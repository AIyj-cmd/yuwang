<script setup lang="ts">
import { computed, reactive } from 'vue';
import { Crown } from 'lucide-vue-next';

const props = defineProps<{
  creating: boolean;
  safetyNotice: string;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: { name: string; description: string; icon: string }): void;
}>();

const NAME_MIN = 2;
const NAME_MAX = 40;
const DESC_MAX = 180;
const ICON_MIN = 1;
const ICON_MAX = 4;
const GUILD_CREATE_COST = 50;

const form = reactive({ name: '', description: '', icon: '鱼' });

const iconSuggestions = ['鱼', '🐟', '🐠', '🦑', '☕', '😴'];

const trimmedLen = (value: string) => value.trim().length;

const error = computed(() => {
  const nameLen = trimmedLen(form.name);
  if (nameLen < NAME_MIN || nameLen > NAME_MAX) {
    return `工会名称需要 ${NAME_MIN}-${NAME_MAX} 个字符。`;
  }
  const descLen = trimmedLen(form.description);
  if (descLen < 1) {
    return '请填写工会简介。';
  }
  if (descLen > DESC_MAX) {
    return `工会简介最多 ${DESC_MAX} 个字符。`;
  }
  const iconLen = trimmedLen(form.icon);
  if (iconLen < ICON_MIN || iconLen > ICON_MAX) {
    return `工会图标需要 ${ICON_MIN}-${ICON_MAX} 个字符。`;
  }
  return '';
});

const canSubmit = computed(() => !props.creating && error.value === '');

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
  <div class="mg-block">
    <div class="module-intro">
      <strong>你还没有加入任何工会</strong>
      <span>
        创建一支属于自己的摸鱼组织并担任会长。创建会消耗 {{ GUILD_CREATE_COST }} 鱼鳞，余额不足将无法创建。
      </span>
    </div>

    <form class="mg-form" @submit.prevent="handleSubmit">
      <div class="field">
        <span>工会图标</span>
        <input
          v-model="form.icon"
          class="mg-input"
          type="text"
          placeholder="1-4 个字符，可用 emoji"
        />
        <div class="mg-icon-picker">
          <button
            v-for="icon in iconSuggestions"
            :key="`create-icon-${icon}`"
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
          placeholder="2-40 个字符，例如：摸鱼地下研究所"
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
          placeholder="介绍这支工会的摸鱼风格（必填，最多 180 字）。"
        ></textarea>
      </label>

      <p class="safety-inline">{{ safetyNotice }}</p>

      <button type="submit" class="btn-primary" :disabled="!canSubmit">
        <Crown :size="14" /> {{ creating ? '创建中…' : '创建工会' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.mg-block {
  display: grid;
  gap: var(--space-4);
}
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
.mg-counter {
  font-style: normal;
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  color: var(--color-text-secondary);
}
.mg-counter--over {
  color: var(--color-danger);
}
.module-intro {
  display: grid;
  gap: var(--space-2);
}
.module-intro strong {
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}
.module-intro span {
  font-size: var(--text-sm);
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
  background: var(--color-bg-subtle);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  background: var(--color-primary);
  color: var(--color-primary-text);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-base);
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
</style>
