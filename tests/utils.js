const Server = require('..')
const superAgentDefaults = require('superagent-defaults')
const supertest = require('supertest')
const sinon = require('sinon')
const chai = require('chai')
chai.use(require('sinon-chai'))
chai.use(require('chai-datetime'))
chai.use(require('chai-as-promised'))
exports.expect = chai.expect

function withDb (wide) {
  const db = require('../lib/services/sequelize')
  const models = require('../lib/models')
  const beforeHook = wide ? before : beforeEach
  const afterHook = wide ? after : afterEach
  beforeHook('sync db tables with model', () => {
    return db.drop({ logging: false }).then(() => db.sync({ logging: false }))
  })
  afterHook('drop database', () => db.drop({ logging: false }))
  return { db, models }
}

exports.asIntegratedTest = extendDescribe(function (describe, flags, declaration) {
  if (!declaration) {
    declaration = flags
    flags = {}
  }
  const { readonly } = flags
  describe(':INTEGRATION:', function () {
    const { db, models } = withDb(readonly)
    this.db = db
    this.models = models
    beforeEach(() => {
      sinon.spy(db, 'log')
    })
    afterEach('Check test has used the database', function () {
      let notAnIntegrationTest = false
      const callThreshold = readonly ? 0 : Object.keys(models).length
      if (db.log.callCount <= callThreshold) {
        notAnIntegrationTest = true
      }
      db.log.restore()
      let parents = []
      let context = this.currentTest
      while (context) {
        parents.unshift(context.title)
        context = context.parent
      }
      const testName = parents.join(' ')

      if (notAnIntegrationTest) {
        throw Error('This seems not to be an integration test. No SQL query were run.\nWe were running ' + testName)
      }
    })
    declaration.call(this, this.db, this.models)
  })
})

/* eslint-disable no-process-env */
exports.withEnv = function withEnv (key, value) {
  let original
  let wasUnset
  beforeEach(`set up ENV['${key}']`, () => {
    if (process.env.hasOwnProperty(key)) {
      original = process.env[key]
      wasUnset = false
    } else {
      wasUnset = true
    }
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  })

  afterEach(`restore ENV['${key}']`, () => {
    if (wasUnset) {
      delete process.env[key]
    } else {
      process.env[key] = original
    }
  })
}
/* eslint-enable no-process-env */

exports.withMock = (type, name) => {
  let modulePath = `../lib/${type}s/${name}`
  if (type === 'service') {
    modulePath += '-service'
  }
  const service = require(modulePath)
  let stubs = []

  let serviceMock
  beforeEach(`mock setup ${type} ${name}`, () => {
    serviceMock = sinon.mock(service)
    stubs = {}
  })
  afterEach(`mock teardown ${type} ${name}`, () => {
    Object.keys(stubs).forEach((method) => delegator.resetStub(method))
    serviceMock.restore()
  })

  const delegator = new Proxy({}, {
    get (source, property) {
      switch (property) {
        case 'stub':
          return (method) => {
            if (stubs[method]) {
              return stubs[method]
            }
            const stub = sinon.stub(serviceMock.object, method)
            stubs[method] = stub
            return stub
          }
        case 'resetStub':
          return (method) => {
            if (stubs[method]) {
              stubs[method].restore()
              delete stubs[method]
            }
          }
        case 'expects':
          return (method) => {
            delegator.resetStub(method)
            return serviceMock.expects(method)
          }
        default:
          const found = serviceMock[property]
          return typeof found === 'function' ? found.bind(serviceMock) : found
      }
    }
  })

  return delegator
}

exports.describeApi = extendDescribe(function (describe, name, declaration) {
  return describe(`:API: ${name}`, function () {
    this.api = withApi()
    declaration.call(this, this.api)
  })
})

function extendDescribe (callback) {
  function desc (name, declaration) {
    return callback(describe, name, declaration)
  }
  desc.only = function (name, declaration) {
    return callback(describe.only, name, declaration)
  }
  desc.skip = function (name, declaration) {
    return callback(describe.skip, name, declaration)
  }
  return desc
}

exports.withApi = function () {
  throw Error(`withApi() is deprecated. please use describeApi('Name', (api) => {...})`)
}
function withApi () {
  let uri, server

  before('start server', () => {
    return Server.createServer({host: 'localhost'})
      .then((_server) => {
        server = _server
        return server.start()
          .then(() => {
            uri = server.info.uri
          })
      })
  })
  after('stop server', () => server.stop())

  return function () {
    const api = superAgentDefaults(supertest(uri))
    api.set('Authorization', 'Bearer testToken')
    return api
  }
}

exports.trap = function () {
  let capturedValue
  return {
    capture () {
      return sinon.match((value) => {
        capturedValue = value
        return true
      }, '[capture]')
    },
    value () {
      return capturedValue
    }
  }
}

exports.dbWithTransaction = function () {
  let fakeTransaction
  const db = {
    transactionMatcher () {
      return sinon.match.same(fakeTransaction)
    },
    transaction () {
      throw Error('transaction called outside of test')
    }
  }
  beforeEach(() => {
    fakeTransaction = {
      toString () {
        return '[Object FakeDbTransaction]'
      }
    }
    sinon.stub(db, 'transaction').callsFake((block) => Promise.resolve(block(fakeTransaction)))
  })
  afterEach(() => {
    fakeTransaction = null
    db.transaction.restore()
  })

  return db
}

exports.asMap = function (object) {
  const definition = Object.keys(object)
    .map((key) => [key, object[key]])
  const map = new Map(definition)
  map.toJSON = function () {
    const json = {}
    for (let [key, value] of this.entries()) {
      json[key] = maybeJSON(value)
    }
    return json
  }
  return map

  function maybeJSON (value) {
    if (value && typeof value.toJSON === 'function') {
      return value.toJSON()
    } else if (Array.isArray(value)) {
      return value.map((v) => maybeJSON(v))
    } else {
      return value
    }
  }
}

exports.dateClose = function dateClose (base, margin) {
  margin = margin || 500
  return sinon.match((param) => {
    return Math.abs(base.getTime() - param.getTime()) < margin
  }, `date close to ${base}`)
}

exports.matchSomeValues = function matchSomeValues (values) {
  return sinon.match((args) => {
    return values.includes(args)
  })
}

exports.fail = (message) => { throw Error(message) }
