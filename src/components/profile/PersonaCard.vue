<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Fish, RefreshCw, Star } from 'lucide-vue-next';
import { PxButton } from '@mmt817/pixel-ui';
import { useAppContext } from '../../appContext';
import type { ProfileInsights } from '../../types';

const props = defineProps<{
  insights: ProfileInsights | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
}>();

const { copy, openProfileRecord, translatedTitle } = useAppContext();
const router = useRouter();

const refreshInsights = () => {
  emit('refresh');
};

const goSubmit = () => router.push('/submit');
</script>

<template>
  <section class="pp-section">
    <div class="pp-section-head">
      <Fish :size="15" />
      <h2>{{ copy('摸鱼画像', 'Persona') }}</h2>
      <button
        class="pp-refresh-btn"
        :class="{ spinning: loading }"
        :disabled="loading"
        @click="refreshInsights"
      >
        <RefreshCw :size="12" />
      </button>
    </div>

    <div v-if="loading" class="pp-placeholder">
      {{ copy('画像生成中...', 'Loading insights...') }}
    </div>

    <template v-else-if="insights">
      <div v-if="insights.totalRecords > 0" class="pp-persona">
        <div class="pp-persona-badge">
          <Star :size="14" />
          <strong>{{ insights.persona.label }}</strong>
        </div>
        <p class="pp-persona-desc">{{ insights.persona.description }}</p>

        <div class="pp-persona-metrics">
          <div class="pp-metric">
            <span>{{ copy('总次数', 'Total') }}</span>
            <strong>{{ insights.totalRecords }}</strong>
          </div>
          <div class="pp-metric">
            <span>{{ copy('平均分', 'Avg') }}</span>
            <strong>{{ insights.averageScore.toFixed(1) }}</strong>
          </div>
          <div class="pp-metric">
            <span>{{ copy('本周', 'Week') }}</span>
            <strong>{{ insights.weekActivity.records }}</strong>
          </div>
          <div class="pp-metric">
            <span>{{ copy('本月', 'Month') }}</span>
            <strong>{{ insights.monthActivity.records }}</strong>
          </div>
          <div class="pp-metric">
            <span>{{ copy('获赞', 'Likes') }}</span>
            <strong>{{ insights.interactions.likes }}</strong>
          </div>
          <div class="pp-metric">
            <span>{{ copy('传奇提名', 'Legends') }}</span>
            <strong>{{ insights.interactions.legendNominations }}</strong>
          </div>
        </div>

        <div
          v-if="insights.highestRecord"
          class="pp-best-record"
          @click="openProfileRecord(insights.highestRecord.id)"
        >
          <div class="pp-best-meta">
            <span class="pp-tag pp-tag--warning">{{ copy('最高分', 'Best') }}</span>
            <span>{{ translatedTitle(insights.highestRecord.title) }}</span>
          </div>
          <strong class="pp-best-score">{{ insights.highestRecord.score.toFixed(1) }}</strong>
          <small>{{ insights.highestRecord.activityText }}</small>
        </div>
      </div>

      <div v-else class="pp-placeholder">
        <p>{{ copy('还没有公开记录，提交一条后画像会自动生成。', 'No public records yet.') }}</p>
        <PxButton type="primary" size="small" @click="goSubmit">{{ copy('去提交', 'Submit') }}</PxButton>
      </div>
    </template>
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
.pp-persona {
  display: grid;
  gap: 14px;
}
.pp-persona-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
  width: fit-content;
}
.pp-persona-badge strong {
  font-family: var(--font-pixel);
  font-size: 13px;
}
.pp-persona-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.6;
}
.pp-persona-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border: 3px solid var(--color-border);
}
.pp-metric {
  display: grid;
  gap: 4px;
  padding: 14px 10px;
  background: var(--color-surface);
  text-align: center;
  border-right: 2px solid var(--color-border-soft);
  border-bottom: 2px solid var(--color-border-soft);
}
.pp-metric:nth-child(3n) {
  border-right: none;
}
.pp-metric:nth-last-child(-n+3) {
  border-bottom: none;
}
.pp-metric span {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 700;
}
.pp-metric strong {
  font-family: var(--font-pixel);
  font-size: 15px;
  color: var(--color-text);
  line-height: 1;
}
.pp-best-record {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 3px solid var(--color-border);
  background: var(--color-warning);
  cursor: pointer;
}
.pp-best-record:hover {
  filter: brightness(0.97);
}
.pp-best-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pp-best-score {
  font-family: var(--font-pixel);
  font-size: 20px;
  color: var(--color-text);
}
.pp-best-record small {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 700;
}
.pp-refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 2px solid var(--color-ink-strong-text);
  background: transparent;
  color: var(--color-ink-strong-text);
  cursor: pointer;
}
.pp-refresh-btn:hover {
  background: var(--color-ink-strong-text);
  color: var(--color-ink-strong-bg);
}
.pp-refresh-btn.spinning svg {
  animation: pp-spin 0.8s linear infinite;
}
@keyframes pp-spin {
  to { transform: rotate(360deg); }
}
.pp-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 900;
  border: 2px solid var(--color-border);
}
.pp-tag--warning {
  background: var(--color-warning);
  color: var(--color-text);
}
.pp-placeholder {
  padding: 24px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 700;
  border: 3px solid var(--color-border-soft);
  background: var(--color-surface-soft);
}
.pp-placeholder p {
  margin: 0 0 10px;
}

@media (max-width: 760px) {
  .pp-persona-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .pp-metric:nth-child(3n) {
    border-right: 2px solid var(--color-border-soft);
  }
  .pp-metric:nth-last-child(-n+3) {
    border-bottom: 2px solid var(--color-border-soft);
  }
  .pp-metric:nth-child(2n) {
    border-right: none;
  }
  .pp-metric:last-child,
  .pp-metric:nth-last-child(2):nth-child(odd) {
    border-bottom: none;
  }
}
</style>
