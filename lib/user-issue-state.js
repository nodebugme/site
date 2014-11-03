module.exports = {
  toNumber: toNumber,
  fromNumber: fromNumber
}

var numberToState = [
  'on_question_1',
  'on_question_2',
  'on_question_3',
  'on_question_4',
  'on_question_5',
  'on_question_6',
  'complete'
]

var enums = 0
var stateToNumber = {
  'on_question_1': enums++,
  'on_question_2': enums++,
  'on_question_3': enums++,
  'on_question_4': enums++,
  'on_question_5': enums++,
  'on_question_6': enums++,
}

function toNumber(state) {
  return stateToNumber[state]
}

function fromNumber(num) {
  return numberToState[num]
}
