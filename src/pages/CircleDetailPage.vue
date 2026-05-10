<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Star } from 'lucide-vue-next';
import { PxCard } from '@mmt817/pixel-ui';

const route = useRoute();
const circleId = computed(() => String(route.params.id ?? ''));
</script>

<template>
  <section class="workspace single-view">
    <aside class="right-rail">
      <PxCard class="panel circle-panel">
        <template #header>
          <div class="panel-title between">
            <span><Star :size="18" /> 圈子详情</span>
            <small>/circles/{{ circleId }}</small>
          </div>
        </template>
        <div class="module-intro">
          <strong>圈子介绍</strong>
          <span>这里保留圈子详情页骨架，先完成真实路由拆分，后续再补齐圈子内容流和排行榜。</span>
        </div>
        <div class="guild-layout">
          <section class="module-section">
            <div class="profile-section-head"><strong>圈子介绍</strong><small>主题说明占位</small></div>
            <p class="module-copy">展示圈子主题、自动归类规则和加入状态。</p>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>圈子内容流</strong><small>记录卡片占位</small></div>
            <div class="empty-list">圈子内容流将在后续迭代中接入。</div>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>圈子排行榜</strong><small>主题榜单占位</small></div>
            <div class="empty-list">圈子排行榜将在接入详情 API 后展示。</div>
          </section>
        </div>
      </PxCard>
    </aside>
  </section>
</template>
