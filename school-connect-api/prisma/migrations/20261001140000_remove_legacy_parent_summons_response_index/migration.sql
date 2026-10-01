-- Keep the final migration state aligned with the current Prisma schema.
-- The response-read index was introduced by an earlier migration but is not
-- part of the current ParentSummons model. Drop it idempotently so existing
-- databases with or without the index converge to the same final state.
DROP INDEX IF EXISTS "ParentSummons_createdBy_status_responseReadAt_idx";
