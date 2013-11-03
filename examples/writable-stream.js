// server setup
var level = require('level')
var LEVEL_PATH = '/tmp/multilevel-http'
// cleanup
require('rimraf').sync(LEVEL_PATH)
// levelDb instance
var db = level(LEVEL_PATH)
var multilevel = require('../')
var server = multilevel.server(db)
var port = process.env.PORT || 5000;
server.listen(port)
console.log('multilevel-http server started on port %s\n', port)

// client setup
var client = multilevel.client('http://localhost:' + port + '/')

// sample app
var pieces = 'multilevel-http helps you out with scaling'.split(' ')
var ws = client.createWriteStream();
for (var i = 0; i < pieces.length; i++) {
  ws.write({ key: 'slice_' + i, value: pieces[i] })
}

ws.on('end', function() {
  client.createReadStream().on('data', function (data) {
    console.log(data.key + ' : ' + data.value)
  }).on('end', function() {
    process.exit()
  })
})

ws.end()
