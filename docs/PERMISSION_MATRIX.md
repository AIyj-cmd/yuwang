# PERMISSION_MATRIX.md

## Single Record Scoring Boundaries

| Behavior | Visitor / unauthenticated | Normal logged-in user | Banned user | Admin |
| --- | --- | --- | --- | --- |
| Submit `POST /api/records` | Allowed by public endpoint when content validation passes | Allowed and associated with the user | No new bypass; existing auth/status protections still apply where protected actions are enforced | Not an admin capability |
| Provide `fishPowerScore`, `score`, `totalScore`, or `title` in request body | Ignored/not accepted as authoritative | Ignored/not accepted as authoritative | Ignored/not accepted as authoritative | Not applicable |
| Final single-record scoring | Backend only | Backend only | Backend only | Backend only |
| Read leaderboards | Allowed | Allowed | Allowed | Allowed |
| Access `/api/admin/*` scoring views or prompt tests | 401 without valid admin cookie | Ordinary bearer token is not admin auth | Ordinary bearer token is not admin auth | Allowed only through httpOnly admin cookie and valid admin session |

Rules:

- `fishPowerScore` is now a backend-generated single-record 0-10 score.
- AI judge output and deterministic fallback are both clamped to `[0, 10]`.
- User cumulative score is not a single-record score and is not capped at 10.
- Ordinary users cannot use request fields to forge final score, cumulative score, title, review status, user status, wallet balance, or admin permissions.
- This scoring change adds no new permission capability and does not weaken administrator httpOnly cookie requirements.
