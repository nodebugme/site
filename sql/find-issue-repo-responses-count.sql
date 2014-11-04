SELECT 
  COUNT(DISTINCT "t0"."issue_id") as "count" 
FROM "nbm_user_issue" "t0"
  LEFT JOIN "nbm_issue" t1 ON (t0."issue_id" = t1."id")
  LEFT JOIN "nbm_repo" t2 ON (t1."repo_id" = t2."id")
WHERE
  "t0"."state" = 'complete' AND
  "t1"."state" = 'open' AND
  "t2"."user" = $1 AND
  "t2"."name" = $2
