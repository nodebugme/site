module.exports = staticMediaURL

// hurk, hurk, hurk
// is there a better way to get at the settings
// object from a helper?
var getSettings = require('../settings.js')
settings = getSettings(process.env.MODE)

function staticMediaURL(context) {
  return settings.staticURL
}
