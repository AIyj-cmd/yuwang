<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Crown } from 'lucide-vue-next';
import { PxCard } from '@mmt817/pixel-ui';

const route = useRoute();
const guildId = computed(() => String(route.params.id ?? ''));
</script>

<template>
  <section class="workspace single-view">
    <aside class="right-rail">
      <PxCard class="panel guild-panel">
        <template #header>
          <div class="panel-title between">
            <span><Crown :size="18" /> 工会详情</span>
            <small>/guilds/{{ guildId }}</small>
          </div>
        </template>
        <div class="module-intro">
          <strong>工会信息</strong>
          <span>这里保留工会详情页骨架，后续再接入成员、贡献和赛季任务的完整业务逻辑。</span>
        </div>
        <div class="guild-layout">
          <section class="module-section">
            <div class="profile-section-head"><strong>工会信息</strong><small>基础资料占位</small></div>
            <p class="module-copy">展示工会名称、简介、等级、成员数量和当前赛季状态。</p>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>成员榜</strong><small>成员贡献占位</small></div>
            <div class="empty-list">成员榜将在接入详情 API 后展示。</div>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>贡献榜</strong><small>Fish Power 贡献占位</small></div>
            <div class="empty-list">贡献榜将在后续迭代中接入。</div>
          </section>
        </div>
      </PxCard>
    </aside>
  </section>
</template>
