<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Crown, Trophy, BadgeCheck } from 'lucide-vue-next';
import { PxCard } from '@mmt817/pixel-ui';
import PageWorkbench from '../components/layout/PageWorkbench.vue';
import WorkbenchHeader from '../components/layout/WorkbenchHeader.vue';
import WorkbenchGrid from '../components/layout/WorkbenchGrid.vue';

const route = useRoute();
const guildId = computed(() => String(route.params.id ?? ''));
</script>

<template>
  <PageWorkbench>
    <WorkbenchHeader
      :icon="Crown"
      title="工会详情"
      :subtitle="`/guilds/${guildId} · 此页面保留工会详情骨架，后续会接入成员、贡献和赛季任务。`"
    />

    <WorkbenchGrid columns="three">
      <template #left>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><Crown :size="16" /><span>工会信息</span></div>
          </template>
          <p class="module-copy">展示工会名称、简介、等级、成员数量和当前赛季状态。</p>
        </PxCard>
      </template>

      <template #main>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><Trophy :size="16" /><span>成员榜</span></div>
          </template>
          <div class="empty-list">成员榜将在接入详情 API 后展示。</div>
        </PxCard>

        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><BadgeCheck :size="16" /><span>贡献榜</span></div>
          </template>
          <div class="empty-list">贡献榜将在后续迭代中接入。</div>
        </PxCard>
      </template>

      <template #side>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><BadgeCheck :size="16" /><span>赛季规则</span></div>
          </template>
          <ul class="rule-list">
            <li>Fish Power * 0.3 贡献到当前工会。</li>
            <li>互动加成额外计入贡献。</li>
            <li>一次只能加入一个工会。</li>
          </ul>
        </PxCard>
      </template>
    </WorkbenchGrid>
  </PageWorkbench>
</template>
