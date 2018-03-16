const path = require('path')
const fs = require('fs')

module.exports = fs.readdirSync(__dirname)
  .filter((filename) => !filename.startsWith('.'))
  .filter((filename) => filename.endsWith('-route.js'))
  .map((routeFile) => require(path.join(__dirname, routeFile)))
  .reduce((all, routes) => all.concat(routes), [])
