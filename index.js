'use strict';
var https = require('https');
var http = require('http');
var stream = require('readable-stream');
var url = require('url');
var qs = require('querystring');
var debug = require('debug')('cartodb-uploader');
var FormData = require('form-data');
var geojsonStream = require('geojson-stream');
var once = require('once');
var zlib = require('zlib');
module.exports = exports = cartodbUploader;
function getUploadState(credentials, destination, callback) {
  var rawUrl = createUrlBase(credentials) + '/api/v1/imports/' + destination + '?' + qs.stringify({
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
          debug(res.headers);
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
  debug('starting upload');
  var compress = false;
  // if (['zip', '.gz', 'bz2', 'tgz', 'kmz', 'lsx', 'ods'].indexOf(fileName.slice(-3)) === -1) {
  //   fileName = fileName += '.gz';
  //   compress = true;
  // }
  callback = once(callback || noop);
  var passthrough = compress ? zlib.createGzip() : new stream.PassThrough();
  passthrough.on('error', callback);
  var form = new FormData();
  form.append('file', passthrough, {
    filename: fileName,
    contentType: 'application/octet-stream'
  });
  form.on('error', callback);
  var fullUrl = createUrlBase(credentials) + '/api/v1/imports?';
  //var fullUrl = 'http://cartodb.calvin:8080/';
  fullUrl += qs.stringify({
      api_key: credentials.key
  });


    var datas = [];
    var len = 0;
    form.pipe(new stream.Transform({
      transform: function (chunk, _, next){
        datas.push(chunk);
        len += chunk.length;
        next();
      },
      flush: function (done) {
        var parsedUrl = url.parse(fullUrl);
        parsedUrl.method = 'POST';
        parsedUrl.headers = form.getHeaders({
          'content-length': len
        });
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
              var out = Buffer.concat(data).toString().trim();
              if (res.statusCode > 299) {
                debug(res.headers);
                callback(out || new Error(http.STATUS_CODES[res.statusCode]));
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
        datas.forEach(function (item) {
          req.write(item);
        });
        req.end();
      }
    }));
  return passthrough;
}
exports.geojson = uploadGeoJson;
function uploadGeoJson(credentials, destination, callback) {
  debug('starting geojson');
  callback = once(callback);
  var inStream = geojsonStream.stringify();
  inStream.on('error', callback)
    .pipe(cartodbUploader(credentials, destination + '.geojson', callback));
  return inStream;
}
function createUrlBase(credentials) {
  if (!credentials.domain && !credentials.subdomainless) {
    return `https://${credentials.user}.carto.com`;
  }
  if (credentials.domain) {
    if (credentials.subdomainless) {
      return `https://${credentials.domain}/user/${credentials.user}`;
    } else {
      return `https://${credentials.user}.${credentials.domain}`;
    }
  } else if (credentials.subdomainless) {
    return `https://carto.com/user/${credentials.user}`;
  }
}
