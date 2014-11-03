WITH "selection" AS (
  SELECT
    "id"
  FROM "nbm_user" WHERE "username" = $1
), "insertion" AS (
    INSERT INTO "nbm_user" (
      "username",
      "display_name",
      "avatar",
      "email",
      "token"
    ) SELECT $1, $2, $3, $4, $5 WHERE NOT EXISTS (
      SELECT * FROM "selection"
    ) RETURNING "id"
)
SELECT "id" FROM "insertion" UNION SELECT "id" FROM "selection"
