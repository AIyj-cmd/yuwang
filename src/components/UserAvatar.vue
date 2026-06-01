<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  displayName?: string | null;
  nickname?: string | null;
  size?: number;
}>();

const fallbackText = computed(() => {
  const name = props.displayName || props.nickname || '鱼';
  return name.slice(0, 1).toUpperCase();
});

const sizePx = computed(() => `${props.size ?? 40}px`);
const fontSizePx = computed(() => `${(props.size ?? 40) * 0.45}px`);
</script>

<template>
  <div class="user-avatar" :style="{ width: sizePx, height: sizePx, fontSize: fontSizePx }">
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="fallbackText"
      class="user-avatar-img"
      :style="{ width: sizePx, height: sizePx }"
      @error="($event.target as HTMLImageElement).style.display = 'none'"
    />
    <span v-else class="user-avatar-text">{{ fallbackText }}</span>
  </div>
</template>

<style scoped>
.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
  font-family: var(--font-pixel);
  font-weight: 900;
  overflow: hidden;
}
.user-avatar-img {
  object-fit: cover;
  display: block;
}
.user-avatar-text {
  line-height: 1;
}
</style>
