# ACCEPTANCE_CRITERIA.md

> Status: Project acceptance baseline for scoring, reports, rate limiting, admin sessions, and Community Home V2.
> Rule: P0/P1 failures block merge. P2/P3 may be scheduled if explicitly accepted.

---

## 0. Priority Definitions

| Priority | Meaning | Merge policy |
|---|---|---|
| P0 | Crash, data loss, permission bypass, secret leak | Must fix before merge. |
| P1 | Security/data consistency/contract issue likely to affect real use | Must fix before merge unless explicitly waived. |
| P2 | Maintainability/edge-case issue | Can schedule with clear note. |
| P3 | Cleanup/style/minor improvement | Does not block merge. |

---

## 1. Single Record Fish Power Score 0-10

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
- [x] No `src/` frontend page, component, style, layout, route, or visual copy file is modified for backend scoring change.
- [x] `package.json` and lockfile are not modified for backend scoring change.

Verification:

- [ ] `npm run typecheck` passes, or failure is documented as existing unrelated frontend error.
- [ ] `npm run build` passes, or failure is documented as existing unrelated frontend error.
- [x] `npx tsc -p tsconfig.server.json --noEmit`.
- [x] Smoke test ordinary record submission returns `fishPowerScore` in `[0, 10]`.
- [x] Smoke test exaggerated/high-risk record submission still returns `fishPowerScore <= 10`.
- [x] Smoke test abnormal AI-style scoring input is clamped to `10`.
- [x] Smoke test AI fallback scoring remains in `[0, 10]`.
- [x] Smoke test `GET /api/leaderboards` returns without error.
- [x] Smoke test admin auth/dashboard endpoints still return expected auth/config status.

False-negative guard examples:

| Scenario | Example text | Expected |
|---|---|---|
| Clear first-person slacking event | `开会时偷偷刷视频摸鱼半小时，还假装在记重点` | Score is `> 0` and `<= 10`. |
| AI false-negative | AI returns `not_slacking_event`, but text describes first-person slacking behavior | Use conservative backend scoring; do not return meaningless `0.0`. |
| Fallback path | AI unavailable, but text describes a valid slacking event | Score is `> 0` and `<= 10`. |
| Explicitly denies slacking | `今天认真上班，没有摸鱼` | `0`. |
| Concept discussion only | `我没有摸鱼，只是在讨论摸鱼这个词` | `0`. |
| Third-party behavior | `同事在摸鱼，我在认真工作` | `0` or existing invalid-input handling. |
| Keyword stuffing | `摸鱼摸鱼摸鱼` | Must not receive the same normal score as a complete event; current backend treats this as invalid. |
| Implicit but real behavior | `上班躲厕所刷了二十分钟短视频` | Receives a conservative valid score in `[0, 10]`. |
| Out-of-range high score | Abnormal bonus / high-score combination | Clamped to `10.0`. |
| Idempotent startup migration | A new `[0, 10]` score is present before repeated initialization | Score is not scaled again. |

---

## 2. Reports Active Deduplication

- [x] Same user + same target can have only one active report.
- [x] Active statuses are `pending` and `reviewing`.
- [x] Processed statuses do not block future reports.
- [x] Database uses a partial unique index for active report dedupe.
- [x] Old global lifetime report uniqueness is removed or no longer created.
- [x] Duplicate active report does not create a new report row.
- [x] Duplicate active report does not increase report count.
- [x] Duplicate active report returns frontend-compatible `alreadyReported: true`.
- [x] Migration is idempotent.
- [x] Migration smoke test verifies backend startup/initDatabase succeeds.

Acceptance examples:

| Scenario | Expected |
|---|---|
| First report | `ok: true`, `alreadyReported: false`, count increases by 1 |
| Duplicate while pending/reviewing | `ok: true`, `alreadyReported: true`, count unchanged |
| Report after previous resolved/rejected | New active report allowed |
| Visitor reports | `401` |

---

## 3. Rate Limit / Proxy Safety

- [x] Login/register/admin-login endpoints have rate limiting.
- [x] Rate limiting does not directly trust client-supplied `X-Forwarded-For`.
- [x] Default client key uses Fastify `request.ip`.

