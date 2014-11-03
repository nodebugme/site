module.exports = {register: register}
register.attributes = {
  name: 'database',
  version: '1.0.0'
}

var debug = require('debug')('response')
var debugDB = require('debug')('database')
var pg = require('pg.js')
var WeakMap = typeof WeakMap !== 'undefined' ? WeakMap : require('weakmap')

var getQueryBox = require('../sql.js')

function register(plugin, options, next) {
  var cache = new WeakMap

  plugin.ext('onRequest', onrequest)
  plugin.ext('onPreResponse', onresponse)

  next()

  function onrequest(request, next) {
    pg.connect(options, function(err, client, done) {
      if (err) {
        return next(err)
      }

      cache.set(request, {release: done, client: client})
      request.db = client
      request.querybox = getQueryBox(executeQuery.bind(client))
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

function executeQuery(qobj, ready) {
  debugDB(qobj.name, qobj.values)
  return this.query(qobj.text, qobj.values, function(err, results) {
    debugDB(err, results && results.rows && results.rows.length)
    return ready(err, results)
  })
}
