'use strict'

module.exports = createRepoModel

var makeORM = require('./orm.js')

function createRepoModel(db, models) {
  return makeORM(Repo, db, models, [
    'id',
    'user',
    'name'
  ])
}

function Repo() {

}
