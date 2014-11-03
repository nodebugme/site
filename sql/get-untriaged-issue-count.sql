SELECT
  COUNT(*) AS "count"
FROM "nbm_issue" "t0"
WHERE
  "t0"."state" = 'open' AND
  "t0"."triage_count" = 0
