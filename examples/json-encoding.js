// server setup
// NOTE: to run this example you must: `npm install rimraf`
var level = require('level')
var request = require('request')
var LEVEL_PATH = '/tmp/multilevel-http'
// cleanup
require('rimraf').sync(LEVEL_PATH)
// levelDb instance
var db = level(LEVEL_PATH, {
  valueEncoding: 'json'
})
var multilevel = require('../')
var server = multilevel.server(db)
var port = process.env.PORT || 5000;
server.listen(port)
console.log('multilevel-http server started on port %s\n', port)

// client setup
// you need to specify the encoding also for the multilevel-http client
var client = multilevel.client('http://localhost:' + port + '/', {
  valueEncoding: 'json'
})

// sample app
var REGISTRY_URL = 'http://registry.npmjs.org/-/all/since?stale=update_after&startkey=';
REGISTRY_URL += Date.now() - 60000 * 15;

console.log('NPM modules updated in the last 15 mins:\n')
request(REGISTRY_URL, function (err, res, body) {
  if (err) throw err

  body = JSON.parse(body)
  delete body._updated

  var ops = []
  Object.keys(body).forEach(function (pkg) {
    ops.push({
      type: 'put',
      key: pkg,
      value: body[pkg]
    })
  })

  client.batch(ops, function (err) {
    if (err) throw err

    client.createReadStream().on('data', function (data) {
      console.log(data.key + '@' + data.value['dist-tags'].latest + ' by ' + data.value.author.name)
    }).on('end', function() {
      process.exit()
    })
  })
})
