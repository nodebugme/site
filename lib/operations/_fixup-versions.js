module.exports = fixupVersions

function fixupVersions(item, path, output) {
  var states = item[path + '.states']
  var versions = item[path + '.versions']
  delete item[path + '.states']
  delete item[path + '.versions']

  item[output] = states.reduce(function(lhs, rhs, idx) {
    ;(lhs[versions[idx]] = lhs[versions[idx]] || {yes: 0, no: 0, idk: 0})
      [rhs]++

    return lhs
  }, {})
}
