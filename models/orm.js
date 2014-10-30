'use strict'

module.exports = makeORM

var inherits = require('inherits')
var debug = require('debug')('orm')

function makeORM(baseClass, db, models, fields) {
  var table = 'nbm_' + toSnake(baseClass.name)

  baseClass.prototype.__proto__ = ORMBase.prototype
  ORMImpl.prototype = baseClass.prototype
  ORMImpl.prototype._db = db
  ORMImpl.prototype._fields = fields
  ORMImpl.prototype._table = table
  ORMImpl.prototype._models = models

  for (var key in ORMBase) if(typeof ORMBase[key] === 'function') { 
    ORMImpl[key] = ORMBase[key]
  }

  for (var key in baseClass) if(typeof baseClass[key] === 'function') { 
    ORMImpl[key] = baseClass[key]
  }

  return ORMImpl

  function ORMImpl(info) {
    ORMBase.call(this)
    info = info || {}
    for(var i = 0, len = this._fields.length; i < len; ++i) {
      this[fromSnake(this._fields[i])] =
        this._fields[i] in info ? info[this._fields[i]] : info[fromSnake(this._fields[i])]
    }
    baseClass.apply(this, arguments)
  }
}

function ORMBase() {
}

function format(op, params, value) {
  switch(op) {
    case 'lt': {
      params.push(value)
      return ' < $' + params.length
    }
    case 'notInTable': {
      // HURK: this is awful never do this
      params.push(value)
      return ' NOT IN (SELECT "id" FROM "nbm_user_issue" WHERE' +
        '"nbm_user_issue"."id" = $' + params.length + ')'
    }
    case 'isNot': {
      params.push(value)
      return ' <> $' + params.length
    }
    case 'in': {
      var out = []
      for(var i = 0; i < value.length; ++i) {
        params.push(value[i])
        out.push('$' + params.length)
      }
      return 'IN (' + out.join(', ') + ')'
    }
    case 'notIn': {
      var out = []
      for(var i = 0; i < value.length; ++i) {
        params.push(value[i])
        out.push('$' + params.length)
      }
      return ' NOT IN (' + out.join(', ') + ')'
    }
  }

  params.push(value)
  return ' = $' + params.length
}

function makeQuery(q, params) {
  var query = []
  for(var key in q) if(q.hasOwnProperty(key)) {
    var split = key.split(':')
    var rhs = format(split[1], params, q[key])
    query.push(toSnake(split[0]) + rhs)
  }
  query = query.length ? ' WHERE ' + query.join(' AND ') : ''
  return query
}

ORMBase.find = function(q, bounds, ordering, ready) {
  // god, this again
  if (arguments.length === 3) {
    ready = ordering
    ordering = []
  } else if (arguments.length === 2) {
    ready = bounds
    bounds = [0, 10]
  }

  var cons = this
  var fields = this.prototype._fields.map(function(xs) {
    return JSON.stringify(xs)
  })
  var table = this.prototype._table
  var db = this.prototype._db

  var query = null
  var params = []

  query = makeQuery(q, params)

  ordering = Array.isArray(ordering) ? ordering : [ordering]
  ordering = ordering.map(function(xs) {
    return xs[0] === '-' ? JSON.stringify(xs.slice(1)) + ' DESC' :
      JSON.stringify(xs)
  })
  ordering = ordering.length ? ' ORDER BY ' + ordering.join(', ') : ''

  var limit = bounds === null ? ' ' : ' LIMIT ' + bounds[1] + ' OFFSET ' + bounds[0]

  var queryString = 
    'SELECT ' + fields.join(', ') + ' FROM ' + table + query + ordering + limit

  debug(queryString, params)
  db.query(queryString, params, onresult)

  function onresult(err, result) {
    if (err) {
      return ready(err)
    }

    return ready(null, result.rows.map(function(row) {
      return new cons(row)
    }))
  }
}

ORMBase.get = function(q, ready) {
  this.find(q, [0, 2], onresult)

  function onresult(err, result) {
    if (err) {
      return ready(err)
    }

    if (result.length > 1) {
      return ready(new Error('Got multiple results!'))
    }

    return ready(null, result[0])
  }
}

ORMBase.create = function(opts, ready) {
  var cons = this
  var table = this.prototype._table
  var db = this.prototype._db
  var placeholders = []
  var fields = []
  var values = []
  for(var i = 0, len = this.prototype._fields.length; i < len; ++i) {
    if (fromSnake(this.prototype._fields[i]) in opts) {
      fields.push(JSON.stringify(this.prototype._fields[i]))
      values.push(opts[fromSnake(this.prototype._fields[i])])
      placeholders.push('$' + (placeholders.length + 1))
    }
  }

  fields = fields.join(', ')
  placeholders = placeholders.join(', ')

  var queryString = 'INSERT INTO ' + table + ' (' + fields + ') VALUES (' + placeholders + ') RETURNING *'

  debug(queryString, values)
  db.query(queryString, values, function(err, result) {
    if (err) {
      return ready(err)
    }

    if (!result.rows.length) {
      return ready(new Error('expected at least one row to be created'))
    }

    return ready(null, new cons(result.rows[0]))
  })
}

ORMBase.prototype.update = function(ready) {
  var db = this._db
  var values = []
  var fields = this._fields.slice()
  fields.splice(fields.indexOf('id'), 1)
  var params = fields.map(function(xs, idx) {
    var value = this[fromSnake(xs)]

    if (value !== undefined) {
      values.push(value)
      value = '$' + values.length
    } else {
      value = 'DEFAULT'
    }

    return JSON.stringify(xs) + ' = ' + value
  }, this)

  values.push(this.id)

  var queryString = 'UPDATE ' + this._table + ' SET ' + params.join(', ') +
    ' WHERE id = $' + values.length

  debug(queryString, values)
  db.query(queryString, values, function(err) {
    if (err) {
      return ready(err)
    }
    ready()
  })
}

ORMBase.prototype.delete = function(ready) {
  var db = this._db

  db.query('DELETE FROM ' + this._table + ' WHERE "id" = ' + this._id, ready)
}

function toSnake(name) {
  return name.replace(/[a-z0-9][A-Z0-9]/g, camelReplacer).toLowerCase()
}

function fromSnake(name) {
  return name.replace(/_[a-z0-9]/g, snakeReplacer)
}

function camelReplacer(m) {
  return m[0] + '_' + m[1].toLowerCase()
}

function snakeReplacer(m) {
  return m[1].toUpperCase()
}
