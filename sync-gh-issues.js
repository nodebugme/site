var sync = require('./lib/sync-issues.js')
var getQuerybox = require('./lib/sql.js')
var Github = require('github')
var pg = require('pg.js')

module.exports = syncAll

if (module.id === '.') {
  syncAll(function() {})
}

function syncAll(ready_) {
  var config = require('./config.json')
  var ready = function(err) {
    var fn = ready_
    ready_ = Function()
    fn(err)
  }

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
        sync(qbox, github, repo, function(err) {
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
