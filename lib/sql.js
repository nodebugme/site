var querybox = require('querybox')
var path = require('path')
module.exports = getQuerybox

var baseBox = querybox(path.resolve(path.join(__dirname, '..', 'sql')), Function())

function getQuerybox(queryFn) {
  var box = Object.create(baseBox)
  box.queryFn = queryFn
  return box
}
