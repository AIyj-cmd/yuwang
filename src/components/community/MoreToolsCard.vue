<script setup lang="ts">
/**
 * Community V2 · MoreToolsCard
 * 右栏次要入口集合:工会 / 圈子 / 钱包等已有路由的快捷跳转。
 * 注意:featureFlags=false 的功能(关注、话题、个人主页)做"待开放"展示,不发请求。
 */
import { useRouter } from 'vue-router';
import type { CommunityFeatureFlags } from '../../types';
import { useAppContext } from '../../appContext';
import SideDataCard from './SideDataCard.vue';
import PixelIcon from './PixelIcon.vue';

defineProps<{
  featureFlags: CommunityFeatureFlags | null;
}>();

const router = useRouter();
const { copy } = useAppContext();

const go = (to: string) => {
  void router.push(to);
};
</script>

<template>
  <SideDataCard
    icon="spark"
    :title="copy('更多入口', 'More')"
    :subtitle="copy('已开放的工具与待开放的功能', 'Open tools and deferred features')"
  >
    <button class="tool-line" type="button" @click="go('/guilds')">
      <PixelIcon name="crown" :size="18" />
      <strong>{{ copy('工会大厅', 'Guild hall') }}</strong>
      <span>{{ copy('赛季', 'Season') }}</span>
    </button>
    <button class="tool-line" type="button" @click="go('/circles')">
      <PixelIcon name="users" :size="18" />
      <strong>{{ copy('发现圈子', 'Find circles') }}</strong>
      <span>{{ copy('同好', 'Tribes') }}</span>
    </button>
    <button class="tool-line" type="button" @click="go('/profile/wallet')">
      <PixelIcon name="wallet" :size="18" />
      <strong>{{ copy('鱼鳞钱包', 'Wallet') }}</strong>
      <span>{{ copy('收支', 'Balance') }}</span>
    </button>

    <!-- 待开放(featureFlags=false 的) -->
    <div class="tool-line locked" v-if="!featureFlags?.mutualFollowing" aria-disabled="true">
      <PixelIcon name="users" :size="18" />
      <strong>{{ copy('互相关注', 'Mutual follow') }}</strong>
      <span class="badge-locked">{{ copy('待开放', 'Coming') }}</span>
    </div>
    <div class="tool-line locked" v-if="!featureFlags?.topics" aria-disabled="true">
      <PixelIcon name="bolt" :size="18" />
      <strong>{{ copy('话题广场', 'Topics') }}</strong>
      <span class="badge-locked">{{ copy('待开放', 'Coming') }}</span>
    </div>
    <div class="tool-line locked" v-if="!featureFlags?.profilePages" aria-disabled="true">
      <PixelIcon name="user" :size="18" />
      <strong>{{ copy('公开主页', 'Public profile') }}</strong>
      <span class="badge-locked">{{ copy('待开放', 'Coming') }}</span>
    </div>
  </SideDataCard>
</template>

<style scoped>
.tool-line {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-base);
  border: 1px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  font-family: inherit;
  color: var(--color-text-primary);
  cursor: pointer;
  text-align: left;
}
.tool-line + .tool-line {
  margin-top: var(--space-2);
}
.tool-line:hover:not(.locked) {
  background: var(--color-accent-mint-soft);
  border-color: var(--color-accent-mint);
}
.tool-line strong {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tool-line span {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}
.tool-line.locked {
  cursor: not-allowed;
  opacity: 0.72;
}
.badge-locked {
  padding: 1px 6px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  font-weight: var(--weight-bold);
}
</style>
