<script setup lang="ts">
import { computed } from 'vue';
import { Activity, Crown, Flame, Hash, ShieldCheck, Smile } from 'lucide-vue-next';
import { useAppContext } from '../appContext';
import type { FeedRecord, Topic } from '../types';

const {
  communityRecords,
  popularTopics,
  adminQueue,
  currentUser,
  copy,
  locale
} = useAppContext();

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

const todayRecords = computed<FeedRecord[]>(() => {
  const rows = (communityRecords?.value ?? []) as FeedRecord[];
  return rows.filter((r) => isToday(r.createdAt));
});

const interactionCount = computed(() => {
  return todayRecords.value.reduce((sum, r) => {
    return (
      sum +
      (r.likeCount ?? 0) +
      (r.commentCount ?? 0) +
      (r.voteCount ?? 0) +
      (r.legendNominationCount ?? 0)
    );
  }, 0);
});

const averageScore = computed(() => {
  const rows = todayRecords.value;
  if (!rows.length) return 0;
  const total = rows.reduce((sum, r) => sum + (r.score ?? 0), 0);
  return total / rows.length;
});

const fishIndex = computed(() => {
  const count = todayRecords.value.length;
  if (!count) return 0;
  const fromCount = Math.min(40, count * 4);
  const fromScore = Math.min(40, averageScore.value / 6);
  const fromInteractions = Math.min(20, interactionCount.value * 0.8);
  const total = fromCount + fromScore + fromInteractions;
  return Math.round(total * 10) / 10;
});

const fishIndexLabel = computed(() => {
  const v = fishIndex.value;
  if (!todayRecords.value.length) {
    return copy('鱼塘还风平浪静', 'Pond is still calm');
  }
  if (v < 20) return copy('鱼塘风平浪静', 'Pond is very calm');
  if (v < 40) return copy('有鱼开始试水', 'Fish starting to test the water');
  if (v < 60) return copy('今日鱼塘偏活跃', 'Pond is fairly active today');
  if (v < 80) return copy('鱼塘明显躁动', 'Pond is clearly stirring');
  return copy('鱼塘即将沸腾', 'Pond is about to boil');
});

const topicHitsForKeywords = (rows: FeedRecord[], keywords: string[]): number => {
  let hits = 0;
  for (const r of rows) {
    const names: string[] = [];
    if (Array.isArray(r.topics)) names.push(...r.topics.map((t) => t.name ?? ''));
    if (r.activityText) names.push(r.activityText);
    if (r.storyText) names.push(r.storyText);
    for (const k of keywords) {
      if (names.some((n) => n && n.includes(k))) {
        hits += 1;
        break;
      }
    }
  }
  return hits;
};

const mentalState = computed(() => {
  const rows = todayRecords.value;
  if (!rows.length) {
    return copy('全站认真上班中', 'Everyone is working seriously');
  }
  const meetingHits = topicHitsForKeywords(rows, ['会议', '开会', 'meeting']);
  const learningHits = topicHitsForKeywords(rows, ['学习', '带薪学习', 'learning', 'study']);
  const teaHits = topicHitsForKeywords(rows, ['茶水', '摸茶', 'tea', 'break']);
  const total = rows.length;
  const avg = averageScore.value;

  if (meetingHits / total >= 0.4) {
    return copy('会议潜航中', 'Diving through meetings');
  }
  if (learningHits / total >= 0.4) {
    return copy('带薪学习中', 'Paid learning in progress');
  }
  if (teaHits / total >= 0.3) {
    return copy('茶水间沸腾', 'Break room is buzzing');
  }
  if (avg < 50) return copy('假装很忙', 'Pretending to be busy');
  if (avg < 120) return copy('集体精神离岸', 'Collective soul has drifted offshore');
  if (avg < 200) return copy('鱼塘水温过高', 'Pond temperature is rising');
  return copy('茶水间沸腾', 'Break room is buzzing');
});

const poolHeat = computed(() => {
  const activity = todayRecords.value.length + interactionCount.value;
  if (activity === 0) return { label: copy('冷清', 'Quiet'), index: 0 };
  if (activity <= 5) return { label: copy('微温', 'Lukewarm'), index: 1 };
  if (activity <= 15) return { label: copy('偏热', 'Warm'), index: 2 };
  if (activity <= 30) return { label: copy('沸腾', 'Boiling'), index: 3 };
  return { label: copy('开锅', 'Boiling over'), index: 4 };
});

const fishKing = computed(() => {
  const rows = todayRecords.value;
  if (!rows.length) return null;
  const top = [...rows].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  if (!top) return null;
  return {
    nickname: top.nickname || copy('匿名鱼', 'Anonymous Fish'),
    score: top.score ?? 0
  };
});

