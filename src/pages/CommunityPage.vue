<script setup lang="ts">
/**
 * Community Plaza – v4
 * --------------------------------------------------------------
 * 视觉重设计：
 *  - 顶部新增全站状态栏：摸鱼指数 / 今日活跃鱼 / 今日上墙 / 今日互动
 *    （全部由已加载的 communityRecords 前端派生，无新增接口；
 *     后端补上精确算法后可直接替换 statusMetrics 的取数逻辑）
 *  - 页面改为三栏：左=竖向筛选+今日鱼王 / 中=信息流 / 右=竖向话题
 *  - 整体放大字号、卡片与间距，信息流改为卡片式，提升可读性
 *  - 保留像素风与全部现有功能、数据流、接口调用
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Flame, Sparkles, Star, Trophy } from 'lucide-vue-next';
import { useAppContext } from '../appContext';
import ComposeModal from '../components/ComposeModal.vue';
import ComposerBar from '../components/ComposerBar.vue';
import FeedCard from '../components/FeedCard.vue';
import FloatingFab from '../components/FloatingFab.vue';
import SuccessPopup from '../components/SuccessPopup.vue';
import StatusBar from '../components/StatusBar.vue';

const {
  communityFilter,
  communityLoading,
  communityRecords,
  copy,
  currentUser,
  feedCommentDrafts,
  form,
  handleFeedComment,
  handleFeedLike,
  handleFeedNominate,
  handleFeedReport,
  lastResult,
  openProfileRecord,
  openTopic,
  options,
  statusMessage,
  t,
  translatedCircleName,
  translatedGuildName,
  translatedSystemComment,
  translatedTitle
} = useAppContext();



/* ------------------------------------------------------------------
 * 信息流过滤器
 * ------------------------------------------------------------------ */
const filters = computed(() => [
  { key: 'latest', label: copy('最新', 'Latest'), icon: Sparkles },
  { key: 'hot', label: copy('热门', 'Hot'), icon: Flame },
  { key: 'high', label: copy('高分', 'Top Score'), icon: Trophy },
  { key: 'legendary', label: copy('传奇', 'Legend'), icon: Star }
]);

const setFilter = (key: string) => {
  communityFilter.value = key as typeof communityFilter.value;
};

/* ------------------------------------------------------------------
 * 全站状态栏指标已迁移到 StatusBar.vue 内部计算
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------
 * 提交流程 & 成功弹窗
 * ------------------------------------------------------------------ */
const successOpen = ref(false);
const successPayload = ref<typeof lastResult.value | null>(null);
const lastSubmittedRecordId = ref<number | null>(null);
const composeOpen = ref(false);

watch(
  () => lastResult.value?.record?.id,
  (id) => {
    if (id && id !== lastSubmittedRecordId.value) {
      lastSubmittedRecordId.value = id;
      successPayload.value = lastResult.value;
      successOpen.value = true;
      composeOpen.value = false;
    }
  }
);

const onViewDetail = async (recordId: number) => {
  await openProfileRecord(recordId);
  successOpen.value = false;
};

/* ------------------------------------------------------------------
 * 浮动投稿按钮（FAB）：投稿条滚出视口后出现，保证任意位置都能发帖
 * ------------------------------------------------------------------ */
const composerBarRef = ref<InstanceType<typeof ComposerBar> | null>(null);
const showFab = ref(false);
let composerObserver: IntersectionObserver | null = null;

onMounted(() => {
  const el = composerBarRef.value?.$el as HTMLElement | undefined;
  if (typeof IntersectionObserver === 'undefined' || !el) return;
  composerObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      showFab.value = entry ? !entry.isIntersecting : false;
    },
    { threshold: 0 }
  );
  composerObserver.observe(el);
});

onBeforeUnmount(() => {
  composerObserver?.disconnect();
  composerObserver = null;
});

/* ------------------------------------------------------------------
 * 初始化：保证发布范围默认是「公开到社区」
 * ------------------------------------------------------------------ */
onMounted(async () => {
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
  await nextTick();
});






</script>

