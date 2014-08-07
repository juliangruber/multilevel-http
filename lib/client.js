var request = require('request')
var JSONStream = require('JSONStream')
var through = require('through')
var duplex = require('duplexer')

module.exports = db

function db (addr) {
  if (!(this instanceof db)) return new db(addr)
  if (!addr.match(/http/)) addr = 'http://' + addr
  if (addr[addr.length - 1] != '/') addr += '/'
  
  this.addr = addr
}

function getOpts (opts, cb) {
  return typeof opts != 'function'
    ? opts
    : {}
}

function getCallback (opts, cb) {
  if (cb) return cb
  if (typeof opts == 'function') return opts
  return function () { /* noop */ }
}

db.prototype.put = function (key, value, opts, cb) {
  cb = getCallback(opts, cb)
  opts = getOpts(opts)
  if (opts.encoding == 'json' || opts.valueEncoding == 'json') {
    value = JSON.stringify(value)
    delete opts.encoding
    delete opts.valueEncoding
  }
  request.post({
    uri : this.addr + 'data/' + key,
    qs : opts,
    body : value
  }, function (err, res) {
    if (res.statusCode != 200) return cb(res.statusCode,res)
    cb(err, res)
  })
}

db.prototype.get = function (key, opts, cb) {
  cb = getCallback(opts, cb)
  opts = getOpts(opts)
  var isJSON = opts.encoding == 'json' || opts.valueEncoding == 'json'
  var isBinary = opts.encoding == 'binary' || opts.valueEncoding == 'binary'
  delete opts.encoding
  
  request(this.addr + 'data/' + key, function (err, res, body) {
    if (err) return cb(err,null,res)
    if (res.statusCode != 200) return cb(body,null,res)
    if (isJSON) body = JSON.parse(body)
    if (isBinary) body = new Buffer(body)
    cb(null, body, res)
  })
}

db.prototype.del = function (key, opts, cb) {
  cb = getCallback(opts, cb)
  opts = getOpts(opts)
  
  request.del(this.addr + 'data/' + key, function (err, res, body) {
    if (res.statusCode != 200) return cb(res.statusCode,null,res)
    cb(err, body, res)
  })
}

db.prototype.batch = function (ops, opts, cb) {
  cb = getCallback(opts, cb)
  opts = getOpts(opts)
  
  request.post({
    uri : this.addr + 'data',
    json : ops
  }, cb)
}

db.prototype.approximateSize = function (from, to, cb) {
  request(this.addr + 'approximateSize/' + from + '..' + to, function (err, res, body) {
    if (err) return cb(err)
    if (res.statusCode != 200) return cb(body)
    if (cb) cb(null, Number(body))
  })
}

db.prototype.readStream = function (opts) {
  return request({
    uri : this.addr + 'data',
    qs : opts || {}
  })
  .pipe(JSONStream.parse())
  .pipe(through(function (arr) {
    // turn it into an object emitting stream
    arr.forEach(this.emit.bind(this, 'data'))
  }))
}

db.prototype.writeStream = function (opts) {
  var parser = JSONStream.stringify()
  var req = request.put({
    uri : this.addr + 'data',
    qs : opts || {}
  })
  parser.pipe(req)
  return duplex(parser, req)
}

db.prototype.keyStream = function (opts) {
  if (!opts) opts = {}
  opts.keys = true
  opts.values = false
  return this.readStream(opts)
}

db.prototype.valueStream = function (opts) {
  if (!opts) opts = {}
  opts.keys = false
  opts.values = true
  return this.readStream(opts)
}
