// server setup
var level = require('level')
var rimraf = require('rimraf')
var multilevel = require('../')

function createDb(path, port) {
  rimraf.sync(path)
  // levelDb instance
  var db = level(path)
  var server = multilevel.server(db)
  var port = port
  server.listen(port)
  console.log('multilevel-http server started on port %s', port)
}

var port1 = 5000
var port2 = 5002

createDb('/tmp/multilevel-http', port1)
createDb('/tmp/multilevel-http2', port2)

// client setup
var client = multilevel.client(port1)
var client2 = multilevel.client(port2)

// sample app
var pieces = 'multilevel-http helps you out with scaling'.split(' ')
var counter = pieces.length
function next(err) {
  if (err) throw err

  // when all the put queries have been executed
  if (!--counter) {
    client.createReadStream()
      .pipe(client2.createWriteStream())
      .on('end', function() {
        console.log('\nsecond database data')
        console.log('--------------------')
        // WOHOOO replicated data from db1 to db2
        client2.createReadStream().on('data', function(data) {
          console.log(data.key + ' : ' + data.value)
        }).on('end', function() {
          process.exit()
        })
      })
  }
}

for (var i = 0; i < pieces.length; i++) {
  client.put('piece_' + i, pieces[i], next)
}

