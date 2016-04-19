# hapi-sequelize-models

This is a Hapi plugin to load your sequelize models. Your models should defined so that
[they can be imported][001]. The plugin itself will not require `Sequelize`, instead you
have to pass it as an option.


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
    const models = request.server.plugins['hapi-sequelize-models'];

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
    - `[options.logging]` - *optional* - logging function
- `modelsPath` - path to models
- `[databases = []]` - *optional* - collection of databases
    - `databases[*].database` - database name
    - `databases[*].models` - list of models that should be loaded
        - `databases[*].models[*]` - String: model name; model must be available under `modelsPath/modelname`

## development

- npm
- [docker][002] is needed to run the tests

```bash
# on your host
npm run d:build
npm run d:login
# within a docker container
npm test
```


[001]: http://docs.sequelizejs.com/en/latest/docs/models-definition/#import
[002]: https://www.docker.com/products/docker-toolbox
[003]: http://docs.sequelizejs.com/en/latest/api/sequelize/
