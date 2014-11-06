var fixupVersions = require('./_fixup-versions.js')
var toObject = require('../to-object.js')
var once = require('once')

module.exports = {
  states: {
    ANY: [
      'incomplete',
      'on_question_1',
      'on_question_2',
      'on_question_3',
      'on_question_4',
      'on_question_5',
      'on_question_6',
      'complete'
    ],
    COMPLETE: [
      'complete'
    ]
  },
  findResponses: findResponses,
  getCurrent: getCurrent,
  startNew: startNew,
  byPath: byPath,
  update: update,
}

function _setIncomplete(db, item, ready) {
  item.state = 'incomplete'
  item.updatedAt =
  item.finishedAt = new Date
  update(db, item, ready)
}

function update(db, item, ready) {
  var onupdated = item.isIssueOnVersions && item.state === 'complete' ?
    updateVersions :
    ready

  ready = once(ready)
  db.run('update-userissue', [
    item.id,
    item.state,
    item.inCorrectRepository,
    item.duplicates,
    item.isFeatureRequest,
    item.hasConsensus,
    item.hasReproductionSteps,
    item.updatedAt,
    item.finishedAt
  ], onupdated)

  // only executed when the object is complete 
  function updateVersions(err) {
    if (err) {
      return ready(err)
    }

    var versions = Object.keys(item.isIssueOnVersions)
    var pending = versions.length

    versions.forEach(function(version) {
      db.run('create-user-issue-version', [
        item.id,
        version,
        item.isIssueOnVersions[version]
      ], onversion)
    })

    function onversion(err) {
      if (err) {
        return ready(err)
      }

      !--pending && ready()
    }
  }
}

function findResponses(db, states, page, ready) {
  var pending = 2
  var count
  var rows

  ready = once(ready)

  db.run('count-responses', [states], oncount)
  db.run('find-responses', [states, 10 * page], onrows)

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
    fixupVersions(xs, 'versions', 'isIssueOnVersions')

    return toObject(xs)
  }
}

function getCurrent(db, creds, ready) {
  db.run('get-current-userissue-by-user', [creds.id], function(err, result) {
    if (err) {
      return ready(err)
    }

    return ready(null, result.rows.map(toObject)[0])
  })
}

function byPath(db, creds, pathParams, ready) {
  db.run('get-userissue-by-path', [
    creds.id,
    pathParams.repo,
    pathParams.name,
    pathParams.number,
  ], onuserissue)

  function onuserissue(err, result) {
    if (err) {
      return ready(err)
    }

    return ready(null, result.rows.map(toObject)[0])
  }
}

function startNew(db, creds, shouldSkip, ready) {
  // This function does a bit of a loop-de-loop:
  // it will try to get the current userIssue, and
  // if one exists, we'll either mark it incomplete
  // (if we are skipping it) OR we'll return it.
  //
  // when we skip OR when there's no userIssue, we
  // find a random issue, create a userIssue for it,
  // and recurse startNew while forcing shouldSkip to
  // false. this way we end up finding the newly created
  // userIssue and we can return it to the caller.
  getCurrent(db, creds, onuserissue)

  function onuserissue(err, current) {
    if (err) {
      return ready(err)
    }

    if (!current) {
      return db.run('get-random-issue', [creds.id], onissue)
    }

    if (!shouldSkip) {
      // this is ultimately the place where
      // control will be passed back to the caller, if
      // everything goes according to plan.
      return ready(null, current)
    }

    return _setIncomplete(
      db,
      current,
      restartTriage
    )
  }

  function onissue(err, result) {
    if (err) {
      return ready(err)
    }

    var issue = result.rows.map(toObject)[0]

    if (!issue) {
      return ready(new Error('ran out of issues'))
    }

    db.run('create-userissue', [
      creds.id,
      issue.id
    ], restartTriage)
  }

  function restartTriage(err) {
    if (err) {
      return ready(err)
    }

    // `shouldSkip` will always be false when
    // restarting triage.
    return startNew(db, creds, false, ready)
  }
}
