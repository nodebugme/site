SELECT
  -- userissue fields
  "t0"."id" AS "id",
  "t0"."state" AS "state",
  "t0"."in_correct_repository" AS "inCorrectRepository",
  "t0"."duplicates" AS "duplicates",
  "t0"."is_feature_request" AS "isFeatureRequest",
  "t0"."has_consensus" AS "hasConsensus",
  "t0"."has_reproduction_steps" AS "hasReproductionSteps",
  "t0"."started_at" AS "startedAt",
  "t0"."updated_at" AS "updatedAt",
  "t0"."finished_at" AS "finishedAt",

  -- issue fields
  "t1"."number" AS "issue.number",
  "t1"."state" AS "issue.state",
  "t1"."title" AS "issue.title",
  "t1"."created_at" AS "issue.createdAt",
  "t1"."updated_at" AS "issue.updatedAt",
  "t1"."closed_at" AS "issue.closedAt",
  "t1"."body" AS "issue.body",
  "t1"."user" AS "issue.user",
  "t1"."assignee" AS "issue.assignee",
  "t1"."locked" AS "issue.locked",
  "t1"."labels" AS "issue.labels",
  "t1"."triage_count" AS "issue.triageCount",

  -- repo fields
  "t2"."user" AS "issue.repo.user",
  "t2"."name" AS "issue.repo.name",
  "t2"."versions"::text[] AS "issue.repo.versions"
FROM "nbm_user_issue" t0
  LEFT JOIN "nbm_issue" t1 ON (t0."issue_id" = t1."id")
  LEFT JOIN "nbm_repo" t2 ON (t1."repo_id" = t2."id")
WHERE
  t0."user_id" = $1 AND
  t2."user" = $2 AND
  t2."name" = $3 AND
  t1."number" = $4 AND
  t0."state" NOT IN ('complete', 'incomplete')
OFFSET 0 LIMIT 1
