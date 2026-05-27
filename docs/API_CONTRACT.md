# API_CONTRACT.md

> Status: Community Home V2 baseline contract
> Scope: Backend/API contract for yuwang frontend V2, scoring, reports, rate limiting, and admin-session boundaries.
> Rule: Claude frontend work must read this document before wiring pages. If an endpoint is missing or marked `需代码确认`, Claude must not mock or invent it; Codex should confirm or minimally implement it first.

---

## 0. Contract Rules

### 0.1 Compatibility

- Existing frontend-facing field names should remain stable unless a migration is explicitly planned.
- New fields must be additive and backward compatible.
- Frontend must not send or trust final scoring fields.
- Backend remains the source of truth for:
  - `fishPowerScore`
  - `title`
  - `totalScore`
  - `cumulativeScore`
  - review status
  - wallet/fish-scale balances
  - permissions
  - admin capability

### 0.2 Auth Models

| Auth type | Used by | Transport | Notes |
|---|---|---|---|
| Visitor / anonymous | Public read and allowed anonymous submission | none | Can read public community data. |
| Normal user | User actions | `Authorization: Bearer <token>` | Cannot access `/api/admin/*`. |
| Admin | Admin backend | httpOnly admin cookie + server-side admin session | Ordinary user token is never admin auth. |

### 0.3 Error and Rate Limit Semantics

| Situation | Expected status | Notes |
|---|---:|---|
| Validation failure | `400` | Invalid body or content safety validation. |
| Missing user token for protected user action | `401` | Like/comment/report/legend actions require login unless explicitly public. |
| User lacks permission | `403` | Includes banned/restricted actions where enforced. |
| Resource not found | `404` | Missing record/comment/etc. |
| Duplicate active report | `200` with `alreadyReported: true` | Kept frontend-compatible; does not create duplicate report. |
| Rate limited | `429` | Stable body: `{ "message": "请求过于频繁，请稍后再试。" }`; should include `Retry-After`. |
| Server/database error | `500` | Must not be disguised as normal auth failure. |

### 0.4 Proxy / IP Contract

- Rate limiting uses Fastify `request.ip` by default.
- The backend must not directly trust client-supplied `X-Forwarded-For`.
- Only explicit trusted-proxy configuration may allow Fastify to derive `request.ip` from proxy headers.
- Production should avoid broad `TRUST_PROXY=true` unless the proxy chain is known.

---

## 1. Community Home V2 API Map

This section is the frontend V2 map. It defines what Claude may consume. If the implementation differs, Codex must update this document before Claude wires the UI.

| Page module | Endpoint / source | Auth | Data needed | Fallback / notes |
|---|---|---|---|---|
| Community record feed | `GET /api/community/feed?filter=latest|hot|high|legendary` | Optional | public records, author display, score, title, body, interactions | Must use this real endpoint; do not mock records. |
| Filter: latest | `GET /api/community/feed?filter=latest` | Optional | newest public approved records | Sorts by `created_at DESC`. |
| Filter: hot | `GET /api/community/feed?filter=hot` | Optional | interaction-weighted public records | Sorts by `like_count * 2 + comment_count * 3 + legend_nomination_count * 8`, then newest. |
| Filter: high score | `GET /api/community/feed?filter=high` | Optional | `fishPowerScore` desc | Score is single-record 0-10. |
| Filter: legend | `GET /api/community/feed?filter=legendary` | Optional | legendary or nominated records | Use existing legend mechanism only. |
| Filter: mutual following | `GET /api/community/overview` feature flag only | Logged-in future feature | none | `mutualFollowing: false`; frontend should show disabled / 待开放 and make no follow API calls. |
| PostBox | `POST /api/records` | Optional user token | create record | Backend generates score/title. |
| My fish data | `GET /api/community/overview` | Logged-in for private data | weekly count, average score, cumulative score, fish scales, global rank | Visitor receives `myStats: null`. |
| Site today | `GET /api/community/overview` | Public | todayRecords, todayActiveUsers, todayLikes, totals | Use real totals for cold-start fallback. |
| Today top | `GET /api/community/overview` `todayTop` | Public | top 5 rows | Real usernames are removed from overview top rows. |
| Like/favorite/legend | `POST /api/records/:id/interactions` | Logged-in | toggle action state | Canonical V2 body: `{ action, active }`. |
| Comment list/post | `GET /api/records/:id/social`, `POST /api/records/:id/comments` | Read optional; write logged-in | list/comment count/post | Load details only when comments are opened. |
| Report | `POST /api/records/:id/report` | Logged-in | report duplicate active state | Active duplicate returns `alreadyReported: true`. |
| Legacy like/legend shortcuts | `POST /api/records/:id/like`, `POST /api/records/:id/nominate-legend` | Logged-in | compatibility only | Prefer canonical interactions endpoint for V2. |

