<script setup lang="ts">
import { computed, ref } from 'vue';
import PixelIcon from '../community/PixelIcon.vue';
import RecordCard from '../community/RecordCard.vue';
import { useAppContext } from '../../appContext';
import type { FeedRecord } from '../../types';

const props = defineProps<{
  records: FeedRecord[];
}>();

const ctx = useAppContext();
const copy = ctx.copy as (zh: string, en: string) => string;

const showAllRecords = ref(false);

const displayedRecords = computed(() => {
  const sorted = [...props.records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return showAllRecords.value ? sorted : sorted.slice(0, 10);
});

const hasMoreRecords = computed(() => props.records.length > 10 && !showAllRecords.value);
</script>

<template>
  <section class="gd-section">
    <h2 class="gd-section-title">
      <PixelIcon name="fish" :size="16" />
      {{ copy('工会摸鱼记录', 'Guild activity') }}
    </h2>

    <div v-if="displayedRecords.length" class="gd-records-list">
      <RecordCard
        v-for="rec in displayedRecords"
        :key="rec.id"
        :record="rec"
      />
    </div>

    <div v-else class="gd-empty-state">
      <p class="gd-empty-title">{{ copy('这个工会还没有摸鱼记录', 'No guild activity yet') }}</p>
      <p class="gd-empty-sub">{{ copy('加入后一起摸鱼吧!', 'Join in and start slacking together!') }}</p>
    </div>

    <div v-if="hasMoreRecords" class="gd-more-row">
      <button class="gd-btn-ghost" @click="showAllRecords = true">
        {{ copy('查看全部 ', 'View all ') }}{{ records.length }}{{ copy(' 条记录', ' records') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.gd-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.gd-section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.gd-records-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.gd-more-row {
  display: flex;
  justify-content: center;
  padding-top: var(--space-2);
}

.gd-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
  padding: var(--space-8) var(--space-6);
}

.gd-empty-title {
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.gd-empty-sub {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}

.gd-btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--transition-base), color var(--transition-base);
}
.gd-btn-ghost:hover {
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
}
</style>
