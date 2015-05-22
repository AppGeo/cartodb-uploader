'use strict';
var https = require('https');
var stream = require('io-stream');
var url = require('url');
var qs = require('querystring');
var debug = require('debug')('cartodb-uploader');
var FormData = require('form-data');
var geojsonStream = require('geojson-stream');
var once = require('once');
module.exports = exports = cartodbUploader;
function getUploadState(credentials, destination, callback) {
  var rawUrl = 'https://' + credentials.user + '.cartodb.com/api/v1/imports/' + destination + '?' + qs.stringify({
      api_key: credentials.key
  });
  https.get(rawUrl, function (res) {
    var data = [];
    debug(res.statusCode);
    res.on('error', callback)
      .on('data', function (d){
        debug(d.toString());
        data.push(d);
      })
      .on('end', function (){
        var out = Buffer.concat(data).toString();
        if (res.statusCode > 299) {
          callback(out);
        } else {
          try {
            out = JSON.parse(out);
          } catch(e) {
            return callback(e);
          }
          if (out.state === 'complete') {
            callback(null, out);
          } else if (out.state === 'failure') {
            callback(out);
          } else {
            setTimeout(getUploadState, 100, credentials, destination, callback);
          }
        }
      });
  });
}
function noop(){}
function cartodbUploader(credentials, fileName, callback) {
  callback = once(callback || noop);
  var passthrough = new stream.PassThrough();
  passthrough.on('error', callback);
  var form = new FormData();
  form.append('file', passthrough, {
    filename: fileName,
    contentType: 'application/octet-stream'
  });
  form.on('error', callback);
  var fullUrl = 'https://' + credentials.user + '.cartodb.com/api/v1/imports?';
  //var fullUrl = 'http://cartodb.calvin:8080/';
  fullUrl += qs.stringify({
      api_key: credentials.key
  });
  var parsedUrl = url.parse(fullUrl);
  parsedUrl.method = 'POST';
  parsedUrl.headers = form.getHeaders();
  debug(parsedUrl);
  var req = https.request(parsedUrl, function (res) {
    var data = [];
    debug(res.statusCode);
    res
      .on('error', callback)
      .on('data', function (d){
        debug(d.toString());
        data.push(d);
      })
      .on('end', function (){
        var out = Buffer.concat(data).toString();
        if (res.statusCode > 299) {
          callback(out);
        } else {
          try {
            out = JSON.parse(out);
          } catch(e) {
            return callback(e);
          }
          if (!out.success) {
            return callback(new Error('failure'));
          }
          getUploadState(credentials, out.item_queue_id, callback);
        }
      });
  }).on('error', callback);
  form.pipe(req);
  return passthrough;
}
exports.geojson = uploadGeoJson;
function uploadGeoJson(credentials, destination, callback) {
  callback = once(callback);
  var inStream = geojsonStream.stringify();
  inStream.on('error', callback);
  inStream.pipe(cartodbUploader(credentials, destination + '.geojson', callback));
  return inStream;
}
