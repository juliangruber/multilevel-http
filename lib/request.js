var request = require('request')
var through = require('through')

module.exports = Request

function Request (opts) {
  if (!(this instanceof Request)) return new Request(opts)
}

Request.prototype._buildError = function (statusCode, uri, body) {
  var err

  body = body ? ('\n' + body) : ''
  err = new Error('Bad status code: ' + statusCode + body)
  err.code = statusCode
  if (statusCode === 404) {
    // like in levelup
    err.notFound = true
    err.type = 'NotFoundError'
  }
  if (uri) err.uri = uri

  return err
}

Request.prototype._isValidResponse = function (statusCode) {
  return statusCode === 200
}

Request.prototype._handleResponse = function (cb, uri) {
  return function (err, res, body) {
    if (err) return cb(err)

    if (!this._isValidResponse(res.statusCode)) {
      err = this._buildError(res.statusCode, uri, body);
    }

    cb(err, res, body)
  }.bind(this)
};

['get', 'del', 'put', 'post'].forEach(function (method) {
  Request.prototype[method] = function (opts, cb) {
    request[method](opts, this._handleResponse(cb, opts.uri))
  }
})

Request.prototype.stream = function (opts) {
  var stream = through(function (data) {
    this.emit('data', data)
  }, function () {
    this.emit('end')
    this.emit('close')
  })
  var req = request(opts)

  // bubble the error up to the 'master' stream
  req.on('error', stream.emit.bind(stream, 'error'))

  req.on('response', function(res) {
    if (!this._isValidResponse(res.statusCode)) {
      stream.emit('error', this._buildError(res.statusCode, opts.uri))
      // kill it early since we don't need the rest
      req.abort()
    } else {
      req.pipe(stream)
    }
  }.bind(this))

  return stream
}
