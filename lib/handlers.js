module.exports = createHandlers

var OAuth = require('oauth')
var hapi = require('hapi')
var joi = require('joi')
var url = require('url')

var addResponse = require('./add-response-to-user-issue.js')
var userIssue = require('./operations/user-issue.js')
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

  startTriage.needsTransaction = true
  triageFeedback.needsTransaction = true

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
    userIssue.getCurrent(req.querybox, req.auth.credentials, onuserissue)

    function onuserissue(err, current) {
      if (err) {
        return reply(err)
      }

      reply.view('triage-home.hbs', {
        current: current
      })
    }
  }

  function startTriage(req, reply) {
    userIssue.startNew(
      req.querybox,
      req.auth.credentials,
      req.payload.skip,
      oncurrent
    )

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
    userIssue.byPath(
      req.querybox, req.auth.credentials, req.params, onuserissue
    )

    function onuserissue(err, current) {
      if (err) {
        return reply(err)
      }

      if (!current) {
        return reply.redirect('/triage')
      }

      reply.view('issue-detail.hbs', {
        userIssue: current
      })
    }
  }

  function triageFeedback(req, reply) {
    var current

    userIssue.byPath(
      req.querybox, req.auth.credentials, req.params, onuserissue
    )

    function onuserissue(err, result) {
      if (err) {
        return reply(err)
      }

      current = result

      var errorClass = addResponse(current, req.payload)
      if (errorClass) {
        return reply.view('issue-detail.hbs', {
          userIssue: current,
          errorClass: errorClass
        })
      }

      userIssue.update(req.querybox, current, onanswered)
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
    _getResponsePage(
      req, reply, userIssue.states.ANY, '/api/v1/responses/all'
    )
  }

  function apiComplete(req, reply) {
    _getResponsePage(
      req, reply, userIssue.states.COMPLETE, '/api/v1/responses/complete'
    )
  }

  function _getResponsePage(req, reply_, search, baseURL) {
    var page = req.query.p ? Math.abs(Number(req.query.p)) : 0

    userIssues.findResponses(req.querybox, search, page, sendResponse)

    return

    function sendResponse(err, result) {
      if (err) {
        return reply(err)
      }

      var responseContainer = toResponseContainer(
        result,
        getHost() + baseURL
      )

      reply(responseContainer)
        .code(responseContainer.objects.length ? 200 : 404)
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
