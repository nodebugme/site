module.exports = migrate

var debug = require('debug')('migrate')
var once = require('once')
var path = require('path')
var fs = require('fs')

function migrate(db, ready) {
  var queries = []
  var files = null
  var pending = 0

  ready = once(ready)
  fs.readdir(path.join(__dirname, '..', 'migrations'), onls)

  function onls(err, results) {
    if (err) {
      return err
    }

    files = results.filter(function(file) {
      return /\.sql$/.test(file)
    }).sort()

    pending = files.length

    files.forEach(function(file, idx) {
      fs.readFile(
        path.join(__dirname, '..', 'migrations', file),
        'utf8',
        onfile
      )

      function onfile(err, data) {
        if (err) {
          return ready(err)
        }

        queries[idx] = data
        !--pending && run()
      }
    })
  }

  function run() {
    iter(null)
  }

  function iter(err) {
    if (err) {
      return ready(err)
    }

    if (!queries.length) {
      return ready()
    }

    var data = queries.shift()
    debug('running...', files.shift())

    // hurk
    data = data.split(';').filter(function(xs) {
      return Boolean(xs.replace(/\s+/g, ''))
    })

    innerIter()

    function innerIter(err) {
      if (err) {
        return ready(err)
      }

      if (!data.length) {
        return iter()
      }

      db.query(data.shift(), innerIter)
    }
  }
}
