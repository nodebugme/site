'use strict'

module.exports = createIssueModel

var makeORM = require('./orm.js')

function createIssueModel(db, models) {
  return makeORM(Issue, db, models, [
    'id',
    'repo_id',
    'number',
    'state',
    'title',
    'created_at',
    'closed_at',
    'updated_at',
    'body',
    'user',
    'assignee',
    'locked',
    'labels',
    'triage_count'
  ])
}

function Issue() {

}

Issue.sync = function(github, repo, ready) {
  var next = startIssues
  var updateNeeded = []
  var model = this
  var db = model.prototype._db
  var lastSeen

  function startIssues() {
    github.issues.repoIssues({
      user: repo.user,
      repo: repo.name,
      state: 'all',
      per_page: 100,
      since: lastSeen.toISOString().replace(/\.\d+Z/g, 'Z')
    }, onissues)
  }

  function iterIssues(issues) {
    github.getNextPage(issues, onissues)
  }

  model.find({repo_id: repo.id}, [0, 1], '-updated_at', function(err, issues) {
    if (err) {
      return ready(err)
    }

    lastSeen = issues.length ? issues[0].updatedAt : new Date(0)
    next()
  })

  function onissues(err, issues) {
    if (err) {
      return ready(err)
    }

    if (!issues.length) {
      return ready()
    }

    next = iterIssues.bind(null, issues)

    var shouldContinue = issues.every(function(issue) {
      var obj = {
        'number': issue.number,
        'state': issue.state,
        'title': issue.title,
        'repoId': repo.id,
        'createdAt': new Date(Date.parse(issue.created_at)),
        'closedAt': issue.closed_at ? new Date(Date.parse(issue.closed_at)) : null,
        'updatedAt': new Date(Date.parse(issue.updated_at)),
        'body': issue.body,
        'user': issue.user ? issue.user.login : '',
        'assignee': issue.assignee ? issue.assignee.login : '',
        'locked': issue.locked,
        'labels': issue.labels.map(function(xs) { return xs.name }),
      }

      var ok = +obj.updatedAt > +lastSeen
      if (ok) updateNeeded.push(obj)
      return ok
    })

    if (!github.hasNextPage(issues) || !shouldContinue) {
      next = updateissues
    }

    next()
  }

  function updateissues() {
    var numbers = []
    var pending = updateNeeded.length

    if (!pending) {
      return ready()
    }

    db.query('SELECT "number" FROM ' + model.prototype._table + ' WHERE "number" IN (' + updateNeeded.map(function(xs, idx) {
      numbers.push(xs.number)
      return '$' + (idx + 1)
    }).join(', ') + ')', numbers, onresult)

    function onresult(err, toUpdate) {
      if (err) {
        return ready(err)
      }

      toUpdate = toUpdate.rows.map(function(xs) {
        return xs.number
      })

      var idx
      for(var i = 0, len = updateNeeded.length; i < len; ++i) {
        idx = toUpdate.indexOf(updateNeeded[i].number)
        if (idx > -1) {
          console.log('updating', updateNeeded[i].number)
          update(updateNeeded[i], onready)
          toUpdate.splice(idx, 1)
        } else {
          console.log('creating', updateNeeded[i].number)
          model.create(updateNeeded[i], onready)
        }
      }
    }

    function update(data, ready) {
      model.get({number: data.number}, function(err, issue) {
        if (err) {
          return ready(err)
        }

        var instance = new model(data)
        instance.id = issue.id
        instance.update(ready)
      })
    }

    function onready(err) {
      if (err) {
        ready(err)
        ready = Function()
        return
      }

      !--pending && ready()
    }
  }
}

// TODO: cache!
Issue.getUntriagedIssues = function(ready) {
  var db = this.prototype._db
  var table = this.prototype._table

  db.query('SELECT COUNT(*) as "count" FROM "' + table + '" WHERE "state" = \'open\' AND "triage_count" = 0', function(err, result) {
    if (err) {
      return ready(err)
    }
    return ready(null, result.rows[0] ? result.rows[0].count : 0)
  })
}

Issue.prototype.incrementCount = function(ready) {
  var db = this._db
  var table = this._table
  db.query('UPDATE "' + table + '" SET "triage_count" = "triage_count" + 1 WHERE "id" = $1', [this.id], ready)
}
