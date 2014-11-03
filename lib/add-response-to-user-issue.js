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
  on_question_1: _handleDuplicates,
  on_question_2: _handleYesNoMaybe('hasConsensus'),
  on_question_3: _handleYesNoMaybe('isFeatureRequest'),
  on_question_4: _handleYesNoMaybe('hasReproductionSteps'),
  on_question_5: _handleIsFixed
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


function _handleYesNoMaybe(field, payloadField) {
  payloadField = payloadField || 'answer'
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
    obj.state = nextState
  }
}


function _handleIsFixed(obj, payload) {
  _handleYesNoMaybe('isFixedOnNode10', 'answer_node_10')(obj, payload)
  _handleYesNoMaybe('isFixedOnNode11', 'answer_node_11')(obj, payload)
  obj.state = 'complete'
}

