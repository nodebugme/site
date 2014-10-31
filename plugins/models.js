module.exports = {register: register}
register.attributes = {
  name: 'models',
  version: '1.0.0'
}

var debug = require('debug')('response')
var pg = require('pg.js')
var WeakMap = typeof WeakMap !== 'undefined' ? WeakMap : require('weakmap')

var getRepo = require('../models/repo.js')
var getUser = require('../models/user.js')
var getIssue = require('../models/issue.js')
var getUserIssue = require('../models/user-issue.js')

function register(plugin, options, next) {
  var cache = new WeakMap

  plugin.ext('onRequest', onrequest)
  plugin.ext('onPreResponse', onresponse)

  next()

  function onrequest(request, next) {
    pg.connect(options.database, function(err, client, done) {
      if (err) {
        return next(err)
      }

      var models = {}
      models.User = getUser(client, models)
      models.Issue = getIssue(client, models)
      models.UserIssue = getUserIssue(client, models)
      models.Repo = getRepo(client, models)
      cache.set(request, {release: done, client: client})
      request.models = models
      client.query('BEGIN', function(err) {
        if (err) {
          return next(err)
        }
        next()
      })
    })
  }

  function onresponse(request, next) {
    debug(request.response)
    var dbinfo = cache.get(request)
    if (!dbinfo) {
      return next()
    }

    cache.delete(request)
    var isError = request.response instanceof Error ||
      request.response.isBoom

    if (isError) console.log(request.response)

    dbinfo.client.query(isError ? 'ROLLBACK' : 'COMMIT', function(err) {
      dbinfo.release(request.response.isBoom)
      next(err)
    })
  }
}
