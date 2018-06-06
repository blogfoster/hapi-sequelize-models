import expect from 'expect';
import Hapi from 'hapi';
import Sequelize from 'sequelize';

import HapiSequelizeModels from '../../source';
import models from '../models';

describe('[integration/plugin]', () => {
  describe('wrong configuration', () => {
    const tests = [
      {
        description: 'without `Sequelize`',
        options: {},
      },
      {
        description: 'without `database`',
        options: {
          Sequelize,
          connections: [{}],
        },
      },
      {
        description: 'with the same connection defined multiple times',
        options: {
          Sequelize,
          connections: [{ database: 'test' }, { database: 'test' }],
        },
      },
      {
        description: 'with the same model name defined multiple times',
        options: {
          Sequelize,
          connections: [
            {
              database: 'test1',
              models: [{ name: 'test', model: models.test }],
            },
            {
              database: 'test2',
              models: [{ name: 'test', model: models.test }],
            },
          ],
        },
      },
    ];

    tests.forEach(test => {
      describe(test.description, () => {
        let server;
        let error;

        before('create a hapi server', () => {
          server = Hapi.Server({ host: '127.0.0.1', port: 8080 });
          return server
            .register([
              {
                plugin: HapiSequelizeModels,
                options: test.options,
              },
            ])
            .catch(err => {
              error = err;
            });
        });

        it('should fail to init the plugin', () => {
          expect(error).toExist();
        });
      });
    });
  });

  describe('successful integration', () => {
    let server;

    before('create a hapi server', () => {
      server = Hapi.Server({ host: '127.0.0.1', port: 8080 });

      const config1 = { options: { storage: './test.db', dialect: 'sqlite' } };
      const config2 = { options: { storage: './test2.db', dialect: 'sqlite' } };

      return server.register([
        {
          plugin: HapiSequelizeModels,
          options: {
            Sequelize,
            connections: [
              {
                ...config1,
                database: 'test',
                models: [
                  {
                    name: 'test',
                    model: models.test,
                  },
                  {
                    name: 'test2',
                    model: models.test2,
                  },
                ],
              },
              {
                ...config1,
                database: 'test2',
                models: [
                  {
                    name: 'xxx',
                    model: models.xxx,
                  },
                ],
              },
              {
                ...config2,
                database: 'test3',
                models: [
                  {
                    name: 'next',
                    model: models.next,
                  },
                ],
              },
            ],
          },
        },
      ]);
    });

    before('init hapi server', () => server.initialize());

    after('stop hapi server', () => server.stop());

    describe('when plugin is loaded', () => {
      it("should make models available as `server.plugins['hapi-sequelize-models']`", () => {
        expect(server.plugins['hapi-sequelize-models'].models).toExist();
      });

      it('should load all defined models', () => {
        const { models } = server.plugins['hapi-sequelize-models'];

        expect(models.test).toExist();
        expect(models.test2).toExist();
        expect(models.xxx).toExist();
        expect(models.next).toExist();
      });

      it('should load Sequelize.Models', () => {
        const { models } = server.plugins['hapi-sequelize-models'];

        expect(models.test.constructor).toEqual(Sequelize.Model.constructor);
        expect(models.test2.constructor).toBeA(Sequelize.Model.constructor);
        expect(models.xxx.constructor).toBeA(Sequelize.Model.constructor);
        expect(models.next.constructor).toBeA(Sequelize.Model.constructor);
      });

      it('should attach a `connection` function to each model, that returns the sequelize connection', () => {
        const { models } = server.plugins['hapi-sequelize-models'];

        Object.keys(models).forEach(name => {
          const model = models[name];

          expect(model.connection).toBeA('function');
          expect(model.connection()).toExist();
          expect(model.connection()).toBeA(Sequelize);
        });
      });
    });
  });
});
