var cookieAuth = require('hapi-auth-cookie')
var marked = require('marked')
var crumb = require('crumb')
var hapi = require('hapi')
var good = require('good')
var bell = require('bell')
var yar = require('yar')
var joi = require('joi')

var handlebars = require('handlebars')
var getSettings = require('./settings.js')
var applyRoutes = require('./routes.js')

var settings
var server

settings = getSettings(process.env.MODE)
server = hapi.createServer('localhost', settings.port, settings.server)

good = {
  plugin: good,
  options: {
    reporters: [
      {reporter: good.GoodConsole}
    ]
  }
}

var context = require('./plugins/context.js')
var models = require('./plugins/models.js')

marked.setOptions({
  sanitize: true,
  smartypants: true,
  breaks: true, 
})

handlebars.registerHelper('markdown', function(text) {
  return marked(text)
})

handlebars.registerHelper('step', function(userIssue) {
  if (!userIssue) {
    return
  }

  return userIssue.stepNumber()
})

models = {
  plugin: models,
  options: settings.server.plugins.models
}

context = {
  plugin: context,
  options: settings.server.plugins.context 
}

yar = {
  plugin: yar,
  options: {
    cookieOptions: {
      password: settings.SECRET_KEY,
      isSecure: false
    }
  }
}

server.pack.register([good, cookieAuth, bell, crumb, models], function() {
  server.auth.strategy('github', 'bell', {
    provider: 'github',
    scope: ['user'],
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
    helpersPath: __dirname + '/helpers',
    engines: {
      hbs: handlebars
    }
  })

  applyRoutes(server, settings.routes)
  console.log('starting server on http://localhost:' + settings.port)
  server.start()
})
