<script setup lang="ts">
/**
 * Community Plaza — Home V2
 * ------------------------------------------------------------------
 * 真理来源:
 *   - 视觉:  STYLE_GUIDE.md(v1.1) + drafts/community-neopixel-v3.html
 *   - 数据:  docs/COMMUNITY_V2_DATA_MAP.md
 *   - 后端:  GET /api/community/overview · GET /api/community/feed
 *           POST /api/records (经 ComposeModal)
 *           POST /api/records/:id/like|nominate-legend|comment|report (经 useAppContext)
 *
 * 本文件只负责:页面组装 + overview 拉取 + ComposeModal 触发 +
 *   把 feed 切换委派给全局 communityFilter(bootstrap 已自动 reload)。
 */
import { onMounted, ref, watch } from 'vue';
import { useAppContext } from '../appContext';
import { fetchCommunityOverview } from '../api';
import type { CommunityOverviewResponse } from '../types';
import ComposeModal from '../components/ComposeModal.vue';
import SuccessPopup from '../components/SuccessPopup.vue';
import CommunityShell from '../components/community/CommunityShell.vue';
import SideNav from '../components/community/SideNav.vue';
import PostBox from '../components/community/PostBox.vue';
import FilterTabs from '../components/community/FilterTabs.vue';
import RecordCard from '../components/community/RecordCard.vue';
import EmptyState from '../components/community/EmptyState.vue';
import MyStatsCard from '../components/community/MyStatsCard.vue';
import SiteTodayCard from '../components/community/SiteTodayCard.vue';
import MiniRank from '../components/community/MiniRank.vue';
import MoreToolsCard from '../components/community/MoreToolsCard.vue';
import PixelIcon from '../components/community/PixelIcon.vue';

const {
  authToken,
  communityFilter,
  communityLoading,
  communityRecords,
  copy,
  form,
  lastResult,
  options,
  statusMessage
} = useAppContext();

/* ------------------------------------------------------------------
 * Overview 数据:右栏与冷启动降级唯一来源,仅来自 /api/community/overview
 * ------------------------------------------------------------------ */
const overview = ref<CommunityOverviewResponse | null>(null);
const overviewLoaded = ref(false);
const overviewError = ref('');

const loadOverview = async () => {
  try {
    overview.value = await fetchCommunityOverview(authToken.value);
    overviewError.value = '';
  } catch (error) {
    overviewError.value = error instanceof Error ? error.message : copy('右栏数据加载失败', 'Failed to load overview');
  } finally {
    overviewLoaded.value = true;
  }
};

// 登录态变化时重拉 overview(myStats 会从 null 变为对象,或反之)
watch(
  () => authToken.value,
  () => {
    overviewLoaded.value = false;
    overview.value = null;
    void loadOverview();
  }
);

/* ------------------------------------------------------------------
 * 投放入口 / ComposeModal
 * ------------------------------------------------------------------ */
const composeOpen = ref(false);
const openCompose = () => {
  composeOpen.value = true;
};
const closeCompose = () => {
  composeOpen.value = false;
};

/* ------------------------------------------------------------------
 * 提交成功弹窗
 * ------------------------------------------------------------------ */
const successOpen = ref(false);
const successPayload = ref<typeof lastResult.value | null>(null);
const lastSubmittedRecordId = ref<number | null>(null);
watch(
  () => lastResult.value?.record?.id,
  (id) => {
    if (id && id !== lastSubmittedRecordId.value) {
      lastSubmittedRecordId.value = id;
      successPayload.value = lastResult.value;
      successOpen.value = true;
      composeOpen.value = false;
      // 提交成功后右栏指标可能也变了
      void loadOverview();
    }
  }
);

/* ------------------------------------------------------------------
 * 筛选 tab 切换:写到全局 communityFilter,bootstrap 会自动 reload feed
 * ------------------------------------------------------------------ */
const onFilterChange = (next: 'latest' | 'hot' | 'high' | 'legendary') => {
  communityFilter.value = next;
};

/* ------------------------------------------------------------------
 * 初始化:默认公开 + 默认时长(避免 ComposeModal 无法 quick submit)
 *        首次拉 overview
 * ------------------------------------------------------------------ */
onMounted(() => {
  if (!form.publishToCommunity && !form.privateOnly) {
    form.publishToCommunity = true;
  }
  if (form.privateOnly) {
    form.privateOnly = false;
    form.publishToCommunity = true;
  }
  if (!form.duration) {
    form.duration = options.value.durations?.[1]?.key ?? form.duration;
  }
  void loadOverview();
});
</script>

