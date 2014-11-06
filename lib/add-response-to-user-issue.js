module.exports = provideAnswer

var state = require('./user-issue-state.js')

function provideAnswer(obj, payload) {
  var error = handleAnswerPayload[obj.state](obj, payload)

  if (error) {
    return error
  }

  obj.updatedAt = new Date()

  if (obj.state === 'complete') {
    obj.finishedAt = obj.updatedAt
  }
}

var handleAnswerPayload = {
  on_question_1: _handleYesNoMaybe('inCorrectRepository', null, _skipIfFalse),
  on_question_2: _handleDuplicates,
  on_question_3: _handleYesNoMaybe('hasConsensus'),
  on_question_4: _handleYesNoMaybe('isFeatureRequest'),
  on_question_5: _handleYesNoMaybe('hasReproductionSteps'),
  on_question_6: _handleIsFixed
}

function _skipIfFalse(obj, value, next) {
  obj.state = value === false ? 'complete' : next
}

function _defaultProgress(obj, value, next) {
  obj.state = next
}

function _handleDuplicates(obj, payload) {
  if (payload.yesno === 'yes') {
    if (!payload.issues) {
      return 'error-issues'
    }

    obj.duplicates = payload.issues
      .split(/\s+,?\s+/g)
      .join(',')

    if (!obj.duplicates || !obj.duplicates.length) {
      return 'error-issues'
    }

    obj.state = 'complete'
    return
  }

  var currentState = state.toNumber(obj.state)
  var nextState = state.fromNumber(currentState + 1)
  obj.duplicates = payload.yesno === 'no' ? '' : null
  obj.state = nextState
}


function _handleYesNoMaybe(field, payloadField, progress) {
  payloadField = payloadField || 'answer'
  progress = progress || _defaultProgress

  return function(obj, payload) {
    obj[field] = {
      'unknown': null,
      'yes': true,
      'no': false,
    }[payload[payloadField]]

    if (obj[field] === undefined) {
      obj[field] = null
    }

    var currentState = state.toNumber(obj.state)
    var nextState = state.fromNumber(currentState + 1)

    progress(obj, obj[field], nextState)
  }
}


function _handleIsFixed(obj, payload) {
  var repo = obj.issue.repo

  obj.isIssueOnVersions = obj.isIssueOnVersions || []

  obj.issue.repo.versions.map(function(xs, idx) {
    _handleYesNoMaybe(idx, 'answer_' + idx)(obj, payload)
    obj.isIssueOnVersions[idx] = {}
    obj.isIssueOnVersions[idx][xs] = obj[idx] === null ?
      'null' : obj[idx] ? 'true' : 'false'
    delete obj[idx]
  })
  obj.state = 'complete'
}

