#!/usr/bin/env node
'use strict';
require('colors');
var fs = require('fs');
var path = require('path');
var uploader = require('./');
var argv = require('yargs')
     .usage('$0 [-f path/to/file.ext] [-n filename.ext] [-a apikey] [-u username] [path/to/file.ext]')
    .alias('f', 'file')
    .describe('f', 'specify file to upload, -f flag is optional'.yellow)
    .alias('n', 'name')
    .describe('n', 'upload from stdin as file'.yellow)
    .alias('u', 'user')
    .describe('u', 'specify cartodb username'.yellow)
    .default('u', null, '$CARTODB_USER_NAME')
    .alias('a', 'apikey')
    .describe('a', 'specify cartodb apikey'.yellow)
    .default('a', null, '$CARTODB_API_KEY')
    .alias('s', 'subdomainless')
    .boolean('s')
    .default('s', undefined)
    .describe('s', 'whether to use subdomainless url mode'.yellow)
    .alias('D', 'domain')
    .describe('D', 'whether to use the non default domain'.yellow)
    .example('$0 -f foo.geojson', 'uploads the file foo.geojson'.green)
    .example('$0 -n foo.geojson', 'sets name of the file, if -f is not specified uses stdin '.green)
    .help('h', 'Show Help'.yellow)
   .alias('h', 'help')
    .argv;
var key = argv.apikey;
if (key === null) {
  key = process.env.CARTODB_API_KEY;
}
var user = argv.user;
if (user === null) {
  user = process.env.CARTODB_USER_NAME;
}
var exit = 0;
if (!key) {
  process.stdout.write('api key is required, please pass the -a option or set CARTODB_API_KEY'.red);
  process.stdout.write('\n');
  exit += 1;
}

if (!user) {
  process.stdout.write('username is required, please pass the -u option or set CARTODB_USER_NAME'.red);
  process.stdout.write('\n');
  exit += 2;
}

if (!argv.f && !argv.n && !argv._[0]) {
  process.stdout.write('name or file is required'.red);
  process.stdout.write('\n');
  exit += 4;
}

if (exit) {
  process.exit(exit);
}

var instream, name;

if (argv.f || argv._[0]) {
  instream = fs.createReadStream(argv.f || argv._[0]);
  name = path.basename(argv.f);
}

if (argv.n) {
  name = argv.n;
  if (!instream) {
    instream = process.stdin;
  }
}

instream.pipe(uploader({
  user: user,
  key: key,
  subdomainless: argv.s,
  domain: argv.D
}, name, function (err, resp) {
  if (err) {
    process.stdout.write(JSON.stringify(err, false, 2));
    process.stdout.write('\n');
    process.exit(8);
  }
  Object.keys(resp).forEach(function (key) {
    process.stdout.write(key);
    process.stdout.write(': ');
    process.stdout.write(String(resp[key]));
    process.stdout.write('\n');
  });
  process.exit(0);
}));
