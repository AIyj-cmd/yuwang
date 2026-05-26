<script setup lang="ts">
import { Check, LogOut, X } from 'lucide-vue-next';
import { PxButton } from '@mmt817/pixel-ui';

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
      <PxButton type="base" size="small" @click="emit('request-leave')">
        <LogOut :size="13" /> 退出工会
      </PxButton>
    </div>
    <div v-else class="mg-confirm">
      <span>确认要退出当前工会吗？此操作无法撤销。</span>
      <div class="mg-form-actions">
        <PxButton type="danger" size="small" :loading="leaving" @click="emit('confirm-leave')">
          <Check :size="13" /> 确认退出
        </PxButton>
        <PxButton type="base" size="small" :disabled="leaving" @click="emit('cancel-leave')">
          <X :size="13" /> 取消
        </PxButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mg-section {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-soft);
}
.mg-section--danger {
  background: var(--color-danger);
}
.mg-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mg-section-head strong {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 900;
  color: var(--color-text);
}
.field-hint {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  line-height: 1.5;
}
.mg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mg-confirm {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
}
.mg-confirm > span {
  font-size: 12.5px;
  font-weight: 900;
  line-height: 1.6;
  color: var(--color-danger-text);
}
.mg-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
