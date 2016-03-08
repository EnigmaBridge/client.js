// http://expressjs.com/en/starter/static-files.html
// https://www.npmjs.com/package/cors
// http://jonathanmh.com/how-to-enable-cors-in-express-js-node-js/
var express = require('express')
    , cors = require('cors')
    , app = express();

app.use(cors());
app.use(express.static('public'));

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
