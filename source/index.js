import Joi from 'joi';
import Path from 'path';

import Pkg from '../package';

const ConfigSchema = Joi.object().keys({
  Sequelize: Joi.func().required().description('Sequelize npm module'),
  connections: Joi.array().items(Joi.object().keys({
    database: Joi.string().required().description('database name or database uri'),
    username: Joi.string().optional().description('database username'),
    password: Joi.string().optional().description('database password'),
    options: Joi.object().keys({
      host: Joi.string().optional().description('database host'),
      dialect: Joi.string().optional().description('sequelize dialect'),
      logging: Joi.func().optional()
                  .description('logger function, if not set defaults to server.log([\'trace\'], ...args)')
    }).optional().default({}).options({ allowUnknown: true }).description('options pass to sequelize'),
    modelsPath: Joi.string().required().description('path to your model definitions'),
    models: Joi.array().items(Joi.string()).required()
               .description('model names; models must be located at `<modelsPath>/<modelName>`')
  })).optional().default([])
}).required();

const connections = new Map();

function getCacheKey(database, username, password, options = {}) {
  // build uri string (which should be unique across connections)
  let key;
  if (database.match(/[a-zA-Z]+:\/\//)) {
    key = database;
  } else {
    const { dialect = 'mysql', host = '127.0.0.1', port, storage } = options;
    key = JSON.stringify({ dialect, username, password, host, storage, port, database });
  }

  return key;
}

function setConnection(key, connection) {
  if (connections.has(key)) {
    throw new Error(`The connection ${key} is defined multiple times.`);
  }

  connections.set(key, connection);
}

/**
 * Loads and returns sequelize models.
 *
 * @param {Object} config - sequelize configuration @see {ConfigSchema}
 *
 * @return {Object{ String: sequlize.Model }} - mapping from model name to sequelize model
 */
function loadModels(config) {
  /**
   * 1) We need to create a separate Sequelize instance for every database.
   *    Sequelize is not able to handle multiple databases with a single
   *    instance currently.
   * 2) A model relates to a database. Therefore, we need to import the model
   *    with the corresponding Sequelize instance. Relationship between
   *    model and database is configured in the config file.
   * 3) We need to associate the model to other models after all are loaded.
   */
  const { Sequelize } = config;

  const models = config.connections.reduce((memo, { database, username, password, options, modelsPath, models }) => {
    // 1)
    const key = getCacheKey(database, username, password, options);
    const connection = new Sequelize(database, username, password, options);
    setConnection(key, connection);

    // 2)
    return models.reduce((memo, modelName) => {
      if (memo[modelName]) {
        throw new Error(`The model ${modelName} is defined multiple times.`);
      }

      memo[modelName] = connection.import(Path.join(modelsPath, modelName));
      memo[modelName].connection = () => connections.get(key); // add refenrence to sequelize instance

      return memo;
    }, memo);
  }, {});

  // 3)
  Object.keys(models).forEach((modelName) => {
    const model = models[modelName];

    if (typeof model.associate === 'function') {
      model.associate(models);
    }
  });

  return Object.freeze(models); // prevent models object from beeing mutated
}

/**
 * close all connections and reset the connection cache
 */
function closeConnections() {
  connections.forEach((con) => con.close());
  connections.clear();
}

/**
 * plugin definition
 */
const plugin = {
  register(server, options, next) {
    const pluginConfig = Joi.attempt(options, ConfigSchema);

    // add a logger to all sequelize connections
    const logger = (...msg) => { server.log([ 'trace', 'sequelize' ], ...msg); };
    pluginConfig.connections.map((cfg) => {
      if (!cfg.options.logging) {
        cfg.options.logging = logger;
      }

      return cfg;
    });

    // expose models - they're now available under server.plugins['hapi-sequelize-models'].models
    server.expose('models', loadModels(pluginConfig));

    // on server stop - close all connections and reset connecitons cache
    server.ext('onPostStop', plugin.deregister);
    return next();
  },

  deregister(server, next) {
    closeConnections();
    return next();
  }
};

plugin.register.attributes = {
  name: Pkg.name,
  version: Pkg.version
};

export default plugin;
