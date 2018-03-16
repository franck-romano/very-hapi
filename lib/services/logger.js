const bunyan = require('bunyan')
const path = require('path')
const blackhole = require('stream-blackhole')

const loggerName = path.basename(process.argv[1] || '<API Name>')
const logger = bunyan.createLogger({
  name: loggerName,
  level: 'debug',
  streams: [{
    type: 'stream',
    stream: blackhole()
  }]
})

exports.logger = () => logger
exports.get = () => logger