Implemented Community Home V2 endpoint map:

| Page module | Endpoint | Notes |
|---|---|---|
| Feed latest | `GET /api/community/feed?filter=latest` | Sorts by `created_at DESC`. |
| Feed hot | `GET /api/community/feed?filter=hot` | Sorts by `like_count * 2 + comment_count * 3 + legend_nomination_count * 8`, then newest. |
| Feed high score | `GET /api/community/feed?filter=high` | Sorts by `fish_power_score DESC`, then newest. |
| Feed legendary | `GET /api/community/feed?filter=legendary` | Uses existing legend selected/nomination/vote/legendary-creativity signals. |
| Right rail overview | `GET /api/community/overview` | Provides `myStats`, `siteToday`, `todayTop`, and disabled feature flags. |
| Like/favorite/legend | `POST /api/records/:id/interactions` | Canonical V2 action endpoint with `{ action, active }`. |
| Comments | `GET /api/records/:id/social`, `POST /api/records/:id/comments` | Use feed `commentCount` until details are opened. |
| Report | `POST /api/records/:id/report` | Active duplicate returns `alreadyReported: true`; feed `viewer.reported` only reflects active reports. |

---

## 1.1 `GET /api/community/overview`

Purpose: one read-only data source for the Community Home V2 right rail and cold-start state. This endpoint must not migrate, repair, normalize, or write database rows while reading.

- Method/path: `GET /api/community/overview`
- Auth: optional `Authorization: Bearer <token>`.
- Request body: none.
- Query params: none.
- Visitor response:

```json
{
  "myStats": null,
  "siteToday": {
    "todayRecords": 0,
    "todayActiveUsers": 0,
    "todayLikes": 0,
    "totalRecords": 0,
    "totalUsers": 0,
    "totalLikes": 0
  },
  "todayTop": [],
  "featureFlags": {
    "mutualFollowing": false,
    "topics": false,
    "profilePages": false
  }
}
```

- Logged-in response: same shape, but `myStats` is populated for the current bearer-token user only:

```json
{
  "myStats": {
    "weeklyRecordCount": 0,
    "weeklyAverageScore": 0,
    "cumulativeScore": 0,
    "fishScales": 0,
    "globalRank": null
  }
}
```

Field semantics:

- `weeklyRecordCount`: current user's non-rejected records in the current week.
- `weeklyAverageScore`: average single-record Fish Power Score for those weekly records, rounded to 1 decimal.
- `cumulativeScore`: current user's cumulative score; this is not capped at 10.
- `fishScales`: current wallet balance read from `user_wallets`; missing wallet rows return `0` and are not created by this endpoint.
- `globalRank`: rank by cumulative user record score, or `null` when the current user has no score.
- `siteToday`: public approved/community-visible aggregate counts.
- `todayTop`: first 5 rows from the existing today leaderboard with real usernames removed.
- `featureFlags.mutualFollowing`: always `false`; no friend/following backend exists in this task.
- `featureFlags.topics`: always `false` for Community Home V2; do not wire a new topic feature from this flag.
- `featureFlags.profilePages`: always `false` for Community Home V2; do not depend on profile navigation from this flag.

Errors: this is a public read endpoint. Invalid or missing bearer token is treated as visitor state; no private `myStats` is returned.

## 1.2 `GET /api/community/feed`

Purpose: Community Home V2 record stream. Existing fields remain available. The response now also includes additive compatibility fields for V2 cards.

- Method/path: `GET /api/community/feed`
- Auth: optional `Authorization: Bearer <token>`.
- Query params:
  - `filter=latest|hot|high|legendary`, default `latest`.
- Response body:

```json
{
  "filter": "latest",
  "records": [
    {
      "id": 1,
      "nickname": "匿名鱼",
      "createdAt": "2026-05-26T00:00:00.000Z",
      "title": "浅水观察员",
      "description": "公开展示的摸鱼描述",
      "score": 4.2,
      "fishPowerScore": 4.2,
      "primaryTag": null,
      "avatarSeed": "public-safe-seed",
      "likeCount": 0,
      "favoriteCount": 0,
      "commentCount": 0,
      "legendNominationCount": 0,
      "viewer": {
        "liked": false,
        "favorited": false,
        "legendNominated": false,
        "reported": false
      }
    }
  ],
  "safetyNotice": "..."
}
```

