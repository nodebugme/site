SELECT
  COUNT(*) AS "count"
FROM "nbm_user_issue"
WHERE
  "state" = ANY($1::user_issue_state[])
