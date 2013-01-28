var express = require('express')
var JSONStream = require('JSONStream')
var levelup = require('levelup')

/**
 * multilevel-http
 *
 * @param {Object|String} db
 * @param {Object=} meta
 */

module.exports = function (db, meta) {
  if (typeof db == 'string') db = levelup(db)
  
  var app = express()

  app.get('/', function (req, res) {
    res.redirect('meta')
  })

  app.get('/meta', function (req, res) {
    res.json(meta)
  })

  app.get('/data/:key', function (req, res, next) {
    db.get(req.params['key'], req.query, function (err, value) {
      if (err && err.name == 'NotFoundError') res.status(404)
      if (err) return next(err)
      res.send(value)
    })
  })

  app.post('/data/:key', function (req, res, next) {
    var chunks = []
    req.on('data', function (chunk) {
      chunks.push(chunk)
    })
    req.on('end', function () {
      var body = chunks.join('')
      
      // TODO: use streaming parser
      if (req.headers['content-type'].match(/json/)) body = JSON.parse(body)

      db.put(req.params['key'], body, req.query, function (err) {
        if (err) return next(err)
        res.send('ok')
      })
    })
  })

  app.del('/data/:key', function (req, res, next) {
    db.del(req.params['key'], req.query, function (err) {
      if (err) return next(err)
      res.send('ok')
    })
  })

  app.get('/approximateSize/:from..:to', function (req, res, next) {
    db.approximateSize(req.params['from'], req.params['to'], function (err, size) {
      if (err) return next(err)
      res.end(size+'')
    })
  })
  
  app.get('/data', function (req, res) {
    var opts = req.query
    if (req.query['limit']) opts.limit = Number(req.query['limit'])
    if (req.query['reverse']) opts.reverse = true
    
    res.type('json')

    db.readStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get('/range/:from..:to', function (req, res) {
    var opts = req.query

    opts.start = req.params['from']
    opts.end = req.params['to']
    
    if (req.query['limit']) opts.limit = Number(req.query['limit'])
    if (req.query['reverse']) opts.reverse = true
    
    res.type('json')
    db.readStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get('/keys/:from..:to', function (req, res) {
    var opts = req.query

    opts.start = req.params['from']
    opts.end = req.params['to']
    
    if (req.query['limit']) opts.limit = Number(req.query['limit'])
    if (req.query['reverse']) opts.reverse = true
    
    res.type('json')
    db.keyStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get('/keys', function (req, res) {
    var opts = req.query
    
    if (req.query['limit']) opts.limit = Number(req.query['limit'])
    if (req.query['reverse']) opts.reverse = true

    res.type('json')
    db.keyStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })
  
  app.get('/values/:from..:to', function (req, res) {
    var opts = req.query

    opts.start = req.params['from']
    opts.end = req.params['to']
    
    if (req.query['limit']) opts.limit = Number(req.query['limit'])
    if (req.query['reverse']) opts.reverse = true
    
    res.type('json')
    db.valueStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get('/values', function (req, res) {
    var opts = req.query
    
    if (req.query['limit']) opts.limit = Number(req.query['limit'])
    if (req.query['reverse']) opts.reverse = true

    res.type('json')
    db.valueStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.put('/data', function (req, res) {
    var stream = db.writeStream()
    stream.on('close', res.end.bind(res, 'ok'))
    
    req.pipe(JSONStream.parse()).pipe(stream)
  })
  
  app.db = db
  app.meta = meta
  
  return app
}