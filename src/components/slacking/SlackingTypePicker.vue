<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  COMMON_SLACKING_TYPE_IDS,
  SLACKING_TYPE_GROUPS,
  SLACKING_TYPE_OPTIONS,
  type SlackingTypeOption
} from '../../config/slackingTypes';

const props = defineProps<{
  modelValue: string;
  locale: 'zh-CN' | 'en-US';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  select: [option: SlackingTypeOption];
}>();

const copy = (zh: string, en: string) => (props.locale === 'en-US' ? en : zh);
const optionLabel = (option: SlackingTypeOption) => (props.locale === 'en-US' ? option.labelEn : option.label);
const optionDescription = (option: SlackingTypeOption) => (props.locale === 'en-US' ? option.descriptionEn : option.description);
const groupName = (group: (typeof SLACKING_TYPE_GROUPS)[number]) => (props.locale === 'en-US' ? group.nameEn : group.name);
const groupDescription = (group: (typeof SLACKING_TYPE_GROUPS)[number]) => (props.locale === 'en-US' ? group.descriptionEn : group.description);

const selectedOption = computed(() => SLACKING_TYPE_OPTIONS.find((item) => item.id === props.modelValue) ?? SLACKING_TYPE_OPTIONS[0]);
const activeGroupId = ref(selectedOption.value.groupId);
const searchKeyword = ref('');

watch(
  () => props.modelValue,
  () => {
    activeGroupId.value = selectedOption.value.groupId;
  }
);

const activeGroup = computed(() => SLACKING_TYPE_GROUPS.find((group) => group.id === activeGroupId.value) ?? SLACKING_TYPE_GROUPS[0]);
const commonOptions = computed(() => COMMON_SLACKING_TYPE_IDS.map((id) => SLACKING_TYPE_OPTIONS.find((item) => item.id === id)).filter(Boolean) as SlackingTypeOption[]);

const visibleOptions = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) return activeGroup.value.options;
  return SLACKING_TYPE_OPTIONS.filter((option) => {
    const haystack = [option.label, option.labelEn, option.groupName, option.groupNameEn, option.description, option.descriptionEn, option.id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(keyword);
  });
});

const selectOption = (option: SlackingTypeOption) => {
  activeGroupId.value = option.groupId;
  emit('update:modelValue', option.id);
  emit('select', option);
};
</script>

<template>
  <section class="slacking-picker" aria-label="Slacking type picker">
    <div class="picker-block">
      <div class="picker-head">
        <strong>{{ copy('常用类型快捷入口', 'Quick Picks') }}</strong>
        <small>{{ copy('一键选择高频摸鱼姿势', 'Choose frequent patterns quickly') }}</small>
      </div>
      <div class="chip-row">
        <button
          v-for="option in commonOptions"
          :key="option.id"
          type="button"
          class="picker-chip"
          :class="{ active: modelValue === option.id }"
          @click="selectOption(option)"
        >
          {{ optionLabel(option) }}
        </button>
      </div>
    </div>

    <div class="picker-block">
      <div class="picker-head">
        <strong>{{ copy('大类选择', 'Category') }}</strong>
        <small>{{ groupDescription(activeGroup) }}</small>
      </div>
      <div class="group-grid">
        <button
          v-for="group in SLACKING_TYPE_GROUPS"
          :key="group.id"
          type="button"
          class="group-button"
          :class="{ active: activeGroupId === group.id }"
          @click="activeGroupId = group.id"
        >
          <span>{{ groupName(group) }}</span>
        </button>
      </div>
    </div>

    <div class="picker-block">
      <div class="picker-head">
        <strong>{{ copy('搜索输入框', 'Search') }}</strong>
        <small>{{ copy('按关键词查找具体行为', 'Search by behavior keyword') }}</small>
      </div>
      <input
        v-model="searchKeyword"
        class="picker-search"
        type="search"
        :placeholder="copy('搜索：会议、短视频、接水...', 'Search: meeting, videos, refill...')"
      />
    </div>

    <div class="picker-block">
      <div class="picker-head">
        <strong>{{ searchKeyword ? copy('搜索结果', 'Search Results') : copy('当前大类下的具体行为', 'Behaviors in Current Category') }}</strong>
        <small>{{ visibleOptions.length }} {{ copy('个选项', 'options') }}</small>
      </div>
      <div v-if="visibleOptions.length" class="option-grid">
        <button
          v-for="option in visibleOptions"
          :key="option.id"
          type="button"
          class="option-card"
          :class="{ active: modelValue === option.id }"
          @click="selectOption(option)"
        >
          <span>{{ optionLabel(option) }}</span>
          <strong>{{ option.score }}</strong>
          <small>{{ optionDescription(option) }}</small>
        </button>
      </div>
      <div v-else class="picker-empty">
        {{ copy('没有找到这种摸鱼姿势，要不先发明一个？', 'No slacking posture found. Invent one first?') }}
      </div>
    </div>

    <div class="selected-result">
      <span>{{ copy('已选择结果', 'Selected') }}</span>
      <strong>{{ optionLabel(selectedOption) }}</strong>
      <small>{{ props.locale === 'en-US' ? selectedOption.groupNameEn : selectedOption.groupName }} · {{ selectedOption.score }} {{ copy('分基础分', 'base points') }}</small>
    </div>
  </section>
</template>

<style scoped>
.slacking-picker {
  display: grid;
  gap: 10px;
  padding: 10px;
  border: 3px solid var(--color-border);
  background: var(--color-warning);
  box-shadow: 3px 3px 0 var(--color-border);
}

.picker-block {
  display: grid;
  gap: 8px;
}

.picker-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.picker-head strong {
  font-size: 13px;
  font-weight: 950;
}

.picker-head small,
.selected-result span,
.selected-result small,
.option-card small {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.35;
}

.chip-row,
.group-grid,
.option-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.group-grid,
.option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.picker-chip,
.group-button,
.option-card {
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: 2px 2px 0 var(--color-border);
  font-weight: 900;
}

.picker-chip {
  min-height: 30px;
  padding: 4px 8px;
  font-size: 12px;
}

.group-button {
  min-height: 34px;
  padding: 6px;
  font-size: 12px;
  text-align: left;
}

.option-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 8px;
  min-height: 58px;
  padding: 7px;
  text-align: left;
}

.option-card span {
  min-width: 0;
  font-size: 12px;
  line-height: 1.25;
}

.option-card strong {
  grid-row: span 2;
  align-self: center;
  font-size: 20px;
}

.option-card small {
  grid-column: 1;
}

.picker-chip.active,
.group-button.active,
.option-card.active {
  background: var(--color-accent);
}

.picker-search {
  min-height: 38px;
  padding: 0 10px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: 2px 2px 0 var(--color-border);
  outline: none;
}

.picker-search:focus {
  border-color: var(--color-focus);
  box-shadow: 2px 2px 0 var(--color-focus);
}

.picker-empty {
  display: grid;
  min-height: 64px;
  place-items: center;
  border: 2px dashed var(--color-border-soft);
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 900;
  text-align: center;
}

.selected-result {
  display: grid;
  gap: 3px;
  padding: 9px;
  border: 2px solid var(--color-border);
  background: var(--color-accent);
  color: var(--color-text);
}

.selected-result strong {
  font-size: 15px;
}
</style>
