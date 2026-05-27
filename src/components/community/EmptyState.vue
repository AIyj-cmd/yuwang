<script setup lang="ts">
/**
 * Community V2 · EmptyState
 * 用于 feed 无记录、todayTop 为空、推荐为空等场景。
 * 主文案 / 副文案 / 可选 CTA(默认触发 emit('cta'))。
 */
import PixelIcon from './PixelIcon.vue';

withDefaults(
  defineProps<{
    icon?: 'fish' | 'trophy' | 'spark' | 'lock';
    title: string;
    description?: string;
    ctaLabel?: string;
    showCta?: boolean;
    size?: 'sm' | 'md';
  }>(),
  { icon: 'fish', showCta: false, size: 'md' }
);

const emit = defineEmits<{
  (e: 'cta'): void;
}>();
</script>

<template>
  <div class="empty-state" :data-size="size">
    <div class="empty-icon" aria-hidden="true">
      <PixelIcon :name="icon" :size="size === 'sm' ? 32 : 56" />
    </div>
    <strong class="empty-title">{{ title }}</strong>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <button v-if="showCta && ctaLabel" type="button" class="empty-cta" @click="emit('cta')">
      {{ ctaLabel }}
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10) var(--space-6);
  border: 1.5px dashed var(--v2-border-card);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  text-align: center;
  gap: var(--space-3);
}
.empty-state[data-size='sm'] {
  padding: var(--space-5) var(--space-4);
  gap: var(--space-2);
}
.empty-icon {
  color: var(--color-text-tertiary);
}
.empty-title {
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
}
.empty-state[data-size='sm'] .empty-title {
  font-size: var(--text-base);
}
.empty-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
  max-width: 360px;
}
.empty-cta {
  margin-top: var(--space-3);
  height: 40px;
  padding: 0 var(--space-5);
  background: var(--color-primary);
  /* v1.2:空态 CTA 边框软化,保留主色突出感 */
  border: 1.5px solid var(--v2-border-emphasis);
  border-radius: var(--radius-md);
  box-shadow: var(--v2-shadow-flat-sm);
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.empty-cta:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--v2-shadow-color);
}
.empty-cta:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--v2-shadow-color);
}
</style>
