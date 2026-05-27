<script setup lang="ts">
import { computed } from 'vue';
import { Activity, Users, Waves, Zap } from 'lucide-vue-next';
import { useAppContext } from '../appContext';

const { communityRecords, copy } = useAppContext();

const isToday = (iso: string): boolean => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const todayRecords = computed(() => communityRecords.value.filter((r: any) => isToday(r.createdAt)));

const interactionCount = computed(() =>
  todayRecords.value.reduce(
    (sum: number, r: any) =>
      sum +
      (r.likeCount ?? 0) +
      (r.commentCount ?? 0) +
      (r.voteCount ?? 0) +
      (r.legendNominationCount ?? 0),
    0
  )
);

const averageScore = computed(() => {
  const rows = todayRecords.value;
  if (!rows.length) return 0;
  return rows.reduce((sum: number, r: any) => sum + (r.score ?? 0), 0) / rows.length;
});

/** 摸鱼指数：复用站内既有公式（记录数 + 平均分 + 互动数派生，0–100）。 */
const fishIndex = computed(() => {
  const count = todayRecords.value.length;
  if (!count) return 0;
  const fromCount = Math.min(40, count * 4);
  const fromScore = Math.min(40, averageScore.value / 6);
  const fromInteractions = Math.min(20, interactionCount.value * 0.8);
  return Math.round((fromCount + fromScore + fromInteractions) * 10) / 10;
});

const fishIndexLabel = computed(() => {
  const v = fishIndex.value;
  if (!todayRecords.value.length) return copy('鱼塘风平浪静', 'Pond is calm');
  if (v < 20) return copy('风平浪静', 'Very calm');
  if (v < 40) return copy('有鱼试水', 'Testing the water');
  if (v < 60) return copy('偏活跃', 'Fairly active');
  if (v < 80) return copy('明显躁动', 'Clearly stirring');
  return copy('即将沸腾', 'About to boil');
});

/** 今日活跃鱼：今日上墙记录里的不重复昵称数（真实派生，非实时在线）。 */
const activeFishCount = computed(() => {
  const names = new Set<string>();
  for (const r of todayRecords.value as any[]) {
    if (r.nickname) names.add(String(r.nickname).trim());
  }
  return names.size;
});

const todayRecordCount = computed(() => todayRecords.value.length);

const statusMetrics = computed(() => [
  {
    key: 'index',
    icon: Activity,
    tone: 'index',
    label: copy('摸鱼指数', 'Slack Index'),
    value: fishIndex.value.toFixed(1),
    hint: fishIndexLabel.value
  },
  {
    key: 'active',
    icon: Users,
    tone: 'active',
    label: copy('今日活跃鱼', 'Active Fish'),
    value: String(activeFishCount.value),
    hint: copy('今日出没的鱼', 'Fish seen today')
  },
  {
    key: 'records',
    icon: Waves,
    tone: 'records',
    label: copy('今日上墙', 'Posts Today'),
    value: String(todayRecordCount.value),
    hint: copy('今日新记录', 'New records today')
  },
  {
    key: 'interactions',
    icon: Zap,
    tone: 'interactions',
    label: copy('今日互动', 'Interactions'),
    value: String(interactionCount.value),
    hint: copy('赞·评·投·提名', 'Likes · replies · votes')
  }
]);
</script>

<template>
  <div class="statusbar" :aria-label="copy('全站状态', 'Site status')">
    <article
      v-for="metric in statusMetrics"
      :key="metric.key"
      class="status-tile"
      :class="`tone-${metric.tone}`"
    >
      <div class="status-tile-head">
        <component :is="metric.icon" :size="15" />
        <span>{{ metric.label }}</span>
      </div>
      <strong class="status-value">{{ metric.value }}</strong>
      <small class="status-hint">{{ metric.hint }}</small>
    </article>
  </div>
</template>

<style scoped>
.statusbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 640px) {
  .statusbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 380px) {
  .statusbar {
    grid-template-columns: 1fr;
  }
}

.status-tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 15px 16px;
  border: 3px solid var(--color-border);
  box-shadow: 5px 5px 0 var(--color-border);
  color: var(--color-text);
  min-width: 0;
}

.status-tile.tone-index {
  background: var(--color-ink-strong-bg);
  color: var(--color-ink-strong-text);
}
.status-tile.tone-active   { background: var(--color-primary); }
.status-tile.tone-records  { background: var(--color-accent); }
.status-tile.tone-interactions { background: var(--color-warning); }

.status-tile-head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-pixel);
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.status-tile-head span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-value {
  font-family: var(--font-pixel);
  font-size: 34px;
  line-height: 1.05;
  letter-spacing: 0.02em;
}

.status-hint {
  font-size: 11px;
  font-weight: 800;
  opacity: 0.82;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 640px) {
  .statusbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .status-value { font-size: 28px; }
}
</style>
