module.exports = createHandlers

var OAuth = require('oauth')
var hapi = require('hapi')
var joi = require('joi')
var url = require('url')

var addResponse = require('./add-response-to-user-issue.js')
var toObject = require('./to-object.js')

function createHandlers(server, settings) {
  var displayThanks = {
    view: 'thanks.hbs'
  }

  var getHost = function() {
    return settings.uri || server.info.uri
  }

  var staticMedia = {
    directory: {
      path: __dirname + '/../public',
      index: false,
      listing: true
    },
  }

  return {
    triageFeedback:   {handler: triageFeedback, auth: 'session'},
    thanks:           {handler: displayThanks, auth: 'session'},
    triageHome:       {handler: triageHome, auth: 'session'},
    startTriage:      {handler: startTriage, auth: 'session'},
    viewIssueTriage:  {handler: viewIssueTriage, auth: 'session'},
    login:            {handler: doLogin, auth: 'github'},
    homepage:         {
      handler: displayHomepage,
      auth: {mode: 'try', strategy: 'session'},
      plugins: {'hapi-auth-cookie': {redirectTo: false}}
    },
    static:           {handler: staticMedia, auth: false},

    apiAll:           {handler: apiAll, auth: false},
    apiComplete:      {handler: apiComplete, auth: false},
    apiIssues:        {handler: apiIssues, auth: false},
    apiRepoIssues:    {handler: apiRepoIssues, auth: false},
    apiIssueDetail:   {handler: apiIssueDetail, auth: false},
  }

  function displayHomepage(req, reply) {
    req.querybox.run('get-untriaged-issue-count', oncount)

    function oncount(err, result) {
      var num = result && result.rows && result.rows[0] ?
        result.rows[0].count :
        false

      reply.view('homepage.hbs', {
        openBugs: num || 0,
        isLoggedIn: req.auth.credentials
      })
    }
  }

  function triageHome(req, reply) {
    req.querybox.run('get-current-userissue-by-user', [req.auth.credentials.id], onuserissue)

    function onuserissue(err, result) {
      if (err) {
        return reply(err)
      }

      var current = result.rows.length ? toObject(result.rows[0]) : null

      reply.view('triage-home.hbs', {
        current: current
      })
    }
  }

  function startTriage(req, reply) {
    var current
    req.querybox.run('get-current-userissue-by-user', [req.auth.credentials.id], onuserissue)

    function onuserissue(err, result) {
      if (err) {
        return reply(err)
      }

      current = result.rows.length ? toObject(result.rows[0]) : null

      if (current) {
        if (req.payload.skip) {
          current.state = 'incomplete'
          req.payload.skip = false
          return req.querybox.run('update-userissue', [
            current.id,
            current.state,
            current.inCorrectRepository,
            current.duplicates,
            current.isFeatureRequest,
            current.hasConsensus,
            current.hasReproductionSteps,
            current.isFixedOnNode10,
            current.isFixedOnNode11,
            current.updatedAt,
            current.finishedAt
          ], restartTriage)
        }

        return oncurrent(null, current)
      }

      req.querybox.run('get-random-issue', [req.auth.credentials.id], onissue)
    }

    function onissue(err, result) {
      if (err) {
        return reply(err)
      }

      if (!result.rows.length) {
        // TODO: handle the case that there are no
        // issues remaining for this user!
        return reply.redirect('/triage')
      }

      var issue = toObject(result.rows[0])

      req.querybox.run('create-userissue', [
        req.auth.credentials.id,
        issue.id
      ], restartTriage)
    }

    function restartTriage(err) {
      if (err) {
        return reply(err)
      }
      return startTriage(req, reply)
    }

    function oncurrent(err, current) {
      if (err) {
        return reply(err)
      }

      reply.redirect('/triage/' + [ 
        current.issue.repo.user,
        current.issue.repo.name,
        current.issue.number
      ].join('/'))
    }
  }

  function viewIssueTriage(req, reply) {
    req.querybox.run('get-userissue-by-path', [
      req.auth.credentials.id,
      req.params.repo,
      req.params.name,
      req.params.number,
    ], onuserissue)

    function onuserissue(err, result) {
      if (err) {
        return reply(err)
      }

      if (!result.rows.length) {
        return reply.redirect('/triage')
      }

      var current = toObject(result.rows[0])

      reply.view('issue-detail.hbs', {
        userIssue: current
      })
    }
  }

  function triageFeedback(req, reply) {
    var current

    req.querybox.run('get-userissue-by-path', [
      req.auth.credentials.id,
      req.params.repo,
      req.params.name,
      req.params.number,
    ], onuserissue)

    function onuserissue(err, result) {
      if (err) {
        return reply(err)
      }

      if (!result.rows.length) {
        return reply('not found').code(404)
      }

      current = toObject(result.rows[0])

      var errorClass = addResponse(current, req.payload)

      if (errorClass) {
        return reply.view('issue-detail.hbs', {
          userIssue: current,
          errorClass: errorClass
        })
      }

      req.querybox.run('update-userissue', [
        current.id,
        current.state,
        current.inCorrectRepository,
        current.duplicates,
        current.isFeatureRequest,
        current.hasConsensus,
        current.hasReproductionSteps,
        current.isFixedOnNode10,
        current.isFixedOnNode11,
        current.updatedAt,
        current.finishedAt
      ], onanswered)
    }

    function onanswered(err) {
      if (err) {
        return reply(err)
      }

      reply.redirect(current.state === 'complete' ? '/triage' : '/triage/' + [
        current.issue.repo.user,
        current.issue.repo.name,
        current.issue.number
      ].join('/'))
    }
  }

  function doLogin(req, reply) {
    req.querybox.run('get-or-create-user', [
      req.auth.credentials.profile.username,
      req.auth.credentials.profile.displayName || null,
      req.auth.credentials.profile.email || null,
      req.auth.credentials.profile.raw.avatar_url || null,
      req.auth.credentials.token
    ], onuser)

    function onuser(err, result) {
      if (err) {
        return reply(err)
      }

      if (!result.rows.length) {
        // TODO: login failed, how do we proceed?
        return reply.redirect('/')
      }

      req.auth.session.set({id: result.rows[0].id})
      reply.redirect('/triage')
    }
  }

  function apiAll(req, reply) {
    _getResponsePage(req, reply, [
      'incomplete',
      'on_question_1',
      'on_question_2',
      'on_question_3',
      'on_question_4',
      'on_question_5',
      'on_question_6',
      'complete'
    ], '/api/v1/responses/all')
  }

  function apiComplete(req, reply) {
    _getResponsePage(req, reply, ['complete'], '/api/v1/responses/complete')
  }

  function _getResponsePage(req, reply_, search, baseURL) {
    var page = req.query.p ? Math.abs(Number(req.query.p)) : 0
    var pending = 2
    var count
    var rows

    var reply = function() {
      var fn = reply_
      reply_ = Function()
      return fn.apply(this, arguments)
    }

    req.querybox.run('count-responses', [search], oncount)
    req.querybox.run('find-responses', [search, 10 * page], onrows)

    function oncount(err, result) {
      if (err) {
        return reply(err)
      }

      count = result.rows[0].count
      !--pending && sendResponse()
    }

    function onrows(err, result) {
      if (err) {
        return reply(err)
      }

      rows = result.rows
      !--pending && sendResponse()
    }

    function sendResponse() {
      rows = rows.map(toObject)

      if (!rows.length) {
        return reply({
          objects: [],
          meta: {
            count: count,
            next: null,
            prev: null
          }
        }).code(404)
      }

      return reply({
        objects: rows,
        meta: {
          next: (page + 1) * 10 > count ?
            null :
            (getHost() + baseURL + '?p=' + (page + 1)),
          prev: !page ?
            null :
            (getHost() + baseURL + (page - 1 ? '?p=' + (page - 1) : '')),
          count: count
        }
      })
    }
  }

  function apiIssues(req, reply_) {
    var page = req.query.p ? Math.abs(Number(req.query.p)) : 0
    var pending = 2
    var count
    var rows

    var reply = function() {
      var fn = reply_
      reply_ = Function()
      return fn.apply(this, arguments)
    }

    req.querybox.run('find-issue-responses', [page * 10], onrows)
    req.querybox.run('find-issue-responses-count', [], oncount)

    function oncount(err, result) {
      if (err) {
        return reply(err)
      }

      count = result.rows[0].count
      !--pending && onready()
    }

    function onrows(err, result) {
      if (err) {
        return reply(err)
      }

      rows = result.rows.map(toObject)
      !--pending && onready()
    }

    function onready() {
      if (!rows.length) {
        return reply({
          objects: [],
          meta: {
            count: count,
            next: null,
            prev: null
          }
        }).code(404)
      }

      return reply({
        objects: rows,
        meta: {
          next: (page + 1) * 10 > count ?
            null :
            (getHost() + '/api/v1/issues?p=' + (page + 1)),
          prev: !page ?
            null :
            (getHost() + '/api/v1/issues' + (page - 1 ? '?p=' + (page - 1) : '')),
          count: count
        }
      })
    }
  }

  function apiRepoIssues(req, reply_) {
    var page = req.query.p ? Math.abs(Number(req.query.p)) : 0
    var pending = 2
    var count
    var rows

    var reply = function() {
      var fn = reply_
      reply_ = Function()
      return fn.apply(this, arguments)
    }

    req.querybox.run('find-issue-repo-responses', [req.params.repoUser, req.params.repoName, 10 * page], onrows)
    req.querybox.run('find-issue-repo-responses-count', [req.params.repoUser, req.params.repoName], oncount)

    function oncount(err, result) {
      if (err) {
        return reply(err)
      }

      count = result.rows[0].count
      !--pending && onready()
    }

    function onrows(err, result) {
      if (err) {
        return reply(err)
      }

      rows = result.rows.map(toObject)
      !--pending && onready()
    }

    function onready() {
      if (!rows.length) {
        return reply({
          objects: [],
          meta: {
            count: count,
            next: null,
            prev: null
          }
        }).code(404)
      }

      var baseURL = '/api/v1/issues/' + req.params.repoUser + '/' + req.params.repoName
      return reply({
        objects: rows,
        meta: {
          next: (page + 1) * 10 > count ?
            null :
            (getHost() + baseURL + '?p=' + (page + 1)),
          prev: !page ?
            null :
            (getHost() + baseURL + (page - 1 ? '?p=' + (page - 1) : '')),
          count: count
        }
      })
    }
  }

  function apiIssueDetail(req, reply) {
    var page = req.query.p ? 10 * Math.abs(Number(req.query.p)) : 0
    req.querybox.run('find-issue-repo-number-responses', [
      req.params.repoUser,
      req.params.repoName,
      req.params.number
    ], onrows)

    function onrows(err, result) {
      if (err) {
        return reply(err)
      }

      if (!result.rows.length) {
        return reply({objects: []}).code(404)
      }

      var rows = result.rows.map(toObject)
      return reply(rows[0] || {})
        .code(rows.length ? 200 : 404)
    }

  }
}
