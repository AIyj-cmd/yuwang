# API_CONTRACT.md

## Single Record Fish Power Score 0-10

### `POST /api/records`

- Method/path: `POST /api/records`.
- Permission: public submission endpoint; if a user token is present, the record is associated with that user. No administrator permission is required.
- Request body: existing record fields are unchanged (`nickname`, `activityText`/`activity_text`/`slackingType`, `duration`, `risk`, `disguise`, `creativity`, `description`/`storyText`, anonymization confirmation, publish scope, groups, and topics). Client-supplied `fishPowerScore`, `score`, `totalScore`, `title`, and cumulative score fields are not accepted as authoritative scoring inputs.
- Response body: response shape is unchanged. `record.score`, `record.breakdown.fishPowerScore`, and `cumulativeScore` keep their existing field names.
- Scoring semantics: `fishPowerScore` now means single-record Fish Power Score in `[0, 10]`, rounded to 1 decimal. `cumulativeScore` is the sum of a user's or nickname's records and is not capped at 10.
- Validation: existing content, safety, topic, duration, and anonymization validation still applies. `risk`, `disguise`, and `creativity` are stored as display/grouping metadata and are not trusted as high-weight score controls.
- AI and fallback: AI judge success and deterministic fallback both pass through backend clamp `[0, 10]`. Missing, non-finite, negative, or out-of-range score values cannot be persisted.
- Error codes: existing 400 validation/safety errors, 403 community-closed errors, and existing auth-related errors are unchanged. Database-level score constraint failures are server errors because application code must clamp before insert.
- Admin requirement: none.
- Impact: affects the single-record score, cumulative title calculation, leaderboards that aggregate `fish_power_score`, record-submission fish-scale reward input, and guild/group contribution input. It does not cap wallet balances, fish-scale transactions, interaction rewards, user cumulative totals, season totals, audit state, or system settings to 10.

### `GET /api/leaderboards`

- Method/path: `GET /api/leaderboards`.
- Permission: public read endpoint.
- Request body: none.
- Response body: unchanged. Board row `score` continues to use the existing field name.
- Scoring semantics: rows are based on `slacking_records.fish_power_score`. Each stored record is 0-10, but rows can exceed 10 when the board aggregates multiple records by user/nickname and period.
- Side effects: this endpoint must not mutate or re-normalize historical scores while reading leaderboards.
