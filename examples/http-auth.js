var level = require('level')
var LEVEL_PATH = '/tmp/multilevel-http'
// cleanup
require('rimraf').sync(LEVEL_PATH)
// levelDb instance
var db = level(LEVEL_PATH)
var port = process.env.PORT || 5000
var multilevel = require('../')

// server setup using express
var express = require('express')
var app = express();

app.use(express.basicAuth('admin', 'admin'))
app.use(multilevel.server(db, { desc: 'multilevel-http-server' }).router)

app.listen(port)
console.log('multilevel-http server started on port %s\n', port)

// client setup
var client = multilevel.client('http://admin:admin@localhost:' + port + '/')

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
