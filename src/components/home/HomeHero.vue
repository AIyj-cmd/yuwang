<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight, Trophy } from 'lucide-vue-next';
import { useAppContext } from '../../appContext';

const { copy, currentUser, stats, t } = useAppContext();
const router = useRouter();

const emit = defineEmits<{
  (e: 'focus-booth'): void;
}>();

const pixelPattern = [
  'i', 'i', 'i', 'i', 'i', 'i',
  'i', 'i', 'fill', 'fill', 'i', 'i',
  'i', 'fill', 'fill-3', 'fill', 'fill-2', 'i',
  'i', 'fill', 'fill', 'fill', 'fill-2', 'fill-2',
  'i', 'i', 'fill', 'fill', 'i', 'i',
  'i', 'i', 'i', 'i', 'i', 'i'
];

const heroTotal = computed(() => stats.value?.totalRecords ?? 0);
const heroToday = computed(() => stats.value?.todayRecords ?? 0);
const heroTop = computed(() => stats.value?.topScore ?? 0);

const openLeaderboard = () => {
  void router.push('/leaderboard');
};
</script>

<template>
  <section class="home-hero" :aria-label="copy('首页头图', 'Home hero')">
    <div class="hero-copy">
      <div class="hero-tag">
        <span>{{ copy('匿名 · 像素 · 摸鱼上榜', 'Anonymous · Pixel · On the Board') }}</span>
      </div>
      <h1 class="hero-title">
        <span>{{ copy('上班别太用力。', 'Don\'t work too hard.') }}</span>
        <span class="hero-accent">{{ copy('把今天摸的鱼，记上榜。', 'Log today\'s drift. Hit the board.') }}</span>
      </h1>
      <p class="hero-sub">{{ copy('匿名提交一段摸鱼瞬间，AI 帮你打分写评语，老板看不到。和工位上的同温层一起上榜、组工会、刷传奇。', 'Drop an anonymous slack moment, get an AI verdict, climb the boards. No boss in sight.') }}</p>
      <div class="hero-cta-row">
        <button type="button" class="hero-cta primary" @click="emit('focus-booth')">
          <span>{{ currentUser ? copy('继续上榜', 'Submit Another') : copy('开始上榜', 'Start the Board') }}</span>
          <ArrowRight :size="16" />
        </button>
        <button type="button" class="hero-cta ghost" @click="openLeaderboard">
          <Trophy :size="16" />
          <span>{{ copy('看今日鱼王', 'See Today\'s Fish King') }}</span>
        </button>
      </div>
      <div v-if="stats" class="hero-stats">
        <div class="hero-stat"><strong>{{ heroTotal }}</strong><span>{{ copy('总记录', 'Records') }}</span></div>
        <div class="hero-stat"><strong>{{ heroToday }}</strong><span>{{ copy('今日上榜', 'Today') }}</span></div>
        <div class="hero-stat"><strong>{{ heroTop }}</strong><span>{{ copy('最高鱼力', 'Top Power') }}</span></div>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="hero-pixel-grid">
        <i v-for="(cell, index) in pixelPattern" :key="index" :class="cell" />
      </div>
      <div class="hero-fish">🐟</div>
    </div>
  </section>
</template>
