<script setup lang="ts">
/**
 * Community V2 · PixelIcon
 * 16×16 像素 SVG 图标库,使用 currentColor 继承父级色。
 * 所有 path 用 <rect> 拼接,shape-rendering=crispEdges 保证像素感。
 * 通过 name 选择图标,size 控制方寸。
 */
import { computed } from 'vue';

type IconName =
  | 'fish'
  | 'home'
  | 'community'
  | 'trophy'
  | 'crown'
  | 'users'
  | 'wallet'
  | 'user'
  | 'settings'
  | 'search'
  | 'heart'
  | 'comment'
  | 'star'
  | 'flag'
  | 'more'
  | 'bolt'
  | 'spark'
  | 'bot'
  | 'edit'
  | 'send'
  | 'globe'
  | 'lock';

const props = withDefaults(
  defineProps<{
    name: IconName;
    size?: number | string;
  }>(),
  { size: 16 }
);

const sizePx = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size));
</script>

<template>
  <svg
    :width="sizePx"
    :height="sizePx"
    viewBox="0 0 16 16"
    aria-hidden="true"
    class="pixel-icon"
  >
    <g shape-rendering="crispEdges" fill="currentColor">
      <!-- fish -->
      <template v-if="name === 'fish'">
        <rect x="2" y="6" width="1" height="4" />
        <rect x="3" y="5" width="1" height="6" />
        <rect x="4" y="4" width="1" height="8" />
        <rect x="5" y="4" width="6" height="8" />
        <rect x="11" y="5" width="1" height="6" />
        <rect x="12" y="3" width="1" height="2" />
        <rect x="12" y="6" width="1" height="4" />
        <rect x="12" y="11" width="1" height="2" />
        <rect x="13" y="2" width="1" height="3" />
        <rect x="13" y="11" width="1" height="3" />
        <rect x="9" y="6" width="1" height="1" fill="#FFFFFF" />
      </template>
      <!-- home -->
      <template v-else-if="name === 'home'">
        <rect x="7" y="2" width="2" height="1" />
        <rect x="6" y="3" width="4" height="1" />
        <rect x="5" y="4" width="6" height="1" />
        <rect x="4" y="5" width="8" height="1" />
        <rect x="3" y="6" width="10" height="1" />
        <rect x="3" y="7" width="2" height="6" />
        <rect x="11" y="7" width="2" height="6" />
        <rect x="5" y="8" width="6" height="5" />
        <rect x="7" y="10" width="2" height="3" fill="var(--color-bg-base, #FAF7F2)" />
      </template>
      <!-- community -->
      <template v-else-if="name === 'community'">
        <rect x="3" y="3" width="4" height="4" />
        <rect x="9" y="3" width="4" height="4" />
        <rect x="3" y="9" width="4" height="4" />
        <rect x="9" y="9" width="4" height="4" />
        <rect x="4" y="4" width="2" height="2" fill="var(--color-bg-base, #FAF7F2)" />
        <rect x="10" y="4" width="2" height="2" fill="var(--color-bg-base, #FAF7F2)" />
        <rect x="4" y="10" width="2" height="2" fill="var(--color-bg-base, #FAF7F2)" />
        <rect x="10" y="10" width="2" height="2" fill="var(--color-bg-base, #FAF7F2)" />
      </template>
      <!-- trophy -->
      <template v-else-if="name === 'trophy'">
        <rect x="4" y="2" width="8" height="1" />
        <rect x="3" y="3" width="10" height="1" />
        <rect x="3" y="4" width="2" height="4" />
        <rect x="11" y="4" width="2" height="4" />
        <rect x="1" y="5" width="2" height="2" />
        <rect x="13" y="5" width="2" height="2" />
        <rect x="5" y="4" width="6" height="5" />
        <rect x="6" y="9" width="4" height="1" />
        <rect x="5" y="10" width="6" height="1" />
        <rect x="4" y="11" width="8" height="1" />
        <rect x="3" y="12" width="10" height="2" />
      </template>
      <!-- crown -->
      <template v-else-if="name === 'crown'">
        <rect x="2" y="4" width="1" height="6" />
        <rect x="13" y="4" width="1" height="6" />
        <rect x="3" y="5" width="1" height="5" />
        <rect x="12" y="5" width="1" height="5" />
        <rect x="7" y="3" width="2" height="2" />
        <rect x="4" y="6" width="8" height="4" />
        <rect x="3" y="11" width="10" height="1" />
      </template>
      <!-- users -->
      <template v-else-if="name === 'users'">
        <rect x="5" y="3" width="3" height="3" />
        <rect x="10" y="4" width="2" height="2" />
        <rect x="3" y="7" width="7" height="1" />
        <rect x="2" y="8" width="9" height="3" />
        <rect x="11" y="8" width="3" height="2" />
      </template>
      <!-- wallet -->
      <template v-else-if="name === 'wallet'">
        <rect x="2" y="4" width="12" height="1" />
        <rect x="2" y="11" width="12" height="1" />
        <rect x="1" y="5" width="1" height="6" />
        <rect x="14" y="5" width="1" height="6" />
        <rect x="11" y="7" width="3" height="2" fill="var(--color-bg-base, #FAF7F2)" />
        <rect x="12" y="7" width="1" height="2" />
      </template>
      <!-- user -->
      <template v-else-if="name === 'user'">
        <rect x="6" y="3" width="4" height="4" />
        <rect x="4" y="9" width="8" height="4" />
        <rect x="3" y="10" width="1" height="3" />
        <rect x="12" y="10" width="1" height="3" />
      </template>
      <!-- settings -->
      <template v-else-if="name === 'settings'">
        <rect x="7" y="2" width="2" height="2" />
        <rect x="7" y="12" width="2" height="2" />
        <rect x="2" y="7" width="2" height="2" />
        <rect x="12" y="7" width="2" height="2" />
        <rect x="3" y="3" width="2" height="2" />
        <rect x="11" y="3" width="2" height="2" />
        <rect x="3" y="11" width="2" height="2" />
        <rect x="11" y="11" width="2" height="2" />
        <rect x="6" y="6" width="4" height="4" />
        <rect x="7" y="7" width="2" height="2" fill="var(--color-bg-base, #FAF7F2)" />
      </template>
      <!-- search -->
      <template v-else-if="name === 'search'">
        <rect x="3" y="2" width="6" height="1" />
        <rect x="2" y="3" width="1" height="6" />
        <rect x="9" y="3" width="1" height="6" />
        <rect x="3" y="9" width="6" height="1" />
        <rect x="9" y="9" width="1" height="1" />
        <rect x="10" y="10" width="1" height="1" />
        <rect x="11" y="11" width="1" height="1" />
        <rect x="12" y="12" width="2" height="2" />
      </template>
      <!-- heart -->
      <template v-else-if="name === 'heart'">
        <rect x="3" y="3" width="3" height="1" />
        <rect x="10" y="3" width="3" height="1" />
        <rect x="2" y="4" width="5" height="1" />
        <rect x="9" y="4" width="5" height="1" />
        <rect x="2" y="5" width="12" height="2" />
        <rect x="3" y="7" width="10" height="1" />
        <rect x="4" y="8" width="8" height="1" />
        <rect x="5" y="9" width="6" height="1" />
        <rect x="6" y="10" width="4" height="1" />
        <rect x="7" y="11" width="2" height="1" />
      </template>
      <!-- comment -->
      <template v-else-if="name === 'comment'">
        <rect x="2" y="3" width="12" height="1" />
        <rect x="2" y="9" width="12" height="1" />
        <rect x="1" y="4" width="1" height="5" />
        <rect x="14" y="4" width="1" height="5" />
        <rect x="4" y="10" width="1" height="1" />
        <rect x="5" y="11" width="1" height="1" />
        <rect x="6" y="12" width="1" height="1" />
        <rect x="4" y="5" width="2" height="1" />
        <rect x="7" y="5" width="2" height="1" />
        <rect x="10" y="5" width="2" height="1" />
        <rect x="4" y="7" width="6" height="1" />
      </template>
      <!-- star -->
      <template v-else-if="name === 'star'">
        <rect x="7" y="2" width="2" height="2" />
        <rect x="6" y="4" width="4" height="2" />
        <rect x="2" y="6" width="12" height="2" />
        <rect x="3" y="8" width="10" height="1" />
        <rect x="4" y="9" width="8" height="2" />
        <rect x="3" y="11" width="3" height="2" />
        <rect x="10" y="11" width="3" height="2" />
        <rect x="3" y="13" width="2" height="1" />
        <rect x="11" y="13" width="2" height="1" />
      </template>
      <!-- flag -->
      <template v-else-if="name === 'flag'">
        <rect x="3" y="2" width="1" height="12" />
        <rect x="4" y="3" width="8" height="3" />
        <rect x="12" y="3" width="1" height="3" />
      </template>
      <!-- more -->
      <template v-else-if="name === 'more'">
        <rect x="2" y="7" width="2" height="2" />
        <rect x="7" y="7" width="2" height="2" />
        <rect x="12" y="7" width="2" height="2" />
      </template>
      <!-- bolt -->
      <template v-else-if="name === 'bolt'">
        <rect x="8" y="2" width="3" height="1" />
        <rect x="7" y="3" width="3" height="1" />
        <rect x="6" y="4" width="3" height="1" />
        <rect x="5" y="5" width="3" height="1" />
        <rect x="4" y="6" width="6" height="1" />
        <rect x="6" y="7" width="4" height="1" />
        <rect x="5" y="8" width="4" height="1" />
        <rect x="4" y="9" width="4" height="1" />
        <rect x="3" y="10" width="4" height="1" />
        <rect x="5" y="11" width="3" height="1" />
        <rect x="6" y="12" width="3" height="1" />
        <rect x="7" y="13" width="2" height="1" />
      </template>
      <!-- spark -->
      <template v-else-if="name === 'spark'">
        <rect x="7" y="1" width="2" height="3" />
        <rect x="7" y="12" width="2" height="3" />
        <rect x="1" y="7" width="3" height="2" />
        <rect x="12" y="7" width="3" height="2" />
        <rect x="5" y="5" width="6" height="6" />
        <rect x="7" y="7" width="2" height="2" fill="var(--color-bg-base, #FAF7F2)" />
      </template>
      <!-- bot -->
      <template v-else-if="name === 'bot'">
        <rect x="7" y="1" width="2" height="2" />
        <rect x="3" y="4" width="10" height="8" />
        <rect x="2" y="5" width="1" height="6" />
        <rect x="13" y="5" width="1" height="6" />
        <rect x="5" y="6" width="2" height="2" fill="var(--color-bg-base, #FAF7F2)" />
        <rect x="9" y="6" width="2" height="2" fill="var(--color-bg-base, #FAF7F2)" />
        <rect x="6" y="9" width="4" height="1" fill="var(--color-bg-base, #FAF7F2)" />
      </template>
      <!-- edit -->
      <template v-else-if="name === 'edit'">
        <rect x="10" y="2" width="3" height="1" />
        <rect x="9" y="3" width="2" height="1" />
        <rect x="11" y="3" width="3" height="1" />
        <rect x="10" y="4" width="1" height="1" />
        <rect x="11" y="4" width="3" height="1" />
        <rect x="9" y="5" width="2" height="1" />
        <rect x="10" y="5" width="3" height="2" />
        <rect x="7" y="6" width="2" height="2" />
        <rect x="6" y="7" width="2" height="2" />
        <rect x="5" y="8" width="2" height="2" />
        <rect x="4" y="9" width="2" height="2" />
        <rect x="3" y="10" width="2" height="2" />
        <rect x="2" y="11" width="3" height="2" />
        <rect x="2" y="13" width="4" height="1" />
      </template>
      <!-- send -->
      <template v-else-if="name === 'send'">
        <rect x="2" y="3" width="12" height="1" />
        <rect x="2" y="4" width="2" height="1" />
        <rect x="3" y="5" width="3" height="1" />
        <rect x="4" y="6" width="4" height="1" />
        <rect x="5" y="7" width="5" height="2" />
        <rect x="4" y="9" width="4" height="1" />
        <rect x="3" y="10" width="3" height="1" />
        <rect x="2" y="11" width="2" height="1" />
      </template>
      <!-- globe -->
      <template v-else-if="name === 'globe'">
        <rect x="5" y="2" width="6" height="1" />
        <rect x="3" y="3" width="2" height="1" />
        <rect x="11" y="3" width="2" height="1" />
        <rect x="2" y="4" width="1" height="8" />
        <rect x="13" y="4" width="1" height="8" />
        <rect x="3" y="12" width="2" height="1" />
        <rect x="11" y="12" width="2" height="1" />
        <rect x="5" y="13" width="6" height="1" />
        <rect x="7" y="3" width="2" height="10" />
        <rect x="3" y="7" width="10" height="2" />
      </template>
      <!-- lock -->
      <template v-else-if="name === 'lock'">
        <rect x="6" y="2" width="4" height="1" />
        <rect x="5" y="3" width="1" height="3" />
        <rect x="10" y="3" width="1" height="3" />
        <rect x="3" y="7" width="10" height="6" />
        <rect x="7" y="9" width="2" height="2" fill="var(--color-bg-base, #FAF7F2)" />
      </template>
    </g>
  </svg>
</template>

<style scoped>
.pixel-icon {
  display: inline-block;
  flex-shrink: 0;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  vertical-align: middle;
}
</style>
