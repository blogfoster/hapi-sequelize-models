import Promise from 'bluebird';
import expect from 'expect';
import Hapi from 'hapi';
import Path from 'path';
import SequelizeFixtures from 'sequelize-fixtures';
import Sequelize from 'sequelize';

import HapiSequelizeModels from '../../source';

import Fixtures from '../fixtures';

describe('[integration/plugin]', function () {
  describe('with missing Sequelize dependency', function () {
    let server;
    let error;

    before('create a hapi server', function () {
      server = new Hapi.Server();
      server.connection({ host: '127.0.0.1', port: 8080 });
      return server.register([
        // hapi-sequelize-models plugin
        {
          register: HapiSequelizeModels,
          options: {
            // without sequelize dependency
            username: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD
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
    let models;
    let server;

    before('create a hapi server', function () {
      server = new Hapi.Server();
      server.connection({ host: '127.0.0.1', port: 8080 });
      return server.register([
        // hapi-sequelize-models plugin
        {
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
        }
      ]);
    });

    before('add a test route to check that models are accessable', function () {
      return server.route([
        {
          method: 'GET',
          path: '/test',
          handler(request, reply) {
            // check that the plugin exposes the models
            expect(request.server.plugins['hapi-sequelize-models'].test).toExist('`test` model should be loaded');
            expect(request.server.plugins['hapi-sequelize-models'].test2).toExist('`test2` model should be loaded');
            expect(request.server.plugins['hapi-sequelize-models'].xxx).toExist('`xxx` model should be loaded');

            // get all test + test2 rows
            const models = request.server.plugins['hapi-sequelize-models'];

            const testEntries = models.test.findAll({
              include: [
                {
                  model: models.test2
                }
              ]
            });

            const xxxEntries = models.xxx.findAll();

            return Promise.all([testEntries, xxxEntries])
            .then(([testEntries, xxxEntries]) => {
              return reply({
                test: testEntries,
                xxx: xxxEntries
              });
            });
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

    before('get models from server', function () {
      models = server.plugins['hapi-sequelize-models'];
    });

    before('truncate mysql', function () {
      return Promise.map(Object.keys(models), modelName => models[modelName].truncate());
    });

    const fixtures = [
      { name: 'test', data: Fixtures.test },
      { name: 'test2', data: Fixtures.test2 },
      { name: 'xxx', data: Fixtures.xxx }
    ];

    fixtures.forEach((fixture) => {
      before(`load ${fixture.name} fixtures`, function () {
        return SequelizeFixtures.loadFixtures(fixture.data, models);
      });
    });

    /**
     * GET /test
     */
    describe('when integrated into hapi server', function () {
      let response;
      let payload;

      before('call hapi', function () {
        return server.inject({
          method: 'GET',
          url: '/test'
        })
        .then((res) => {
          response = res;
          payload = JSON.parse(response.payload);
        });
      });

      it('should respond with HTTP 200 (OK)', function () {
        expect(response.statusCode).toEqual(200);
      });

      it('should respond with the test data', function () {
        // test model
        expect(payload.test.length).toEqual(1);
        expect(payload.test[0].id).toEqual(1);
        expect(payload.test[0].name).toEqual('name-1');

        // test2 model
        expect(payload.test[0].Test2s.length).toEqual(1);
        expect(payload.test[0].Test2s[0]).toInclude({
          id: 1,
          data: 'data-1',
          test_id: 1
        });

        // xxx model
        expect(payload.xxx.length).toEqual(1);
        expect(payload.xxx[0].id).toEqual(5);
      });
    });
  });
});
