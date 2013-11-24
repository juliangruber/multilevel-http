// server setup
var level = require('level')
var pre = require('level-prefix')
var LEVEL_PATH = '/tmp/multilevel-http'
// cleanup
require('rimraf').sync(LEVEL_PATH)
// levelDb instance
var db = level(LEVEL_PATH)
var multilevel = require('../')
var server = multilevel.server(db)
var port = process.env.PORT || 5000;
server.listen(port)

// client setup
var client = pre(multilevel.client('http://localhost:' + port + '/')).prefix('attachments-')
var Store = require('level-store')
var fs = require('fs')
var store = Store(client);
var assert = require('assert')

fs.createReadStream(__filename)
  .pipe(store.createWriteStream('file2', { valueEncoding: 'binary' }))
  .on('close', function () {
    // the file is stored in LevelDB now
    var chunks = []
    var fileStream = store.createReadStream('file2', { valueEncoding: 'binary' })

    fileStream.on('data', function(data) {
      chunks.push(data)
    }).on('end', function() {
      // compare the original file with the file stored into LevelDB
      assert.equal(fs.readFileSync(__filename).toString(), Buffer.concat(chunks).toString('utf8'));
      console.log('all good')
      process.exit()
    })
  });

