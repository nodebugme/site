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

  plugin.ext('onPreHandler', onrequest)
  plugin.ext('onPreResponse', onresponse)

  next()

  function onrequest(request, next) {
    var needsTransaction = request.route.handler && request.route.handler.needsTransaction

    pg.connect(options, function(err, client, done) {
      if (err) {
        return next(err)
      }

      cache.set(request, {release: done, client: client})
      request.db = client
      request.querybox = getQueryBox(
        options.analyze ?
          executeAnalyze.bind(client) :
          executeQuery.bind(client)
      )

      if (needsTransaction) return client.query('BEGIN', function(err) {
        debugDB('start transaction')
        if (err) {
          return next(err)
        }
        next()
      })

      next()
    })
  }

  function onresponse(request, next) {
    var needsTransaction = request.route.handler && request.route.handler.needsTransaction
    debug(request.response)
    var dbinfo = cache.get(request)
    if (!dbinfo) {
      return next()
    }

    cache.delete(request)
    var isError = request.response instanceof Error ||
      request.response.isBoom

    if (isError) console.log(request.response)

    if (needsTransaction) return dbinfo.client.query(isError ? 'ROLLBACK' : 'COMMIT', function(err) {
      debugDB('end transaction', err)
      dbinfo.release(request.response.isBoom)
      next(err)
    })

    dbinfo.release(request.response.isBoom)
    next()
  }
}

function executeQuery(qobj, ready) {
  debugDB(qobj.name, qobj.values)
  return this.query(qobj.text, qobj.values, function(err, results) {
    debugDB(err, results && results.rows && results.rows.length)
    return ready(err, results)
  })
}

function executeAnalyze(qobj, ready) {
  var self = this

  this.query('EXPLAIN ' + qobj.text, qobj.values, function(err, results) {
    if (err) {
      return ready(err)
    }

    debugDB(qobj.name, results)
    executeQuery.call(self, qobj, ready)
  })
}
