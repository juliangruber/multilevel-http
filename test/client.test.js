var multilevel = require('..')
var server = multilevel.server(__dirname + '/client.test.db')
var should = require('should')
var rimraf = require('rimraf')
var nock = require('nock')
var after = require('after')

server.listen(5001)

beforeEach(function (done) {
  nock.cleanAll()
  server.db.close()
  rimraf.sync(__dirname + '/client.test.db')
  server.db.open(function(err) {
    if (err) throw err

    done()
  })
})

var db = multilevel.client('http://localhost:5001/')
var db2 = multilevel.client('http://localhost:5001/', {
  valueEncoding: 'json'
})

describe('client', function () {
  describe('db#put(key, value)', function () {
    it('should store text', function (done) {
      db.put('foo', 'bar', function (err) {
        if (err) return done(err)
        
        db.get('foo', function (err, value) {
          if (err) return done(err)
          
          should.exist(value)
          value.should.equal('bar')
          done()
        })
      })
    })
    
    it('should store json', function (done) {
      db.put('foo', { some : 'json' }, { encoding : 'json' }, function (err) {
        if (err) return done(err)
        db.get('foo', { encoding : 'json' }, function (err, value) {
          if (err) return done(err)
          value.should.eql({ some : 'json' })
          done()
        })
      })
    })
    
    it('should store binary', function (done) {
      db.put('foo', new Buffer([0, 1]), { encoding : 'binary' }, function (err) {
        if (err) return done(err)
        db.get('foo', { encoding : 'binary' }, function (err, value) {
          if (err) return done(err)
          value.toString().should.equal("\u0000\u0001")
          done()
        })
      })
    })

    it('should default to global encoding', function (done) {
      db2.put('foo-json', { bar: 1 }, function (err) {
        if (err) return done(err)

        db2.get('foo-json', function (err, value) {
          if (err) return done(err)
          value.bar.should.equal(1)
          done()
        })
      })
    })
  })
  
  describe('db#get(key)', function () {
    it('should get', function (done) {
      db.put('foo', 'bar', function (err) {
        if (err) return done(err)
        
        db.get('foo', function (err, value) {
          if (err) return done(err)
          
          should.exist(value)
          value.should.equal('bar')
          done()
        })
      })
    })

    it('should return notFound err when no val', function (done) {
      db.get('foo', function (err) {
        err.should.be.an.instanceOf(Error)
        err.should.have.property('notFound')
        err.type.should.equal('NotFoundError')
        done()
      })
    })
  })
  
  describe('db#del(key)', function () {
    it('should delete', function (done) {
      db.put('foo', 'bar', function (err) {
        if (err) return done(err)
        
        db.del('foo', function (err) {
          if (err) return done(err)
          
          db.get('foo', function (err, value) {
            should.exist(err)
            should.not.exist(value)
            done()
          })
        })
      })
    })
  })
  
  describe('db#batch(ops, cb)', function () {
    it('should create', function (done) {
      db.batch([
        { type : 'put', key : 'key', value : 'value' }
      ], function (err) {
        if (err) return done(err)
        
        db.get('key', function (err, value) {
          if (err) return done(err)
          
          should.exist(value)
          value.should.equal('value')
          done()
        })
      })
    })

    it('should default to global encoding', function (done) {
      db2.batch([
        { type : 'put', key : 'batch-with-json', value : { apples: 'oranges' } }
      ], function (err) {
        if (err) return done(err)
        
        db2.get('batch-with-json', function (err, value) {
          if (err) return done(err)
          
          should.exist(value)
          should.exist(value.apples)
          value.should.eql({ apples: 'oranges' })
          done()
        })
      })
    })
  })
  
  describe('db#approximateSize(from, to, cb)', function () {
    it('should get a size', function (done) {
      db.approximateSize('a', 'z', function (err, size) {
        if (err) return done(err)
        should.exist(size)
        size.should.be.a('number')
        done()
      })
    })
  })
  
  describe('db#readStream()', function () {
    it('should read', function (done) {
      db.put('foo', 'bar', function (err) {
        if (err) return done(err)
        var count = 0
        
        db.readStream()
        .on('data', function (data) {
          count++
          should.exist(data)
          data.should.eql({ key : 'foo', value : 'bar' })
        })
        .on('error', done)
        .on('end', function (data) {
          count.should.equal(1)
          done()
        })
      })
    })

    it('should default to global encoding', function (done) {
      db2.put('foo', { bar: 'baz' }, function (err) {
        if (err) return done(err)
        var count = 0
        
        db2.readStream()
        .on('data', function (data) {
          count++
          should.exist(data)
          data.should.eql({ key : 'foo', value : { bar: 'baz' } })
        })
        .on('error', done)
        .on('end', function (data) {
          count.should.equal(1)
          done()
        })
      })
    })
  })
  
  describe('db#writeStream()', function () {
    it('should save', function (done) {
      var ws = db.writeStream()
  
      ws.on('end', function () {
        db.get('key', function (err, value) {
          if (err) return done(err)
          should.exist(value)
          value.should.equal('value')
          done()
        })
      })
      
      ws.write({ key : 'key', value : 'value' })
      ws.end()
    })
  })

  describe('bad http codes', function () {
    var url = 'http://localhost:5001'

    it('should callback with error for bad status codes', function (done) {
      var next = after(4, function() {
        done()
      })

      nock(url)
        .get('/data/key')
        .reply(333, 'bad mojo')

      nock(url)
        .post('/data/key?valueEncoding=utf8')
        .reply(333, 'bad mojo')

      nock(url)
        .get('/data?valueEncoding=utf8')
        .reply(333, 'bad mojo')

      nock(url)
        .delete('/data/key')
        .reply(333, 'bad mojo')

      function checkErr(err) {
        err.should.be.an.Error
        err.code.should.equal(333)
        err.message.should.match(/333/)
        err.should.have.property('uri')

        next()
      }

      db.get('key', checkErr)
      db.del('key', checkErr)
      db.put('key', 'value', checkErr)
      db.createReadStream().on('error', checkErr)
    })
  })

})
