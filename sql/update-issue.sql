UPDATE "nbm_issue" SET
  "state" = $3,
  "title" = $4,
  "created_at" = $5,
  "updated_at" = $6,
  "closed_at" = $7,
  "body" = $8,
  "user" = $9,
  "assignee" = $10,
  "locked" = $11,
  "labels" = $12
WHERE "number" = $1 AND "repo_id" = $2
