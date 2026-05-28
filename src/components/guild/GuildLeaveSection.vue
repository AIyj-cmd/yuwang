<script setup lang="ts">
import { Check, LogOut, X } from 'lucide-vue-next';

const props = defineProps<{
  leaveConfirm: boolean;
  isOwner: boolean;
  leaving: boolean;
}>();

const emit = defineEmits<{
  (e: 'request-leave'): void;
  (e: 'confirm-leave'): void;
  (e: 'cancel-leave'): void;
}>();
</script>

<template>
  <section class="mg-section mg-section--danger">
    <div class="mg-section-head">
      <strong><LogOut :size="14" /> 退出工会</strong>
    </div>
    <p v-if="isOwner" class="field-hint">
      你是会长，不能直接退出工会。需先移出全部成员后再处理，或交由管理员协助。
    </p>
    <p v-else class="field-hint">
      退出后你将不再属于这支工会，历史摸鱼记录的工会归属保持不变。
    </p>

    <div v-if="!leaveConfirm" class="mg-actions">
      <button type="button" class="btn-secondary" @click="emit('request-leave')">
        <LogOut :size="13" /> 退出工会
      </button>
    </div>
    <div v-else class="mg-confirm">
      <span>确认要退出当前工会吗？此操作无法撤销。</span>
      <div class="mg-form-actions">
        <button
          type="button"
          class="btn-danger"
          :disabled="leaving"
          @click="emit('confirm-leave')"
        >
          <Check :size="13" /> {{ leaving ? '退出中…' : '确认退出' }}
        </button>
        <button
          type="button"
          class="btn-secondary"
          :disabled="leaving"
          @click="emit('cancel-leave')"
        >
          <X :size="13" /> 取消
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mg-section {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: var(--border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
.mg-section--danger {
  border-color: var(--color-danger);
  background: var(--color-bg-active-danger);
}
.mg-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.mg-section-head strong {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}
.field-hint {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}
.mg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.mg-confirm {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: var(--border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.mg-confirm > span {
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  line-height: var(--leading-normal);
  color: var(--color-danger);
}
.mg-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--transition-base);
}
.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-card);
}
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  background: var(--color-danger);
  color: var(--color-text-inverse);
  border: 1.5px solid var(--color-danger);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  font-family: inherit;
  box-shadow: var(--shadow-flat-sm);
  cursor: pointer;
  transition: opacity var(--transition-fast);
}
.btn-danger:hover:not(:disabled) {
  opacity: 0.85;
}
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
