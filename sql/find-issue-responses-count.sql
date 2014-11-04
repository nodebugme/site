SELECT 
  COUNT(DISTINCT "t0"."issue_id") as "count" 
FROM "nbm_user_issue" "t0"
  LEFT JOIN "nbm_issue" t1 ON (t0."issue_id" = t1."id")
WHERE
  "t0"."state" = 'complete' AND
  "t1"."state" = 'open'
