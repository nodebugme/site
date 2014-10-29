module.exports = createHandlers

var OAuth = require('oauth')
var hapi = require('hapi')
var joi = require('joi')
var url = require('url')

function createHandlers(server, settings) {
  var displayThanks = {
    view: 'thanks.hbs'
  }

  var staticMedia = {
    directory: {
      path: __dirname + '/public',
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
    static:           {handler: staticMedia, auth: false}
  }

  function displayHomepage(req, reply) {
    console.log(req.auth.credentials)
    if (req.auth.credentials) {
      return reply.redirect('/triage')
    }

    req.models.Issue.getUntriagedIssues(function(err, num) {
      reply.view('homepage.hbs', {
        openBugs: num || 0
      })
    })
  }

  function triageHome(req, reply) {
    req.models.UserIssue.getCurrent(req.auth.credentials, onuserissue)

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
    req.models.UserIssue.getOrCreateForUser(req.auth.credentials, onuserissue)

    function onuserissue(err, current) {
      if (err) {
        return reply(err)
      }

      if (req.payload.skip) {
        current.state = 'incomplete'
        return current.update(function(err) {
          req.payload.skip = false
          startTriage(req, reply)
        })
      }

      reply.redirect('/triage/' + [ 
        current.issue.repo.user,
        current.issue.repo.name,
        current.issue.number
      ].join('/'))
    }
  }

  function viewIssueTriage(req, reply) {
    req.models.UserIssue.getByPath(
      req.auth.credentials,
      req.params.repo,
      req.params.name,
      req.params.number,
      onuserissue
    )

    function onuserissue(err, current) {
      if (err) {
        return reply(err)
      }

      reply.view('issue-detail.hbs', {
        userIssue: current
      })
    }
  }

  function triageFeedback(req, reply) {
    req.models.UserIssue.getByPath(
      req.auth.credentials,
      req.params.repo,
      req.params.name,
      req.params.number,
      onuserissue
    )

    function onuserissue(err, current) {
      if (err) {
        return reply(err)
      }

      current.provideAnswer(req.payload, function(err, invalidationClass) {
        if (err) {
          return reply(err)
        }

        if (invalidationClass) {
          return reply.view('issue-detail.hbs', {
            userIssue: current,
            errorClass: invalidationClass
          })
        }

        reply.redirect(current.state === 'complete' ? '/triage' : '/triage/' + [
          current.issue.repo.user,
          current.issue.repo.name,
          current.issue.number
        ].join('/'))
      })
    }
  }

  function doLogin(req, reply) {
    req.models.User.fromCredentials(req.auth.credentials, function(err, user) {
      if (err) {
        return reply(err)
      }

      req.auth.session.set(user)
      reply.redirect('/triage')
    })
  }
}
