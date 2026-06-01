# PERMISSION_MATRIX.md

> Status: Current permission baseline for yuwang backend/frontend collaboration.
> Scope: Community Home V2, scoring, reports, interactions, admin auth, and anonymous identity protection.

---

## 0. Role Definitions

| Role | Meaning |
|---|---|
| Visitor / unauthenticated | No user bearer token and no admin cookie. |
| Normal logged-in user | Valid normal user bearer token. |
| Resource owner | Logged-in user who owns the submitted record/comment/etc. |
| Banned / restricted user | User account exists but is blocked from protected actions where backend enforces status. |
| Admin | Valid httpOnly admin cookie + valid server-side admin session. |

Important:

- Normal bearer token is never admin auth.
- Admin capability must not be inferred from normal user token.
- Frontend hidden buttons are not permission checks; backend must enforce permissions.

---

## 1. Community and Records

| Behavior | Visitor | Normal user | Resource owner | Banned/restricted user | Admin |
|---|---|---|---|---|---|
| View public community records | Allowed | Allowed | Allowed | Usually allowed unless globally blocked | Allowed |
| Read `GET /api/community/overview` public aggregates | Allowed; `myStats` is `null` | Allowed with private `myStats` for self only | Same as normal user | Public aggregates allowed; protected actions still blocked where enforced | Not admin-specific |
| View unapproved/private records | Not allowed | Only if explicitly owned and exposed by existing API | Owner only where supported | Not allowed | Admin review/admin routes only |
| Submit `POST /api/records` | Allowed if public endpoint and validation passes | Allowed and associated with user | Same as normal user | Must not bypass existing status protections | Not an admin-only capability |
| Provide final score/title in request body | Ignored/not authoritative | Ignored/not authoritative | Ignored/not authoritative | Ignored/not authoritative | Not applicable |
| Final single-record scoring | Backend only | Backend only | Backend only | Backend only | Backend only |
| Read leaderboards | Allowed | Allowed | Allowed | Allowed unless globally blocked | Allowed |
| View public record detail via `GET /api/records/:id/social` | Allowed for approved/public records | Allowed for approved/public records plus viewer state | Same as normal user unless owner-specific access is explicit | Public read allowed; protected writes remain blocked where enforced | Public route only; admin internals stay in admin routes |
| View approved public comments in social detail | Allowed | Allowed | Allowed | Usually allowed unless globally blocked | Public route only; admin internals stay in admin routes |

---

## 2. Anonymous Identity Protection

| Behavior | Visitor | Normal user | Resource owner | Admin |
|---|---|---|---|---|
| See anonymous record display name | Public-safe anonymous name only | Public-safe anonymous name only | Public-safe anonymous name; owner-specific behavior must be explicit | Admin routes may see moderation-needed identity if implemented |
| See real `user_id`, email, username behind anonymous public record | Not allowed | Not allowed | Not allowed in public feed | Admin-only, if required for moderation |
| Click avatar/name on anonymous record to reveal identity | Not allowed | Not allowed | Not allowed | Not via public frontend |

Rules:

- Community Home V2 must never expose real identity for anonymous records.
- Avatar seeds must be public-safe and not reversible to sensitive identity.
- `GET /api/community/feed` may keep compatibility placeholders such as `userId: null` and `username: ""`, but must not expose real user IDs, real usernames, email, or non-empty `reviewNote`.
- `GET /api/records/:id/social` must use the same public record identity protection and must also redact public comment author internals.
- Public social `comments[]` may expose only public display fields such as `id`, `recordId`, `nickname`, `content`, `createdAt`, and public-safe `avatarSeed`; it must not expose comment `userId`, `username`, email, `status`, `reviewNote`, or review metadata.
- `GET /api/community/overview.todayTop` must not expose real usernames.
- Frontend must not infer identity from hidden fields.

---

## 3. Interactions

| Behavior | Visitor | Normal user | Resource owner | Banned/restricted user | Admin |
|---|---|---|---|---|---|
| Like record | Not allowed; prompt login or disabled | Allowed | Allowed unless self-like is blocked by product rule | Not allowed where status enforced | Not admin-specific |
| Comment on record | Not allowed to post; read depends on public API | Allowed | Allowed | Not allowed where status enforced | Admin may moderate via admin routes |
| Report record | Not allowed | Allowed | Allowed unless self-report is blocked by product rule | Not allowed where status enforced | Admin handles reports via admin routes |
| Legend nomination | Not allowed | Allowed | Allowed unless self-nomination is blocked | Not allowed where status enforced | Admin/review behavior via admin routes if any |
| Duplicate active report | Not allowed without login | Returns `alreadyReported: true`; no duplicate row/count | Same | Same | Admin not used for duplicate user report |

---

## 3.1 Guild Public Creator Display

| Behavior | Visitor | Normal user | Guild creator/owner | Admin |
|---|---|---|---|---|
| Read public guild list/detail | Allowed | Allowed | Allowed | Allowed via public route; admin routes remain separate |
| See `creatorDisplayName` | Allowed public display only | Allowed public display only | Same public display | Same public display on public route |
| See creator email/internal username/admin fields | Not allowed | Not allowed | Not allowed through public guild route | Admin-only routes if explicitly implemented |

