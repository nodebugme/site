BEGIN;

ALTER TABLE "nbm_repo" ADD COLUMN "versions" varchar(64)[] default '{}';

CREATE TABLE IF NOT EXISTS "nbm_user_issue_version" (
  "id" serial primary key,
  "user_issue_id" INTEGER NOT NULL REFERENCES "nbm_user_issue" ("id") DEFERRABLE INITIALLY DEFERRED,
  "version" varchar(64) not null,
  "is_issue" boolean default null
);

UPDATE "nbm_repo" SET "versions" = '{0.10, 0.11}' WHERE "user" = 'joyent' AND "name" = 'node';

INSERT INTO "nbm_user_issue_version" ("user_issue_id", "version", "is_issue") (
  SELECT "id", '0.10', "is_fixed_on_node_10" FROM "nbm_user_issue"
);

INSERT INTO "nbm_user_issue_version" ("user_issue_id", "version", "is_issue") (
  SELECT "id", '0.11', "is_fixed_on_node_11" FROM "nbm_user_issue"
);

COMMIT;
