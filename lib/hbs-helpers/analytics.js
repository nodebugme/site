module.exports = load

function load(handlebars, settings) {
  handlebars.registerHelper('analytics', function() {
    return settings.googleAnalytics
  })
}
