// server setup
var level = require('level')
var LEVEL_PATH = '/tmp/multilevel-http'
// cleanup
require('rimraf').sync(LEVEL_PATH)
// levelDb instance
var db = level(LEVEL_PATH)
var multilevel = require('../')
var server = multilevel.server(db)
var port = parseInt(process.env.PORT, 10) || 5000;
server.listen(port)
console.log('multilevel-http server started on port %s\n', port)

// client setup
var client = multilevel.client(port)
// more verbose, in case if you need to specify host protocol etc
// var client = multilevel.client('http://localhost:' + port + '/')

// sample app
var pieces = 'multilevel-http helps you out with scaling'.split(' ')
var counter = pieces.length
function next(err) {
  if (err) throw err

  // when all the put queries have been executed, pipe the readStream into stdout
  if (!--counter) {
    client.createReadStream().on('data', function (data) {
      console.log(data.key + ' : ' + data.value)
    }).on('end', function() {
      process.exit()
    })
  }
}

for (var i = 0; i < pieces.length; i++) {
  client.put('piece_' + i, pieces[i], next)
}
