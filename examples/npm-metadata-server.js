// server setup
var level = require('level')
var LEVEL_PATH = '/tmp/multilevel-http'
// cleanup
require('rimraf').sync(LEVEL_PATH)
// levelDb instance
var db = level(LEVEL_PATH, {
  valueEncoding: 'json'
})
var multilevel = require('../')
var server = multilevel.server(db)
var port = process.env.PORT || 5000
server.listen(port)
console.log('multilevel-http server started on port %s\n', port)
