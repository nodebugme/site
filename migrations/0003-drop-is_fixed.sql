BEGIN;

ALTER TABLE "nbm_user_issue" DROP COLUMN "is_fixed_on_node_10";
ALTER TABLE "nbm_user_issue" DROP COLUMN "is_fixed_on_node_11";

COMMIT;
