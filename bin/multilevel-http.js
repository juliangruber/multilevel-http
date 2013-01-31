#!/usr/bin/env node

var multilevel = require('..')
var optimist = require('optimist')
var express = require('express')

var argv = optimist
  .usage('$0 [OPTIONS] path-to-db')

  .describe('port', 'The port to listen on')
  .default('port', 3000)
  .alias('port', 'p')
  
  .describe('help', 'Print usage instructions')
  .alias('h', 'help')
  
  .argv
  
  
if (argv.help || argv._.length != 1) return optimist.showHelp()

multilevel.server(argv._[0]).listen(argv.port, function () {
  console.log('multilevel-http listening on port ' + argv.port)
})