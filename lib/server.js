var express = require('express')
var JSONStream = require('JSONStream')
var through = require('through')
var levelup = require('level')
var mps = require('msgpack-stream')

function getOpts (opts) {
  if (opts.limit) opts.limit = Number(opts.limit)
  return opts
}

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
      if (req.query.encoding == 'binary' || req.query.valueEncoding == 'binary') {
        var body = Buffer.concat(chunks);
      } else {
        var body = chunks.join('')

        if (req.query.encoding == 'json' || req.query.valueEncoding == 'json') {
          body = JSON.parse(body)
        }
      }
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
    var opts = getOpts(req.query)
    var stream

    if (opts.encoding == 'binary' || opts.valueEncoding == 'binary') {
      stream = mps.createEncodeStream()
      res.setHeader('Content-Type', 'application/octet-stream')
    } else {
      res.type('json')
      stream = JSONStream.stringify()
    }

    db.readStream(opts)
    .pipe(stream)
    .pipe(res)
  })

  app.get('/range/:from..:to', function (req, res) {
    var opts = getOpts(req.query)
    opts.start = req.params['from']
    opts.end = req.params['to']

    res.type('json')
    db.readStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get('/keys/:from..:to', function (req, res) {
    var opts = getOpts(req.query)
    opts.start = req.params['from']
    opts.end = req.params['to']

    res.type('json')
    db.keyStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get('/keys', function (req, res) {
    var opts = getOpts(req.query)

    res.type('json')
    db.keyStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get('/values/:from..:to', function (req, res) {
    var opts = getOpts(req.query)
    opts.start = req.params['from']
    opts.end = req.params['to']

    res.type('json')
    db.valueStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get('/values', function (req, res) {
    var opts = getOpts(req.query)

    res.type('json')
    db.valueStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.put('/data', function (req, res) {
    var ws = db.writeStream(req.query)
    ws.on('close', res.end.bind(res, 'ok'))

    req
    .pipe(JSONStream.parse())
    .pipe(through(function (data) {
      Array.isArray(data)
        ? data.forEach(this.emit.bind(this, 'data'))
        : this.emit('data', data)
    }))
    .pipe(ws)
  })
  
  app.post('/data', function (req, res, next) {
    var ops = []

    req
    .pipe(JSONStream.parse())
    .pipe(through(function (data) {
      Array.isArray(data)
        ? data.forEach(function (d) { ops.push(d) })
        : ops.push(data)
    }))
    .on('end', function () {
      db.batch(ops, req.query, function (err) {
        if (err) return next(err)
        res.send('ok')
      })
    })
  })
  
  app.db = db
  app.meta = meta

  return app
}