Additive V2 fields:

- `fishPowerScore`: top-level alias for the backend-clamped single-record score in `[0, 10]`. Existing `score` and `breakdown.fishPowerScore` are preserved.
- `primaryTag`: the first existing record tag/circle tag object, or `null`. No new topic system is created for this field.
- `avatarSeed`: generated from public-safe record fields. It must not expose real `user_id`, username, email, or admin data.
- `viewer.favorited`: true only when the current viewer has an existing favorite interaction.
- `viewer.reported`: true only when the current viewer has an active report with status `pending` or `reviewing`.

Identity and moderation protection:

- Community feed records must not expose real `userId`, real `username`, email, or non-empty `reviewNote`.
- Anonymous/public records use public display fields only.
- Admin-only moderation fields stay in admin endpoints.

Sort rules:

- `latest`: `created_at DESC`.
- `hot`: `(like_count * 2 + comment_count * 3 + legend_nomination_count * 8) DESC, created_at DESC`.
- `high`: `fish_power_score DESC, created_at DESC`.
- `legendary`: `legend_selected DESC, legend_nomination_count DESC, vote_count DESC, fish_power_score DESC`; only records selected, nominated, voted, or marked with legendary creativity are included.

Frontend rule: Claude must call this real endpoint for Community Home V2 record data and must not mock records or invent alternate feed endpoints.

---

## 2. `POST /api/records`

- Method/path: `POST /api/records`.
- Permission: public submission endpoint; if a user token is present, the record is associated with that user.
- Request body: existing record fields are unchanged:
  - `nickname`
  - `activityText` / `activity_text` / `slackingType`
  - `duration`
  - `risk`
  - `disguise`
  - `creativity`
  - `description` / `storyText` / `story_text`
  - anonymization confirmation
  - publish scope
  - groups/topics if already supported
- Client-supplied `fishPowerScore`, `score`, `totalScore`, `title`, and cumulative score fields are not authoritative.
- Response body: response shape is unchanged. Existing fields such as `record.score`, `record.breakdown.fishPowerScore`, and `cumulativeScore` keep their current names.
- Scoring semantics:
  - `fishPowerScore` means a single-record Fish Power Score in `[0, 10]`, rounded to 1 decimal.
  - `cumulativeScore` is a user/nickname aggregate and is not capped at 10.
- Validation:
  - Safety/anonymization validation still applies.
  - `risk`, `disguise`, and `creativity` are metadata or lightweight inputs. They must not be trusted as high-weight scoring controls.
- Side effects:
  - record insert
  - cumulative score/title update if applicable
  - fish-scale submission reward if applicable
  - guild/group side effects only if existing backend rules support them
- Forbidden:
  - frontend cannot choose final score/title.
  - frontend cannot bypass anonymization confirmation.

---

## 3. Community Records Feed

> Current implementation path must be confirmed against `server/routes.ts` and `src/api.ts`. Preferred V2 contract below.

### `GET /api/records`

Query parameters:

| Param | Values | Required | Notes |
|---|---|---:|---|
| `sort` | `latest` / `hot` / `score` / `legend` | No | Defaults to `latest`. |
| `limit` | integer | No | Backend should cap maximum. |
| `cursor` / `page` | string / integer | No | Use current pagination style. |
| `scope` | `public` | No | Community feed must only return public/approved records. |

Response shape target:

```json
{
  "records": [
    {
      "id": 1,
      "author": {
        "displayName": "匿名鲨鱼",
        "isAnonymous": true,
        "avatarSeed": "safe-public-seed"
      },
      "createdAt": "2026-05-26T00:00:00.000Z",
      "title": "茶水间常驻",
      "activityText": "茶水间偶遇老板",
      "description": "……",
      "fishPowerScore": 8.4,
      "titleBadge": "摸鱼老学徒",
      "primaryTag": "#会议神游",
      "counts": {
        "likes": 0,
        "comments": 0,
        "favorites": 0,
        "legendNominations": 0
      },
      "viewer": {
        "hasLiked": false,
        "hasReportedActive": false,
        "hasNominatedLegend": false
      }
    }
  ],
  "nextCursor": null
}
```

Rules:

