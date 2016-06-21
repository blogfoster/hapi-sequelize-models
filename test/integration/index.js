import expect from 'expect';
import Hapi from 'hapi';
import Path from 'path';
import Sequelize from 'sequelize';

import HapiSequelizeModels from '../../source';

describe('[integration/plugin]', function () {
  describe('wrong configuration', function () {
    const tests = [
      {
        description: 'without `Sequelize`',
        options: {}
      },
      {
        description: 'without `modelsPath`',
        options: {
          Sequelize,
          connections: [ {
            database: 'test'
          } ]
        }
      },
      {
        description: 'without `database`',
        options: {
          Sequelize,
          connections: [ {
            modelsPath: '.'
          } ]
        }
      },
      {
        description: 'with the same connection defined multiple times',
        options: {
          Sequelize,
          connections: [
            { modelsPath: '.', database: 'test' },
            { modelsPath: '.', database: 'test' }
          ]
        }
      },
      {
        description: 'with the same model name defined multiple times',
        options: {
          Sequelize,
          connections: [
            { modelsPath: '.', database: 'test1', models: [ 'test' ] },
            { modelsPath: '.', database: 'test2', models: [ 'test' ] }
          ]
        }
      }
    ];

    tests.forEach((test) => {
      describe(test.description, function () {
        let server;
        let error;

        before('create a hapi server', function () {
          server = new Hapi.Server();
          server.connection({ host: '127.0.0.1', port: 8080 });
          return server.register([
            {
              register: HapiSequelizeModels,
              options: test.options
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
    });
  });

  describe('successful integration', function () {
    let server;

    before('create a hapi server', function () {
      server = new Hapi.Server();
      server.connection({ host: '127.0.0.1', port: 8080 });

      const config1 = {
        options: { storage: './test.db', dialect: 'sqlite' },
        modelsPath: Path.join(__dirname, '../models')
      };

      const config2 = {
        options: { storage: './test2.db', dialect: 'sqlite' },
        modelsPath: Path.join(__dirname, '../models')
      };

      return server.register([
        {
          register: HapiSequelizeModels,
          options: {
            Sequelize,
            connections: [
              {
                ...config1,
                database: 'test',
                models: [ 'test', 'test2' ]
              },
              {
                ...config1,
                database: 'test2',
                models: [ 'xxx' ]
              },
              {
                ...config2,
                database: 'test3',
                models: [ 'next' ]
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
        expect(server.plugins['hapi-sequelize-models'].models).toExist();
      });

      it('should load all defined models', function () {
        const { models } = server.plugins['hapi-sequelize-models'];

        expect(models.test).toExist();
        expect(models.test2).toExist();
        expect(models.xxx).toExist();
        expect(models.next).toExist();
      });

      it('should load Sequelize.Models', function () {
        const { models } = server.plugins['hapi-sequelize-models'];

        expect(models.test).toBeA(Sequelize.Model);
        expect(models.test2).toBeA(Sequelize.Model);
        expect(models.xxx).toBeA(Sequelize.Model);
        expect(models.next).toBeA(Sequelize.Model);
      });

      it('should attach a `connection` function to each model, that returns the sequelize connection', function () {
        const { models } = server.plugins['hapi-sequelize-models'];

        Object.keys(models).forEach((name) => {
          const model = models[name];

          expect(model.connection).toBeA('function');
          expect(model.connection()).toExist();
          expect(model.connection()).toBeA(Sequelize);
        });
      });
    });
  });
});
