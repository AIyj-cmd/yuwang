<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronsDown, Trophy } from 'lucide-vue-next';
import { PxTag } from '@mmt817/pixel-ui';
import { useAppContext } from '../../appContext';
import type { RecordSummary } from '../../types';

const props = defineProps<{
  records: RecordSummary[];
}>();

const { copy, openProfileRecord, translatedTitle } = useAppContext();

const recordLimit = ref(6);
const recordFilter = ref<'all' | 'approved' | 'pending' | 'hidden'>('all');

const recordFilters = computed(() => [
  { key: 'all' as const, label: copy('全部', 'All') },
  { key: 'approved' as const, label: copy('已通过', 'Approved') },
  { key: 'pending' as const, label: copy('审核中', 'Pending') },
  { key: 'hidden' as const, label: copy('已隐藏', 'Hidden') }
]);

const filteredRecords = computed(() => {
  let list = [...props.records];
  if (recordFilter.value !== 'all') {
    list = list.filter(r => r.status === recordFilter.value);
  }
  return list;
});

const statusTagType = (status: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'approved':
    case 'published': return 'success';
    case 'pending': return 'warning';
    case 'hidden':
    case 'rejected': return 'danger';
    default: return 'info';
  }
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    approved: copy('已通过', 'Approved'),
    published: copy('已发布', 'Published'),
    pending: copy('审核中', 'Pending'),
    hidden: copy('已隐藏', 'Hidden'),
    rejected: copy('已驳回', 'Rejected')
  };
  return map[status] ?? status;
};
</script>

<template>
  <section class="pp-section">
    <div class="pp-section-head">
      <Trophy :size="15" />
      <h2>{{ copy('近期记录', 'Recent') }}</h2>
    </div>
    <div class="pp-record-filter">
      <button
        v-for="f in recordFilters"
        :key="f.key"
        :class="{ active: recordFilter === f.key }"
        @click="recordFilter = f.key"
      >
        {{ f.label }}
      </button>
    </div>
    <div v-if="filteredRecords.length === 0" class="pp-placeholder">
      {{ copy('该状态下没有记录。', 'No records in this status.') }}
    </div>
    <div v-else class="pp-record-list">
      <button
        v-for="record in filteredRecords.slice(0, recordLimit)"
        :key="record.id"
        class="pp-record-row"
        @click="openProfileRecord(record.id)"
      >
        <div class="pp-record-info">
          <div class="pp-record-top">
            <span class="pp-record-title">{{ translatedTitle(record.title) }}</span>
            <PxTag :type="statusTagType(record.status)" size="small">{{ statusLabel(record.status) }}</PxTag>
          </div>
          <small class="pp-record-activity">{{ record.activityText }}</small>
        </div>
        <div class="pp-record-score">
          <strong>{{ record.score.toFixed(1) }}</strong>
          <small>{{ new Date(record.createdAt).toLocaleDateString() }}</small>
        </div>
      </button>
    </div>
    <div v-if="filteredRecords.length > recordLimit" class="pp-load-more">
      <button @click="recordLimit += 6">
        <ChevronsDown :size="14" /> {{ copy('加载更多', 'Load More') }}
      </button>
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
.pp-record-filter {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pp-record-filter button {
  padding: 5px 10px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.pp-record-filter button.active {
  background: var(--color-primary);
  color: var(--color-primary-text);
}
.pp-record-list {
  display: grid;
  gap: 0;
  border: 3px solid var(--color-border);
}
.pp-record-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  border: none;
  border-bottom: 2px solid var(--color-border-soft);
  transition: background 0.1s;
}
.pp-record-row:last-child {
  border-bottom: none;
}
.pp-record-row:hover {
  background: var(--color-surface-soft);
}
.pp-record-info {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.pp-record-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.pp-record-title {
  font-size: 13px;
  font-weight: 950;
}
.pp-record-activity {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pp-record-score {
  display: grid;
  gap: 2px;
  text-align: right;
  flex-shrink: 0;
}
.pp-record-score strong {
  font-family: var(--font-pixel);
  font-size: 15px;
}
.pp-record-score small {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 700;
}
.pp-load-more {
  display: flex;
  justify-content: center;
  padding-top: 6px;
}
.pp-load-more button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.pp-load-more button:hover {
  background: var(--color-border);
  color: var(--color-surface);
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

@media (max-width: 420px) {
  .pp-record-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .pp-record-score {
    text-align: left;
    flex-direction: row;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
