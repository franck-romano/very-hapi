const Hapi = require('hapi')
const Path = require('path')
const HapiSwagger = require('hapi-swagger')
const Config = require('./lib/services/configuration-service')
const Logger = require('./lib/services/logger')
const routes = require('./lib/routes')

exports.createServer = ({host, port}) => {
  const server = new Hapi.Server({
    connections: {
      routes: {
        files: {
          relativeTo: Path.join(__dirname, '../dist')
        }
      }
    }
  })
  server.connection({
    host,
    port
  })
  const logger = Logger.get()

  return server.register({
    register: require('hapi-bunyan'),
    options: { logger, mergeData: true }
  })
  .then(() => server.register(require('h2o2')))
  .then(() => server.register(require('hapi-require-https')))
  .then(() => {
    return server.register({
      register: HapiSwagger,
      options: {
        documentationPath: '/api/documentation',
        swaggerUIPath: '/api/swaggerui/',
        securityDefinitions: {
          bearer: {
            type: 'apiKey',
            in: 'header',
            name: 'Authorization'
          }
        },
        pathPrefixSize: 2,
        info: {
          title: '<NAME> API'
        }
      }
    })
  })
  .then(() => server.register(require('inert')))
  .then(() => server.register(require('vision')))
  .then(() => {
    server.route({
      method: 'GET',
      path: '/api',
      handler: (request, reply) => {
        reply('Hello')
      }
    })
    server.route(routes)
  })
  .then(() => server)
}
