'use strict'

module.exports = createUserIssueModel

var debug = require('debug')('orm')
var makeORM = require('./orm.js')
var hbs = require('handlebars')
var path = require('path')
var fs = require('fs')

function createUserIssueModel(db, models) {
  return makeORM(UserIssue, db, models, [
    'id',
    'state',
    'user_id',
    'issue_id',
    'duplicates',
    'is_feature_request',
    'has_consensus',
    'is_fixed_on_node_10',
    'is_fixed_on_node_11',
    'has_reproduction_steps',
    'started_at',
    'updated_at',
    'finished_at'
  ])
}

function UserIssue() {
  this.questionText = this.questionText()
  this.questionForm = this.questionForm()
}


var enums = 0
var stateToNumber = {
  'on_question_1': enums++,
  'on_question_2': enums++,
  'on_question_3': enums++,
  'on_question_4': enums++,
  'on_question_5': enums++,
}

UserIssue.prototype.stepNumber = function() {
  return stateToNumber[this.state] + 1
}

var numberToState = [
  'on_question_1',
  'on_question_2',
  'on_question_3',
  'on_question_4',
  'on_question_5',
  'complete'
]

UserIssue.prototype.provideAnswer = function(payload, ready) {
  var result = this.provideAnswerMap[this.state].call(this, payload)

  if (result) {
    return ready(null, result)
  }

  this.updatedAt = new Date()

  if (this.state === 'complete') {
    this.finishedAt = this.updatedAt
  }

  this.update(ready)
}

UserIssue.prototype.provideAnswerMap = {
  on_question_1: handleDuplicates,
  on_question_2: handleYesNoMaybe('hasConsensus'),
  on_question_3: handleYesNoMaybe('isFeatureRequest'),
  on_question_4: handleYesNoMaybe('hasReproductionSteps'),
  on_question_5: handleIsFixed
}

function handleDuplicates(payload) {
  if (payload.yesno === 'yes') {
    if (!payload.issues) {
      return 'error-issues'
    }

    this.duplicates = payload.issues
      .split(/\s+,?\s+/g)
      .join(',')

    if (!this.duplicates || !this.duplicates.length) {
      return 'error-issues'
    }

    this.state = 'complete'
    return
  }

  var currentState = stateToNumber[this.state]
  var nextState = numberToState[currentState + 1]
  this.duplicates = payload.yesno === 'no' ? '' : null
  this.state = nextState
}

function handleYesNoMaybe(field, payloadField) {
  payloadField = payloadField || 'answer'
  return function(payload) {
    this[field] = {
      'unknown': null,
      'yes': true,
      'no': false,
    }[payload[payloadField]]

    if (this[field] === undefined) {
      this[field] = null
    }

    var currentState = stateToNumber[this.state]
    var nextState = numberToState[currentState + 1]
    this.state = nextState
  }
}

function handleIsFixed(payload) {
  handleYesNoMaybe('isFixedOnNode10', 'answer_node_10').call(this, payload)
  handleYesNoMaybe('isFixedOnNode11', 'answer_node_11').call(this, payload)
  this.state = 'complete'
}

UserIssue.prototype.questionText = function() {
  return {
    on_question_1: 'Is this issue a duplicate of any other issue?',
    on_question_2: 'Is there a clear consensus on how to solve the issue?',
    on_question_3: 'Has one of the core contributors stated that they would accept a pull request to address the issue?',
    on_question_4: 'Does the issue include enough steps to reproduce the issue?',
    on_question_5: 'Is this still an issue?',
  }[this.state]
}

UserIssue.prototype.questionForm = function() {
  return (this.questionFormMap[this.state] || Function())()
}

var _ = function(tpl) {
  return hbs.compile(
    fs.readFileSync(
      path.resolve(path.join(__dirname, '..', 'templates', tpl)),
      'utf8'
    )
  )
}

UserIssue.prototype.questionFormMap = {
  on_question_1: _('question_list.hbs'),
  on_question_2: _('question_yesnomaybe.hbs'),
  on_question_3: _('question_yesnomaybe.hbs'),
  on_question_4: _('question_yesnomaybe.hbs'),
  on_question_5: _('question_is_fixed.hbs')
}