- [x] Trusted proxy behavior requires explicit configuration.
- [x] Forged changing `X-Forwarded-For` cannot bypass login limits.
- [x] Rate limit buckets have expiry cleanup or capacity bound.
- [x] 429 response shape is stable.
- [x] `Retry-After` is included where supported.
- [x] Username-subject dimension is applied to login-class endpoints where implemented.

Acceptance examples:

| Scenario | Expected |
|---|---|
| Repeated login attempts from same IP | 429 after threshold |
| Same request with fake different `X-Forwarded-For` | Still hits same limit when proxy not trusted |
| Many unique fake headers | Does not grow memory unbounded |
| Normal login | Still works before threshold |

---

## 4. Community Home V2 Backend Contract

- [x] `GET /api/community/overview` exists and is a read-only public endpoint.
- [x] Visitor `GET /api/community/overview` returns `myStats: null`.
- [x] Logged-in `GET /api/community/overview` returns only the current user's `weeklyRecordCount`, `weeklyAverageScore`, `cumulativeScore`, `fishScales`, and `globalRank`.
- [x] Overview `siteToday` returns `todayRecords`, `todayActiveUsers`, `todayLikes`, `totalRecords`, `totalUsers`, and `totalLikes` from real tables.
- [x] Overview `todayTop` returns the existing today leaderboard top 5 without real usernames.
- [x] Overview feature flags return `mutualFollowing: false`, `topics: false`, and `profilePages: false`.
- [x] `GET /api/community/feed` preserves existing `score` and `breakdown.fishPowerScore` while adding top-level `fishPowerScore`.
- [x] Feed records include `primaryTag`, public-safe `avatarSeed`, and `viewer.favorited`.
- [x] Feed `viewer.reported` is true only for active `pending` or `reviewing` reports.
- [x] Feed records do not expose real `userId`, real `username`, email, or non-empty `reviewNote`.
- [x] Feed filters `latest`, `hot`, `high`, and `legendary` return without error and use documented sort rules.
- [x] No friend/following backend, topic system expansion, profile-page work, scoring change, report-dedupe change, admin-auth change, frontend page/component/style change, `package.json` change, or lockfile change is introduced for Community Home V2.

Verification:

- [x] `npx tsc -p tsconfig.server.json --noEmit`.
- [x] `npm run typecheck`.
- [x] `npm run build`.
- [x] Smoke test visitor overview returns 200 and `myStats: null`.
- [x] Smoke test logged-in overview returns current-user `myStats`.
- [x] Smoke test feed returns `fishPowerScore` in `[0, 10]`.
- [x] Smoke test feed does not expose real user identity fields.
- [x] Smoke test active report state only counts `pending` / `reviewing`.

---

## 5. Admin Session

- [x] Admin auth uses httpOnly cookie + server-side admin session.
- [x] Admin logout revokes server-side session.
- [x] Ordinary bearer token cannot access `/api/admin/*`.
- [x] Cookie/token format errors return unauthenticated safely.
- [x] `admin_sessions` database errors are not swallowed as fake `401`.
- [x] Sensitive token content is not logged.
- [x] `/api/admin/auth/me` validates admin cookie/session.

---

## 5.1 Guild Creator Display Contract

- [x] `guilds` has existing `owner_user_id` and `created_by_user_id` fields.
- [x] `GET /api/guilds` returns additive `creatorDisplayName` on each guild object.
- [x] `GET /api/guilds/:id` returns additive `creatorDisplayName` on the detail guild object.
- [x] `creatorDisplayName` is derived from public `users.display_name` only.
- [x] Missing creator/owner references return `creatorDisplayName: null`.
- [x] Public guild payloads do not expose raw creator/owner user IDs; legacy ID slots remain present as `null`.
- [x] No new database table, field, migration, or index is introduced for creator display.
- [x] No frontend page/component/style/API-client file is modified for this backend contract change.
- [x] No package or lockfile change is introduced.

Verification:

