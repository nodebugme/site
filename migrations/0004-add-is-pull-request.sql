BEGIN;
ALTER TABLE nbm_issue ADD COLUMN is_pull_request BOOLEAN DEFAULT NULL;
COMMIT;