<template>
  <CommunityShell>
    <!-- ============ 左栏 ============ -->
    <template #nav>
      <SideNav />
    </template>

    <!-- ============ 主栏 ============ -->
    <template #main>
      <!-- 页头:左标题 + 右搜索 icon(搜索功能维持当前能力,作为次要入口) -->
      <header class="page-head">
        <div class="page-head-text">
          <h1>{{ copy('社区广场', 'Community plaza') }}</h1>
          <p class="page-head-sub">{{ copy('公共水域 · 只展示已公开且通过审核的记录', 'Public waters · approved public records only') }}</p>
        </div>
        <div class="head-actions">
          <button
            type="button"
            class="icon-btn"
            :title="copy('搜索', 'Search')"
            :aria-label="copy('搜索', 'Search')"
            disabled
          >
            <PixelIcon name="search" :size="16" />
          </button>
        </div>
      </header>

      <!-- 主 CTA:投放入口 -->
      <PostBox @compose="openCompose" />

      <!-- 筛选 -->
      <FilterTabs
        :active="communityFilter"
        :count="communityRecords.length"
        :mutual-enabled="!!overview?.featureFlags?.mutualFollowing"
        @change="onFilterChange"
      />

      <!-- 记录列表 -->
      <section v-if="communityLoading" class="feed-state loading">
        <span class="pixel-loader" aria-hidden="true"></span>
        <span>{{ copy('加载中…', 'Loading…') }}</span>
      </section>

      <section v-else-if="!communityRecords.length" class="feed-empty-wrap">
        <EmptyState
          icon="fish"
          :title="copy('鱼塘还没有人,你来当第一条!', 'No fish yet — be the first!')"
          :description="copy('第一条记录就是今天的鱼王。', 'Your first post becomes today\'s king.')"
          :cta-label="copy('鱼上墙', 'Post it')"
          :show-cta="true"
          @cta="openCompose"
        />
      </section>

      <section v-else class="feed-list">
        <RecordCard
          v-for="record in communityRecords"
          :key="record.id"
          :record="record"
        />
      </section>
    </template>

    <!-- ============ 右栏 ============ -->
    <template #side>
      <MyStatsCard
        :my-stats="overview?.myStats ?? null"
        :loaded="overviewLoaded"
      />
      <SiteTodayCard
        :site-today="overview?.siteToday ?? null"
      />
      <MiniRank
        :today-top="overview?.todayTop ?? []"
      />
      <MoreToolsCard
        :feature-flags="overview?.featureFlags ?? null"
      />
    </template>
  </CommunityShell>

  <!-- 提交弹窗 -->
  <ComposeModal :open="composeOpen" @close="closeCompose" />

  <!-- 提交成功弹窗 -->
  <SuccessPopup
    :open="successOpen"
    :payload="successPayload"
    :status-message="statusMessage"
    @close="successOpen = false"
  />
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-bg-card);
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  box-shadow: var(--v2-shadow-flat-md);
  padding: var(--space-4) var(--space-5);
  gap: var(--space-3);
}
.page-head h1 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
}
.page-head-sub {
  margin-top: 2px;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
.head-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.icon-btn {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: var(--color-bg-card);
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.icon-btn:hover:not(:disabled) {
  background: var(--color-bg-base);
  border-color: var(--v2-border-emphasis);
  color: var(--color-text-primary);
}
.icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  /* disabled 状态:更柔和,不像"坏掉的黑框" */
  background: var(--color-bg-subtle);
  border-color: var(--v2-divider);
}

.feed-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-12) var(--space-5);
  background: var(--color-bg-card);
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}
.pixel-loader {
  width: 24px;
  height: 24px;
  /* v1.2:loader 像素方块改为柔和暖米灰,不再用纯黑刺眼 */
  background:
    linear-gradient(var(--v2-border-emphasis) 0 0) 0 0 / 8px 8px no-repeat,
    linear-gradient(var(--v2-border-emphasis) 0 0) 8px 0 / 8px 8px no-repeat,
    linear-gradient(var(--v2-border-emphasis) 0 0) 16px 0 / 8px 8px no-repeat;
  animation: pixel-blink 1s steps(3) infinite;
}
@keyframes pixel-blink {
  0% { opacity: 0.3; }
  33% { opacity: 0.6; }
  66% { opacity: 1; }
  100% { opacity: 0.3; }
}

.feed-empty-wrap {
  margin-top: var(--space-3);
}
.feed-list {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-1);
}

@media (max-width: 720px) {
  .page-head {
    padding: var(--space-3) var(--space-4);
  }
  .page-head h1 {
    font-size: var(--text-md);
  }
}
</style>
