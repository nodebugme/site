try {
  require('newrelic')
} catch(err) {
}

var cookieAuth = require('hapi-auth-cookie')
var crumb = require('crumb')
var hapi = require('hapi')
var good = require('good')
var bell = require('bell')
var joi = require('joi')

var handlebars = require('handlebars')
var getSettings = require('./lib/settings.js')
var applyRoutes = require('./lib/routes.js')

if (module === require.main) {
  getServer(null, function(err, server) {
    if (err) throw err
    server.start(function(err) {
      console.log('server listening on ' + server.info.uri)
    })
  })
}

module.exports = getServer

function getServer(settings, ready) {
  var server

  settings = settings || getSettings(process.env.MODE)
  server = hapi.createServer('localhost', settings.port, settings.server)

  require('./lib/hbs-helpers/user-issue.js')(handlebars, settings)
  require('./lib/hbs-helpers/analytics.js')(handlebars, settings)
  require('./lib/hbs-helpers/markdown.js')(handlebars, settings)
  require('./lib/hbs-helpers/partials.js')(handlebars, settings)
  require('./lib/hbs-helpers/media.js')(handlebars, settings)
  require('./lib/hbs-helpers/date.js')(handlebars, settings)

  var database = require('./lib/plugins/database.js')

  var goodPlugin = {
    plugin: good,
    options: {
      reporters: [
        {reporter: good.GoodConsole}
      ]
    }
  }

  var cookieAuthPlugin = {
    plugin: cookieAuth,
    options: {}
  }

  var databasePlugin = {
    plugin: database,
    options: settings.server.plugins.database
  }

  var bellPlugin = {
    plugin: bell,
    options: {}
  }

  var crumbPlugin = {
    plugin: crumb,
    options: {}
  }

  var plugins = [
    goodPlugin,
    cookieAuthPlugin,
    bellPlugin,
    crumbPlugin,
    databasePlugin
  ]

  plugins = plugins.filter(function(xs) {
    var name =
      xs.plugin.register.attributes.name ||
      xs.plugin.register.attributes.pkg.name
    return !(name in (settings.disablePlugins || {}))
  })

  server.pack.register(plugins, function(err) {
    if (err) {
      return ready(err)
    }

    server.auth.strategy('github', 'bell', {
      provider: 'github',
      scope: [],
      password: settings.SECRET_KEY,
      clientId: settings.githubClientID,
      clientSecret: settings.githubClientSecret,
      isSecure: settings.githubIsSecure || false
    })

    server.auth.strategy('session', 'cookie', {
      password: settings.SECRET_KEY,
      redirectTo: '/',
      isSecure: process.env.MODE === 'production'
    })

    server.views({
      path: __dirname + '/templates',
      engines: {
        hbs: handlebars
      }
    })

    applyRoutes(server, settings.routes)
    ready(null, server)
  })
}

