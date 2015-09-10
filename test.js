'use strict';
var uploader = require('./');
var jsonstream = require('jsonstream3');
var fs = require('fs');
var auth = require('./auth.json');
var test = require('tape');

test('binary', function (t) {
  t.plan(2);
  fs.createReadStream('./test.geojson')
    //.pipe(jsonstream.parse('features.*'))
    .pipe(uploader(auth, 'uploder_test_binary.geojson', function (a, b) {
      t.error(a);
      t.ok(b.success);
  }));
});

test('geojson', function (t) {
  t.plan(2);
  fs.createReadStream('./test.geojson')
    .pipe(jsonstream.parse('features.*'))
    .pipe(uploader.geojson(auth, 'uploder_test_geojson', function (a, b) {
      t.error(a);
      t.ok(b.success);
  }));
});
