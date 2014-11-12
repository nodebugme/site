INSERT INTO "nbm_issue" (
  "number",
  "repo_id",
  "state",
  "title",
  "created_at",
  "updated_at",
  "closed_at",
  "body",
  "user",
  "assignee",
  "locked",
  "labels",
  "is_pull_request"
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  $9,
  $10,
  $11,
  $12,
  $13
) RETURNING "id"
