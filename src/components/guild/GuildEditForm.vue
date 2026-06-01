<script setup lang="ts">
import { computed, reactive } from 'vue';
import { Pencil, Save, X } from 'lucide-vue-next';

const props = defineProps<{
  initialName: string;
  initialDescription: string;
  initialIcon: string;
  savingEdit: boolean;
  safetyNotice: string;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: { name: string; description: string; icon: string }): void;
  (e: 'cancel'): void;
}>();

const NAME_MIN = 2;
const NAME_MAX = 40;
const DESC_MAX = 180;
const ICON_MIN = 1;
const ICON_MAX = 4;

const form = reactive({
  name: props.initialName,
  description: props.initialDescription,
  icon: props.initialIcon
});

const iconSuggestions = ['鱼', '🐟', '🐠', '🦑', '☕', '😴'];

const trimmedLen = (value: string) => value.trim().length;

const error = computed(() => {
  const nameLen = trimmedLen(form.name);
  if (nameLen < NAME_MIN || nameLen > NAME_MAX) {
    return `工会名称需要 ${NAME_MIN}-${NAME_MAX} 个字符。`;
  }
  if (trimmedLen(form.description) > DESC_MAX) {
    return `工会简介最多 ${DESC_MAX} 个字符。`;
  }
  const iconLen = trimmedLen(form.icon);
  if (iconLen < ICON_MIN || iconLen > ICON_MAX) {
    return `工会图标需要 ${ICON_MIN}-${ICON_MAX} 个字符。`;
  }
  return '';
});

const canSubmit = computed(() => !props.savingEdit && error.value === '');

const handleSubmit = () => {
  if (!canSubmit.value) return;
  emit('submit', {
    name: form.name.trim(),
    description: form.description.trim(),
    icon: form.icon.trim()
  });
};
</script>

<template>
  <form class="mg-form mg-card" @submit.prevent="handleSubmit">
    <div class="mg-section-head">
      <strong><Pencil :size="14" /> 编辑工会资料</strong>
      <small>仅会长可修改</small>
    </div>

    <div class="field">
      <span>工会图标</span>
      <input
        v-model="form.icon"
        class="mg-input"
        type="text"
        placeholder="1-4 个字符"
      />
      <div class="mg-icon-picker">
        <button
          v-for="icon in iconSuggestions"
          :key="`edit-icon-${icon}`"
          type="button"
          class="mg-icon-chip"
          :class="{ active: form.icon === icon }"
          @click="form.icon = icon"
        >
          {{ icon }}
        </button>
      </div>
    </div>

    <label class="field">
      <span>
        工会名称
        <em class="mg-counter" :class="{ 'mg-counter--over': trimmedLen(form.name) > NAME_MAX }">
          {{ trimmedLen(form.name) }}/{{ NAME_MAX }}
        </em>
      </span>
      <input
        v-model="form.name"
        class="mg-input"
        type="text"
        placeholder="2-40 个字符"
      />
    </label>

    <label class="field">
      <span>
        工会简介 / 公告
        <em class="mg-counter">{{ trimmedLen(form.description) }}/{{ DESC_MAX }}</em>
      </span>
      <textarea
        v-model="form.description"
        class="mg-input mg-textarea"
        :maxlength="DESC_MAX"
        rows="4"
        placeholder="最多 180 字。"
      ></textarea>
    </label>

    <p class="safety-inline">{{ safetyNotice }}</p>

    <div class="mg-form-actions">
      <button type="submit" class="btn-primary" :disabled="!canSubmit">
        <Save :size="13" /> {{ savingEdit ? '保存中…' : '保存修改' }}
      </button>
      <button type="button" class="btn-secondary" @click="emit('cancel')">
        <X :size="13" /> 取消
      </button>
    </div>
  </form>
</template>

<style scoped>
.mg-form {
  display: grid;
  gap: var(--space-4);
}
.field {
  display: grid;
  gap: var(--space-2);
}
.field > span {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}
.mg-card {
  padding: var(--space-4);
  border: var(--border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
.mg-counter {
  font-style: normal;
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  color: var(--color-text-secondary);
}
.mg-counter--over {
  color: var(--color-danger);
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
.mg-textarea {
  resize: vertical;
  min-height: 80px;
}
.mg-icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.mg-icon-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 32px;
  padding: 0 var(--space-2);
  border: var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-flat-sm);
  color: var(--color-text-primary);
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  cursor: pointer;
}
.mg-icon-chip:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-border);
}
.mg-icon-chip.active {
  background: var(--color-primary-soft);
  border-color: var(--color-border-strong);
}
.mg-icon-chip:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.safety-inline {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: var(--border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}
.mg-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  background: var(--color-primary);
  color: var(--color-primary-text);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  font-family: inherit;
  box-shadow: var(--shadow-flat-sm);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.btn-primary:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-border);
}
.btn-primary:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--color-border);
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
.btn-secondary:hover {
  background: var(--color-bg-card);
}
</style>
