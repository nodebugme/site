'use strict'

var sync = require('./lib/sync-issues.js')
var getQuerybox = require('./lib/sql.js')
var Github = require('github')
var once = require('once')
var pg = require('pg.js')

module.exports = syncAll

if (module.id === '.') {
  syncAll(process.argv[2] === '--all', function() {})
}

function syncAll(all, ready) {
  if (arguments.length === 1) {
    ready = all
    all = false
  }

  var config = require('./config.json')
  ready = once(ready)

  var github = new Github({
      version: '3.0.0'
    , protocol: 'https'
  })

  github.authenticate({
      type: 'oauth'
    , token: config.githubSyncToken
  })

  pg.connect(config.server.plugins.database, function(err, client, done) {
    if (err) {
      return ready(err)
    }

    var qbox = getQuerybox(function(qobj, ready) {
      client.query(qobj.text, qobj.values, ready)
    })

    client.query('SELECT id, nbm_repo.user, name FROM nbm_repo', function (err, results) {
      if (err) return ready(err)

      var pending = results.rows.length

      if (!pending) return end()

      results.rows.forEach(function(repo) {
        sync(qbox, github, repo, all, function(err) {
          if (err) console.error(err.stack)

          !--pending && end()
        })
      })
    })

    function end() {
      done()
      pg.end()
      ready()
    }
  })

}
