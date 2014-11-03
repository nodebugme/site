insert into "nbm_user_issue" (
  "state",
  "user_id",
  "issue_id"
) VALUES ('on_question_1', $1, $2) RETURNING *
