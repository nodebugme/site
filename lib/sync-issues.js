module.exports = sync

function sync(db, github, repo, ready) {
  var next = startIssues
  var updateNeeded = []
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

  db.run('get-most-recent-issue', [repo.id], function(err, result) {
    if (err) {
      return ready(err)
    }

    lastSeen = result.rows.length ? result.rows[0].updatedAt : new Date(0)
    console.log('\nfetching ' + repo.user + '/' + repo.name + ' issues since ' + lastSeen)
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
        'created_at': new Date(Date.parse(issue.created_at)),
        'closed_at': issue.closed_at ? new Date(Date.parse(issue.closed_at)) : null,
        'updated_at': new Date(Date.parse(issue.updated_at)),
        'body': issue.body,
        'user': issue.user ? issue.user.login : '',
        'assignee': issue.assignee ? issue.assignee.login : '',
        'locked': issue.locked,
        'labels': issue.labels.map(function(xs) { return xs.name }),
      }

      updateNeeded.push(obj)
      return true
    })

    process.stdout.write('\rgot ' + updateNeeded.length + ' issues... ')
    if (!github.hasNextPage(issues) || !shouldContinue) {
      process.stdout.write('done.\n')
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

    db.queryFn({text: 'SELECT "number" FROM "nbm_issue" WHERE "number" IN (' + updateNeeded.map(function(xs, idx) {
      numbers.push(xs.number)
      return '$' + (idx + 1)
    }).join(', ') + ')', values: numbers}, onresult)

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
          process.stdout.write('\rupdating ' + updateNeeded[i].number)
          update(updateNeeded[i], onready)
          toUpdate.splice(idx, 1)
        } else {
          process.stdout.write('\rcreating ' + updateNeeded[i].number)
          save(updateNeeded[i], onready)
        }
      }
    }

    function save(data, ready) {
      db.run('create-issue', [
        data.number,
        repo.id,
        data.state,
        data.title,
        data.created_at,
        data.updated_at,
        data.closed_at,
        data.body,
        data.user,
        data.assignee,
        data.locked,
        data.labels
      ], ready)
    }

    function update(data, ready) {
      db.run('update-issue', [
        data.number,
        repo.id,
        data.state,
        data.title,
        data.created_at,
        data.updated_at,
        data.closed_at,
        data.body,
        data.user,
        data.assignee,
        data.locked,
        data.labels
      ], ready)
    }

    function onready(err) {
      if (err) {
        ready(err)
        ready = Function()
        return
      }

      !--pending && done()
    }
  }

  function done() {
    console.log('')
    ready()
  }
}

