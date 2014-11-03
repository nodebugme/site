module.exports = toObject

function toObject(obj) {
  var keys = Object.keys(obj)
  var base = {}
  var current
  var path

  for (var i = 0, len = keys.length; i < len; ++i) {
    path = keys[i].split('.')
    current = base

    for (var j = 0, jlen = path.length - 1; j < jlen; ++j) {
      current = current[path[j]] = current[path[j]] || {}
    }

    current[path[j]] = obj[keys[i]]
  }

  return base
}
