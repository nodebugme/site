module.exports = load

var state = require('../user-issue-state.js')
var path = require('path')
var fs = require('fs')

function load(handlebars) {
  var questionFormMap = {
    on_question_1: _loadForm('question_list.hbs'),
    on_question_2: _loadForm('question_yesnomaybe.hbs'),
    on_question_3: _loadForm('question_yesnomaybe.hbs'),
    on_question_4: _loadForm('question_yesnomaybe.hbs'),
    on_question_5: _loadForm('question_is_fixed.hbs')
  }

  handlebars.registerHelper('step', _getStepNumber)
  handlebars.registerHelper('getQuestionForm', _getQuestionForm)
  handlebars.registerHelper('getQuestionText', _getQuestionText)

  function _loadForm(tpl) {
    return handlebars.compile(
      fs.readFileSync(
        path.resolve(path.join(__dirname, '..', '..', 'templates', tpl)),
        'utf8'
      )
    )
  }

  function _getQuestionText(obj) {
    return {
      on_question_1: 'Is this issue a duplicate of any other issue?',
      on_question_2: 'Is there a clear consensus on how to solve the issue?',
      on_question_3: 'Has one of the core contributors stated that they would accept a pull request to address the issue?',
      on_question_4: 'Does the issue include enough steps to reproduce the issue?',
      on_question_5: 'Is this still an issue?',
    }[obj.state]
  }

  function _getQuestionForm(obj) {
    return (questionFormMap[obj.state] || Function())()
  }

  function _getStepNumber(obj) {
    return state.toNumber(obj.state) + 1
  }
}
