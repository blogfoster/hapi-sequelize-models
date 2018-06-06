# hapi-sequelize-models

[![Greenkeeper badge](https://badges.greenkeeper.io/blogfoster/hapi-sequelize-models.svg)](https://greenkeeper.io/)

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

const mysqlConfig = {
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  options: {
    host: process.env.MYSQL_HOST,
    dialect: 'mysql',
  },
};

return server
  .register({
    plugin: HapiSequelizeModels,
    options: {
      Sequelize,
      connections: [
        {
          ...mysqlConfig,
          database: 'test',
          models: [
            {
              name: 'test',
              model: require('../models/test'),
            },
            {
              name: 'test2',
              model: require('../models/test2'),
            },
          ],
        },
        {
          ...mysqlConfig,
          database: 'test2',
          models: [
            {
              name: 'xxx',
              model: require('../models/xxx'),
            },
          ],
        },
      ],
    },
  })
  .then(() => {
    console.log('plugin registered');
  })
  .catch(err => {
    console.error('registering plugin failed:', err);
  });
```

### usage in a handler function

```javascript
const handler = {
  handleRequest(request, reply) {
    const { models } = request.server.plugins['hapi-sequelize-models'];

    return models.test.findAll().then(reply);
  },
};
```

## plugin api

- `Sequelize` - sequelize npm module (`require('sequelize')`)
- `[connections = []]` - _optional_ list of connection definitions
  - `database` - database name or database uri
  - `[username]` - _optional_ database user name
  - `[password]` - _optional_ database user password
  - `[options = {}]` - _optional_ [sequelize options][003]
    - `[host]` - _optional_ database host
    - `[dialect]` - _optional_ database dialect
    - `[logging = (...msg) => server.log(['trace'], ...mgs)]` - _optional_ logging function
  - `[models]` - list of objects with the following properties:
    - `name` - name of the model
    - `model` - the model definition to load with sequelize

## model definition

Models should be defined so that they can be imported using [sequelize.import][001]. For convenience
a `.connection()` function is attached to each model, to access its underlying sequelize connection.

Also models will be available using `server.plugins['hapi-sequelize-models'].models.<name>` where `<name>` is the name of the model specified in the config.

```javascript
const handler = (request, h) => {
  const { models } = request.server.plugins['hapi-sequelize-models'];

  const sequelize = models.test.connection();
  const data = await sequelize.query('SELECT * FROM *');
  // ...
};
```

### Associations

After all models are loaded, the plugin iterates through all of them to check if an `associate` function was
defined. If so it calls it with all `models`. The assoication must then happen within that function.

```javascript
export default const defineUser = (sequelize, DataTypes) =>
  sequelize.define(
    'User',
    {
      id: DataTypes.INTEGER,
    },
    {
      classMethods: {
        associate(models) {
          models.user.belongsTo(models.test);
        },
      },
    },
  );
```

### Caveats

- it's not possible to define multiple connections with the same host + port + schema + database setup
- it's not possible to define different models with the same name

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
