# ACCEPTANCE_CRITERIA.md

## Single Record Fish Power Score 0-10

- [x] `fishPowerScore` represents a single-record Fish Power Score in `[0, 10]`.
- [x] New records are scored by backend code, not by client-supplied score fields.
- [x] AI judge success path clamps final `fishPowerScore` to `[0, 10]`.
- [x] AI judge fallback path clamps final `fishPowerScore` to `[0, 10]`.
- [x] Negative, missing, non-finite, or out-of-range final scores are normalized before insert.
- [x] SQLite triggers reject future inserts or updates with `fish_power_score` outside `[0, 10]`.
- [x] Existing records with `fish_power_score > 10` are migrated idempotently with `ROUND(MIN(10, MAX(0, fish_power_score / 12)), 1)`.
- [x] Existing records already in `[0, 10]` are not repeatedly divided on later startups.
- [x] `users.total_score` and response `cumulativeScore` remain cumulative sums and are not capped at 10.
- [x] Title thresholds are adjusted for the new cumulative scale so progression remains reachable.
- [x] Leaderboards keep the same response shape and aggregate the new record score semantics.
- [x] Wallet balances, fish-scale transactions, interaction rewards, guild contribution, group goals, review status, user status, and system settings are not converted into 0-10 fields.
- [x] Existing `fishPowerScore`/`score`/`breakdown` response field names are preserved for frontend compatibility.
- [x] Admin prompt test and record detail use the same clamped backend scoring semantics.
- [x] No `src/` frontend page, component, style, layout, route, or visual copy file is modified for this change.
- [x] `package.json` and lockfile are not modified for this change.

Verification required before completion:

- [ ] `npm run typecheck` (currently blocked by existing `src/` type errors outside this backend scoring change).
- [ ] `npm run build` (currently blocked by the same existing `src/` type errors).
- [x] `npx tsc -p tsconfig.server.json --noEmit`
- [x] Smoke test ordinary record submission returns `fishPowerScore` in `[0, 10]`.
- [x] Smoke test exaggerated/high-risk record submission still returns `fishPowerScore <= 10`.
- [x] Smoke test abnormal AI-style scoring input is clamped to `10`.
- [x] Smoke test AI fallback scoring remains in `[0, 10]`.
- [x] Smoke test `GET /api/leaderboards` returns without error.
- [x] Smoke test admin auth/dashboard endpoints still return expected auth/config status.
