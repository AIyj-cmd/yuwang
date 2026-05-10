<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Star, Trophy, BadgeCheck } from 'lucide-vue-next';
import { PxCard } from '@mmt817/pixel-ui';
import PageWorkbench from '../components/layout/PageWorkbench.vue';
import WorkbenchHeader from '../components/layout/WorkbenchHeader.vue';
import WorkbenchGrid from '../components/layout/WorkbenchGrid.vue';

const route = useRoute();
const circleId = computed(() => String(route.params.id ?? ''));
</script>

<template>
  <PageWorkbench>
    <WorkbenchHeader
      :icon="Star"
      title="圈子详情"
      :subtitle="`/circles/${circleId} · 保留圈子详情骨架，后续再补齐内容流和榜单。`"
    />

    <WorkbenchGrid columns="three">
      <template #left>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><Star :size="16" /><span>圈子介绍</span></div>
          </template>
          <p class="module-copy">展示圈子主题、自动归类规则和加入状态。</p>
        </PxCard>
      </template>

      <template #main>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><Trophy :size="16" /><span>圈子内容流</span></div>
          </template>
          <div class="empty-list">圈子内容流将在后续迭代中接入。</div>
        </PxCard>
      </template>

      <template #side>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><BadgeCheck :size="16" /><span>圈子规则</span></div>
          </template>
          <ul class="rule-list">
            <li>按事项 / 故事 / 话题自动归类。</li>
            <li>可同时加入多个圈子。</li>
            <li>圈子不参与工会贡献。</li>
          </ul>
        </PxCard>
      </template>
    </WorkbenchGrid>
  </PageWorkbench>
</template>
