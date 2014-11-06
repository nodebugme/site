var fixupVersions = require('./_fixup-versions.js')
var toObject = require('../to-object.js')
var once = require('once')

module.exports = {
  findIssues: findIssues,
  findRepoIssues: findRepoIssues,
  findIssueDetail: findIssueDetail
}

function findIssues(db, page, ready) {
  _findIssueRollup(db, 'find-issue-responses', [], page, ready)
}

function findRepoIssues(db, repo, page, ready) {
  _findIssueRollup(db, 'find-issue-repo-responses', [
    repo.user,
    repo.name
  ], page, ready)
}

function findIssueDetail(db, repo, number, page, ready) {
  _findIssueRollup(db, 'find-issue-repo-number-responses', [
    repo.user,
    repo.name,
    number
  ], page, ready, true)
}

function _findIssueRollup(db, query, params, page, ready, single) {
  var fullParams = params.concat(page * 10)
  var pending = 2
  var count
  var rows

  ready = once(ready)
  db.run(query, fullParams, onrows)
  
  if (!single) {
    db.run(query + '-count', params, oncount)
  } else {
    count = 1
    pending = 1
  }

  return

  function oncount(err, result) {
    if (err) {
      return ready(err)
    }

    count = result.rows[0].count
    !--pending && done()
  }

  function onrows(err, result) {
    if (err) {
      return ready(err)
    }

    rows = result.rows
    !--pending && done()
  }

  function done() {
    ready(null, {
      objects: rows.map(formatIssueOnVersions),
      count: count,
    })
  }

  function formatIssueOnVersions(xs) {
    fixupVersions(xs, 'stats.versions', 'stats.isIssueOnVersions')
    return toObject(xs)
  }
}
