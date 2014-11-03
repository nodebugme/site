module.exports = load

var path = require('path')
var fs = require('fs')

var header = fs.readFileSync(path.join(
  __dirname, '..', '..', 'templates', 'partial-header.hbs'
), 'utf8')

var footer = fs.readFileSync(path.join(
  __dirname, '..', '..', 'templates', 'partial-footer.hbs'
), 'utf8')

function load(handlebars, settings) {
  var headerTemplate = handlebars.compile(header)
  var footerTemplate = handlebars.compile(footer)

  handlebars.registerPartial('header', headerTemplate)
  handlebars.registerPartial('footer', footerTemplate)
}