UserIssue.getByPath = function(user, repoUser, repoName, number, ready) {
  var db = this.prototype._db
  var meta = this.prototype
  var models = meta._models
  
  var query =
  'SELECT {fields} FROM {userIssueTable} t0 ' +
  'LEFT JOIN {issueTable} t1 ON (t0."issue_id" = t1."id") ' +
  'LEFT JOIN {repoTable} t2 ON (t1."repo_id" = t2."id") WHERE ' +
  't2."user" = $1 AND t2."name" = $2 AND ' +
  't1."number" = $3 AND t0."user_id" = $4 AND ' +
  't0."state" NOT IN (\'complete\', \'incomplete\') ' +
  'OFFSET 0 LIMIT 1'

  var matches = {
    userIssueTable: JSON.stringify(models.UserIssue.prototype._table),
    issueTable: JSON.stringify(models.Issue.prototype._table),
    repoTable: JSON.stringify(models.Repo.prototype._table),
    fields: [
      getFields('t0', models.UserIssue.prototype._fields),
      getFields('t1', models.Issue.prototype._fields),
      getFields('t2', models.Repo.prototype._fields)
    ].join(', ')
  }

  query = query.replace(/{(\w+)}/g, function(a, m) {
    return matches[m]
  })

  var params = [repoUser, repoName, number, user.id]
  debug(query, params)
  db.query(query, params, onresults)

  function onresults(err, result) {
    debug(err, result)
    if (err) {
      return ready(err)
    }

    var result = result.rows[0]

    if (!result) {
      return ready()
    }

    var userIssue = new models.UserIssue({
      'id': result.t0_id,
      'state': result.t0_state,
      'user_id': result.t0_user_id,
      'issue_id': result.t0_issue_id,
      'duplicates': result.t0_duplicates,
      'is_feature_request': result.t0_is_feature_request,
      'has_consensus': result.t0_has_consensus,
      'is_fixed_on_node_10': result.t0_is_fixed_on_node_10,
      'is_fixed_on_node_11': result.t0_is_fixed_on_node_11,
      'has_reproduction_steps': result.t0_has_reproduction_steps,
      'started_at': result.t0_started_at,
      'updated_at': result.t0_updated_at,
      'finished_at': result.t0_finished_at
    })

    var issue = new models.Issue({
      'id': result.t1_id,
      'repo_id': result.t1_repo_id,
      'number': result.t1_number,
      'state': result.t1_state,
      'title': result.t1_title,
      'created_at': result.t1_created_at,
      'closed_at': result.t1_closed_at,
      'updated_at': result.t1_updated_at,
      'body': result.t1_body,
      'user': result.t1_user,
      'assignee': result.t1_assignee,
      'locked': result.t1_locked,
      'labels': result.t1_labels
    })

    var repo = new models.Repo({
      'id': result.t2_id,
      'user': result.t2_user,
      'name': result.t2_name
    })

    issue.repo = repo
    userIssue.issue = issue
    ready(null, userIssue)
  }

  function getFields(prefix, fields) {
    return fields.map(function(xs) {
      return prefix + '.' + JSON.stringify(xs) + ' AS ' + JSON.stringify(prefix + '_' + xs)
    }).join(', ')
  }
}

// TODO: cache this.
UserIssue.getCurrent = function(user, ready) {
  var userIssue = null
  var model = this

  return model.find({userId: user.id, 'state:notIn': ['complete', 'incomplete']}, [0, 1], function(err, userIssues) {
    if (err) return ready(err)
    if (!userIssues.length) return ready()

    userIssue = userIssues[0]

    // TODO: left join.
    model.prototype._models.Issue.find({id: userIssue.issueId}, [0, 1], onissue)
  })

  function onissue(err, issue) {
    if (err) return ready(err)

    userIssue.user = user
    userIssue.issue = issue[0]

    model.prototype._models.Repo.get({
      id: issue[0].repoId
    }, onrepo)
  }

  function onrepo(err, repo) {
    if (err) return ready(err)

    userIssue.issue.repo = repo
    return ready(null, userIssue)
  }
}

UserIssue.getOrCreateForUser = function(user, ready) {
  var UserIssue = this
  var Issue = UserIssue.prototype._models.Issue

  return UserIssue.getCurrent(user, function(err, userIssue) {
    if (err) {
      return ready(err)
    }

    if (userIssue) {
      return ready(null, userIssue)
    }

    var ordering = Math.random() > 0.5 ? '-title' :
      Math.random() > 0.5 ? 'updated_at' :
      Math.random() > 0.5 ? '-created_at' :
      '-number'

    Issue.find({state: 'open', 'id:notInTable': user.id, 'triageCount:lt': 5}, [0, 10], ordering, onissue)
  })

  function onissue(err, issues) {
    if (err) {
      return ready(err)
    }

    var issueIndex = (Math.random() * issues.length) | 0
    var issue = issues[issueIndex]

    UserIssue.create({
      userId: user.id,
      issueId: issue.id,
      startedAt: new Date(),
      updatedAt: new Date(),
      state: 'on_question_1'
    }, onuserissue)

    function onuserissue(err, userIssue) {
      if (err) return ready(err)

      userIssue.issue = issue
      userIssue.user = user
      // TODO: left join!
      Issue.prototype._models.Repo.find({id: issue.repoId}, [0, 1], function(err, repo) {
        if (err) {
          return ready(err)
        }

        userIssue.issue.repo = repo[0]
        issue.incrementCount(function(err) {
          if (err) return ready(err)
          ready(null, userIssue)
        })
      })
    }
  }
}
