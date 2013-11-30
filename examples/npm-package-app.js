var fs = require('fs')
var tar = require('tar')
var zlib = require('zlib')
var fstream = require('fstream-npm')
var assert = require('assert')
var crypto = require('crypto')

var rimraf = require('rimraf')
var LEVEL_PATH = '/tmp/multilevel-http'
rimraf.sync(LEVEL_PATH)
var level = require('level')
var db = level(LEVEL_PATH, { valueEncoding: 'binary' })
var multilevel = require('../')

multilevel.server(db).listen(5000)

var client = multilevel.client('http://localhost:5000/', { valueEncoding: 'binary' })

npmPack(function(err, shasum, content) {
  if (err) throw err

  client.put(shasum, content, function(err) {
    if (err) throw err

    client.get(shasum, function(err, content) {
      if (err) throw err

      // comparing the shasum for the original content with the shasum
      // of the value from the database
      compareSha(content, shasum)
    })
  })
})

function npmPack(cb) {
  var shasum = crypto.createHash('sha1')
  var chunks = []

  // NOTE: in production don't forget to put error handlers on the streams
  new fstream({ path: __dirname + '/../' })
    .pipe(tar.Pack())
    .pipe(zlib.createGzip())
    .on('data', function(chunk) {
      shasum.update(chunk)
      chunks.push(chunk)
    })
    .on('close', function() {
      cb(null, shasum.digest('hex'), Buffer.concat(chunks))
    })
}

function compareSha(content, shasum) {
  var shasum2 = crypto.createHash('sha1')
  shasum2.update(content)
  assert.equal(shasum, shasum2.digest('hex'))
  console.log('all good, the shasum matched')
  process.exit()
}
