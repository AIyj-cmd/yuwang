<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Check, Flower2, Moon, Palette, Sunset, TreePine, Waves } from 'lucide-vue-next';

type ThemeKey = 'ocean' | 'sunset' | 'midnight' | 'sakura' | 'forest';

interface ThemeMeta {
  key: ThemeKey;
  zhName: string;
  enName: string;
  zhTag: string;
  enTag: string;
  icon: typeof Waves;
  swatches: [string, string, string];
}

const props = defineProps<{ locale: 'zh-CN' | 'en-US' }>();

const THEMES: ThemeMeta[] = [
  {
    key: 'ocean',
    zhName: '海蓝鱼塘',
    enName: 'Ocean Pond',
    zhTag: '清爽默认',
    enTag: 'Fresh default',
    icon: Waves,
    swatches: ['#40bed6', '#0c8f7b', '#ffe66d']
  },
  {
    key: 'sunset',
    zhName: '黄昏下班',
    enName: 'Sunset Clock-out',
    zhTag: '暖橙活力',
    enTag: 'Warm and lively',
    icon: Sunset,
    swatches: ['#ff5d73', '#ff8a56', '#ffd166']
  },
  {
    key: 'midnight',
    zhName: '午夜加班',
    enName: 'Midnight Overtime',
    zhTag: '深夜摸鱼',
    enTag: 'Late-night drift',
    icon: Moon,
    swatches: ['#6c5ce7', '#40bed6', '#ffe66d']
  },
  {
    key: 'sakura',
    zhName: '樱花茶水间',
    enName: 'Sakura Break Room',
    zhTag: '粉色治愈',
    enTag: 'Soft and sweet',
    icon: Flower2,
    swatches: ['#ff78a4', '#b76cd7', '#ffd1dc']
  },
  {
    key: 'forest',
    zhName: '工位绿洲',
    enName: 'Desk Oasis',
    zhTag: '安静自然',
    enTag: 'Calm and natural',
    icon: TreePine,
    swatches: ['#2f9e6e', '#56a85d', '#ffd166']
  }
];

const STORAGE_KEY = 'gongwei-yuwang-theme';
const DEFAULT_THEME: ThemeKey = 'ocean';

const readStoredTheme = (): ThemeKey => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeKey | null;
    if (stored && THEMES.some((theme) => theme.key === stored)) return stored;
  } catch {
    // Access to localStorage can throw in private modes; fall back silently.
  }
  return DEFAULT_THEME;
};

const applyTheme = (theme: ThemeKey) => {
  const root = document.documentElement;
  if (theme === DEFAULT_THEME) {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
};

const currentTheme = ref<ThemeKey>(readStoredTheme());
const open = ref(false);

const selectedMeta = computed(() => THEMES.find((theme) => theme.key === currentTheme.value) ?? THEMES[0]);

const toggleLabel = computed(() =>
  props.locale === 'en-US' ? `Theme · ${selectedMeta.value.enName}` : `主题 · ${selectedMeta.value.zhName}`
);

const panelTitle = computed(() => (props.locale === 'en-US' ? 'Pick a theme' : '选一套主题'));
const panelHint = computed(() =>
  props.locale === 'en-US'
    ? 'Only the right-side content changes. Your choice is saved locally.'
    : '只影响右侧内容区，选择会保存在本地。'
);

const selectTheme = (theme: ThemeKey) => {
  currentTheme.value = theme;
  open.value = false;
};

watch(
  currentTheme,
  (theme) => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors.
    }
  },
  { immediate: false }
);

onMounted(() => {
  applyTheme(currentTheme.value);
});
</script>

<template>
  <div class="theme-picker" :aria-label="locale === 'en-US' ? 'Theme picker' : '主题选择器'">
    <section v-if="open" class="theme-picker-panel" role="dialog">
      <h4>
        <Palette :size="14" style="vertical-align: -2px; margin-right: 6px" />
        {{ panelTitle }}
      </h4>
      <small>{{ panelHint }}</small>
      <div class="theme-picker-options">
        <button
          v-for="theme in THEMES"
          :key="theme.key"
          type="button"
          class="theme-picker-option"
          :class="{ active: currentTheme === theme.key }"
          :aria-pressed="currentTheme === theme.key"
          @click="selectTheme(theme.key)"
        >
          <component :is="theme.icon" :size="16" />
          <span class="theme-swatch" aria-hidden="true">
            <i :style="{ background: theme.swatches[0] }"></i>
            <i :style="{ background: theme.swatches[1] }"></i>
            <i :style="{ background: theme.swatches[2] }"></i>
          </span>
          <span>
            {{ locale === 'en-US' ? theme.enName : theme.zhName }}
            <small>{{ locale === 'en-US' ? theme.enTag : theme.zhTag }}</small>
          </span>
          <Check v-if="currentTheme === theme.key" :size="14" />
          <span v-else aria-hidden="true"></span>
        </button>
      </div>
    </section>
    <button
      type="button"
      class="theme-picker-toggle"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="theme-swatch-dot" aria-hidden="true"></span>
      <Palette :size="16" />
      <span>{{ toggleLabel }}</span>
    </button>
  </div>
</template>
