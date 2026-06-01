<script setup lang="ts">
import { Send } from 'lucide-vue-next';
import { useAppContext } from '../appContext';

const { copy } = useAppContext();

defineProps<{
  show: boolean;
}>();

defineEmits<{
  (e: 'compose'): void;
}>();
</script>

<template>
  <transition name="fab-pop">
    <button
      v-show="show"
      type="button"
      class="compose-fab"
      :aria-label="copy('投放摸鱼记录', 'Post a slacking record')"
      @click="$emit('compose')"
    >
      <span class="fab-dot" aria-hidden="true"></span>
      <Send :size="20" />
      <span class="fab-label" aria-hidden="true">REC</span>
    </button>
  </transition>
</template>

<style scoped>
.compose-fab {
  position: fixed;
  right: 26px;
  bottom: 26px;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 64px;
  height: 64px;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
  box-shadow: 4px 4px 0 var(--color-border);
  font-family: var(--font-pixel);
  font-size: 9px;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: transform 0.1s steps(2, end), box-shadow 0.1s steps(2, end);
}

.compose-fab:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--color-border);
}

.compose-fab:active {
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0 var(--color-border);
}

.fab-label {
  font-family: var(--font-pixel);
  font-size: 9px;
  letter-spacing: 0.08em;
}

.fab-dot {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  background: #ff5252;
  box-shadow: inset 0 0 0 2px #b81d1d;
  animation: composer-blink 1.1s steps(2, end) infinite;
}

.fab-pop-enter-active,
.fab-pop-leave-active {
  transition: transform 0.16s cubic-bezier(0.34, 1.5, 0.64, 1), opacity 0.16s ease;
}

.fab-pop-enter-from,
.fab-pop-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.8);
}

@media (max-width: 420px) {
  .compose-fab { right: 16px; bottom: 16px; width: 56px; height: 56px; }
}
</style>
