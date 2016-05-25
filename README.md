# hapi-sequelize-models

[![travis-develop][004]][005]
[![npm-dependencies][006]][007]

This is a Hapi plugin to load your sequelize models. Your models should be defined so that
[they can be imported by sequelize][001]. The plugin itself will not require `Sequelize`,
instead you have to pass it in as an option.


## usage

### register the plugin

```javascript
import HapiSequelizeModels from 'hapi-sequelize-models';
import Sequelize from 'sequelize';

return server.register({
  register: HapiSequelizeModels,
  options: {
    Sequelize,
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    options: {
      host: process.env.MYSQL_HOST,
      dialect: 'mysql'
    },
    modelsPath: Path.join(__dirname, '../models'),
    databases: [
      {
        database: 'test',
        models: ['test', 'test2']
      },
      {
        database: 'test2',
        models: ['xxx']
      }
    ]
  }
})
.then(() => {
  console.log('plugin registered');
})
.catch((err) => {
  console.error('registering plugin failed:', err);
})
```

### usage in a handler function

```javascript
const handler = {
  handleRequest(request, reply) {
    const { models } = request.server.plugins['hapi-sequelize-models'];

    return models.test.findAll()
      .then(reply);
  }
};
```

## plugin api

- `Sequelize` - sequelize npm module (`require('sequelize')`)
- `[username]` - *optional* database user name
- `[password]` - *optional* database user password
- `[options = {}]` - *optional* [sequelize options][003]
    - `[options.host]` - *optional* - database host
    - `[options.dialect]` - *optional* - database dialect
    - `[options.logging]` - *optional* - logging function, if not set this defaults to `(...msg) => server.log(['trace'], ...mgs)`
- `modelsPath` - path to models
- `[databases = []]` - *optional* - collection of databases
    - `databases[*].database` - database name
    - `databases[*].models` - list of models that should be loaded
        - `databases[*].models[*]` - String: model name; model must be available under `modelsPath/modelname`

## model definition

Models should be defined so that they can be imported using [sequelize.import][001]. For convenience
a `.connection()` function is attached to each model, to access its underlaying sequelize connection.

Also models will be availabe using `server.plugins['hapi-sequelize-models'].models.<modelName>`. Here `<modelName>`
is not the name defined in `sequelize.define`, but the filename, which is also used in the `databases[*].models[*]`.

```javascript
const handler = {
  handleRequest(request, reply) {
    const { models } = request.server.plugins['hapi-sequelize-models'];

    const sequelize = models.test.connection();
    sequelize.query('SELECT * FROM *');
  }
};
```

### Associates

After all models are loaded, the plugin iterates through all of them to check if an `associate` function was
defined. If so it calls it with all `models`. The assoication must then happen within that function.

```javascript
export default function defineUser(sequelize, DataTypes) {
  return sequelize.define('User', {
    id: DataTypes.INTEGER,
  }, {
    classMethods: {
      associate(models) {
        models.user.belongsTo(models.test);
      }
    }
  });
}
```

## development

- npm

```bash
npm prune && npm install
npm test
```


[001]: http://docs.sequelizejs.com/en/latest/docs/models-definition/#import
[002]: https://www.docker.com/products/docker-toolbox
[003]: http://docs.sequelizejs.com/en/latest/api/sequelize/
[004]: https://travis-ci.org/blogfoster/hapi-sequelize-models.svg?branch=develop
[005]: https://travis-ci.org/blogfoster/hapi-sequelize-models
[006]: https://david-dm.org/blogfoster/hapi-sequelize-models.svg
[007]: https://david-dm.org/blogfoster/hapi-sequelize-models
