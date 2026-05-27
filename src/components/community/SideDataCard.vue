<script setup lang="ts">
/**
 * Community V2 · SideDataCard
 * 右栏数据卡通用壳:标题(带像素图标) + 副标题 + 默认 slot 内容。
 */
import PixelIcon from './PixelIcon.vue';

defineProps<{
  title: string;
  subtitle?: string;
  icon?: 'fish' | 'globe' | 'trophy' | 'spark' | 'lock';
}>();
</script>

<template>
  <section class="side-data-card">
    <h3 class="side-title">
      <PixelIcon v-if="icon" :name="icon" :size="16" />
      <span>{{ title }}</span>
    </h3>
    <p v-if="subtitle" class="side-sub">{{ subtitle }}</p>
    <div class="side-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.side-data-card {
  background: var(--color-bg-card);
  /* v1.2 软化:右栏卡片不再使用会被 themes 覆盖到黑色的 token */
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  box-shadow: var(--v2-shadow-flat-md);
  padding: var(--space-4) var(--space-4) var(--space-3);
}
.side-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
  margin: 0;
}
.side-sub {
  margin: var(--space-1) 0 var(--space-3);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}
.side-body {
  min-width: 0;
}
</style>
