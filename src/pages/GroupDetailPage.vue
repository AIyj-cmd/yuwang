<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { User } from 'lucide-vue-next';
import { PxCard } from '@mmt817/pixel-ui';

const route = useRoute();
const groupId = computed(() => String(route.params.id ?? ''));
</script>

<template>
  <section class="workspace single-view">
    <aside class="right-rail">
      <PxCard class="panel group-panel">
        <template #header>
          <div class="panel-title between">
            <span><User :size="18" /> 小组详情</span>
            <small>/groups/{{ groupId }}</small>
          </div>
        </template>
        <div class="module-intro">
          <strong>小组公告</strong>
          <span>这里保留小组详情页骨架，先确保刷新和直达路由可用，不在本次展开完整小组业务。</span>
        </div>
        <div class="guild-layout">
          <section class="module-section">
            <div class="profile-section-head"><strong>小组公告</strong><small>公告占位</small></div>
            <p class="module-copy">展示小组规则、挑战说明和匿名化提示。</p>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>成员</strong><small>成员空间占位</small></div>
            <div class="empty-list">成员列表将在后续迭代中接入。</div>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>小组记录流</strong><small>记录占位</small></div>
            <div class="empty-list">小组记录流将在接入详情 API 后展示。</div>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>小组榜单</strong><small>挑战榜占位</small></div>
            <div class="empty-list">小组榜单将在后续迭代中接入。</div>
          </section>
        </div>
      </PxCard>
    </aside>
  </section>
</template>
