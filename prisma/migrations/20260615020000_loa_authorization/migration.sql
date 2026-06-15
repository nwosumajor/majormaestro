-- Feature 3 — Letter-of-Authorization signatory rules.
-- Additive, nullable columns so existing rows remain valid.

ALTER TABLE "RecoveryComplaint" ADD COLUMN "authorizationMethod"    TEXT;    -- 'two_directors'|'board_resolution'|'sole_director'
ALTER TABLE "RecoveryComplaint" ADD COLUMN "companyHasSoleDirector" BOOLEAN;
ALTER TABLE "RecoveryComplaint" ADD COLUMN "loaSignatories"         JSONB;   -- [{ name, title }]
