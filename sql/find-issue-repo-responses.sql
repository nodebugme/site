SELECT
  -- issue fields
  "t1"."number" AS "number",
  "t1"."state" AS "state",
  "t1"."title" AS "title",
  "t1"."created_at" AS "createdAt",
  "t1"."updated_at" AS "updatedAt",
  "t1"."closed_at" AS "closedAt",

  -- repo fields
  "t2"."user" AS "repo.user",
  "t2"."name" AS "repo.name",

  -- stats
  "stats"."total" AS "stats.total",
  "stats"."duplicates" AS "stats.duplicates",
  "stats"."in_correct_repository_yes" AS "stats.inCorrectRepository.yes",
  "stats"."in_correct_repository_no" AS "stats.inCorrectRepository.no",
  ("stats"."total" - "stats"."in_correct_repository_no" - "stats"."in_correct_repository_yes") AS "stats.inCorrectRepository.idk",
  "stats"."has_consensus_yes" AS "stats.hasConsensus.yes",
  "stats"."has_consensus_no" AS "stats.hasConsensus.no",
  ("stats"."total" - "stats"."has_reproduction_steps_no" - "stats"."has_consensus_yes") AS "stats.hasConsensus.idk",
  "stats"."is_feature_request_yes" AS "stats.isFeatureRequest.yes",
  "stats"."is_feature_request_no" AS "stats.isFeatureRequest.no",
  ("stats"."total" - "stats"."is_feature_request_no" - "stats"."is_feature_request_yes") AS "stats.isFeatureRequest.idk",
  "stats"."has_reproduction_steps_yes" AS "stats.hasReproductionSteps.yes",
  "stats"."has_reproduction_steps_no" AS "stats.hasReproductionSteps.no",
  ("stats"."total" - "stats"."has_reproduction_steps_no" - "stats"."has_reproduction_steps_yes") AS "stats.hasReproductionSteps.idk",
  "stats"."is_fixed_on_node_10_yes" AS "stats.isIssueOnNode10.yes",
  "stats"."is_fixed_on_node_10_no" AS "stats.isIssueOnNode10.no",
  ("stats"."total" - "stats"."is_fixed_on_node_10_no" - "stats"."is_fixed_on_node_10_yes") AS "stats.isIssueOnNode10.idk",
  "stats"."is_fixed_on_node_11_yes" AS "stats.isIssueOnNode11.yes",
  "stats"."is_fixed_on_node_11_no" AS "stats.isIssueOnNode11.no",
  ("stats"."total" - "stats"."is_fixed_on_node_11_no" - "stats"."is_fixed_on_node_11_yes") AS "stats.isIssueOnNode11.idk"
FROM "nbm_issue" "t1"
  RIGHT JOIN (SELECT
  "t0"."issue_id" as "id",

  -- # responses
  count("t0"."issue_id") as "total",

  -- in correct repo?
  sum(
    case when "t0"."in_correct_repository" = true then 1 else 0 end
  ) as "in_correct_repository_yes",
  sum(
    case when "t0"."in_correct_repository" = false then 1 else 0 end
  ) as "in_correct_repository_no",

  array_agg("t0"."duplicates") as "duplicates",

  -- has consensus?
  sum(
    case when "t0"."has_consensus" = true then 1 else 0 end
  ) as "has_consensus_yes",
  sum(
    case when "t0"."has_consensus" = false then 1 else 0 end
  ) as "has_consensus_no",

  -- is feature?
  sum(
    case when "t0"."is_feature_request" = true then 1 else 0 end
  ) as "is_feature_request_yes",
  sum(
    case when "t0"."is_feature_request" = false then 1 else 0 end
  ) as "is_feature_request_no",

  -- reproducible?
  sum(
    case when "t0"."has_reproduction_steps" = true then 1 else 0 end
  ) as "has_reproduction_steps_yes",
  sum(
    case when "t0"."has_reproduction_steps" = false then 1 else 0 end
  ) as "has_reproduction_steps_no",

  -- fixed?
  sum(
    case when "t0"."is_fixed_on_node_10" = true then 1 else 0 end
  ) as "is_fixed_on_node_10_yes",
  sum(
    case when "t0"."is_fixed_on_node_10" = false then 1 else 0 end
  ) as "is_fixed_on_node_10_no",

  -- fixed?
  sum(
    case when "t0"."is_fixed_on_node_11" = true then 1 else 0 end
  ) as "is_fixed_on_node_11_yes",
  sum(
    case when "t0"."is_fixed_on_node_11" = false then 1 else 0 end
  ) as "is_fixed_on_node_11_no"

FROM "nbm_user_issue" "t0" 
  WHERE "t0"."state" = 'complete'
  GROUP BY "t0"."issue_id"
) "stats" ON ("t1"."id" = "stats"."id")
  LEFT JOIN "nbm_repo" t2 ON (t1."repo_id" = t2."id")
WHERE
  "t1"."state" = 'open' AND
  "t2"."user" = $1 AND
  "t2"."name" = $2
ORDER BY "t1"."number" DESC
OFFSET $3 LIMIT 10
