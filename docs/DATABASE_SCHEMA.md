# DATABASE_SCHEMA.md

## `slacking_records` Score Fields

Single-record Fish Power Score is stored on `slacking_records`.

| Field | Type | Nullable | Default | Unique | Index | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `fish_power_score` | REAL | No | none | No | `idx_slacking_records_score` | Final backend-generated single-record score, clamped to `[0, 10]` and rounded to 1 decimal. |
| `score_version` | TEXT | No | `legacy_type_v1` | No | `idx_slacking_records_score_version` | New records use `ai_judge_v2_10pt` or `ai_judge_v2_10pt_fallback`. Migrated legacy rows append `+single_record_10pt_v1`. |
| `score_breakdown` | TEXT | No | `''` | No | No | JSON metadata for scoring components. API serialization overrides final `fishPowerScore` from `fish_power_score` so legacy JSON cannot leak an old >10 final score. |
| `duration_score` | REAL | No | `0` | No | No | Duration component under the current 0-10 model is 1.4-3.0 for new records. |
| `duration_base_score` | REAL | No | `0` | No | No | Same duration base component for the current scoring model. |

Constraints:

- `trg_slacking_records_fish_score_insert_check` rejects inserts where `fish_power_score` is negative, above 10, or non-finite.
- `trg_slacking_records_fish_score_update_check` rejects updates that would move `fish_power_score` outside `[0, 10]`.
- The backend also clamps before insert through `insertRecord()`; the trigger is a database safety net.

Migration:

- Startup migration is idempotent and does not clear `slacking_records`.
- Existing rows with `fish_power_score > 10` are normalized once using `ROUND(MIN(10, MAX(0, fish_power_score / 12)), 1)`.
- Existing rows with negative or non-finite scores are set to `0`.
- Rows already in `[0, 10]` are not divided again, so repeated startup does not keep shrinking scores.
- After migration, `refreshAllSocialAggregates()` recalculates `users.total_score` from normalized record scores.

Compatibility:

- User cumulative score remains a sum of record scores and is not capped at 10.
- Guild contribution, group goals, fish-scale wallet balances, and interaction rewards keep their own units; they are not converted into 0-10 fields.