const hotPostures = computed<Topic[] | { name: string; count: number }[]>(() => {
  const rows = todayRecords.value;
  const counter = new Map<string, number>();
  for (const r of rows) {
    if (Array.isArray(r.topics)) {
      for (const topic of r.topics) {
        if (!topic?.name) continue;
        counter.set(topic.name, (counter.get(topic.name) ?? 0) + 1);
      }
    }
  }
  if (counter.size) {
    return [...counter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }
  // Fallback to site-level popular topics if no topics on today's records
  const popular = (popularTopics?.value ?? []) as Topic[];
  return popular.slice(0, 3).map((t) => ({ name: t.name, count: t.usage_count }));
});

const safetyState = computed(() => {
  const queue = adminQueue?.value;
  if (currentUser?.value?.isAdmin && queue) {
    const pending = (queue.records?.length ?? 0) + (queue.comments?.length ?? 0);
    if (pending > 0) {
      return {
        level: copy('留意', 'Heads-up'),
        note: copy('有内容正在审核中', 'Content is under review'),
        warn: true
      };
    }
  }
  return {
    level: copy('正常', 'Normal'),
    note: copy('鱼塘巡逻中', 'Patrolling the pond'),
    warn: false
  };
});

const todayLabel = computed(() => {
  const d = new Date();
  if (locale?.value === 'en-US') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return `${d.getMonth() + 1}月${d.getDate()}日`;
});
</script>

<template>
  <section class="today-dashboard" :aria-label="copy('今日鱼况', 'Today Pond Status')">
    <header class="today-dashboard-head">
      <div>
        <strong>{{ copy('今日鱼况', 'Today’s Pond Status') }}</strong>
        <small>{{ copy('全站匿名摸鱼状态总览 · ', 'Site-wide anonymous mood overview · ') }}{{ todayLabel }}</small>
      </div>
      <span class="today-dashboard-chip">
        {{ copy('今日记录', 'Today') }} {{ todayRecords.length }} · {{ copy('互动', 'Interactions') }} {{ interactionCount }}
      </span>
    </header>

    <div class="today-dashboard-grid">
      <article class="today-tile today-tile-index">
        <div class="today-tile-head">
          <Activity :size="14" />
          <span>{{ copy('全站摸鱼指数', 'Site Slacking Index') }}</span>
        </div>
        <strong class="today-index-number">{{ fishIndex.toFixed(1) }}</strong>
        <small>{{ fishIndexLabel }}</small>
      </article>

      <article class="today-tile today-tile-mood">
        <div class="today-tile-head">
          <Smile :size="14" />
          <span>{{ copy('全站精神状态', 'Collective Mood') }}</span>
        </div>
        <strong>{{ mentalState }}</strong>
        <small>{{ copy('根据今日标签与平均分推断', 'Derived from today’s tags and avg score') }}</small>
      </article>

      <article class="today-tile today-tile-heat">
        <div class="today-tile-head">
          <Flame :size="14" />
          <span>{{ copy('鱼塘水温', 'Pond Temperature') }}</span>
        </div>
        <strong>{{ poolHeat.label }}</strong>
        <div class="today-heat-bar" :data-level="poolHeat.index" :aria-hidden="true">
          <span v-for="i in 5" :key="i" :class="{ filled: i - 1 <= poolHeat.index }"></span>
        </div>
        <small>
          {{ copy('今日', 'Today') }} {{ todayRecords.length }} {{ copy('条记录', 'records') }} ·
          {{ interactionCount }} {{ copy('次互动', 'interactions') }}
        </small>
      </article>

      <article class="today-tile today-tile-king">
        <div class="today-tile-head">
          <Crown :size="14" />
          <span>{{ copy('今日鱼王', 'Today’s Fish King') }}</span>
        </div>
        <template v-if="fishKing">
          <strong class="today-king-name">{{ fishKing.nickname }}</strong>
          <small class="today-king-score">Fish Power {{ fishKing.score.toFixed(1) }}</small>
        </template>
        <template v-else>
          <strong class="today-king-empty">{{ copy('今日鱼王虚位以待', 'Fish King seat is open') }}</strong>
          <small>{{ copy('提交一条记录有机会上位', 'Submit a record to claim the seat') }}</small>
        </template>
      </article>

      <article class="today-tile today-tile-postures">
        <div class="today-tile-head">
          <Hash :size="14" />
          <span>{{ copy('热门摸鱼姿势', 'Hot Postures') }}</span>
        </div>
        <div v-if="hotPostures.length" class="today-posture-list">
          <span v-for="item in hotPostures" :key="item.name">
            #{{ item.name }}
          </span>
        </div>
        <small v-else class="today-posture-empty">
          {{ copy('还没有热门姿势', 'No hot postures yet') }}
        </small>
      </article>

      <article class="today-tile today-tile-safety" :class="{ warn: safetyState.warn }">
        <div class="today-tile-head">
          <ShieldCheck :size="14" />
          <span>{{ copy('安全水位', 'Safety Level') }}</span>
        </div>
        <strong>{{ safetyState.level }}</strong>
        <small>{{ safetyState.note }}</small>
      </article>
    </div>
  </section>
</template>
