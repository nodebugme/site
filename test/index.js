module.exports = run

var db = require('./utils/db.js')
var assert = require('assert')
var tape = require('tape')

if (module === require.main) {
  run(tape)
}

var through = require('tape/node_modules/through')

function run(test) {
  db.init(function(err, client) {
    console.log('# initializing db...', err)
    test('just to see', function(t) {
      require('./api.js')(db.test(t.test, client))
      t.end()
    }).on('end', function() {
      db.drop(client, function(err) {
        console.log('drop database', err)
      })
    })
  })

}
