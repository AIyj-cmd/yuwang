<script setup lang="ts">
import { Crown, Pencil } from 'lucide-vue-next';
import type { CachedGuild } from '../../types';

const props = defineProps<{
  guildInfo: CachedGuild | null;
  guildId: number | null;
  isOwner: boolean;
}>();

const emit = defineEmits<{
  (e: 'edit'): void;
}>();
</script>

<template>
  <div class="mg-guild">
    <div class="mg-guild__emblem">{{ guildInfo?.icon || '?' }}</div>
    <div class="mg-guild__meta">
      <span class="mg-guild__kicker">我的工会</span>
      <strong v-if="guildInfo">{{ guildInfo.name }}</strong>
      <strong v-else>工会 #{{ guildId }}</strong>
      <div class="mg-tags">
        <em v-if="isOwner" class="mg-tag mg-tag--owner"><Crown :size="11" /> 会长</em>
        <em v-else-if="guildInfo" class="mg-tag">成员</em>
        <em class="mg-tag mg-tag--ghost">ID {{ guildId }}</em>
      </div>
    </div>
  </div>

  <p v-if="guildInfo && guildInfo.description" class="mg-desc">{{ guildInfo.description }}</p>
  <p v-else-if="guildInfo" class="mg-desc mg-desc--empty">
    这支工会还没有写简介 / 公告。
  </p>
  <div v-if="!$slots.edit && isOwner" class="mg-actions">
    <button type="button" class="btn-primary" @click="emit('edit')">
      <Pencil :size="13" /> 编辑工会
    </button>
  </div>
</template>

<style scoped>
.mg-guild {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border: var(--border-default);
  border-radius: var(--radius-md);
  background: var(--color-primary);
  box-shadow: var(--shadow-flat-sm);
}
.mg-guild__emblem {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border: var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  font-size: var(--text-xl);
  line-height: 1;
}
.mg-guild__meta {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}
.mg-guild__kicker {
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  letter-spacing: 0.12em;
  color: var(--color-text-primary);
  opacity: 0.7;
}
.mg-guild__meta strong {
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  word-break: break-word;
}
.mg-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-1);
}
.mg-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border: var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  font-style: normal;
}
.mg-tag--owner {
  background: var(--color-primary-soft);
}
.mg-tag--ghost {
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
}
.mg-desc {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: var(--border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-relaxed);
  white-space: pre-line;
  word-break: break-word;
}
.mg-desc--empty {
  color: var(--color-text-secondary);
}
.mg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.gc-state {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-secondary);
  border: var(--border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
.gc-state strong {
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}
.gc-state span {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-normal);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  background: var(--color-primary);
  color: var(--color-primary-text);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  font-family: inherit;
  box-shadow: var(--shadow-flat-sm);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.btn-primary:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-border);
}
.btn-primary:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--color-border);
}
</style>
