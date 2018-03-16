const { describeApi } = require('./utils')

describeApi('Server', (api) => {
  describe('API response', () => {
    it('replies 200', () => {
      return api()
      .get('/api')
      .expect(200)
      .expect('Hello')
    })
  })
})
