<script setup lang="ts">
import { ref } from 'vue';
import { UserMinus } from 'lucide-vue-next';
import { PxButton, PxInput } from '@mmt817/pixel-ui';

const props = defineProps<{
  removing: boolean;
  removedMembers: number[];
}>();

const emit = defineEmits<{
  (e: 'remove', userId: number): void;
}>();

const userId = ref('');

const handleSubmit = () => {
  const raw = userId.value.trim();
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) return;
  emit('remove', Number(raw));
  userId.value = '';
};
</script>

<template>
  <section class="mg-section">
    <div class="mg-section-head">
      <strong><UserMinus :size="14" /> 成员管理</strong>
      <small>会长操作</small>
    </div>
    <p class="field-hint">
      输入要移出工会的成员用户 ID。第一阶段没有成员列表接口，移除成功后会在下方记录本次操作。会长不能移除自己或其他会长。
    </p>
    <form class="mg-remove" @submit.prevent="handleSubmit">
      <PxInput v-model="userId" placeholder="成员用户 ID，例如 1024" />
      <PxButton
        type="danger"
        native-type="submit"
        size="small"
        :disabled="removing || !userId.trim()"
        :loading="removing"
      >
        <UserMinus :size="13" /> 移除成员
      </PxButton>
    </form>
    <div v-if="removedMembers.length" class="mg-removed">
      <span>本次会话已移除：</span>
      <em v-for="uid in removedMembers" :key="`removed-${uid}`">#{{ uid }}</em>
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
.mg-section-head small {
  font-size: 11px;
  font-weight: 800;
  color: var(--color-text-muted);
}
.field-hint {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  line-height: 1.5;
}
.mg-remove {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
}
.mg-removed {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text);
}
.mg-removed em {
  font-style: normal;
  padding: 2px 7px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  font-weight: 900;
}

@media (max-width: 480px) {
  .mg-remove {
    grid-template-columns: 1fr;
  }
}
</style>
