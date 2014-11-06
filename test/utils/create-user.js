module.exports = createUser

function createUser(db, opts, ready) {
  opts.display_name = 'display_name' in opts ? opts.display_name : 'Gary Busey'
  opts.avatar = 'avatar' in opts ? opts.avatar : 'http://gary.busey'
  opts.email = 'email' in opts ? opts.email : 'me@gary.busey'
  opts.token = 'token' in opts ? opts.token :
    Math.random().toFixed(20).slice(2) +
    Math.random().toFixed(20).slice(2)

  db.query('insert into nbm_user (username, display_name, avatar, email, token) ' +
  ' VALUES ($1, $2, $3, $4, $5) RETURNING id', [
    opts.username,
    opts.display_name,
    opts.avatar,
    opts.email,
    opts.token
  ], onresult)

  function onresult(err, result) {
    if (err) {
      return ready(err)
    }

    opts.id = result.rows[0].id
    return ready(null, opts)
  }
}
