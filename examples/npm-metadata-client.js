// NOTE: you should first run the metadata server
var http = require('http')
var after = require('after')
var request = require('request')
var multilevel = require('../')
var port = process.env.PORT || 5000

// client setup
// you need to specify the encoding also for the multilevel-http client
var client = multilevel.client('http://localhost:' + port + '/', {
  valueEncoding: 'json'
})

// sample app
var http = require('http')
var after = require('after')
var REGISTRY_URL = 'http://registry.npmjs.eu/'
var replicateMetaForPackage = function (name, cb) {
  request(REGISTRY_URL + name, function (err, res, body) {
    if (err) {
      return cb(err)
    } else if (res.statusCode !== 200) {
      return cb(new Error('Bad response status code: ', res.statusCode))
    } else {
      client.put(name, JSON.parse(body), cb)
    }
  })
}
var packages = ['connect', 'express', 'async', 'lodash', 'qs']
var next = after(packages.length, function (err) {
  if (err) throw err

  bootServer(process.env.APP_PORT || 7777)
})
packages.forEach(function (pkg) {
  replicateMetaForPackage(pkg, next)
})
var bootServer = function (port) {
  http.createServer(function (req, res) {
    var pkg = req.url.replace('/', '')

    if (!pkg) {
      var content = '<p>Try visiting one of the following pages: </p>'
      content += '<ul>'
      packages.forEach(function (name) {
        content += '<li><a href="/' + name + '">' + name + '</a></li>'
      })
      content += '</ul>'
      res.writeHead(200, {'Content-Type': 'text/html'})
      res.end(content)
    } else if (packages.indexOf(pkg) !== -1) {
      // specifically calling for 'binary' encoding since we don't need to
      // parse and then encode JSON (we just send it directly to the client)
      client.get(pkg, {valueEncoding:'binary'}, function(err, val) {
        if (err) {
          console.log(err.stack)
          return res.end(err.message)
        }

        res.writeHead(200, {'Content-Type': 'application/json'})
        res.end(val)
      })
    } else {
      res.writeHead(404, {'Content-Type': 'application/json'})
      res.end({ error: 'not_found' })
    }
  }).listen(port)

  console.log('app listening on port %s', port)
}
