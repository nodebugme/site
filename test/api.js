module.exports = run

var getServer = require('../app.js')
var assert = require('assert')
var tape = require('tape')

if (module === require.main) {
  run(tape)
}

function run(test) {
  test('ok', function(t) {
    setTimeout(function() {
      console.log('right then')
      t.end()
    }, 1000)
  })
}
