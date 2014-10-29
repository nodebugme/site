module.exports = getAnalytics

var getSettings = require('../settings.js')
settings = getSettings(process.env.MODE)

function getAnalytics(context) {
  return settings.googleAnalytics
}

