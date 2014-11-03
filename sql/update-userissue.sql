UPDATE "nbm_user_issue" SET
  "state" = $2,
  "in_correct_repository" = $3,
  "duplicates" = $4,
  "is_feature_request" = $5,
  "has_consensus" = $6,
  "has_reproduction_steps" = $7,
  "is_fixed_on_node_10" = $8,
  "is_fixed_on_node_11" = $9,
  "updated_at" = $10,
  "finished_at" = $11
WHERE "id" = $1
