<script setup lang="ts">
import { computed } from 'vue';
import { BarChart3 } from 'lucide-vue-next';
import { useAppContext } from '../../appContext';
import type { RecordSummary } from '../../types';

const props = defineProps<{
  records: RecordSummary[];
}>();

const { copy, locale } = useAppContext();

const HEATMAP_WEEKS = 18;
const HEATMAP_DAYS = HEATMAP_WEEKS * 7;

interface HeatmapDay {
  date: Date;
  dateStr: string;
  score: number;
  count: number;
  level: number;
}

interface HeatmapWeek {
  index: number;
  days: HeatmapDay[];
  monthLabel: string;
}

const heatmapWeeks = computed<HeatmapWeek[]>(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - HEATMAP_DAYS + 1);

  const records = props.records;

  // Pre-index records by date string for O(1) lookup instead of O(n·m) filter
  const recordMap = new Map<string, RecordSummary[]>();
  for (const r of records) {
    const parsed = new Date(r.createdAt);
    if (Number.isNaN(parsed.getTime())) continue;
    const rDate = parsed.toISOString().split('T')[0];
    if (!recordMap.has(rDate)) recordMap.set(rDate, []);
    recordMap.get(rDate)!.push(r);
  }

  const days: HeatmapDay[] = [];

  for (let i = 0; i < HEATMAP_DAYS; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const dayRecords = recordMap.get(dateStr) ?? [];
    const score = dayRecords.reduce((sum: number, r: RecordSummary) => sum + r.score, 0);
    const count = dayRecords.length;

    let level = 0;
    if (count > 0) {
      if (score < 60) level = 1;
      else if (score < 120) level = 2;
      else if (score < 200) level = 3;
      else level = 4;
    }

    days.push({ date, dateStr, score, count, level });
  }

  const weeks: HeatmapWeek[] = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const weekDays = days.slice(w * 7, w * 7 + 7);
    const firstDay = weekDays[0];
    const monthLabel = firstDay.date.getDate() <= 7 || w === 0
      ? firstDay.date.toLocaleDateString(locale.value === 'en-US' ? 'en' : 'zh-CN', { month: 'short' })
      : '';
    weeks.push({ index: w, days: weekDays, monthLabel });
  }

  return weeks;
});
</script>

<template>
  <section class="pp-section">
    <div class="pp-section-head">
      <BarChart3 :size="15" />
      <h2>{{ copy('摸鱼热力图', 'Heatmap') }}</h2>
    </div>
    <div class="pp-heatmap">
      <div class="pp-heatmap-months">
        <span
          v-for="week in heatmapWeeks"
          :key="`m-${week.index}`"
          class="pp-heatmap-month"
          :class="{ visible: week.monthLabel }"
        >{{ week.monthLabel }}</span>
      </div>
      <div class="pp-heatmap-grid">
        <div v-for="week in heatmapWeeks" :key="week.index" class="pp-heatmap-week">
          <div
            v-for="(day, idx) in week.days"
            :key="`${week.index}-${idx}`"
            class="pp-heatmap-cell"
            :class="`level-${day.level}`"
            :title="`${day.dateStr} · ${day.count} ${copy('条', 'records')} · ${day.score.toFixed(1)} ${copy('分', 'pts')}`"
          />
        </div>
      </div>
      <div class="pp-heatmap-legend">
        <span>{{ copy('少', 'Less') }}</span>
        <div class="pp-heatmap-cell level-0" />
        <div class="pp-heatmap-cell level-1" />
        <div class="pp-heatmap-cell level-2" />
        <div class="pp-heatmap-cell level-3" />
        <div class="pp-heatmap-cell level-4" />
        <span>{{ copy('多', 'More') }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pp-section {
  display: grid;
  gap: 14px;
}
.pp-section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 3px solid var(--color-border);
  background: var(--color-ink-strong-bg);
}
.pp-section-head h2 {
  font-family: var(--font-pixel);
  font-size: 13px;
  font-weight: 900;
  margin: 0;
  color: var(--color-ink-strong-text);
  flex: 1;
  letter-spacing: 0.3px;
}
.pp-section-head svg {
  color: var(--color-ink-strong-text);
  padding: 3px;
  border: 2px solid var(--color-ink-strong-text);
  flex-shrink: 0;
}
.pp-heatmap {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 3px solid var(--color-border);
  background: var(--color-surface-soft);
}
.pp-heatmap-months {
  display: flex;
  gap: 3px;
}
.pp-heatmap-month {
  width: 14px;
  font-size: 9px;
  color: var(--color-text-muted);
  font-weight: 800;
  text-align: center;
  line-height: 1;
  visibility: hidden;
}
.pp-heatmap-month.visible {
  visibility: visible;
}
.pp-heatmap-grid {
  display: flex;
  gap: 3px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.pp-heatmap-week {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.pp-heatmap-cell {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
}
.pp-heatmap-cell.level-1 {
  background: var(--color-accent);
  opacity: 0.5;
}
.pp-heatmap-cell.level-2 {
  background: var(--color-accent);
  opacity: 0.8;
}
.pp-heatmap-cell.level-3 {
  background: var(--color-accent);
  opacity: 1;
}
.pp-heatmap-cell.level-4 {
  background: var(--color-primary);
  opacity: 1;
}
.pp-heatmap-legend {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-top: 4px;
}
.pp-heatmap-legend span {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 700;
}
</style>
