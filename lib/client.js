var request = require('./request')()
var JSONStream = require('JSONStream')
var through = require('through')
var duplex = require('duplexer')
var xtend = require('xtend')
var noop = function(){}

module.exports = db

function db (addr, opts) {
  if (!(this instanceof db)) return new db(addr, opts)
  if (!addr.match(/http/)) addr = 'http://' + addr
  if (addr[addr.length - 1] != '/') addr += '/'

  opts = opts || {}
  this.encoding = opts.encoding || opts.valueEncoding || 'utf8'

  this.addr = addr
}

function getCallback (opts, cb) {
  if (cb) return cb
  if (typeof opts == 'function') return opts
  return noop;
}

db.prototype._getOpts = function (opts, cb) {
  var _opts = typeof opts != 'function'
    ? opts
    : {}

  // make sure we don't have different values for encoding and valueEncoding
  if (_opts && _opts.encoding) {
    _opts.valueEncoding = _opts.valueEncoding || _opts.encoding
    delete _opts.encoding
  }

  return xtend({ valueEncoding: this.encoding }, _opts)
}

db.prototype.put = function (key, value, opts, cb) {
  cb = getCallback(opts, cb)
  opts = this._getOpts(opts)
  if (opts.encoding == 'json' || opts.valueEncoding == 'json') {
    value = JSON.stringify(value)
  }
  request.post({
    uri : this.addr + 'data/' + key,
    qs : opts,
    body : value
  }, function (err, res) {
    cb(err)
  })
}

db.prototype.get = function (key, opts, cb) {
  cb = getCallback(opts, cb)
  opts = this._getOpts(opts)
  var isJSON = opts.encoding == 'json' || opts.valueEncoding == 'json'
  var isBinary = opts.encoding == 'binary' || opts.valueEncoding == 'binary'
  delete opts.encoding

  request.get({
    uri: this.addr + 'data/' + key
  }, function (err, res, body) {
    if (err) return cb(err)
    if (isJSON) body = JSON.parse(body)
    if (isBinary) body = new Buffer(body)
    cb(null, body)
  })
}

db.prototype.del = function (key, opts, cb) {
  cb = getCallback(opts, cb)
  opts = this._getOpts(opts)
  
  request.del({
    uri: this.addr + 'data/' + key
  }, function (err, res, body) {
    cb(err, body)
  })
}

db.prototype.batch = function (ops, opts, cb) {
  cb = getCallback(opts, cb)
  opts = this._getOpts(opts)

  request.post({
    uri : this.addr + 'data',
    json : ops,
    qs : opts
  }, cb)
}

db.prototype.approximateSize = function (from, to, cb) {
  request.get({
    uri: this.addr + 'approximateSize/' + from + '..' + to
  }, function (err, res, body) {
    if (err) return cb(err)
    if (cb) cb(null, Number(body))
  })
}

db.prototype.readStream =
db.prototype.createReadStream = function (opts) {
  opts = this._getOpts(opts)

  if (opts.encoding == 'binary' || opts.valueEncoding == 'binary') {
    delete opts.encoding
  }

  var masterStream = through(function (arr) {
    // turn it into an object emitting stream
    arr.forEach(this.emit.bind(this, 'data'))
  })

  return request.stream({
    uri : this.addr + 'data',
    qs : opts || {}
  })
  // bubble up the error onto the master stream
  .on('error', masterStream.emit.bind(masterStream, 'error'))
  .pipe(JSONStream.parse())
  .on('error', masterStream.emit.bind(masterStream, 'error'))
  .pipe(masterStream)
}

db.prototype.writeStream =
db.prototype.createWriteStream = function (opts) {
  opts = this._getOpts(opts)

  function end() {
    if (endCalled && !pending) {
      stream.emit('end')
    }
  }

  var pending = 0
  function next(err) {
    if (err) { return stream.emit('error', err) }
    pending--
    end()
  }

  var that = this
  var endCalled = false
  var stream = through(function(data) {
    pending++

    if (data.type === 'del') {
      that.del(data.key, opts, next)
    } else {
      that.put(data.key, data.value, opts, next)
    }
  }, function() {
    endCalled = true
    end()
  });

  return stream
}

db.prototype.keyStream =
db.prototype.createKeyStream = function (opts) {
  opts = this._getOpts(opts)

  opts.keys = true
  opts.values = false
  return this.readStream(opts)
}

db.prototype.valueStream =
db.prototype.createValueStream = function (opts) {
  opts = this._getOpts(opts)
  opts.keys = false
  opts.values = true
  return this.readStream(opts)
}
