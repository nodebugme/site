module.exports = run

var getSettings = require('./utils/sample-settings.js')
var getServer = require('../app.js')
var assert = require('assert')
var tape = require('tape')

var createIssue = require('./utils/create-issue.js')
var createUser = require('./utils/create-user.js')

if (module === require.main) {
  run(tape)
}

function permutation(arr, startIdx, items, out) {
  if (startIdx === arr.length - 1) {
    for(var i = 0, len = arr[startIdx].length; i < len; ++i) {
      out.push(items.slice().concat(i))
    }
  } else {
    var idx = items.length
    for(var i = 0, len = arr[startIdx].length; i < len; ++i) {
      items[idx] = i
      if (arr[startIdx][i][2]) {
        out.push(items.slice().concat(i))
      } else {
        permutation(arr, startIdx + 1, items, out)
      }
      items.length = idx
    }
  }
}

function run(test) {
  var answers = [
    [
      [{'answer': 'no'}, false, true],
      [{'answer': 'yes'}, true, null],
      [{'answer': 'idk'}, null, null]
    ],
    [
      [{'yesno': 'yes', 'issues': '#8808'}, '#8808', true],
      [{'yesno': 'yes', 'issues': '#8808, #1010'}, '#8808,#1010', true],
      [{'yesno': 'no', 'issues': '#8808, #1010'}, '', null],
      [{'yesno': 'idk', 'issues': '#8808, #1010'}, null, null],
      [{'yesno': 'no', 'issues': ''}, '', null],
      [{'yesno': 'idk', 'issues': ''}, null, null],
    ],
    [
      [{'answer': 'no'}, false, null],
      [{'answer': 'yes'}, true, null],
      [{'answer': 'idk'}, null, null]
    ],
    [
      [{'answer': 'no'}, false, null],
      [{'answer': 'yes'}, true, null],
      [{'answer': 'idk'}, null, null]
    ],
    [
      [{'answer': 'no'}, false, null],
      [{'answer': 'yes'}, true, null],
      [{'answer': 'idk'}, null, null]
    ],
    [
      [{'answer_0': 'no', 'answer_1': 'no'}, [false, false], true],
      [{'answer_0': 'yes', 'answer_1': 'no'}, [true, false], true],
      [{'answer_0': 'no', 'answer_1': 'yes'}, [false, true], true],
      [{'answer_0': 'idk', 'answer_1': 'no'}, [null, false], true],
      [{'answer_0': 'no', 'answer_1': 'idk'}, [false, null], true],
      [{'answer_0': 'idk', 'answer_1': 'yes'}, [null, true], true],
      [{'answer_0': 'yes', 'answer_1': 'idk'}, [true, null], true],
      [{'answer_0': 'yes', 'answer_1': 'yes'}, [true, true], true],
      [{'answer_0': 'idk', 'answer_1': 'idk'}, [null, null], true]
    ],
  ]
  var out = []
  permutation(answers, 0, [], out)

  test('answer flow', function(assert, db) {
    var pendingSequences = out.length
    var env
    commonSetup(db, onsetup)

    function onsetup(err, env_) {
      assert.equal(err, null)
      env = env_

      begin()
    }

    function begin() {
      out.forEach(function(sequence, idx) {
        createUser(db, {username: 'hey' + idx}, function(err, user) {
          if (err) throw err
          runTest(sequence, user.id)
        })
      })
    }

    function runTest(sequence, userId) {
      env.server.inject({
        'method': 'POST',
        'credentials': {'id': userId},
        'url': '/triage',
        'payload': {}
      }, onstarttriage)

      function onstarttriage(res) {
        assert.equal(res.statusCode, 302)
        assert.ok(/http:\/\/localhost:8080\/triage\/\w+\/\w+\/\d+/.test(res.headers.location))

        db.query('select * from nbm_user_issue where user_id = $1', [userId], function(err, result) {
          assert.ok(!err)
          assert.equal(result.rows.length, 1)
          assert.equal(result.rows[0].state, 'on_question_1')

          // is the issue in the right repo?
          env.server.inject({
            'method': 'POST',
            'credentials': {'id': userId},
            'url': res.headers.location,
            'payload': answers[0][sequence[0]][0]
          }, onsendanswer1)
        })
      }

      function onsendanswer1(res) {
        assert.equal(res.statusCode, 302)

        if (answers[0][sequence[0]][2] === true) {
          assert.equal('http://localhost:8080/triage', res.headers.location)
          return !--pendingSequences && finish()
        }

        assert.ok(/http:\/\/localhost:8080\/triage\/\w+\/\w+\/\d+/.test(res.headers.location))

        db.query('select * from nbm_user_issue where user_id = $1', [userId], function(err, result) {
          assert.ok(!err)
          assert.equal(result.rows.length, 1)
          assert.equal(result.rows[0].state, 'on_question_2')
          assert.equal(result.rows[0].in_correct_repository, answers[0][sequence[0]][1])

          // is the issue a duplicate?
          env.server.inject({
            'method': 'POST',
            'credentials': {'id': userId},
            'url': res.headers.location,
            'payload': answers[1][sequence[1]][0]
          }, onsendanswer2)
        })
      }

      function onsendanswer2(res) {
        assert.equal(res.statusCode, 302)

        if (answers[1][sequence[1]][2] === true) {
          assert.equal('http://localhost:8080/triage', res.headers.location)
          return !--pendingSequences && finish()
        }
        assert.ok(/http:\/\/localhost:8080\/triage\/\w+\/\w+\/\d+/.test(res.headers.location))

        db.query('select * from nbm_user_issue where user_id = $1', [userId], function(err, result) {
          assert.ok(!err)
          assert.equal(result.rows.length, 1)
          assert.equal(result.rows[0].state, 'on_question_3')
          assert.equal(result.rows[0].in_correct_repository, answers[0][sequence[0]][1])
          assert.equal(result.rows[0].duplicates, answers[1][sequence[1]][1])

          // is the issue a duplicate?
          env.server.inject({
            'method': 'POST',
            'credentials': {'id': userId},
            'url': res.headers.location,
            'payload': answers[2][sequence[2]][0]
          }, onsendanswer3)
        })
      }

      function onsendanswer3(res) {
        assert.equal(res.statusCode, 302)
        assert.ok(/http:\/\/localhost:8080\/triage\/\w+\/\w+\/\d+/.test(res.headers.location))

        db.query('select * from nbm_user_issue where user_id = $1', [userId], function(err, result) {
          assert.ok(!err)
          assert.equal(result.rows.length, 1)
          assert.equal(result.rows[0].state, 'on_question_4')
          assert.equal(result.rows[0].in_correct_repository, answers[0][sequence[0]][1])
          assert.equal(result.rows[0].duplicates, answers[1][sequence[1]][1])
          assert.equal(result.rows[0].has_consensus, answers[2][sequence[2]][1])

          // is the issue a duplicate?
          env.server.inject({
            'method': 'POST',
            'credentials': {'id': userId},
            'url': res.headers.location,
            'payload': answers[3][sequence[3]][0]
          }, onsendanswer4)
        })
      }

      function onsendanswer4(res) {
        assert.equal(res.statusCode, 302)
        assert.ok(/http:\/\/localhost:8080\/triage\/\w+\/\w+\/\d+/.test(res.headers.location))

        db.query('select * from nbm_user_issue where user_id = $1', [userId], function(err, result) {
          assert.ok(!err)
          assert.equal(result.rows.length, 1)
          assert.equal(result.rows[0].state, 'on_question_5')
          assert.equal(result.rows[0].in_correct_repository, answers[0][sequence[0]][1])
          assert.equal(result.rows[0].duplicates, answers[1][sequence[1]][1])
          assert.equal(result.rows[0].has_consensus, answers[2][sequence[2]][1])
          assert.equal(result.rows[0].is_feature_request, answers[3][sequence[3]][1])

          // is the issue a duplicate?
          env.server.inject({
            'method': 'POST',
            'credentials': {'id': userId},
            'url': res.headers.location,
            'payload': answers[4][sequence[4]][0]
          }, onsendanswer5)
        })
      }

      function onsendanswer5(res) {
        assert.equal(res.statusCode, 302)
        assert.ok(/http:\/\/localhost:8080\/triage\/\w+\/\w+\/\d+/.test(res.headers.location))

        db.query('select * from nbm_user_issue where user_id = $1', [userId], function(err, result) {
          assert.ok(!err)
          assert.equal(result.rows.length, 1)
          assert.equal(result.rows[0].state, 'on_question_6')
          assert.equal(result.rows[0].in_correct_repository, answers[0][sequence[0]][1])
          assert.equal(result.rows[0].duplicates, answers[1][sequence[1]][1])
          assert.equal(result.rows[0].has_consensus, answers[2][sequence[2]][1])
          assert.equal(result.rows[0].is_feature_request, answers[3][sequence[3]][1])
          assert.equal(result.rows[0].has_reproduction_steps, answers[4][sequence[4]][1])

          // is the issue a duplicate?
          env.server.inject({
            'method': 'POST',
            'credentials': {'id': userId},
            'url': res.headers.location,
            'payload': answers[5][sequence[5]][0]
          }, onsendanswer6)
        })
      }

      function onsendanswer6(res) {
        assert.equal(res.statusCode, 302)
        assert.ok(/http:\/\/localhost:8080\/triage/.test(res.headers.location))

        db.query('select * from nbm_user_issue where user_id = $1', [userId], function(err, result) {
          assert.ok(!err)
          assert.equal(result.rows.length, 1)
          assert.equal(result.rows[0].state, 'complete')
          assert.equal(result.rows[0].in_correct_repository, answers[0][sequence[0]][1])
          assert.equal(result.rows[0].duplicates, answers[1][sequence[1]][1])
          assert.equal(result.rows[0].has_consensus, answers[2][sequence[2]][1])
          assert.equal(result.rows[0].is_feature_request, answers[3][sequence[3]][1])
          assert.equal(result.rows[0].has_reproduction_steps, answers[4][sequence[4]][1])

          var query = 'select * from nbm_user_issue_version where user_issue_id = $1 order by version'
          db.query(query, [result.rows[0].id], function(err, result) {
            assert.ok(!err)
            assert.equal(result.rows.length, 2)
            assert.equal(result.rows[0].version, '0.10')
            assert.equal(result.rows[0].is_issue, answers[5][sequence[5]][1][0])
            assert.equal(result.rows[1].version, '0.11')
            assert.equal(result.rows[1].is_issue, answers[5][sequence[5]][1][1])
            !--pendingSequences && finish()
          })
        })

      }

      function finish() {
        env.server.stop()
        assert.end()
      }
    }
  })

  function commonSetup(db, ready) {
    var server
    var issue
    var user

    getServer(getSettings(), function(err, server_) {
      if (err) {
        return ready(err)
      }

      server = server_
      return continueWithTest()
    })

    function continueWithTest() {
      createIssue(db, {
        state: 'open'
      }, onissue)
    }

    function onissue(err, issue_) {
      if (err) {
        return ready(err)
      }

      createUser(db, {
        username: 'garybusey'
      }, onuser)
    }

    function onuser(err, user_) {
      if (err) {
        return ready(err)
      }

      user = user_
      ready(null, {
        user: user,
        issue: issue,
        server: server
      })
    }
  }

}
