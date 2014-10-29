var getIssue = require('./models/issue.js')
var getRepo = require('./models/repo.js')
var config = require('./config.json')
var Github = require('github')
var pg = require('pg.js')

var github = new Github({
    version: '3.0.0'
  , protocol: 'https'
})

github.authenticate({
    type: 'oauth'
  , token: config.githubSyncToken
})

pg.connect(config.server.plugins.models.database, function(err, client, done) {
  var models = {}
  var Issue = models.Issue = getIssue(client, models)
  var Repo = models.Repo = getRepo(client, models)

  Repo.find({}, null, function(err, repos) {
    if (err) throw err

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
  }
})
