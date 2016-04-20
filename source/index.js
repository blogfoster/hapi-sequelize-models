import Joi from 'joi';
import Path from 'path';

import pkg from '../package';

const ConfigSchema = Joi.object().keys({
  Sequelize: Joi.func().required().description('Sequelize npm module'),
  username: Joi.string().optional().description('database username'),
  password: Joi.string().optional().description('database password'),
  options: Joi.object().keys({
    host: Joi.string().optional().description('database host'),
    dialect: Joi.string().optional().description('sequelize dialect'),
    logging: Joi.func().optional()
                .description('logger function, if not set defaults to server.log([\'trace\'], ...args)')
  }).optional().default({}).options({ allowUnknown: true }),
  modelsPath: Joi.string().required().description('path to your model definitions'),
  databases: Joi.array().items(Joi.object().keys({
    database: Joi.string().required().description('database name'),
    models: Joi.array().items(Joi.string()).required()
               .description('model names; models must be located at `<modelsPath>/<modelName>`')
  })).optional().default([])
}).required();

const connectionCache = new Map();

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
  const models = {};
  const { Sequelize, modelsPath } = config;

  config.databases.forEach((dbConfig) => {
    const { database } = dbConfig;
    let connection = null;

    // 1)
    connection = new Sequelize(database, config.username, config.password, config.options);
    connectionCache.set(database, connection);

    // 2)
    dbConfig.models.forEach((modelName) => {
      models[modelName] = connection.import(Path.join(modelsPath, modelName));
      models[modelName].connection = () => connectionCache.get(database); // add refenrence to sequlize instance
    });
  });

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
  connectionCache.forEach((con) => con.close());
  connectionCache.clear();
}

const plugin = {
  register(server, options, next) {
    const result = Joi.validate(options, ConfigSchema);
    if (result.error) {
      throw result.error;
    }

    const pluginConfig = result.value;
    if (!pluginConfig.options.logging) {
      pluginConfig.options.logging = (...msg) => { server.log(['trace'], ...msg); };
    }

    const models = loadModels(pluginConfig);

    // expose models - they're now available under server.plugins['hapi-sequelize-models'].models
    server.expose('models', models);

    // on server stop - close all connections and reset connecitons cache
    server.ext('onPostStop', (server, next) => {
      closeConnections();
      return next();
    });

    return next();
  }
};

plugin.register.attributes = {
  name: pkg.name,
  version: pkg.version
};

export default plugin;
