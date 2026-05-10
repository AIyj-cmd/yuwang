<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Check, Palette } from 'lucide-vue-next';
import { applyTheme, readSavedTheme, THEMES, type ThemeId } from '../theme';

const props = defineProps<{
  locale?: 'zh-CN' | 'en-US';
}>();

const current = ref<ThemeId>(readSavedTheme());
const expanded = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const isZh = computed(() => (props.locale ?? 'zh-CN') === 'zh-CN');

const currentTheme = computed(() => THEMES.find((theme) => theme.id === current.value) ?? THEMES[0]);
const triggerLabel = computed(() => (isZh.value ? currentTheme.value.labelZh : currentTheme.value.labelEn));
const panelTitle = computed(() => (isZh.value ? '选择主题' : 'Select Theme'));
const triggerTitle = computed(() => (isZh.value ? '切换界面主题' : 'Switch visual theme'));

const handleSelect = (id: ThemeId) => {
  current.value = id;
  applyTheme(id);
  expanded.value = false;
};

const toggle = () => {
  expanded.value = !expanded.value;
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!expanded.value) return;
  const root = rootRef.value;
  if (root && event.target instanceof Node && !root.contains(event.target)) {
    expanded.value = false;
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && expanded.value) {
    expanded.value = false;
  }
};

onMounted(() => {
  // The initial data-theme attribute is already applied in main.ts before
  // mount, so we only reconcile the reactive state here.
  current.value = readSavedTheme();
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div ref="rootRef" class="theme-switcher" :class="{ open: expanded }">
    <button
      type="button"
      class="theme-switcher-trigger"
      :title="triggerTitle"
      :aria-expanded="expanded"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <Palette :size="14" />
      <span class="theme-switcher-label">{{ isZh ? '主题' : 'Theme' }}</span>
      <span class="theme-switcher-current">{{ triggerLabel }}</span>
      <span class="theme-switcher-swatch" aria-hidden="true">
        <i v-for="color in currentTheme.swatches" :key="color" :style="{ background: color }" />
      </span>
    </button>

    <div v-if="expanded" class="theme-switcher-panel" role="listbox" :aria-label="panelTitle">
      <p class="theme-switcher-panel-title">{{ panelTitle }}</p>
      <button
        v-for="theme in THEMES"
        :key="theme.id"
        type="button"
        class="theme-switcher-option"
        :class="{ active: theme.id === current }"
        role="option"
        :aria-selected="theme.id === current"
        @click="handleSelect(theme.id)"
      >
        <span class="theme-switcher-swatch" aria-hidden="true">
          <i v-for="color in theme.swatches" :key="color" :style="{ background: color }" />
        </span>
        <span class="theme-switcher-option-text">
          <strong>{{ isZh ? theme.labelZh : theme.labelEn }}</strong>
          <small>{{ isZh ? theme.descriptionZh : theme.descriptionEn }}</small>
        </span>
        <Check v-if="theme.id === current" :size="14" class="theme-switcher-check" />
      </button>
    </div>
  </div>
</template>
