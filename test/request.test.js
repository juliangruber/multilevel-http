var should = require('should')
var nock = require('nock')
var request = require('../lib/request')()
var http = require('http')
var after = require('after')
var fs = require('fs')
var portfinder = require('portfinder')

beforeEach(function (done) {
  nock.cleanAll()
  done()
})

describe('request', function () {
  var host = 'http://localhost:5001'

  describe('should callback with error for bad status codes', function () {
    it('request#verbs', function (done) {
      var path = '/test'
      var methods = ['get', 'put', 'del', 'post']
      var next = after(methods.length, done)

      methods.forEach(function (method) {
        nock(host)[method.replace('del', 'delete')](path)
          .reply(333, 'bad mojo')

        request[method]({
          uri: host + path
        }, function(err, res, body) {
          err.should.be.an.Error
          err.code.should.equal(333)
          err.message.should.match(/bad mojo/)
          err.should.have.property('uri')
          err.uri.should.equal(host + path)

          next()
        })
      })
    })

    it('request#stream', function (done) {
      portfinder.getPort(function (err, port) {
        http.createServer(function (req, res) {
          res.writeHead(333, { 'Content-Type': 'text/html' })
          fs.createReadStream(__filename).pipe(res)
        }).listen(port)

        var url = 'http://localhost:' + port + '/'

        request.stream({
          uri: url
        }).on('error', function (err) {
          err.should.be.an.Error
          err.code.should.equal(333)
          err.message.should.match(/bad status code/i)
          err.should.have.property('uri')
          err.uri.should.equal(url)

          done()
        }).on('data', function () {
          throw new Error('this should never be called')
        })
      })
    })
  })

  describe('request#stream', function () {
    it('should pipe everything if correct status code', function(done) {
      portfinder.getPort(function (err, port) {
        http.createServer(function (req, res) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          fs.createReadStream(__filename).pipe(res)
        }).listen(port)

        var url = 'http://localhost:' + port + '/'
        var chunks = []

        request.stream({
          uri: url
        }).on('error', function (err) {
          throw err
        }).on('data', function (data) {
          chunks.push(data)
        }).on('end', function () {
          chunks.join('').should.equal(fs.readFileSync(__filename).toString())
          done()
        })
      })
    })
  })
})
 
