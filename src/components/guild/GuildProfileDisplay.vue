<script setup lang="ts">
import { Crown, Pencil, RefreshCw } from 'lucide-vue-next';
import { PxButton } from '@mmt817/pixel-ui';
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
  <div v-else class="gc-state">
    <RefreshCw :size="20" />
    <strong>工会资料未在本设备缓存</strong>
    <span>
      你已加入这支工会（见上方 ID），但它的名称和简介没有保存在当前浏览器。你仍然可以编辑资料或退出工会，编辑成功后资料会显示出来。
    </span>
  </div>

  <div v-if="!$slots.edit" class="mg-actions">
    <PxButton type="primary" size="small" @click="emit('edit')">
      <Pencil :size="13" /> 编辑工会
    </PxButton>
  </div>
</template>

<style scoped>
.mg-guild {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  box-shadow: var(--shadow-small);
}
.mg-guild__emblem {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  font-size: 26px;
  line-height: 1;
}
.mg-guild__meta {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.mg-guild__kicker {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: var(--color-primary-text);
  opacity: 0.7;
}
.mg-guild__meta strong {
  font-size: 18px;
  font-weight: 900;
  color: var(--color-primary-text);
  word-break: break-word;
}
.mg-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}
.mg-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 11px;
  font-weight: 900;
  font-style: normal;
}
.mg-tag--owner {
  background: var(--color-accent);
}
.mg-tag--ghost {
  background: var(--color-surface-soft);
  color: var(--color-text-muted);
}
.mg-desc {
  margin: 0;
  padding: 12px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-soft);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.6;
  white-space: pre-line;
  word-break: break-word;
}
.mg-desc--empty {
  color: var(--color-text-muted);
  font-weight: 800;
}
.mg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.gc-state {
  display: grid;
  gap: 6px;
  padding: 16px;
  text-align: center;
  color: var(--color-text-muted);
  border: 2px solid var(--color-border-soft);
  background: var(--color-surface-soft);
}
.gc-state strong {
  font-size: 14px;
  font-weight: 900;
  color: var(--color-text);
}
.gc-state span {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}
</style>
