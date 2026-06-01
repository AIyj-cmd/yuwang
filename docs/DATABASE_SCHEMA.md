# DATABASE_SCHEMA.md

> Status: Current backend schema baseline for yuwang collaboration.
> Scope: Documents stable schema expectations and safety constraints used by Codex/Claude workflows.
> Note: If a table/column name differs in code, Codex must update this document after checking `server/database.ts`.

---

## 0. Database Principles

- SQLite is the current storage layer.
- Backend code is authoritative for scoring, permissions, wallet/fish-scale changes, reports, and admin sessions.
- Database constraints should protect high-value invariants where possible.
- Startup migrations must be idempotent.
- Migrations must not clear production data.
- Development-only cleanup must be explicitly marked as such.

---

## 1. Core Tables Overview

| Table | Purpose | Notes |
|---|---|---|
| `users` | Normal user accounts and cumulative profile data | `total_score` is cumulative and not capped at 10. |
| `sessions` | Normal user sessions | Should be cleaned when expired; ordinary session is not admin auth. |
| `admin_sessions` | Admin cookie-backed server-side sessions | Required for real admin logout/revocation. |
| `slacking_records` | Submitted fish/slacking records | Stores single-record `fish_power_score` in `[0, 10]`. |
| `comments` | Record comments | Rewards must avoid infinite farming. |
| `reports` | User reports against records/comments/etc. | Active duplicate report is blocked by partial unique index. |
| `reactions` | Legacy/canonical reactions, code-confirmed | If still used, must stay consistent with `record_interactions`. |
| `record_interactions` | Legacy/canonical interaction table, code-confirmed | Current canonical source must be documented in API contract. |
| `fish_scale_transactions` | Wallet/fish-scale ledger | Not converted into 0-10 score units. |
| `guilds` / group-related tables | Social/guild feature data | Do not modify for Community V2 unless needed by existing API. |
| `audit_logs` / admin logs | Admin/system audit trail | Admin actions should not be mixed with public user APIs. |

---

## 2. `slacking_records` Score Fields

Single-record Fish Power Score is stored on `slacking_records`.

| Field | Type | Nullable | Default | Unique | Index | Notes |
|---|---|---:|---|---:|---|---|
| `fish_power_score` | REAL | No | none | No | `idx_slacking_records_score` | Backend-generated single-record score, clamped to `[0, 10]` and rounded to 1 decimal. |
| `score_version` | TEXT | No | `legacy_type_v1` | No | `idx_slacking_records_score_version` | New records use `ai_judge_v2_10pt` or `ai_judge_v2_10pt_fallback`. Migrated legacy rows append `+single_record_10pt_v1`. |
| `score_breakdown` | TEXT | No | `''` | No | No | JSON metadata for scoring components. API serialization must not leak legacy >10 final score from JSON. |
| `duration_score` | REAL | No | `0` | No | No | Duration component under current 0-10 model is 1.4-3.0 for new records. |
| `duration_base_score` | REAL | No | `0` | No | No | Same duration base component for current scoring model. |

Constraints:

- `trg_slacking_records_fish_score_insert_check` rejects inserts where `fish_power_score` is negative, above 10, or non-finite.
- `trg_slacking_records_fish_score_update_check` rejects updates that would move `fish_power_score` outside `[0, 10]`.
- Backend also clamps before insert through record creation logic; trigger is a database safety net.

Migration:

- Startup migration is idempotent and does not clear `slacking_records`.
- Existing rows with `fish_power_score > 10` are normalized once using `ROUND(MIN(10, MAX(0, fish_power_score / 12)), 1)`.
- Existing rows with negative or non-finite scores are set to `0`.
- Rows already in `[0, 10]` are not divided again.
- After migration, social aggregates should be refreshed so `users.total_score` reflects normalized records.

Compatibility:

- User cumulative score remains a sum of record scores and is not capped at 10.
- Guild contribution, group goals, fish-scale wallet balances, and interaction rewards keep their own units.

---

## 2.1 `guilds` Creator Fields

The existing `guilds` table already stores creator/owner references for user-created guilds.

| Field | Type | Nullable | Default | Unique | Index | Notes |
|---|---|---:|---|---:|---|---|
| `owner_user_id` | INTEGER | Yes | `NULL` | No | No dedicated index | Current guild owner reference; foreign key to `users(id)`. |
| `created_by_user_id` | INTEGER | Yes | `NULL` | No | No dedicated index | User who created the guild; foreign key to `users(id)`. |

Public API display rule:

- `GET /api/guilds` and `GET /api/guilds/:id` may derive `creatorDisplayName` from `created_by_user_id`, falling back to `owner_user_id`.
- The public display value comes only from `users.display_name`.
- If the reference is missing or the user row does not exist, the API returns `creatorDisplayName: null`.
- No new table, field, migration, or index is required for this display field.
- Public creator display must not expose email, internal username, admin flags, or additional raw identifiers.

---

## 3. `reports`

Purpose:

- Stores user reports for records/comments/targets.
- Prevents repeated active reports from the same user against the same target.