- Anonymous records must not expose real user id, email, username, or admin-only identity.
- `viewer` fields are only meaningful when logged in; visitor values may be false or omitted.
- `fishPowerScore` is always `[0, 10]`.
- Only public/approved records should appear in community feed.

---

## 4. `GET /api/leaderboards`

- Method/path: `GET /api/leaderboards`.
- Permission: public read endpoint.
- Request body: none.
- Response body: unchanged. Board row `score` continues to use the existing field name.
- Scoring semantics:
  - Each stored record score is 0-10.
  - Leaderboard rows can exceed 10 when aggregating multiple records by user/nickname/period.
- Side effects: must not mutate or re-normalize historical scores.

Community Home V2 usage:

- Today Top 5 can consume the today board if available.
- If the response does not provide the needed Top 5 structure, Codex may add an overview endpoint rather than making Claude derive unstable data.

---

## 5. `GET /api/community/overview` Implemented Contract

This aggregation endpoint is implemented for Community Home V2. Claude must call it for right-rail stats and cold-start data instead of mocking those values.

Permission:

- Public endpoint.
- If user token is present, can include private viewer-specific `myStats`.
- Without user token, private fields should be `null` or omitted.

Response target:

```json
{
  "myStats": null,
  "siteToday": {
    "todayRecords": 0,
    "todayActiveUsers": 0,
    "todayLikes": 0,
    "totalRecords": 0,
    "totalUsers": 0,
    "totalLikes": 0
  },
  "todayTop": [],
  "featureFlags": {
    "mutualFollowing": false,
    "topics": false,
    "profilePages": false
  }
}
```

Logged-in `myStats` target:

```json
{
  "weeklyRecordCount": 0,
  "weeklyAverageScore": 0,
  "cumulativeScore": 0,
  "fishScales": 0,
  "globalRank": null
}
```

Cold-start requirements:

- Frontend needs both today values and cumulative totals.
- If a today metric is `< 5`, frontend should show fallback cumulative data instead of discouraging low today numbers.

---

## 6. Reports

### `POST /api/records/:id/report`

Permission:

- Logged-in user required.
- Visitor should receive `401`.

Rules:

- A user may have only one active report for the same `target_type + target_id`.
- Active statuses: `pending`, `reviewing`.
- Processed statuses such as `resolved`, `rejected`, `invalid`, or `closed` do not block future reports.
- Duplicate active report must not:
  - create a new report row
  - increase report count
  - create duplicate review task

Compatible duplicate response:

```json
{
  "ok": true,
  "alreadyReported": true,
  "record": {}
}
```

First report response:

```json
{
  "ok": true,
  "alreadyReported": false,
  "record": {}
}
```

---

## 7. Interactions

Current project history includes more than one interaction path. Before frontend V2 implementation, Codex should define the canonical frontend path in `src/api.ts` and keep older endpoints as compatibility only if needed.

Canonical behavior required:

| Interaction | Auth | Idempotency | Frontend requirement |
|---|---|---|---|
| Like | Logged-in | Same actor/record/action should not double count | 0 count displays icon only. |
| Comment | Logged-in for post | Multiple comments may exist, but reward must not be infinitely farmable | Comment box hidden by default. |
| Legend nomination | Logged-in | Same actor/record should not double count | Can power legend tab. |
| Report | Logged-in | Same actor/target active report only once | `alreadyReported` compatible response. |

Frontend must not maintain authoritative counts locally after failed requests.

---

## 8. Admin Auth

- Admin login endpoint may return `429` under rate limit.
- Admin auth uses httpOnly admin cookie + server-side admin session.
- Admin logout must revoke server-side session.
- `GET /api/admin/auth/me` should verify admin cookie/session.
- Ordinary bearer token is not admin auth.
- Admin session database query errors should be logged and surface as system errors, not as fake `401` unauthenticated.

---

## 9. Feature Flags for V2 UI

Recommended source: `GET /api/community/overview.featureFlags`.

| Flag | Current target | Frontend behavior |
|---|---:|---|
| `mutualFollowing` | `false` | Show disabled / 待开放 tab, no API request. |
| `topics` | `false` | Do not implement `#` topic system as real feature. |
| `profilePages` | `false` | Do not create profile route from record card unless existing route is already stable. |

---

## 10. Frontend Rules Derived from Contract

- Claude must consume real APIs documented here.
- Claude must not mock community records, leaderboards, stats, wallet, or interaction states.
- If an API is missing, Claude should implement a safe disabled/empty/fallback state and report the backend gap.
- No frontend route should expose anonymous real identity.
