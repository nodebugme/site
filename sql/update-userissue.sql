UPDATE "nbm_user_issue" SET
  "state" = $2,
  "duplicates" = $3,
  "is_feature_request" = $4,
  "has_consensus" = $5,
  "has_reproduction_steps" = $6,
  "is_fixed_on_node_10" = $7,
  "is_fixed_on_node_11" = $8,
  "updated_at" = $9,
  "finished_at" = $10
WHERE "id" = $1
