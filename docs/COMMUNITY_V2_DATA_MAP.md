# COMMUNITY_V2_DATA_MAP.md

> Status: Implemented backend map for Community Home V2.  
> Owner: Claude Code should use this when rebuilding Community Home V2.  
> Rule: Claude must use these real APIs and must not mock records, stats, rankings, wallet values, or viewer states.

---

## 0. Inputs

- Visual source: `STYLE_GUIDE.md`.
- Design reference: `drafts/community-neopixel-v3.html` in this repo. A root-level `community-neopixel-v3.html` was not present when this backend map was updated.
- Backend contract: `docs/API_CONTRACT.md`.

---

## 1. Page Module To API Map

| Community V2 module | Real endpoint/source | Auth | Notes |
|---|---|---|---|
| PostBox / 投放入口 | `POST /api/records` | Optional bearer token | Existing submission flow. Backend generates score/title. |
| Feed latest tab | `GET /api/community/feed?filter=latest` | Optional bearer token | Sorts by `created_at DESC`. |
| Feed hot tab | `GET /api/community/feed?filter=hot` | Optional bearer token | Sorts by `like_count * 2 + comment_count * 3 + legend_nomination_count * 8`, then newest. |
| Feed high tab | `GET /api/community/feed?filter=high` | Optional bearer token | Sorts by `fish_power_score DESC`, then newest. |
| Feed legendary tab | `GET /api/community/feed?filter=legendary` | Optional bearer token | Includes selected/nominated/voted/legendary-creativity records and sorts by legend signals. |
| Mutual following tab | `GET /api/community/overview` feature flag | Optional bearer token | `featureFlags.mutualFollowing` is `false`; render disabled / waiting state and make no follow API call. |
| Record card score | Feed record `fishPowerScore` | Public | Single-record score in `[0, 10]`. Existing `score` and `breakdown.fishPowerScore` remain for compatibility. |
| Record card primary tag | Feed record `primaryTag` | Public | First existing tag/circle tag object, or `null`; do not invent topics. |
| Record card avatar | Feed record `avatarSeed` | Public | Public-safe seed generated from public record fields; not real `user_id`/username/email. |
| Like / favorite / legend | `POST /api/records/:id/interactions` | Logged-in bearer token | Body `{ "action": "like"|"favorite"|"vote", "active": true|false }`. Use this canonical endpoint for V2. |
| Comments | `GET /api/records/:id/social`, `POST /api/records/:id/comments` | Read optional; post logged-in | Use feed `commentCount` for collapsed cards. Load social only when opening comments. |
| Report | `POST /api/records/:id/report` | Logged-in bearer token | Duplicate active report returns `alreadyReported: true`. Feed `viewer.reported` means active `pending`/`reviewing` only. |
| My fish data card | `GET /api/community/overview` | Optional bearer token | Visitor gets `myStats: null`; logged-in user gets self-only stats. |
| Site today card | `GET /api/community/overview` | Public | Uses `siteToday` fields. Apply cold-start fallback when today values are below product threshold. |
| Today Top 5 | `GET /api/community/overview` | Public | Use `todayTop`. Real usernames are removed from this payload. |

---

## 2. `GET /api/community/feed`

Request:

```http
GET /api/community/feed?filter=latest
Authorization: Bearer <optional user token>
```

Allowed filters:

- `latest`
- `hot`
- `high`
- `legendary`

Record fields for V2:

```ts
type CommunityFeedRecord = {
  id: number
  nickname: string
  createdAt: string
  title: string
  activityText: string
  description: string
  score: number
  fishPowerScore: number
  primaryTag: null | {
    id: number
    name: string
    slug: string
  }
  avatarSeed: string
  avatarUrl: string
  likeCount: number
  favoriteCount: number
  commentCount: number
  legendNominationCount: number
  viewer: {
    liked: boolean
    favorited: boolean
    legendNominated: boolean
    reported: boolean
  }
}
```

Identity rules:

- Do not display or depend on `userId`, `username`, email, or `reviewNote` from community feed payloads.
- Feed may keep compatibility placeholders such as `userId: null`, `username: ""`, and `reviewNote: ""`; these are intentionally not identity data.
- Anonymous/public records must use `nickname` and `avatarSeed` only.

---

## 3. `GET /api/community/overview`

Request:

```http
GET /api/community/overview
Authorization: Bearer <optional user token>
```

Response:

```ts
type CommunityOverview = {
  myStats: null | {
    weeklyRecordCount: number
    weeklyAverageScore: number
    cumulativeScore: number
    fishScales: number
    globalRank: number | null
  }
  siteToday: {
    todayRecords: number
    todayActiveUsers: number
    todayLikes: number
    totalRecords: number
    totalUsers: number
    totalLikes: number
  }
  todayTop: Array<{
    id: number
    rank: number
    nickname: string
    score: number
    metricLabel: string
    title: string
    description: string
    slackingType: string
    activityText: string
    risk: string
    createdAt: string
    likeCount: number
    favoriteCount: number
    voteCount: number
    commentCount: number
    count?: number
  }>
  featureFlags: {
    mutualFollowing: false
    topics: false
    profilePages: false
  }
}
```

Visitor behavior:

- `myStats` is always `null`.
- `siteToday`, `todayTop`, and `featureFlags` are returned.

Logged-in behavior:

- `myStats` is populated only for the current bearer-token user.
- Missing wallet rows return `fishScales: 0`; overview does not create wallet rows.

---

## 4. Cold-Start And Empty-State Rules

Use real values from `GET /api/community/overview`.

| Data state | Frontend behavior |
|---|---|
| `siteToday.todayRecords >= 5` | Show today's record count normally. |
| `siteToday.todayRecords < 5` | Use cumulative fallback such as `siteToday.totalRecords`; do not mock higher today numbers. |
| `siteToday.todayActiveUsers < 5` | Use fallback copy/state instead of emphasizing low activity. |
| `records.length === 0` | Render an empty state with the PostBox CTA; do not inject fake records. |
| `todayTop.length === 0` | Render mini-rank empty state. |

Normal and fallback states must be mutually exclusive.

---

## 5. Feature Flags / Deferred Work

| Feature | Current backend value | Frontend behavior |
|---|---|---|
| Mutual following | `featureFlags.mutualFollowing: false` | Disabled tab / 待开放; no friend API calls. |
| Topics | `featureFlags.topics: false` | Do not create topic UI flows from Community V2. Existing `primaryTag` is display-only. |
| Profile pages | `featureFlags.profilePages: false` | Do not add record-card profile navigation from this flag. |
| Dynamic detail page | No new endpoint in this task | Do not build as part of Community Home V2 backend scope. |
| Guild/circle/group details | Existing features only | Do not expand for Community Home V2. |

---

## 6. No-Mock Rules

Claude must not:

- create fake community records as production data;
- create fake ranking values;
- create fake wallet/fish-scale values;
- create fake user stats;
- treat static `community-neopixel-v3.html` demo content as live data;
- call endpoints not documented here or in `API_CONTRACT.md`;
- silently fall back to local arrays when API fails.

Allowed fallback:

- loading state;
- empty state;
- disabled / 待开放 state;
- error state showing backend message;
- cold-start fallback using real cumulative fields from `siteToday`.
