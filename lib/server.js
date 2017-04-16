var express = require('express')
var JSONStream = require('JSONStream')
var through = require('through')
var levelup = require('levelup')

function getOpts (opts) {
  if (opts.limit) opts.limit = Number(opts.limit)
  return opts
}

module.exports = function (db, meta, app) {
  if (typeof db == 'string') db = levelup(db)
  
  app = app || express()

  meta = meta || {}
  meta.base = meta.base || ''

  app.get(meta.base+'/meta', function (req, res) {
    res.json(meta)
  })

  app.get(meta.base+'/data/:key', function (req, res, next) {
    db.get(req.params['key'], req.query, function (err, value) {
      if (err && err.name == 'NotFoundError') res.status(404)
      if (err) return next(err)
      res.send((typeof value === 'number' ? '' + value : value))
    })
  })

  app.post(meta.base+'/data/:key', function (req, res, next) {
    var chunks = []
    req.on('data', function (chunk) {
      chunks.push(chunk)
    })
    req.on('end', function () {
      var body = chunks.join('')
      if (req.query.encoding == 'json' || req.query.valueEncoding == 'json') {
        body = JSON.parse(body)
      }
      db.put(req.params['key'], body, req.query, function (err) {
        if (err) return next(err)
        res.send('ok')
      })
    })
  })

  app.delete(meta.base+'/data/:key', function (req, res, next) {
    db.del(req.params['key'], req.query, function (err) {
      if (err) return next(err)
      res.send('ok')
    })
  })

  app.get(meta.base+'/approximateSize/:from..:to', function (req, res, next) {
    db.approximateSize(req.params['from'], req.params['to'], function (err, size) {
      if (err) return next(err)
      res.end(size+'')
    })
  })

  app.get(meta.base+'/data', function (req, res) {
    var opts = getOpts(req.query)

    res.type('json')
    db.readStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get(meta.base+'/range/:from..:to', function (req, res) {
    var opts = getOpts(req.query)
    opts.start = req.params['from']
    opts.end = req.params['to']

    res.type('json')
    db.readStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get(meta.base+'/keys/:from..:to', function (req, res) {
    var opts = getOpts(req.query)
    opts.start = req.params['from']
    opts.end = req.params['to']

    res.type('json')
    db.keyStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get(meta.base+'/keys', function (req, res) {
    var opts = getOpts(req.query)

    res.type('json')
    db.keyStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get(meta.base+'/values/:from..:to', function (req, res) {
    var opts = getOpts(req.query)
    opts.start = req.params['from']
    opts.end = req.params['to']

    res.type('json')
    db.valueStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.get(meta.base+'/values', function (req, res) {
    var opts = getOpts(req.query)

    res.type('json')
    db.valueStream(opts)
    .pipe(JSONStream.stringify())
    .pipe(res)
  })

  app.put(meta.base+'/data', function (req, res) {
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
  
  app.post(meta.base+'/data', function (req, res, next) {
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
  
  return { app: app, db: db };
}
