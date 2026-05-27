<script setup lang="ts">
/**
 * Community V2 · PostBox
 * 首页主 CTA — 投放入口。点击触发 emit('compose'),由父级打开 ComposeModal。
 * 视觉:黄底强边框扁平阴影 + 像素笔头图标 + 大白底输入区占位 + 强对比按钮。
 */
import { useAppContext } from '../../appContext';
import PixelIcon from './PixelIcon.vue';

const { copy } = useAppContext();

defineEmits<{
  (e: 'compose'): void;
}>();
</script>

<template>
  <button
    type="button"
    class="post-box"
    :aria-label="copy('打开投放入口', 'Open post entry')"
    @click="$emit('compose')"
  >
    <span class="post-emoji" aria-hidden="true">
      <PixelIcon name="edit" :size="22" />
    </span>
    <span class="post-input">
      <b class="post-title">{{ copy('今天这条鱼怎么摸的？', 'Caught a fish today?') }}</b>
      <span class="post-hint">{{ copy('讲讲今天的带薪发呆现场', 'Share today\'s desk drift') }}</span>
    </span>
    <span class="post-btn">
      <PixelIcon name="send" :size="14" />
      <span>{{ copy('鱼上墙', 'Post it') }}</span>
    </span>
  </button>
</template>

<style scoped>
.post-box {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  background: var(--color-primary);
  /* v1.2 软化:不再用黑色 2px strong border,改为柔和米灰 hairline */
  border: 1.5px solid var(--v2-border-emphasis);
  border-radius: var(--radius-md);
  box-shadow: var(--v2-shadow-flat-md);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  text-align: left;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.post-box:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--v2-shadow-color);
}
.post-box:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--v2-shadow-color);
}
.post-emoji {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background: var(--color-bg-card);
  /* 软化:像素笔头容器不再黑色描边 */
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  color: var(--color-text-primary);
}
.post-input {
  flex: 1;
  min-width: 0;
  height: 44px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-4);
  background: var(--color-bg-card);
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  cursor: text;
}
.post-title {
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.post-hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.post-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 44px;
  padding: 0 var(--space-5);
  /*
   * v1.2 软化:旧版黑底黄字非常压迫。
   * 改为温暖的"焦糖暖棕"色作为反色 CTA,既显著又不刺眼,
   * 文字用纯白确保对比度通过 WCAG AA。
   */
  background: #6B5A3E;
  color: #FFFFFF;
  border: 1.5px solid #6B5A3E;
  border-radius: var(--radius-md);
  box-shadow: var(--v2-shadow-flat-sm);
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  flex-shrink: 0;
}
.post-btn:hover {
  background: #574A33;
  border-color: #574A33;
}

@media (max-width: 720px) {
  .post-box {
    flex-wrap: wrap;
  }
  .post-input {
    order: 2;
    width: 100%;
  }
  .post-btn {
    order: 3;
    width: 100%;
    justify-content: center;
  }
  .post-emoji {
    order: 1;
  }
  .post-hint {
    display: none;
  }
}
</style>
