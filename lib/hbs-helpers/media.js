module.exports = load

function load(handlebars, settings) {
  handlebars.registerHelper('staticMediaURL', function() {
    return settings.staticURL
  })
}
