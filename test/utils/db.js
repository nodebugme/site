'use strict'

module.exports = {
  test: test,
  init: init,
  drop: drop
}

var getSettings = require('../../lib/settings.js')
var migrate = require('../../lib/migrate.js')
var once = require('once')
var pg = require('pg.js')
var WeakMap = typeof WeakMap !== 'undefined' ? WeakMap : require('weakmap')

var connect = pg.connect
var cache = new WeakMap

function init(ready) {
  ready = once(ready)
  var settings = getSettings('test')
  var opts = settings.server.plugins.database
  var clone = {}

  for(var key in opts) {
    clone[key] = opts[key]
  }

  clone.database = 'test_' + clone.database
  pg.connect(opts, function(err, client, done) {
    console.log('creating db')
    done()
    if (err) {
      return ready(err)
    }
    client.query('drop database if exists "' + clone.database + '"', function(err) {
      client.query('create database "' + clone.database + '"', function(err) {
        if (err) {
          return ready(err)
        }

        console.log('connecting')
        pg.connect(clone, onclone)
      })
    })
  })

  function onclone(err, client, done) {
    if (err) {
      return drop(client, onerror.bind(null, err))
    }
    cache.set(client, {done: done, opts: opts})
    migrate(client, function(err) {
      if (err) {
        return drop(client, onerror.bind(null, err))
      }

      pg.connect = function(opts, ready) {
        ready(null, client, Function())
      }

      console.log('ready.')
      ready(null, client)
    })
  }

  function onerror(originalError, err) {
    return ready(err || originalError)
  }
}

function drop(client, ready) {
  var meta = cache.get(client)

  if (!meta) {
    return setImmediate(ready)
  }

  console.log('calling done on original connection')
  meta.done()
  pg.connect = connect
  pg.connect(meta.opts, function(err, client, done) {
    console.log('dropping')
    pg.end()
    client.query('drop database "test_' + meta.opts.database + '"', function(err) {
      if (err) {
        return ready(err)
      }
      console.log('dropped')
      done()
    })
  })
}

function test(baseTest, client) {
  return inner

  function inner(name, fn) {
    client.inTransaction = true
    baseTest('BEGIN ' + name, function(t) {
      client.query('BEGIN', function(err) {
        if (err) throw err
        t.end()
      })
    })

    baseTest(name, function(t) {
      fn(t, client)
    })

    baseTest('END ' + name, function(t) {
      client.query('ROLLBACK', function(err) {
        if (err) throw err
        t.end()
      })
    })
  }
}
