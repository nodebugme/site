SELECT
  "t0"."state" AS "state",
  "t0"."in_correct_repository" AS "inCorrectRepository",
  "t0"."duplicates" AS "duplicates",
  "t0"."is_feature_request" AS "isFeatureRequest",
  "t0"."has_consensus" AS "hasConsensus",
  "t0"."has_reproduction_steps" AS "hasReproductionSteps",
  "t3"."versions" AS "versions.versions",
  "t3"."states" AS "versions.states",
  "t0"."started_at" AS "startedAt",
  "t0"."updated_at" AS "updatedAt",
  "t0"."finished_at" AS "finishedAt",
  (
    'https://github.com/' ||
    "t2"."user" ||
    '/' ||
    "t2"."name" ||
    '/' ||
    "t1"."number"
  ) AS "issueURL"
FROM "nbm_user_issue" t0
  LEFT JOIN "nbm_issue" t1 ON (t0."issue_id" = t1."id")
  LEFT JOIN "nbm_repo" t2 ON (t1."repo_id" = t2."id")
  LEFT OUTER JOIN (
    SELECT
      "user_issue_id",
      array_agg("version") as "versions",
      array_agg((case "is_issue"
        when true then 'yes'
        when false then 'no'
        else 'idk'
      end)) as "states"
    FROM "nbm_user_issue_version"
    GROUP BY "user_issue_id"
  ) t3 ON (t3."user_issue_id" = t0."id")
WHERE
  "t0"."state" = ANY($1::user_issue_state[])
ORDER BY "t0"."issue_id" DESC
OFFSET $2 LIMIT 10
