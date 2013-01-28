var should = require('should')
var request = require('supertest')
var levelup = require('levelup')
var fs = require('fs.extra')

var app

beforeEach(function (done) {
  if (app && app.db) app.db.close()
  fs.rmrf(__dirname + '/test.db', function () {
    done()
  })
})

beforeEach(function () {
  app = require('..')(__dirname + '/test.db', { some : 'meta' })
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
    it('should get a values', function (done) {
      request(app)
      .get('/data/foo')
      .expect('bar')
      .end(done)
    })
    
    it('should respond with 404', function (done) {
      request(app)
      .get('/data/baz')
      .expect(404)
      .expect(/not found/)
      .end(done)
    })
  })
  
  describe('POST /data/:key', function () {
    it('should save', function (done) {
      request(app)
      .post('/data/foo')
      .send('changed')
      .type('text/plain')
      .end(function (err) {
        if (err) return done(err)
        request(app).get('/data/foo').expect('changed').end(done)
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
      .expect('0')
      .end(done)
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
})