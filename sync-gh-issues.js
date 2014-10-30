var getIssue = require('./models/issue.js')
var getRepo = require('./models/repo.js')
var Github = require('github')
var pg = require('pg.js')

module.exports = sync

if (module.id === '.') {
  sync(function() {})
}

function sync(ready_) {
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

  pg.connect(config.server.plugins.models.database, function(err, client, done) {
    if (err) {
      return ready(err)
    }
    var models = {}
    var Issue = models.Issue = getIssue(client, models)
    var Repo = models.Repo = getRepo(client, models)

    Repo.find({}, null, function(err, repos) {
      if (err) return ready(err)

      var pending = repos.length

      if (!pending) return end()

      repos.forEach(function(repo) {
        Issue.sync(github, repo, function(err) {
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
