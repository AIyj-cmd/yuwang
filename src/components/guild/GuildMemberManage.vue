<script setup lang="ts">
import { ref } from 'vue';
import { UserMinus } from 'lucide-vue-next';

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
      <input
        v-model="userId"
        class="mg-input"
        type="text"
        placeholder="成员用户 ID，例如 1024"
      />
      <button
        type="submit"
        class="btn-danger"
        :disabled="removing || !userId.trim()"
      >
        <UserMinus :size="13" /> {{ removing ? '移除中…' : '移除成员' }}
      </button>
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
  gap: var(--space-3);
  padding: var(--space-4);
  border: var(--border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
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
.mg-section-head small {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
}
.field-hint {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}
.mg-input {
  width: 100%;
  background: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  font-family: inherit;
  color: var(--color-text-primary);
}
.mg-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-flat-sm);
}
.mg-remove {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-2);
  align-items: start;
}
.mg-removed {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}
.mg-removed em {
  font-style: normal;
  padding: 2px var(--space-2);
  border: var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  font-weight: var(--weight-bold);
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
  white-space: nowrap;
  transition: opacity var(--transition-fast);
}
.btn-danger:hover:not(:disabled) {
  opacity: 0.85;
}
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .mg-remove {
    grid-template-columns: 1fr;
  }
}
</style>