<template>
  <div class="plaza">

    <!-- ============================================================
         顶部：品牌 + 全站状态栏
         ============================================================ -->
    <header class="plaza-top">
      <div class="plaza-head">
        <div class="plaza-masthead">
          <span class="masthead-mark" aria-hidden="true">🐟</span>
          <div class="masthead-text">
            <h1 class="masthead-title">{{ copy('社区广场', 'COMMUNITY PLAZA') }}</h1>
            <p class="masthead-sub">{{ copy('全站匿名摸鱼实况', 'Live anonymous slacking feed') }}</p>
          </div>
        </div>

        <div class="plaza-filters" role="tablist" :aria-label="copy('信息流过滤', 'Feed filter')">
          <button
            v-for="f in filters"
            :key="f.key"
            type="button"
            class="plaza-filter"
            :class="{ active: communityFilter === f.key }"
            role="tab"
            :aria-selected="communityFilter === f.key"
            @click="setFilter(f.key)"
          >
            <component :is="f.icon" :size="14" />
            <span>{{ f.label }}</span>
          </button>
        </div>
      </div>

      <StatusBar />
    </header>

    <!-- ============================================================
         全宽投稿条：社区核心入口，点任意处唤起投稿弹窗
         ============================================================ -->
    <ComposerBar @compose="composeOpen = true" />

    <!-- ============================================================
         信息流舞台：单栏全宽
         ============================================================ -->
    <div class="plaza-stage">
      <!-- ------- 信息流 ------- -->
      <main class="feed-col">
        <section class="feed">
          <div v-if="communityLoading" class="feed-state loading">
            <span class="pixel-loader" aria-hidden="true"></span>
            {{ copy('加载中…', 'Loading…') }}
          </div>

          <div v-else-if="!communityRecords.length" class="feed-state empty">
            <div class="empty-fish" aria-hidden="true">🐟</div>
            <strong>{{ copy('今天还没有鱼浮出水面。', 'No fish surfaced yet.') }}</strong>
            <span>{{ copy('你的第一条记录就是今天的鱼王。', 'Your first post becomes today\'s Fish King.') }}</span>
          </div>

          <ul v-else class="feed-list">
            <FeedCard
              v-for="record in communityRecords"
              :key="record.id"
              :record="record"
            />
          </ul>
        </section>
      </main>
    </div>

    <!-- ============================================================
         浮动投稿按钮（FAB）：滚动离开投稿条后出现
         ============================================================ -->
    <FloatingFab :show="showFab" @compose="composeOpen = true" />

    <!-- ============================================================
         提交区  —  「迷你录音棚」弹窗
         ============================================================ -->
    <ComposeModal :open="composeOpen" @close="composeOpen = false" />

    <SuccessPopup
      :open="successOpen"
      :payload="successPayload"
      :status-message="statusMessage"
      @close="successOpen = false"
      @view-detail="onViewDetail"
    />
  </div>
</template>

<style scoped>
/* ================================================================
 * 整体容器
 * ================================================================ */
.plaza {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 4px 0 72px;
  font-family: var(--font-readable);
  color: var(--color-text);
}

/* ================================================================
 * 顶部：品牌 + 状态栏
 * ================================================================ */
.plaza-top {
  margin-bottom: 22px;
}

.plaza-masthead {
  display: flex;
  align-items: center;
  gap: 14px;
}

.masthead-mark {
  font-size: 34px;
  line-height: 1;
  filter: drop-shadow(2px 2px 0 var(--color-border));
}

.masthead-title {
  margin: 0;
  font-family: var(--font-pixel);
  font-size: 22px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
  line-height: 1.2;
}

.masthead-sub {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-muted);
}

/* ================================================================
 * 顶部筛选 + 单栏信息流舞台
 * ================================================================ */
.plaza-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.plaza-filters {
  display: inline-flex;
  flex-wrap: wrap;
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 4px 4px 0 var(--color-border);
}

.plaza-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 13px;
  border: 0;
  border-right: 3px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-family: var(--font-pixel);
  font-size: 11px;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}

.plaza-filter:last-child {
  border-right: 0;
}

.plaza-filter:hover {
  background: var(--color-surface-soft);
  color: var(--color-text);
}

.plaza-filter.active {
  background: var(--color-primary);
  color: var(--color-primary-text);
}

.plaza-filter span {
  white-space: nowrap;
}

.plaza-stage {
  display: block;
}

/* ================================================================
 * 浮动投稿按钮（FAB）
 * ================================================================ */

/* ================================================================
 * 信息流  —  卡片式
 * ================================================================ */
.feed-state {
  padding: 56px 20px;
  text-align: center;
  border: 2px dashed var(--color-border-soft);
  background: var(--color-surface);
  color: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.feed-state .empty-fish { font-size: 42px; }
.feed-state.empty strong { color: var(--color-text); font-size: 16px; }
.feed-state.empty span { font-size: 13px; }
.feed-state.loading { font-family: var(--font-pixel); font-size: 12px; }

.pixel-loader {
  width: 24px;
  height: 24px;
  background:
    linear-gradient(var(--color-border) 0 0) 0 0 / 8px 8px no-repeat,
    linear-gradient(var(--color-border) 0 0) 8px 0 / 8px 8px no-repeat,
    linear-gradient(var(--color-border) 0 0) 16px 0 / 8px 8px no-repeat;
  animation: pixel-blink 1s steps(3) infinite;
}

@keyframes pixel-blink {
  0%   { opacity: 0.3; }
  33%  { opacity: 0.6; }
  66%  { opacity: 1;   }
  100% { opacity: 0.3; }
}

.feed-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ================================================================
 * 响应式
 * ================================================================ */
@media (max-width: 640px) {
  .masthead-title { font-size: 18px; }
  .masthead-mark { font-size: 28px; }

  .plaza-filters { width: 100%; }
  .plaza-filter { flex: 1 1 auto; justify-content: center; }

}

</style>