Rules:

- `creatorDisplayName` is derived from `users.display_name` only.
- Missing creator/owner references return `null`.
- Public guild APIs must not add new raw user ID, email, internal username, or admin fields for creator display.
- Public guild payloads keep legacy `ownerUserId` and `createdByUserId` field names for response-shape compatibility, but return `null`; they are not a permission source for frontend display decisions.

---

## 4. Reports

Rules:

- Same user + same target can only have one active report.
- Active statuses: `pending`, `reviewing`.
- Processed reports do not block future reports.
- Duplicate active report must not increase counts or create duplicate review tasks.
- Frontend may display a friendly "already reported, pending review" state.

---

## 4.1 Public Record Social Detail

| Behavior | Visitor | Normal user | Resource owner | Admin |
|---|---|---|---|---|
| Read approved/public record social detail | Allowed | Allowed with viewer state | Allowed through public-safe response | Use admin routes for internals |
| Read approved comments | Allowed with public fields only | Allowed with public fields only | Allowed with public fields only | Use admin comment routes for internals |
| Read pending/reviewing/rejected comments through public social | Not allowed | Not allowed | Not allowed unless a future owner-specific contract is added | Admin-only routes |
| See comment author real `userId` / `username` / email | Not allowed | Not allowed | Not allowed through public route | Admin-only routes if needed |
| See comment `status` / `reviewNote` / review metadata | Not allowed | Not allowed | Not allowed through public route | Admin-only routes |
| Post a comment | 401 | Allowed subject to content safety and account status | Same | Not an admin-public-route capability |

Rules:

- `GET /api/records/:id/social` is a public detail source, not a moderation source.
- Public comment visibility is approved-only.
- Pending comments created by `POST /api/records/:id/comments` must not be faked into the public comment list by frontend code.

---

## 5. Scoring Boundaries

| Behavior | Visitor | Normal user | Banned user | Admin |
|---|---|---|---|---|
| Submit score fields | Ignored/not authoritative | Ignored/not authoritative | Ignored/not authoritative | Not applicable |
| Final `fishPowerScore` | Backend only | Backend only | Backend only | Backend only |
| Access admin scoring views/prompt tests | 401 without admin cookie | Not allowed with bearer token | Not allowed with bearer token | Allowed with valid admin session |

Rules:

- `fishPowerScore` is backend-generated single-record `[0, 10]`.
- AI output and fallback both clamp to `[0, 10]`.
- User cumulative score is not capped at 10.
- Wallet/fish-scale balances are not `fishPowerScore`.

---

## 6. Admin

| Behavior | Visitor | Normal user | Banned/restricted user | Admin |
|---|---|---|---|---|
| `POST /api/admin/auth/login` | Allowed with admin credentials, rate limited | Same | Same | Same |
| `GET /api/admin/auth/me` | 401 | 401 | 401 | 200 if valid cookie/session |
| Access `/api/admin/*` | 401 | 401/403 | 401/403 | Allowed if route permits |
| Logout admin | No-op/401 | No-op/401 | No-op/401 | Revokes server-side admin session |

Admin rules:

- Admin auth uses httpOnly cookie + `admin_sessions`.
- Admin logout must revoke server-side session.
- Admin session DB error should not be disguised as `401`.
- Do not log sensitive token content.

---

## 7. Community Home V2 Frontend Permission Rules

| UI module | Visitor behavior | Logged-in behavior | Notes |
|---|---|---|---|
| Record feed | Can read public records | Can read public records plus viewer flags if returned | No private/admin fields. |
| PostBox | Can submit if public endpoint allows; otherwise prompt login | Can submit associated with user | Backend validates anonymization. |
| Like/comment/report/legend buttons | Disabled or prompt login | Enabled according to backend | Do not fake success locally. |
| My fish data | Hidden/null/login prompt | Show real private stats | Do not show fake stats. |
| Mutual following tab | Disabled / 待开放 | Disabled / 待开放 until backend feature exists | No API request. |
| Profile/avatar clicks | No identity reveal | No identity reveal for anonymous records | Do not implement new profile route in this task. |

Community Home V2 additions:

- `GET /api/community/overview` returns public `siteToday`, `todayTop`, and feature flags to visitors, but visitor `myStats` is always `null`.
- Logged-in `GET /api/community/overview` returns only the current user's `myStats`.
- `GET /api/community/feed` viewer flags are optional public-context state; `viewer.reported` is true only for current viewer reports with active status `pending` or `reviewing`.
- `featureFlags.mutualFollowing`, `featureFlags.topics`, and `featureFlags.profilePages` are all `false`; Claude must not call or invent friend/following/topic/profile APIs for Community Home V2.

---

## 8. Forbidden Permission Shortcuts

- Do not rely on frontend visibility to enforce permission.
- Do not let client choose score/title/review state.
- Do not use ordinary bearer token for admin routes.
- Do not expose anonymous real identity in community feed.
- Do not create mock admin/user states to make UI look complete.
