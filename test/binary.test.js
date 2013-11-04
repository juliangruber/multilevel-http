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

describe('handling binary data', function() {
  var tgzFile
  var tgzSha

  before(function(done) {
    npmPack(function(err, content) {
      if (err) throw err

      tgzFile = content
      tgzSha = getSha(tgzFile)
      done()
    })
  })

  it('#put && #get', function(done) {
    client.put(tgzSha, tgzFile, function(err) {
      if (err) throw err

      client.get(tgzSha, function(err, content) {
        if (err) throw err

        // comparing the shasum for the original content with the shasum
        // of the value from the database
        getSha(content).should.equal(tgzSha)
        done()
      })
    })
  })

  it('#writeStream() && #readStream', function(done) {
    var currentFile = fs.readFileSync(__filename)
    var ws = client.createWriteStream()
    ws.write({ key: 'wskey-1', value: tgzFile })
    ws.write({ key: 'wskey-2', value: currentFile })
    ws.end()

    ws.on('end', function() {
      client.createReadStream({
        start: 'wskey-',
        end: 'wskey-\xff'
      }).on('data', function(data) {
        if (data.key === 'wskey-1') {
          getSha(data.value).should.equal(tgzSha)
        } else if (data.key === 'wskey-2') {
          getSha(data.value).should.equal(getSha(currentFile))
        } else {
          throw new Error('unknown key ' + data.key)
        }
      }).on('end', function() {
        done()
      })
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
      chunks.push(chunk)
    })
    .on('end', function() {
      cb(null, Buffer.concat(chunks))
    })
}

function getSha(content) {
  var shasum2 = crypto.createHash('sha1')
  shasum2.update(content)
  return shasum2.digest('hex')
}
