<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { User, Trophy, BadgeCheck } from 'lucide-vue-next';
import { PxCard } from '@mmt817/pixel-ui';
import PageWorkbench from '../components/layout/PageWorkbench.vue';
import WorkbenchHeader from '../components/layout/WorkbenchHeader.vue';
import WorkbenchGrid from '../components/layout/WorkbenchGrid.vue';

const route = useRoute();
const groupId = computed(() => String(route.params.id ?? ''));
</script>

<template>
  <PageWorkbench>
    <WorkbenchHeader
      :icon="User"
      title="小组详情"
      :subtitle="`/groups/${groupId} · 保留小组详情骨架，后续接入完整业务。`"
    />

    <WorkbenchGrid columns="three">
      <template #left>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><User :size="16" /><span>小组公告</span></div>
          </template>
          <p class="module-copy">展示小组规则、挑战说明和匿名化提示。</p>
        </PxCard>
      </template>

      <template #main>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><Trophy :size="16" /><span>成员与记录</span></div>
          </template>
          <div class="empty-list">成员列表与小组记录流将在后续迭代中接入。</div>
        </PxCard>
      </template>

      <template #side>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><BadgeCheck :size="16" /><span>挑战榜</span></div>
          </template>
          <ul class="rule-list">
            <li>创建小组消耗 50 鱼鳞。</li>
            <li>发起挑战消耗 30 鱼鳞。</li>
            <li>邀请码不收集真实身份。</li>
          </ul>
        </PxCard>
      </template>
    </WorkbenchGrid>
  </PageWorkbench>
</template>
