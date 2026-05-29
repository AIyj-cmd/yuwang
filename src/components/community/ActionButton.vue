<script setup lang="ts">
/**
 * Community V2 · ActionButton (v1.3 软化重做)
 *
 * 视觉:
 *   - 默认透明无框,胶囊圆角
 *   - hover 轻底色(米灰 token),不出现黑边
 *   - active:
 *       warm  → 淡黄 (点赞 / 收藏)
 *       mint  → 淡薄荷 (评论展开 / 已评论)
 *       legend→ 淡珊瑚 (传奇提名)
 *       danger→ 淡红 (举报),低饱和不抢戏
 *   - 图标 16px,确保语义清晰
 *
 * 行为不变:
 *   - count 为 0 / 未提供 → 不渲染数字
 *   - iconOnly 强制隐藏数字位
 *   - disabled 时阻断 click
 */
import { computed } from 'vue';
import PixelIcon from './PixelIcon.vue';

type Variant = 'warm' | 'mint' | 'legend' | 'danger' | 'neutral';

const props = withDefaults(
  defineProps<{
    icon: 'heart' | 'comment' | 'star' | 'crown' | 'flag' | 'more';
    count?: number;
    active?: boolean;
    /** Disable interaction (e.g. visitor unauthenticated). */
    disabled?: boolean;
    /** Tooltip text. */
    title?: string;
    /** Variant for hover / active color hint. */
    variant?: Variant;
    iconOnly?: boolean;
    label?: string;
  }>(),
  {
    count: 0,
    active: false,
    disabled: false,
    variant: 'warm',
    iconOnly: false
  }
);

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const showCount = computed(() => !props.iconOnly && typeof props.count === 'number' && props.count > 0);
const handleClick = () => {
  if (props.disabled) return;
  emit('click');
};
</script>

<template>
  <button
    type="button"
    class="action"
    :class="{ active, disabled, 'icon-only': iconOnly }"
    :data-variant="variant"
    :title="title"
    :aria-label="label || title"
    :aria-pressed="active"
    :disabled="disabled"
    @click="handleClick"
  >
    <PixelIcon :name="icon" :size="16" />
    <span v-if="showCount" class="num">{{ count }}</span>
  </button>
</template>

<style scoped>
/* ============================================================
 * 默认:透明胶囊,无边框,只有 hover/active 才有底色变化
 * ============================================================ */
.action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  background: transparent;
  border: none;
  border-radius: var(--radius-pill);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
  /* 重置浏览器原生 button outset 边框、底色 */
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

/* ============================================================
 * 反压第三方全局阴影(@mmt817/pixel-ui 全局给所有 <button> 注入
 *   默认 box-shadow / drop-shadow,导致按钮底部出现黑色月牙)。
 * 在所有交互状态下显式清零,确保胶囊视觉永远干净。
 * ============================================================ */
.action,
.action:hover,
.action:focus,
.action:focus-visible,
.action:active,
.action.active,
.action.disabled,
.action[disabled] {
  box-shadow: none !important;
  filter: none !important;
}
.action::before,
.action::after {
  content: none !important;
  display: none !important;
  box-shadow: none !important;
}
.action:focus-visible {
  /* 用柔和 outline 替代第三方可能注入的硬框 */
  outline: 2px solid var(--color-accent-mint);
  outline-offset: 2px;
}

/* 仅图标(更多按钮)挤压成圆形 */
.action.icon-only {
  width: 32px;
  padding: 0;
  justify-content: center;
}

/* ============================================================
 * hover · 极淡底色 + 文字主色
 * ============================================================ */
.action:hover:not(.disabled):not(.active) {
  background: var(--color-bg-base);
  color: var(--color-text-primary);
}

/* variant 决定 hover 的色调倾向 */
.action[data-variant='warm']:hover:not(.disabled):not(.active) {
  background: var(--color-bg-active-warm);
  color: var(--color-text);
}
.action[data-variant='mint']:hover:not(.disabled):not(.active) {
  background: var(--color-accent-mint-soft);
  color: var(--color-text-on-mint);
}
.action[data-variant='legend']:hover:not(.disabled):not(.active) {
  background: var(--color-bg-active-coral);
  color: var(--color-text-on-coral);
}
.action[data-variant='danger']:hover:not(.disabled):not(.active) {
  background: var(--color-bg-active-danger);
  color: var(--color-text-on-coral);
}

/* ============================================================
 * active · 淡底色 + 同色系深字,无边框
 * ============================================================ */
.action.active {
  font-weight: var(--weight-bold);
}
.action.active[data-variant='warm'] {
  background: var(--color-bg-active-warm);
  color: var(--color-text);
}
.action.active[data-variant='mint'] {
  background: var(--color-accent-mint-soft);
  color: var(--color-text-on-mint);
}
.action.active[data-variant='legend'] {
  background: var(--color-bg-active-coral);
  color: var(--color-text-on-coral);
}
.action.active[data-variant='danger'] {
  background: var(--color-bg-active-danger);
  color: var(--color-text-on-coral);
}

/* ============================================================
 * 按下反馈 · 极轻微缩放(不上下移动以避免假阴影错觉)
 * ============================================================ */
.action:active:not(.disabled) {
  transform: scale(0.97);
}

/* ============================================================
 * disabled · 柔和灰化,不显示黑色禁用框
 * ============================================================ */
.action.disabled {
  cursor: not-allowed;
  opacity: 0.5;
  background: transparent;
}

/* ============================================================
 * 数字
 * ============================================================ */
.num {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
</style>
