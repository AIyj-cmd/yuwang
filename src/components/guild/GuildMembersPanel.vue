<script setup lang="ts">
import PixelIcon from '../community/PixelIcon.vue';
import { useAppContext } from '../../appContext';
import type { GuildMember } from '../../types';

defineProps<{
  members: GuildMember[];
}>();

const ctx = useAppContext();
const copy = ctx.copy as (zh: string, en: string) => string;

function avatarLetter(name: string): string {
  return (name || '?')[0].toUpperCase();
}

function memberAvatarBg(name: string): string {
  const seed = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const colors = [
    'var(--color-accent-mint)',
    'var(--color-accent-coral)',
    'var(--color-primary)'
  ];
  return colors[seed % 3];
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  } catch {
    return iso;
  }
}

function roleLabel(role: string): string {
  if (role === 'owner') return copy('会长', 'Leader');
  return copy('成员', 'Member');
}

function isOwnerRole(role: string): boolean {
  return role === 'owner';
}
</script>

<template>
  <div class="gd-column-card">
    <h2 class="gd-section-title">
      <PixelIcon name="heart" :size="16" />
      {{ copy('成员', 'Members') }}
    </h2>

    <div v-if="members.length" class="gd-member-list">
      <div
        v-for="m in members"
        :key="m.id"
        class="gd-member-row"
      >
        <div
          class="gd-member-avatar"
          :style="{ background: memberAvatarBg(m.display_name || m.username) }"
          aria-hidden="true"
        >{{ avatarLetter(m.display_name || m.username) }}</div>

        <span class="gd-member-name">{{ m.display_name || m.username }}</span>

        <span
          class="gd-member-role"
          :class="{ 'gd-member-role--owner': isOwnerRole(m.role) }"
        >{{ roleLabel(m.role) }}</span>

        <span class="gd-member-date">{{ formatDate(m.joined_at) }}</span>
      </div>
    </div>

    <div v-else class="gd-empty-inline">{{ copy('这个工会还没有鱼友上榜', 'No guild members on the board yet') }}</div>
  </div>
</template>

<style scoped>
.gd-column-card {
  background: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-flat-sm);
  padding: var(--space-5);
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

.gd-member-list {
  display: flex;
  flex-direction: column;
}

.gd-member-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 48px;
  border-bottom: 1px solid var(--color-divider);
}
.gd-member-row:last-child {
  border-bottom: none;
}

.gd-member-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  flex-shrink: 0;
}

.gd-member-name {
  flex: 1;
  font-size: var(--text-base);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gd-member-role {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  padding: 2px var(--space-2);
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.gd-member-role--owner {
  background: var(--color-primary-soft);
  color: var(--color-text-primary);
}

.gd-member-date {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  flex-shrink: 0;
  font-family: var(--font-mono);
}

.gd-empty-inline {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--space-6) 0;
}

@media (max-width: 720px) {
  .gd-member-date {
    display: none;
  }
}
</style>
