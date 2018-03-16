const { expect, withEnv } = require('./utils')
const Joi = require('joi')
const Config = require('../lib/services/configuration-service')

describe('ConfigurationService', () => {
  describe('.has(key)', () => {
    const key = 'MY_KEY'
    describe('when key is no setup', () => {
      it('returns false', () => {
        expect(Config.has(key)).to.equal(false)
      })
    })
    describe('when the key is set up on the environment', () => {
      const value = 'hello'
      withEnv(key, value)
      it('returns true', () => {
        expect(Config.has(key)).to.equal(true)
      })
    })
  })

  describe('.get(key)', () => {
    const key = 'MY_KEY'
    describe('when the key is not set up', () => {
      it('returns undefined', () => {
        expect(Config.get(key)).to.be.undefined
      })
    })
    describe('when the key is set up', () => {
      const value = 'hello'
      withEnv(key, value)
      it('returns the value', () => {
        expect(Config.get(key)).to.equal(value)
      })
    })
  })

  describe('.require(key)', () => {
    const key = 'MY_KEY'
    describe('when the key is not set up', () => {
      it('rejects with a reason', () => {
        return expect(Config.require(key)).to.be.rejectedWith(/MY_KEY is not set/i)
      })
    })
    describe('when the key is set up', () => {
      const value = 'hello'
      withEnv(key, value)
      it('resolves with the value', () => {
        return expect(Config.require(key)).to.eventually.equal(value)
      })
    })
  })
  describe('when the key has a Joi description', () => {
    const key = 'MY_KEY'
    let previousDescription
    beforeEach(() => {
      previousDescription = Config.description
      Config.description = {
        [key]: Joi.boolean().insensitive().default(false)
      }
    })
    afterEach(() => {
      Config.description = previousDescription
    })

    describe('.has(key)', () => {
      describe('when key is not set up', () => {
        describe('but a default value is set', () => {
          it('returns true', () => {
            expect(Config.has(key)).to.equal(true)
          })
        })
        describe('and no default value is set', () => {
          beforeEach(() => {
            Config.description = {
              [key]: Joi.any()
            }
          })
          it('returns false', () => {
            expect(Config.has(key)).to.equal(false)
          })
        })
      })
      describe('when the key is set up and valid', () => {
        const value = 'true'
        withEnv(key, value)
        it('returns true', () => {
          expect(Config.has(key)).to.equal(true)
        })
      })
      describe('when the key is set up but invalid', () => {
        const value = 'hello'
        withEnv(key, value)
        it('returns false', () => {
          expect(Config.has(key)).to.equal(false)
        })
      })
    })
    describe('.get(key)', () => {
      describe('when key is not set up', () => {
        describe('and a default value is set', () => {
          it('returns the default value', () => {
            expect(Config.get(key)).to.equal(false)
          })
        })
        describe('but no default value is set', () => {
          beforeEach(() => {
            Config.description = {
              [key]: Joi.any()
            }
          })
          it('returns undefined', () => {
            expect(Config.get(key)).to.be.undefined
          })
        })
      })
      describe('when the key is set up and valid', () => {
        const value = 'true'
        withEnv(key, value)
        it('returns the value', () => {
          expect(Config.get(key)).to.equal(true)
        })
      })
      describe('when the key is set up but invalid', () => {
        const value = 'hello'
        withEnv(key, value)
        it('throws', () => {
          expect(() => Config.get(key)).to.throw(/MY_KEY is not valid/i)
        })
      })
    })
    describe('.require(key)', () => {
      describe('when key is not set up', () => {
        describe('and a default value is set', () => {
          it('resolves the default value', () => {
            return expect(Config.require(key)).to.eventually.equal(false)
          })
        })
        describe('but no default value is set', () => {
          beforeEach(() => {
            Config.description = {
              [key]: Joi.any()
            }
          })
          it('rejects', () => {
            return expect(Config.require(key)).to.be.rejectedWith(/MY_KEY is not set/i)
          })
        })
      })
      describe('when the key is set up and valid', () => {
        const value = 'true'
        withEnv(key, value)
        it('resolves the value', () => {
          return expect(Config.require(key)).to.eventually.equal(true)
        })
      })
      describe('when the key is set up but invalid', () => {
        const value = 'hello'
        withEnv(key, value)
        it('rejects', () => {
          expect(Config.require(key)).to.be.rejectedWith(/MY_KEY is not valid/i)
        })
      })
    })
  })
})
