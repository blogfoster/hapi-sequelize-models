import expect from 'expect';
import Hapi from 'hapi';
import Path from 'path';
import Sequelize from 'sequelize';

import HapiSequelizeModels from '../../source';

describe('[integration/plugin]', function () {
  describe('with missing Sequelize dependency', function () {
    let server;
    let error;

    before('create a hapi server', function () {
      server = new Hapi.Server();
      server.connection({ host: '127.0.0.1', port: 8080 });
      return server.register([
        // hapi-sequelize-models plugin integration
        {
          register: HapiSequelizeModels,
          options: {
            // without sequelize dependency
            username: 'test',
            password: 'test'
          }
        }
      ])
      .catch((err) => {
        error = err;
      });
    });

    it('should fail to init the plugin', function () {
      expect(error).toExist();
    });
  });

  describe('successful integration', function () {
    let server;

    before('create a hapi server', function () {
      server = new Hapi.Server();
      server.connection({ host: '127.0.0.1', port: 8080 });
      return server.register([
        // hapi-sequelize-models plugin integration
        {
          register: HapiSequelizeModels,
          options: {
            Sequelize,
            username: 'test',
            options: {
              storage: './test.db',
              dialect: 'sqlite'
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
        }
      ]);
    });

    before('init hapi server', function () {
      return server.initialize();
    });

    after('stop hapi server', function () {
      return server.stop();
    });

    describe('when plugin is loaded', function () {
      it('should make models available as `server.plugins[\'hapi-sequelize-models\']`', function () {
        expect(server.plugins['hapi-sequelize-models']).toExist();
      });

      it('should load all defined models', function () {
        const models = server.plugins['hapi-sequelize-models'];

        expect(models.test).toExist();
        expect(models.test2).toExist();
        expect(models.xxx).toExist();
      });

      it('should load Sequelize.Models', function () {
        const models = server.plugins['hapi-sequelize-models'];

        expect(models.test).toBeA(Sequelize.Model);
        expect(models.test2).toBeA(Sequelize.Model);
        expect(models.xxx).toBeA(Sequelize.Model);
      });

      it('should attach an `connection` function to each model, to get the sequelize connection', function () {
        const models = server.plugins['hapi-sequelize-models'];

        expect(typeof models.test.connection).toEqual('function');
        expect(models.test.connection()).toExist();
      });
    });
  });
});
