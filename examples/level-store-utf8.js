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
var Store = require('level-store')
var fs = require('fs')
var store = Store(client);
var assert = require('assert')

fs.createReadStream(__filename)
  .pipe(store.createWriteStream('file'))
  .on('close', function () {
    // the file is stored in LevelDB now
    var buf = ''
    var fileStream = store.createReadStream('file')

    fileStream.on('data', function(data) {
      buf += data
    }).on('end', function() {
      // compare the original file with the file stored into LevelDB
      assert.equal(fs.readFileSync(__filename).toString(), buf)
      process.exit()
    })

    // pipe the file into stdout
    fileStream.pipe(process.stdout);
  });
