ALTER TYPE "user_issue_state" ADD VALUE 'on_question_6' AFTER 'on_question_5';
BEGIN;

ALTER TABLE "nbm_user_issue" ADD COLUMN "in_correct_repository" boolean default null;
UPDATE "nbm_user_issue" SET "state" = 'on_question_6' WHERE "state" = 'on_question_5';
UPDATE "nbm_user_issue" SET "state" = 'on_question_5' WHERE "state" = 'on_question_4';
UPDATE "nbm_user_issue" SET "state" = 'on_question_4' WHERE "state" = 'on_question_3';
UPDATE "nbm_user_issue" SET "state" = 'on_question_3' WHERE "state" = 'on_question_2';
UPDATE "nbm_user_issue" SET "state" = 'on_question_2' WHERE "state" = 'on_question_1';
COMMIT;
