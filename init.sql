BEGIN;
CREATE TABLE IF NOT EXISTS "nbm_user" ( 
  "id" serial primary key,
  "username" varchar(255) NOT NULL CHECK ("username" <> ''),
  "display_name" varchar(255) NOT NULL,
  "avatar" varchar(512) NOT NULL,
  "email" varchar(255) NOT NULL,
  "token" varchar(40) NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TYPE issue_state AS ENUM ('open', 'closed');

CREATE TABLE IF NOT EXISTS "nbm_repo" (
  "id" serial primary key,
  "user" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "nbm_issue" (
  "id" serial primary key,
  "repo_id" INTEGER NOT NULL REFERENCES "nbm_repo" ("id") DEFERRABLE INITIALLY DEFERRED,
  "number" INTEGER NOT NULL,
  "state" issue_state NOT NULL,
  "title" varchar(255) NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "closed_at" timestamp DEFAULT NULL,
  "body" text NULL DEFAULT NULL,
  "user" varchar(255) NOT NULL,
  "assignee" varchar(255) NOT NULL,
  "locked" boolean NOT NULL,
  "labels" text NULL DEFAULT NULL,
  "triage_count" integer default 0
);

CREATE UNIQUE INDEX "nbm_issue_number_idx" ON "nbm_issue" ("number");

CREATE TYPE user_issue_state AS ENUM (
  'complete',
  'incomplete',
  'on_question_1',
  'on_question_2',
  'on_question_3',
  'on_question_4',
  'on_question_5'
);

CREATE TABLE IF NOT EXISTS "nbm_user_issue" (
  "id" serial primary key,
  "state" user_issue_state NOT NULL,
  "user_id" integer NOT NULL REFERENCES "nbm_user" ("id") DEFERRABLE INITIALLY DEFERRED,
  "issue_id" integer NOT NULL REFERENCES "nbm_issue" ("id") DEFERRABLE INITIALLY DEFERRED,
  "duplicates" varchar(512) DEFAULT NULL,
  "is_feature_request" boolean DEFAULT NULL,
  "has_consensus" boolean DEFAULT NULL,
  "has_reproduction_steps" boolean DEFAULT NULL,
  "is_fixed_on_node_10" boolean DEFAULT NULL,
  "is_fixed_on_node_11" boolean DEFAULT NULL,
  "started_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "finished_at" timestamp DEFAULT NULL,
  UNIQUE ("user_id", "issue_id")
);

CREATE INDEX "nbm_issue_state" ON "nbm_issue" ("state");
CREATE INDEX "nbm_issue_triage_count" ON "nbm_issue" ("triage_count");
CREATE INDEX "nbm_issue_repo_id" ON "nbm_issue" ("repo_id");
CREATE INDEX "nbm_user_issue_user_id" ON "nbm_user_issue" ("user_id");
CREATE INDEX "nbm_user_issue_issue_id" ON "nbm_user_issue" ("issue_id");
INSERT INTO "nbm_repo" ("user", "name") VALUES ('joyent', 'node');
COMMIT;