Required active uniqueness:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_active_user_target
ON reports(user_id, target_type, target_id)
WHERE status IN ('pending', 'reviewing');
```

Rules:

- This is not a lifetime unique report rule.
- Same user + same target may report again after previous report is processed.
- Active statuses: `pending`, `reviewing`.
- Processed statuses should include code-confirmed values such as `resolved`, `rejected`, `invalid`, `closed`.
- Duplicate active report should be handled with `alreadyReported: true`.

Migration:

- Old global unique index such as `idx_reports_unique_user_target` should not remain if it blocks processed-status re-reporting.
- Migration may clean duplicate active development data, but must be idempotent.
- Production migration must not blindly delete audit-relevant report history.

---

## 4. `admin_sessions`

Purpose:

- Stores active/revoked admin sessions for httpOnly cookie auth.
- Enables real logout/revocation instead of stateless cookie-only auth.

Expected fields, code-confirmed names may vary:

| Field | Purpose |
|---|---|
| session/token id or nonce | Server-side session lookup. |
| username/admin identity | Admin principal. |
| created_at | Session creation. |
| expires_at | TTL validation. |
| revoked_at | Logout/revocation marker. |

Rules:

- Admin logout should mark/revoke session server-side.
- `getAdminSession` should not swallow database errors as `401`.
- Ordinary `sessions` rows or bearer token sessions are not admin sessions.

---

## 5. `sessions`

Purpose:

- Normal user session storage.

Rules:

- Expired sessions should be cleaned on login/startup or equivalent maintenance path.
- Session table should not grow forever.
- Normal sessions do not grant admin access.

---

## 6. `comments`

Purpose:

- Stores record comments.

Rules:

- Comment creation requires login unless explicitly documented otherwise.
- Comment rewards must not be infinitely farmable.
- Comment count shown in Community V2 should come from backend count, not frontend-only local state.
- Comments should respect content safety/anonymization rules.

Suggested constraints to verify in code:

- Index on `record_id`.
- Index on `user_id`.
- Created timestamp for ordering.
- Optional status/review field if comments go through moderation.

---

## 7. `reactions` / `record_interactions`

Purpose:

- Stores likes, favorites, votes, legend nominations, or similar interaction state.

Current risk:

- Project history may include multiple endpoints and/or two tables for overlapping interactions.
- Codex should define the canonical frontend source before Community V2 wiring.

Rules:

- Same actor + same record + same action should be idempotent.
- Counts should not be double-counted across tables.
- If two tables remain for compatibility, synchronization rules must be explicit.
- Community V2 frontend should call only the canonical API in `src/api.ts`.

---

## 8. `fish_scale_transactions`

Purpose:

- Ledger for fish-scale wallet/reward changes.

Rules:

- Fish scales are not `fishPowerScore`.
- Fish-scale transaction amount is not capped to 10.
- Submission reward, comment reward, interaction reward, guild contribution, and wallet balance must keep separate units and audit semantics.
- Reward grant paths should be idempotent where actor/target/action semantics exist.

---

## 9. Community Home V2 Data Requirements

Community Home V2 adds no tables and runs no read-time migrations or repairs. `GET /api/community/overview` and `GET /api/community/feed` read existing tables only.

Preferred data sources:

| UI need | Source |
|---|---|
| record feed | `slacking_records` plus public-safe interaction aggregates; real `user_id`, username, email, and non-empty review notes must not be exposed in community feed payloads. |
| `myStats.weeklyRecordCount` / `weeklyAverageScore` | `slacking_records` rows for the current user where `status != 'rejected'` and `created_at` falls in the current week. |
| `myStats.cumulativeScore` | Current user's cumulative non-rejected `slacking_records.fish_power_score`; not capped at 10. |
| `myStats.fishScales` | Direct read from `user_wallets.fish_scale_balance`; missing wallet rows return `0` and are not created by overview. |
| `myStats.globalRank` | Derived from cumulative user totals over `slacking_records`. |
| `siteToday.todayRecords` / `todayActiveUsers` | Approved + public `slacking_records` in today's range. |
| `siteToday.todayLikes` | `record_interactions` rows where `action = 'like'` in today's range. |
| `siteToday.totalRecords` / `totalLikes` | Approved + public `slacking_records`. |
| `siteToday.totalUsers` | Aggregate `users` count only; no identity fields returned. |
| `todayTop` | Existing today leaderboard query over `slacking_records`, trimmed to 5 and stripped of real usernames for overview. |
| active report state | `reports` rows with status `pending` or `reviewing` only. |
| like/comment/favorite/legend counts | Existing `slacking_records` aggregate count columns refreshed by current interaction paths. |

Community V2 index added:

```sql
CREATE INDEX IF NOT EXISTS idx_record_interactions_action_created_at
  ON record_interactions(action, created_at);
```

Reason: supports `GET /api/community/overview` when computing `siteToday.todayLikes` by filtering `record_interactions` on `action = 'like'` and a daily `created_at` range.

---

## 10. Index / Trigger Checklist

Must remain documented and code-confirmed:

| Name | Purpose |
|---|---|
| `idx_slacking_records_score` | Score sorting. |
| `idx_slacking_records_score_version` | Migration/version tracing. |
| `idx_record_interactions_action_created_at` | Community overview `todayLikes` query. |
| `idx_reports_unique_active_user_target` | Prevent duplicate active reports. |
| `trg_slacking_records_fish_score_insert_check` | DB safety for 0-10 score insert. |
| `trg_slacking_records_fish_score_update_check` | DB safety for 0-10 score update. |

Additional indexes should be added only with query justification.
