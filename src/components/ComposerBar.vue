<script setup lang="ts">
import { ref } from 'vue';
import { Send } from 'lucide-vue-next';
import { useAppContext } from '../appContext';

const { copy } = useAppContext();

defineEmits<{
  (e: 'compose'): void;
}>();

const rootRef = ref<HTMLElement | null>(null);
defineExpose({ $el: rootRef });
</script>

<template>
  <button
    ref="rootRef"
    type="button"
    class="composer-bar"
    @click="$emit('compose')"
  >
    <span class="composer-rec" aria-hidden="true">
      <span class="composer-rec-dot"></span>
      <span class="composer-rec-text">REC</span>
    </span>
    <span class="composer-prompt">
      {{ copy('今天这条鱼，怎么摸的？匿名上墙，老板看不到。', 'How did today\'s fish swim? Posted anonymously — no boss in sight.') }}
    </span>
    <span class="composer-cta">
      <Send :size="18" />
      <span>{{ copy('投放上墙', 'Post it') }}</span>
    </span>
  </button>
</template>

<style scoped>
.composer-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  margin-bottom: 22px;
  padding: 14px 16px;
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 6px 6px 0 var(--color-border);
  cursor: pointer;
  text-align: left;
  transition: transform 0.1s steps(2, end), box-shadow 0.1s steps(2, end);
}

.composer-bar:hover {
  transform: translate(-3px, -3px);
  box-shadow: 9px 9px 0 var(--color-border);
}

.composer-bar:active {
  transform: translate(1px, 1px);
  box-shadow: 3px 3px 0 var(--color-border);
}

/* REC 身份徽 */
.composer-rec {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 10px 13px;
  border: 2px solid var(--color-border);
  background: var(--color-ink-strong-bg);
  color: var(--color-ink-strong-text);
  font-family: var(--font-pixel);
  font-size: 14px;
  letter-spacing: 0.1em;
}

.composer-rec-dot {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
  border: 2px solid currentColor;
  background: #ff5252;
  box-shadow: inset 0 0 0 2px #b81d1d;
  animation: composer-blink 1.1s steps(2, end) infinite;
}

@keyframes composer-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.25; }
}

/* 仿输入框提示 */
.composer-prompt {
  flex: 1;
  min-width: 0;
  padding: 13px 14px;
  border: 2px dashed var(--color-border-soft);
  background: var(--color-surface-soft);
  color: var(--color-text-muted);
  font-family: var(--font-readable);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: border-color 0.1s, color 0.1s;
}

@media (max-width: 640px) {
  .composer-prompt {
    white-space: normal;
    font-size: 13px;
  }
}

.composer-bar:hover .composer-prompt {
  border-color: var(--color-border);
  color: var(--color-text);
}

/* 亮色 CTA */
.composer-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 13px 18px;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
  box-shadow: 3px 3px 0 var(--color-border);
  font-family: var(--font-pixel);
  font-size: 13px;
  letter-spacing: 0.04em;
  transition: transform 0.1s steps(2, end), box-shadow 0.1s steps(2, end);
}

.composer-bar:hover .composer-cta {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--color-border);
}
</style>
