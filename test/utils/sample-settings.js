module.exports = getSettings

function getSettings() {
  return {
    "port": 8080,
    "SECRET_KEY": "YER A SECRET",
    "githubClientID": "64a4009cab63ac370f80", // <-- phony, taken from git log
    "githubSyncToken": "null",
    "githubClientSecret": "asdf",
    "googleAnalytics": "",
    "isSecure": false,
    "staticURL": "http://localhost:8080/public/",
    "routes": {
      "serveStatic": true
    },
    "disablePlugins": {"crumb": true, "good": true},
    "server": {
      "security": true,
      "state": {
        "cookies": {
          "parse": true,
          "failAction": "log"
        }
      },
      "plugins": {
        "database": {
          "poolSize": 4,
          "user": null,
          "database": "nodebugme_test",
          "password": null,
          "port": 5432,
          "host": "localhost",
          "ssl": false
        }
      }
    }
  }
}