- [x] `npx tsc -p tsconfig.server.json --noEmit`.
- [x] `npm run typecheck`.
- [x] `npm run build`.
- [x] Smoke test `GET /api/guilds` returns `creatorDisplayName`.

---

## 6. Community Home V2 Backend/API Readiness

Codex must complete before Claude V2 page wiring:

- [x] Community feed API path is confirmed and documented.
- [x] Sorts for latest/hot/high/legend are confirmed or explicitly marked as unsupported/degraded.
- [x] Community overview data source is confirmed:
  - [x] `GET /api/community/overview`
- [x] Overview supports public site stats.
- [x] Overview does not return private `myStats` to visitors.
- [x] `featureFlags.mutualFollowing` is false or equivalent status is documented.
- [x] Record feed response does not expose anonymous real identity.
- [ ] Record feed exposes or can safely derive:
  - [x] id
  - [x] display author
  - [x] created time
  - [x] title/body
  - [x] 0-10 `fishPowerScore`
  - [x] primary tag or fallback
  - [x] interaction counts
  - [x] viewer interaction flags when logged in
- [x] Interactions use canonical documented endpoints.
- [x] Claude can implement Community V2 without mock data.

---

## 7. Community Home V2 Frontend Acceptance

Claude must satisfy before frontend PR merge:

- [ ] Opening the existing community route shows the new V2 community page.
- [ ] No unused V2 page is left unconnected.
- [ ] Page follows `STYLE_GUIDE.md`.
- [ ] New UI uses tokens for color, type, spacing, radius, and shadow.
- [ ] No new Pixel UI components are introduced.
- [ ] `server/` is not modified.
- [ ] `shared/` is not modified.
- [ ] `docs/` is not modified by frontend implementation unless explicitly requested.
- [ ] `package.json` and lockfile are not modified.
- [ ] No new dependency is added.
- [ ] Community feed uses real API data.
- [ ] No fake records, fake leaderboards, fake wallet values, or fake interaction states are displayed as real.
- [ ] Missing/unavailable modules show disabled/待开放/fallback state.
- [ ] PostBox is the primary CTA and opens the real ComposeModal/submission flow.
- [ ] ComposeModal still submits valid payload accepted by backend.
- [ ] Filter tabs include latest/hot/high/legend and disabled mutual-following if unsupported.
- [ ] Mutual-following tab does not request nonexistent API.
- [ ] Record card displays single-record 0-10 `fishPowerScore`.
- [ ] Interaction count of 0 renders icon only, not `0`.
- [ ] Comment composer is hidden by default and expands on comment action.
- [ ] EmptyState appears when feed is empty.
- [ ] Today site stats implement cold-start fallback: today `< 5` shows cumulative fallback.
- [ ] Normal and fallback states are mutually exclusive.
- [ ] 1280/960/720 breakpoints follow `STYLE_GUIDE.md`.
- [ ] Mobile has no horizontal overflow.
- [ ] Anonymous records do not reveal real identity.

---

## 8. Documentation Acceptance

- [x] `API_CONTRACT.md` maps Community V2 modules to endpoints.
- [x] `DATABASE_SCHEMA.md` documents reports, admin sessions, scoring triggers, and interaction table status.
- [x] `PERMISSION_MATRIX.md` covers visitor/user/owner/banned/admin behavior.
- [x] `COMMUNITY_V2_DATA_MAP.md` exists and is usable by Claude.
- [ ] If an endpoint is uncertain, it is marked `需代码确认` rather than claimed as implemented.
- [x] Docs do not tell Claude to mock missing backend features.

---

## 9. PR / Merge Quality Gate

Before merging a backend or frontend PR:

- [ ] Confirm changed files are within allowed scope.
- [ ] Confirm no unexpected `src/` changes in backend PR.
- [ ] Confirm no `server/` or `shared/` changes in frontend-only PR.
- [ ] Confirm no dependency/lockfile changes unless explicitly intended.
- [ ] Confirm P0/P1 findings are closed or explicitly accepted.
- [ ] Confirm `typecheck/build` status is reported honestly.
- [ ] Confirm residual risks are written in PR summary.
