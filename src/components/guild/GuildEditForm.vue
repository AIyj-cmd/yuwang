<script setup lang="ts">
import { computed, reactive } from 'vue';
import { Pencil, Save, X } from 'lucide-vue-next';
import { PxButton, PxInput } from '@mmt817/pixel-ui';

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
      <PxInput v-model="form.icon" placeholder="1-4 个字符" />
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
      <PxInput v-model="form.name" placeholder="2-40 个字符" />
    </label>

    <label class="field">
      <span>
        工会简介 / 公告
        <em class="mg-counter">{{ trimmedLen(form.description) }}/{{ DESC_MAX }}</em>
      </span>
      <textarea
        v-model="form.description"
        :maxlength="DESC_MAX"
        rows="4"
        placeholder="最多 180 字。"
      ></textarea>
    </label>

    <p class="safety-inline">{{ safetyNotice }}</p>

    <div class="mg-form-actions">
      <PxButton type="primary" native-type="submit" size="small" :disabled="!canSubmit" :loading="savingEdit">
        <Save :size="13" /> 保存修改
      </PxButton>
      <PxButton type="base" native-type="button" size="small" @click="emit('cancel')">
        <X :size="13" /> 取消
      </PxButton>
    </div>
  </form>
</template>

<style scoped>
.mg-form {
  display: grid;
  gap: 14px;
}
.mg-form .field > span {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.mg-card {
  padding: 14px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-soft);
}
.mg-counter {
  font-style: normal;
  font-size: 11px;
  font-weight: 900;
  color: var(--color-text-muted);
}
.mg-counter--over {
  color: var(--color-danger-text);
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
.mg-icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.mg-icon-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 32px;
  padding: 0 6px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 2px 2px 0 var(--color-border);
  color: var(--color-text);
  font-size: 15px;
  font-weight: 900;
  cursor: pointer;
}
.mg-icon-chip:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-border);
}
.mg-icon-chip.active {
  background: var(--color-accent);
}
.mg-icon-chip:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.safety-inline {
  margin: 0;
  padding: 8px 10px;
  border: 2px solid var(--color-border-soft);
  background: var(--color-surface-soft);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  line-height: 1.5;
}
.mg-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
