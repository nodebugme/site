'use strict'

module.exports = createUserModel

var makeORM = require('./orm.js')

function createUserModel(db, models) {
  return makeORM(User, db, models, [
    'id',
    'username',
    'display_name',
    'avatar',
    'email',
    'token',
    'created_at'
  ])
}

function User() {
  this.createdAt = new Date(this.createdAt)
}

User.fromCredentials = function(creds, ready) {
  var model = this

  model.get({username: creds.profile.username}, function(err, user) {
    if (err) {
      return ready(err)
    }

    if (user) {
      return ready(null, user)
    }

    return model.create({
      username: creds.profile.username,
      displayName: creds.profile.displayName,
      email: creds.profile.email,
      avatar: creds.profile.raw.avatar_url,
      token: creds.token
    }, ready)
  })
}
