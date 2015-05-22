cartodb-uploader
===

streaming upload to cartodb, arguemnts are

- credentials object with user and api members
- filename, in the format of `desired_table_name.fileExt`
- callback (optional) to be called when the table ends up being created

returns a writable stream that accepts the file, acceptable file extensions are
(accourding to cartodb)[http://docs.cartodb.com/cartodb-editor.html#supported-file-formats]

- csv
- tab
- shp
- kml
- kmz
- xls
- xlsx
- geojson
- gpx
- osm
- bz2
- ods

also has a geojson method which just takes a destination table instead of a filename and is a writable
object stream taking geojson features

```js
var cartodbUploader = require('cartodb-uploader');

var featureStream = getFeatureStreamSomehow();
featureStream.pipe(cartodbUploader.geojson({
  user: 'username',
  key: 'apikey'
}, 'destination_table_name', function (err, resp) {
  // optional callback when done
}));

var binaryCSVstream = fs.createReadStream('./something.csv')

featureStream.pipe(cartodbUploader({
  user: 'username',
  key: 'apikey'
}, 'something.csv', function (err, resp) {
  // optional callback when done
}));
```
