SELECT
  -- issue fields
  "t0"."id" AS "id",
  "t0"."number" AS "number",
  "t0"."state" AS "state",
  "t0"."title" AS "title",
  "t0"."created_at" AS "createdAt",
  "t0"."updated_at" AS "updatedAt",
  "t0"."closed_at" AS "closedAt",
  "t0"."body" AS "body",
  "t0"."user" AS "user",
  "t0"."assignee" AS "assignee",
  "t0"."locked" AS "locked",
  "t0"."labels" AS "labels",
  "t0"."triage_count" AS "triageCount",

  -- repo fields
  "t1"."user" AS "repo.user",
  "t1"."name" AS "repo.name",

  -- random element
  random() as "_randomValue"
FROM "nbm_issue" "t0"
LEFT JOIN "nbm_repo" "t1" ON ("t0"."repo_id" = "t1"."id")
WHERE
  "t0"."state" = 'open' AND
  "t0"."is_pull_request" = FALSE AND
  "t0"."id" NOT IN (
    SELECT "issue_id" FROM "nbm_user_issue" "t2"
    WHERE "t2"."user_id" = $1
  )
ORDER BY "t0"."triage_count" ASC, "_randomValue" ASC
OFFSET 0 LIMIT 10
