var assert = require('assert')
var http = require('http')

module.exports = function(location, ready) {
  iter(location + '/api/v1/issues', ready)
}

function iter(url, ready) {
  http.get(url, function(res) {
    var accum = []
    res.on('data', [].push.bind(accum))
    res.on('end', function() {
      var container = JSON.parse(Buffer.concat(accum).toString('utf8'))
      try {
        container.objects.forEach(check)
      } catch(err) {
        return ready(err)
      }

      if (container.meta.next) {
        iter(container.meta.next, ready)
      } else {
        ready()
      }
    })
  })
}

function check(item) {
  var total = +item.stats.total

  var checkPlain = [
    'hasConsensus',
    'hasReproductionSteps',
    'inCorrectRepository',
    'isFeatureRequest'
  ]

  checkPlain.forEach(function(xs) {
    console.log('checking %s[%s]', item.number, xs)
    assert.equal(+item.stats[xs].yes + +item.stats[xs].no + +item.stats[xs].idk, total)
  })

  for(var key in item.stats.isIssueOnVersions) {
    console.log('checking %s.isIssueOnVersions[%s]', item.number, key)
    assert.equal(+item.stats.isIssueOnVersions[key].yes + +item.stats.isIssueOnVersions[key].no + +item.stats.isIssueOnVersions[key].idk, total)
  }
}
