var spawn = require('child_process').spawn
var migrate = require('./lib/migrate.js')
var sync = require('./sync-gh-issues.js')
var ghauth = require('ghauth')
var read = require('read')
var path = require('path')
var open = require('open')
var pg = require('pg.js')
var os = require('os')
var fs = require('fs')

var configPath = path.join(__dirname, 'config.json')

if (!fs.existsSync(configPath)) {
  var json = JSON.parse(fs.readFileSync(configPath + '.example', 'utf8'))

  spawn('which', ['psql']).on('exit', function(code) {
    if (code) {
      console.log('it looks like postgres isn\'t installed.')
      if (os.platform() === 'darwin') {
        console.log('to install (using homebrew, in a separate terminal):')
        console.log('')
        console.log('   brew install postgres')
        console.log('   postgres -D /usr/local/var/postgres')
        console.log('')
      }
      return process.exit(1)
    }

    process.stdout.write('creating "nodebugme" database... ')
    spawn('createdb', ['nodebugme']).on('exit', function(code) {
      if (code) {
        console.log('failed! (tried "createdb nodebugme")')
        return process.exit(1)
      }
      console.log('done.')

      process.stdout.write('setting up "nodebugme" tables... ')
      pg.connect(json.server.plugins.database, function(err, client, done) {
        if (err) {
          console.log('failed! (%s)', err.message)
          return process.exit(1)
        }

        migrate(client, function(err) {
          if (err) {
            console.log('failed! (%s)', err.message)
            return process.exit(1)
          }

          console.log('done.')
          process.stdout.write('getting credentials for github sync... ')
          ghauth({
            noSave: true,
            scopes: ['user'],
            note: 'syncing local nodebugme instance',
            userAgent: 'nodebugme local'
          }, onauth)
        })
      })
    })

    function onauth(err, authData) {
      if (err) {
        console.log('failed! (%s)', err.message)
        return process.exit(1)
      }

      console.log('done.')
      json.githubSyncToken = authData.token
      console.log('setting up a new github application.')
      console.log('')
      console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
      console.log('')
      console.log('   hey! listen!')
      console.log('   In a few seconds a website (https://github.com/settings/applications/new) should open.')
      console.log('   The only *important* parameter to fill in is "Authorization Callback URL", which ')
      console.log('   should be *exactly*:')
      console.log('')
      console.log('       http://localhost:8080/login')
      console.log('')
      console.log('   Once you create the application, return to this terminal')
      console.log('   and enter the "Client ID" and "Client Secret".')
      console.log('')
      console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
      setTimeout(function() {
        open('https://github.com/settings/applications/new', function() {
          read({prompt: 'Client ID:'}, function(err, cid) {
            if (err) {
              console.log('failed! (%s)', err.message)
              return process.exit(1)
            }
            read({prompt: 'Client Secret:'}, function(err, cst) {
              if (err) {
                console.log('failed! (%s)', err.message)
                return process.exit(1)
              }
              json.githubClientID = cid
              json.githubClientSecret = cst
              fs.writeFileSync(configPath, JSON.stringify(json, null, 2))
              process.stdout.write('syncing github issues (this may take a while)... ')
              sync(function(err) {
                if (err) {
                  console.log('failed! (%s)', err.message)
                  return process.exit(1)
                }
                console.log('done!')
                done()
              })
            })
          })
        })
      }, 10000)
    }
  })
} else {
  done()
}

function done() {
  require('./app.js')(null, function(err, server) {
    if (err) throw err
    server.start(function(err) {
      console.log('server listening on ' + server.info.uri)
    })
  })
}
