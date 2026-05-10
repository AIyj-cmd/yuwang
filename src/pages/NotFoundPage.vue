<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { AlertTriangle, Inbox } from 'lucide-vue-next';
import { PxCard } from '@mmt817/pixel-ui';
import PageWorkbench from '../components/layout/PageWorkbench.vue';
import WorkbenchHeader from '../components/layout/WorkbenchHeader.vue';
import WorkbenchGrid from '../components/layout/WorkbenchGrid.vue';
</script>

<template>
  <PageWorkbench>
    <WorkbenchHeader
      :icon="AlertTriangle"
      title="未找到页面"
      subtitle="这个路径不存在，或者旧入口已经迁移到真实路由。"
    />

    <WorkbenchGrid columns="two">
      <template #main>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><AlertTriangle :size="18" /><span>404</span></div>
          </template>
          <p class="module-copy">你访问的路径不存在。可以返回摸鱼记录提交，或者去社区广场、排行榜看看其他鱼友。</p>
          <div class="form-actions">
            <RouterLink class="profile-toggle-button" to="/">返回摸鱼记录提交</RouterLink>
            <RouterLink class="profile-toggle-button" to="/leaderboard">去排行榜</RouterLink>
            <RouterLink class="profile-toggle-button" to="/community">去社区广场</RouterLink>
          </div>
        </PxCard>
      </template>

      <template #side>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><Inbox :size="16" /><span>快速导航</span></div>
          </template>
          <ul class="rule-list">
            <li>提交页 /</li>
            <li>排行榜 /leaderboard</li>
            <li>社区广场 /community</li>
            <li>工会 /guilds</li>
            <li>圈子 /circles</li>
          </ul>
        </PxCard>
      </template>
    </WorkbenchGrid>
  </PageWorkbench>
</template>
