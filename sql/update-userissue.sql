UPDATE "nbm_user_issue" SET
  "state" = $2,
  "in_correct_repository" = $3,
  "duplicates" = $4,
  "is_feature_request" = $5,
  "has_consensus" = $6,
  "has_reproduction_steps" = $7,
  "updated_at" = $8,
  "finished_at" = $9
WHERE "id" = $1
