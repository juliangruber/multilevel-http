var should = require('should')
var request = require('supertest')
var levelup = require('levelup')
var fs = require('fs.extra')
var multilevel = require('..')

var app

beforeEach(function (done) {
  if (app && app.db) app.db.close()
  fs.rmrf(__dirname + '/server.test.db', function () {
    done()
  })
})

beforeEach(function () {
  app = multilevel.server(__dirname + '/server.test.db', { some : 'meta' })
})

beforeEach(function (done) {
  app.db.put('foo', 'bar', done)
})

beforeEach(function (done) {
  app.db.put('bar', 'foo', done)
})

describe('http', function () {
  describe('GET /meta', function () {
    it('should send meta', function (done) {
      request(app)
      .get('/meta')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err)
        should.exist(res.body)
        should.exist(res.body.some)
        res.body.some.should.equal('meta')
        
        done()
      })
    })
  })
  
  describe('GET /data/:key', function () {
    it('should get text', function (done) {
      request(app)
      .get('/data/foo')
      .expect('bar', done)
    })
    
    it('should get json', function (done) {
      app.db.put('json', { some : 'json' }, { encoding : 'json' }, function (err) {
        if (err) return done(err)
        
        request(app)
        .get('/data/json?encoding=json')
        .expect(200)
        .expect({ some : 'json' }, done)
      })
    })
    
    it('should respond with 404', function (done) {
      request(app)
      .get('/data/baz')
      .expect(404)
      .expect(/not found/, done)
    })
  })
  
  describe('POST /data/:key', function () {
    it('should save text', function (done) {
      request(app)
      .post('/data/foo')
      .send('changed')
      .end(function (err) {
        if (err) return done(err)
        request(app).get('/data/foo').expect('changed').end(done)
      })
    })
    
    it('should save json', function (done) {
      request(app)
      .post('/data/json?encoding=json')
      .send({ some : 'json' })
      .end(function (err) {
        if (err) return done(err)
        
        app.db.get('json', { encoding : 'json' }, function (err, value) {
          if (err) return done(err)
          should.exist(value)
          value.should.eql({ some : 'json' })
          done()
        })
      })
    })
  })
  
  describe('DEL /data/:key', function () {
    it('should delete', function (done) {
      request(app)
      .del('/data/foo')
      .expect(200)
      .expect('ok')
      .end(function (err) {
        request(app).get('/foo').expect(404).end(done)
      })
    })
  })
  
  describe('GET /approximateSize/:from..:to', function () {
    it('should get a size', function (done) {
      request(app)
      .get('/approximateSize/a..z')
      .expect(200)
      .expect('0', done)
    })
  })
  
  describe('GET /data', function () {
    it('should get all', function (done) {
      request(app)
        .get('/data')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.body.should.be.an.instanceOf(Array)
          res.body.should.have.length(2)
          done()
        })
    })

    it('should limit', function (done) {
      request(app)
        .get('/data?limit=1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.body.should.be.an.instanceOf(Array)
          res.body.should.have.length(1)
          done()
        })
    })
  })
  
  describe('GET /range/:from..:to', function () {
    it('should get data', function (done) {
      request(app)
        .get('/range/a..z')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.body.should.be.an.instanceOf(Array)
          res.body.should.have.length(2)
          done()
        })
    })
    
    it('should limit', function (done) {
      request(app)
        .get('/range/a..z?limit=1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.body.should.be.an.instanceOf(Array)
          res.body.should.have.length(1)
          done()
        })
    })
  })
  
  describe('GET /values/(:from..:to)', function () {
    it('should get values', function (done) {
      request(app)
        .get('/values')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.body.should.be.an.instanceOf(Array)
          res.body.should.have.length(2)
          done()
        })
    })

    it('should limit', function (done) {
      request(app)
        .get('/values?limit=1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.body.should.be.an.instanceOf(Array)
          res.body.should.have.length(1)
          done()
        })
    })

    it('should get a range', function (done) {
      request(app)
        .get('/values/0..z?limit=1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.body.should.be.an.instanceOf(Array)
          res.body.should.have.length(1)
          done()
        })
    })
  })
  
  describe('/keys/(:from..:to)', function () {
    it('should get keys', function (done) {
      request(app)
        .get('/keys')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.body.should.be.an.instanceOf(Array)
          res.body.should.have.length(2)
          done()
        })
    })
    
    it('should limit', function (done) {
      request(app)
        .get('/keys?limit=1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.body.should.be.an.instanceOf(Array)
          res.body.should.have.length(1)
          done()
        })
    })
    
    it('should get a range', function (done) {
      request(app)
        .get('/keys/0..z?limit=1')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.body.should.be.an.instanceOf(Array)
          res.body.should.have.length(1)
          done()
        })
    })
  })
  
  describe('PUT /data', function () {
    it('should save', function (done) {
      request(app)
      .put('/data')
      .send({ key : 'key', value : 'value'})
      .expect(200)
      .expect('ok')
      .end(function (err) {
        if (err) return done(err)
        request(app).get('/data/key').expect('value').end(done)
      })
    })
  })
  
  describe('POST /data', function () {
    it('should save', function (done) {
      request(app)
      .post('/data')
      .send({ type : 'put', key : 'key', value : 'value' })
      .expect(200)
      .expect('ok')
      .end(function (err) {
        if (err) return done(err)
        setTimeout(function () {
          request(app).get('/data/key').expect('value').end(done)
        }, 10)
      })
    })
  })
})