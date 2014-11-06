WITH "userIssueIds"(
  "userIssueId",
  "issue_id",
  "in_correct_repository",
  "duplicates",
  "has_consensus",
  "is_feature_request",
  "has_reproduction_steps"
) AS (
  SELECT
    "nbm_user_issue"."id",
    "nbm_user_issue"."issue_id",
    "nbm_user_issue"."in_correct_repository",
    "nbm_user_issue"."duplicates",
    "nbm_user_issue"."has_consensus",
    "nbm_user_issue"."is_feature_request",
    "nbm_user_issue"."has_reproduction_steps"
  FROM "nbm_user_issue"
  LEFT JOIN "nbm_issue" "t1" ON ("nbm_user_issue"."issue_id" = "t1"."id")
  WHERE
    "nbm_user_issue"."state" = 'complete' AND
    "t1"."state" = 'open'
), "versionStats"("uiid", "versions", "state") AS (
  SELECT
    "user_issue_id" as "uiid",
    string_agg("version"::text, ',') as "versions",
    string_agg((case "is_issue"
      when true then 'yes'
      when false then 'no'
      else 'idk'
    end), ',') as "state"
    FROM "nbm_user_issue_version"
    WHERE "user_issue_id" IN (SELECT "userIssueId" FROM "userIssueIds")
    GROUP BY "user_issue_id"
), "stats"(
  "issueId", 
  "total",
  "in_correct_repository_yes",
  "in_correct_repository_no",
  "duplicates",
  "has_consensus_yes",
  "has_consensus_no",
  "is_feature_request_yes",
  "is_feature_request_no",
  "has_reproduction_steps_yes",
  "has_reproduction_steps_no",
  "versions",
  "states"
) AS (
  SELECT
    "issue_id" as "id",
    -- # responses
    count("issue_id") as "total",

    -- in correct repo?
    sum(
      case when "in_correct_repository" = true then 1 else 0 end
    ) as "in_correct_repository_yes",
    sum(
      case when "in_correct_repository" = false then 1 else 0 end
    ) as "in_correct_repository_no",

    array_agg("duplicates") as "duplicates",

    -- has consensus?
    sum(
      case when "has_consensus" = true then 1 else 0 end
    ) as "has_consensus_yes",
    sum(
      case when "has_consensus" = false then 1 else 0 end
    ) as "has_consensus_no",

    -- is feature?
    sum(
      case when "is_feature_request" = true then 1 else 0 end
    ) as "is_feature_request_yes",
    sum(
      case when "is_feature_request" = false then 1 else 0 end
    ) as "is_feature_request_no",

    -- reproducible?
    sum(
      case when "has_reproduction_steps" = true then 1 else 0 end
    ) as "has_reproduction_steps_yes",
    sum(
      case when "has_reproduction_steps" = false then 1 else 0 end
    ) as "has_reproduction_steps_no",

    string_agg("t2"."versions", ',') as "versions",
    string_agg("t2"."state", ',') as "state"

  FROM "versionStats" "t2"
  LEFT JOIN "userIssueIds" on ("t2"."uiid" = "userIssueIds"."userIssueId")
  GROUP BY "issue_id"
)
SELECT
  -- issue fields
  "t0"."number" AS "number",
  "t0"."state" AS "state",
  "t0"."title" AS "title",
  "t0"."created_at" AS "createdAt",
  "t0"."updated_at" AS "updatedAt",
  "t0"."closed_at" AS "closedAt",

  -- repo fields
  (
    'https://github.com/' ||
    "t1"."user" ||
    '/' ||
    "t1"."name" ||
    '/' ||
    "t0"."number"
  ) AS "issueURL",

  -- stats
  "stats"."total" AS "stats.total",
  "stats"."duplicates" AS "stats.duplicates",
  "stats"."in_correct_repository_yes" AS "stats.inCorrectRepository.yes",
  "stats"."in_correct_repository_no" AS "stats.inCorrectRepository.no",
  ("stats"."total" - "stats"."in_correct_repository_no" - "stats"."in_correct_repository_yes") AS "stats.inCorrectRepository.idk",
  "stats"."has_consensus_yes" AS "stats.hasConsensus.yes",
  "stats"."has_consensus_no" AS "stats.hasConsensus.no",
  ("stats"."total" - "stats"."has_consensus_no" - "stats"."has_consensus_yes") AS "stats.hasConsensus.idk",
  "stats"."is_feature_request_yes" AS "stats.isFeatureRequest.yes",
  "stats"."is_feature_request_no" AS "stats.isFeatureRequest.no",
  ("stats"."total" - "stats"."is_feature_request_no" - "stats"."is_feature_request_yes") AS "stats.isFeatureRequest.idk",
  "stats"."has_reproduction_steps_yes" AS "stats.hasReproductionSteps.yes",
  "stats"."has_reproduction_steps_no" AS "stats.hasReproductionSteps.no",
  ("stats"."total" - "stats"."has_reproduction_steps_no" - "stats"."has_reproduction_steps_yes") AS "stats.hasReproductionSteps.idk",
  string_to_array("stats"."states", ',', 'NULL') AS "stats.versions.states",
  string_to_array("stats"."versions", ',', 'NULL') AS "stats.versions.versions"

FROM "stats"
  LEFT JOIN "nbm_issue" "t0" ON ("stats"."issueId" = "t0"."id")
  LEFT JOIN "nbm_repo" "t1" ON ("t0"."repo_id" = "t1"."id")
  WHERE
    "t1"."user" = $1 AND
    "t1"."name" = $2 AND
    "t0"."number" = $3
OFFSET $4 LIMIT 10
