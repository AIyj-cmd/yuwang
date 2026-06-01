<script setup lang="ts">
import { ref, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { useAppContext } from '../appContext';
import { useFocusTrap } from '../composables/useFocusTrap';

const props = defineProps<{
  open: boolean;
  payload: {
    record: {
      score: number;
      title: string;
      systemComment: string;
      status: string;
      id: number;
    };
    todayRank?: number;
    cumulativeScore: number;
    fishScaleReward?: { awardedAmount: number } | null;
  } | null;
  statusMessage?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'viewDetail', recordId: number): void;
}>();

const { copy, translatedTitle, translatedSystemComment } = useAppContext();

const popupRef = ref<HTMLElement | null>(null);
const isActive = ref(false);

watch(() => props.open, (val) => {
  isActive.value = val && !!props.payload;
}, { immediate: true });

useFocusTrap(popupRef, isActive);
</script>

<template>
  <transition name="popup-fade">
    <div
      v-if="open && payload"
      ref="popupRef"
      class="popup-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-title"
      @click.self="$emit('close')"
    >
      <div class="popup-window">
        <button type="button" class="popup-close" aria-label="close" @click="$emit('close')">
          <X :size="14" />
        </button>

        <div class="popup-tape"><span>★ {{ copy('记录成功', 'RECORD OK') }} ★</span></div>

        <div class="popup-score-block">
          <span class="popup-score">{{ payload.record.score.toFixed(1) }}</span>
          <span class="popup-score-label">Fish Power</span>
        </div>

        <h3 id="popup-title" class="popup-title">
          {{ translatedTitle(payload.record.title) }}
        </h3>

        <p class="popup-comment">
          {{ translatedSystemComment(payload.record.systemComment) }}
        </p>

        <ul class="popup-meta">
          <li v-if="payload.todayRank">
            <span>{{ copy('今日排名', 'Today') }}</span>
            <strong>#{{ payload.todayRank }}</strong>
          </li>
          <li>
            <span>{{ copy('累计', 'Total') }}</span>
            <strong>{{ payload.cumulativeScore.toFixed(1) }}</strong>
          </li>
          <li v-if="payload.fishScaleReward?.awardedAmount">
            <span>{{ copy('鱼鳞', 'Scale') }}</span>
            <strong>+{{ payload.fishScaleReward.awardedAmount }}</strong>
          </li>
          <li v-if="payload.record.status === 'pending'">
            <span>{{ copy('状态', 'Status') }}</span>
            <strong>{{ copy('审核中', 'Pending') }}</strong>
          </li>
        </ul>

        <p v-if="statusMessage" class="popup-status">{{ statusMessage }}</p>

        <div class="popup-actions">
          <button type="button" class="popup-btn ghost" @click="$emit('close')">
            {{ copy('继续摸鱼', 'Keep going') }}
          </button>
          <button type="button" class="popup-btn primary" @click="$emit('viewDetail', payload.record.id)">
            {{ copy('查看详情', 'View detail') }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.popup-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(20, 26, 34, 0.5);
  backdrop-filter: blur(3px);
}

.popup-window {
  position: relative;
  width: min(400px, 100%);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  box-shadow: 6px 6px 0 var(--color-border);
  display: flex;
  flex-direction: column;
  font-family: var(--font-readable);
  overflow: hidden;
}

.popup-tape {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  background: var(--color-primary);
  border-bottom: 2px solid var(--color-border);
  font-family: var(--font-pixel);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-primary-text);
}

.popup-close {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-primary-text);
  opacity: 0.7;
  transition: opacity 0.08s;
}

.popup-close:hover { opacity: 1; }

.popup-score-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 20px 20px 14px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}

.popup-score {
  font-family: var(--font-pixel);
  font-size: 40px;
  color: var(--color-text);
  letter-spacing: 0.04em;
  line-height: 1;
}

.popup-score-label {
  font-size: 11px;
  font-family: var(--font-pixel);
  color: var(--color-text-muted);
  letter-spacing: 0.12em;
}

.popup-title {
  margin: 0;
  padding: 12px 20px 0;
  font-family: var(--font-pixel);
  font-size: 13px;
  letter-spacing: 0.05em;
  color: var(--color-text);
  text-align: center;
}

.popup-comment {
  margin: 0;
  padding: 6px 20px 0;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.6;
  text-align: center;
}

.popup-meta {
  list-style: none;
  padding: 12px 20px;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 6px;
}

.popup-meta li {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  background: var(--color-surface-soft, #f8f8f8);
  border: 1px solid var(--color-border-soft, #e0e0e0);
  font-size: 10px;
  color: var(--color-text-muted);
  gap: 2px;
}

.popup-meta strong {
  font-family: var(--font-pixel);
  font-size: 13px;
  color: var(--color-text);
}

.popup-status {
  margin: 0;
  padding: 0 20px 8px;
  font-size: 11px;
  color: var(--color-success-text, #047857);
  text-align: center;
}

.popup-actions {
  display: flex;
  gap: 0;
  border-top: 2px solid var(--color-border);
}

.popup-btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  font-family: var(--font-pixel);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.08s;
  letter-spacing: 0.04em;
}

.popup-btn + .popup-btn {
  border-left: 2px solid var(--color-border);
}

.popup-btn.primary {
  background: var(--color-primary);
  color: var(--color-primary-text);
}

.popup-btn.primary:hover { filter: brightness(1.06); }

.popup-btn.ghost {
  background: var(--color-surface);
  color: var(--color-text-muted);
}

.popup-btn.ghost:hover {
  background: var(--color-surface-soft, #f5f5f5);
  color: var(--color-text);
}

.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.16s ease;
}
.popup-fade-enter-active .popup-window,
.popup-fade-leave-active .popup-window {
  transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
}
.popup-fade-enter-from .popup-window,
.popup-fade-leave-to .popup-window {
  transform: translateY(12px) scale(0.97);
}
</style>
