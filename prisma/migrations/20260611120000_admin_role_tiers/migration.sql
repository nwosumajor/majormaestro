-- Admin role hierarchy revision: per-section senior → lead → base tiers.
-- Data-only migration (no schema change) — remap existing admin roles to the new
-- vocabulary. Least-privilege: existing broad roles map to the LEAD tier (they
-- keep most access; the apex-sensitive powers — bulk PII export / referral
-- payouts / webhooks / retention purge for recovery, and scholarship
-- disbursement + NIN reveal for GICN — now require the SENIOR tier, which the
-- owner can grant per person afterward). owner + viewer are unchanged.

UPDATE "AdminUser" SET "role" = 'recovery_lead_manager' WHERE "role" = 'manager';
UPDATE "AdminUser" SET "role" = 'gicn_lead_manager' WHERE "role" = 'gicn_manager';
