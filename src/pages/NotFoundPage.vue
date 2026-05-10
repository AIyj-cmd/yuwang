<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { AlertTriangle } from 'lucide-vue-next';
import { PxCard } from '@mmt817/pixel-ui';
</script>

<template>
  <section class="workspace single-view">
    <aside class="right-rail">
      <PxCard class="panel">
        <template #header>
          <div class="panel-title"><AlertTriangle :size="18" /><span>未找到页面</span></div>
        </template>
        <div class="module-intro">
          <strong>404</strong>
          <span>这个页面不存在，或者旧入口已经迁移到真实路由。</span>
        </div>
        <RouterLink class="profile-toggle-button" to="/">返回摸鱼记录提交</RouterLink>
      </PxCard>
    </aside>
  </section>
</template>
