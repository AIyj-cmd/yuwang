<script setup lang="ts">
import type { Guild } from '../../types';

defineProps<{
  guild: Guild;
  joining: boolean;
  joinError: string;
  token: string | null;
}>();

defineEmits<{
  (e: 'join'): void;
}>();
</script>

<template>
  <section class="gd-header-card">
    <div class="gd-header-main">
      <div class="gd-header-left">
        <div class="gd-guild-icon" aria-hidden="true">{{ guild.icon }}</div>
        <div class="gd-header-info">
          <h1 class="gd-guild-name">{{ guild.name }}</h1>
          <p class="gd-guild-meta">
            Lv.{{ guild.level }}
            <span class="gd-dot" aria-hidden="true"></span>
            {{ guild.memberCount }} 人
          </p>
        </div>
      </div>

      <p v-if="guild.description" class="gd-guild-desc">{{ guild.description }}</p>

      <div class="gd-header-action">
        <button v-if="guild.joined" class="gd-btn-joined" disabled>已加入</button>
        <button
          v-else-if="token"
          class="gd-btn-primary"
          :disabled="joining"
          @click="$emit('join')"
        >{{ joining ? '加入中…' : '加入工会' }}</button>
        <p v-if="joinError" class="gd-join-error">{{ joinError }}</p>
      </div>
    </div>

    <div class="gd-contribution-row">
      <span class="gd-contribution-num">{{ guild.totalContribution.toLocaleString() }}</span>
      <span class="gd-contribution-label">赛季总贡献</span>
    </div>
  </section>
</template>

<style scoped>
.gd-header-card {
  background: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-flat-md);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.gd-header-main {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.gd-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.gd-guild-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  border: var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  flex-shrink: 0;
  line-height: 1;
}

.gd-header-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.gd-guild-name {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
}

.gd-guild-meta {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.gd-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-text-tertiary);
  display: inline-block;
}

.gd-guild-desc {
  flex: 1;
  font-size: var(--text-base);
  color: var(--color-text-body);
  line-height: var(--leading-normal);
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  min-width: 160px;
}

.gd-header-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
  flex-shrink: 0;
}

.gd-join-error {
  font-size: var(--text-xs);
  color: var(--color-danger);
}

.gd-contribution-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-divider);
}

.gd-contribution-num {
  font-family: var(--font-mono);
  font-size: var(--text-display);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  line-height: 1;
}

.gd-contribution-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.gd-btn-primary {
  background: var(--color-primary);
  color: var(--color-text-primary);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  font-family: inherit;
  box-shadow: var(--shadow-flat-sm);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  cursor: pointer;
}
.gd-btn-primary:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-border);
}
.gd-btn-primary:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--color-border);
}
.gd-btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.gd-btn-joined {
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  font-family: inherit;
  cursor: default;
}

@media (max-width: 720px) {
  .gd-header-main {
    flex-direction: column;
    gap: var(--space-3);
  }
  .gd-header-action {
    align-items: flex-start;
  }
}
</style>
