SELECT
  "t0"."updated_at" AS "updatedAt"
FROM "nbm_issue" "t0"
WHERE "repo_id" = $1
ORDER BY "t0"."updated_at" DESC
OFFSET 0 LIMIT 1
