module.exports = createIssue

var path = require('path')
var fs = require('fs')

var QUERY = fs.readFileSync(
  path.join(__dirname, '..', '..', 'sql', 'create-issue.sql'),
  'utf8'
)

function createIssue(db, opts, ready) {
  opts.number = 'number' in opts ? opts.number : parseInt(Math.random() * 8000, 10) 
  opts.repo_id = opts.repo_id || 1
  opts.state = 'state' in opts ? opts.state : 'open'
  opts.title = 'title' in opts ? opts.title : 'example title'
  opts.created_at = 'created_at' in opts ? opts.created_at : new Date()
  opts.updated_at = 'updated_at' in opts ? opts.updated_at : new Date()
  opts.closed_at = 'closed_at' in opts ? opts.closed_at : null
  opts.body = 'body' in opts ? opts.body : 'example body'
  opts.user = 'user' in opts ? opts.user : 'garybusey'
  opts.assignee = 'assignee' in opts ? opts.assignee : 'ry'
  opts.locked = 'locked' in opts ? opts.locked : false
  opts.labels = 'labels' in opts ? opts.labels : '{nope}'

  db.query(QUERY, [
    opts.number,
    opts.repo_id,
    opts.state,
    opts.title,
    opts.created_at,
    opts.updated_at,
    opts.closed_at,
    opts.body,
    opts.user,
    opts.assignee,
    opts.locked,
    opts.labels
  ], ready)
}
