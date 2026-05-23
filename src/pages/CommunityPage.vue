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
import { useRouter } from 'vue-router';
import { Activity, Check, Crown, Flame, Send, Sparkles, Star, Trophy, Users, Waves, X, Zap } from 'lucide-vue-next';
import { useAppContext } from '../appContext';

const router = useRouter();
const {
  canSubmit,
  communityFilter,
  communityLoading,
  communityRecords,
  copy,
  currentUser,
  errorMessage,
  feedCommentDrafts,
  form,
  handleCommunityScopeChange,
  handleFeedComment,
  handleFeedLike,
  handleFeedNominate,
  handleFeedReport,
  handleSubmit,
  lastResult,
  loading,
  openProfileRecord,
  openTopic,
  options,
  popularTopics,
  statusMessage,
  t,
  translatedCircleName,
  translatedGuildName,
  translatedSystemComment,
  translatedTitle,
  translatedOptionLabel
} = useAppContext();

/* ------------------------------------------------------------------
 * 主输入：把同一个输入同时写入 activityText 和 description
 * ------------------------------------------------------------------ */
const mainText = computed({
  get: () => form.activityText,
  set: (value: string) => {
    form.activityText = value;
    form.description = value;
  }
});

const mainTextarea = ref<HTMLTextAreaElement | null>(null);

const maxMain = computed(() => {
  const a = options.value.maxActivityTextLength ?? 60;
  const d = options.value.maxDescriptionLength ?? 120;
  return Math.min(a, d);
});

const mainRemaining = computed(() => maxMain.value - mainText.value.length);
const mainOver = computed(() => mainRemaining.value < 0);
const submitDisabled = computed(() => !canSubmit.value);

const placeholderMain = computed(() =>
  copy(
    '今天主要在干什么？例如：假装看需求文档，其实在挑晚饭。',
    'What were you mainly up to? e.g., pretending to read specs while picking dinner.'
  )
);

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
 * 全站状态栏：实时指标
 * 全部由已加载的 communityRecords 前端派生，不新增任何接口调用。
 * 后端补上精确的"在线/指数"算法后，只需替换下方 statusMetrics 取数即可。
 * ------------------------------------------------------------------ */
const isToday = (iso: string): boolean => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const todayRecords = computed(() => communityRecords.value.filter((r: any) => isToday(r.createdAt)));

const interactionCount = computed(() =>
  todayRecords.value.reduce(
    (sum: number, r: any) =>
      sum +
      (r.likeCount ?? 0) +
      (r.commentCount ?? 0) +
      (r.voteCount ?? 0) +
      (r.legendNominationCount ?? 0),
    0
  )
);

const averageScore = computed(() => {
  const rows = todayRecords.value;
  if (!rows.length) return 0;
  return rows.reduce((sum: number, r: any) => sum + (r.score ?? 0), 0) / rows.length;
});

/** 摸鱼指数：复用站内既有公式（记录数 + 平均分 + 互动数派生，0–100）。 */
const fishIndex = computed(() => {
  const count = todayRecords.value.length;
  if (!count) return 0;
  const fromCount = Math.min(40, count * 4);
  const fromScore = Math.min(40, averageScore.value / 6);
  const fromInteractions = Math.min(20, interactionCount.value * 0.8);
  return Math.round((fromCount + fromScore + fromInteractions) * 10) / 10;
});

const fishIndexLabel = computed(() => {
  const v = fishIndex.value;
  if (!todayRecords.value.length) return copy('鱼塘风平浪静', 'Pond is calm');
  if (v < 20) return copy('风平浪静', 'Very calm');
  if (v < 40) return copy('有鱼试水', 'Testing the water');
  if (v < 60) return copy('偏活跃', 'Fairly active');
  if (v < 80) return copy('明显躁动', 'Clearly stirring');
  return copy('即将沸腾', 'About to boil');
});

/** 今日活跃鱼：今日上墙记录里的不重复昵称数（真实派生，非实时在线）。 */
const activeFishCount = computed(() => {
  const names = new Set<string>();
  for (const r of todayRecords.value as any[]) {
    if (r.nickname) names.add(String(r.nickname).trim());
  }
  return names.size;
});

const todayRecordCount = computed(() => todayRecords.value.length);

/** 今日鱼王：今日记录中 Fish Power 最高的一条。 */
const fishKing = computed(() => {
  const rows = [...(todayRecords.value as any[])];
  if (!rows.length) return null;
  rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return rows[0] ?? null;
});

const statusMetrics = computed(() => [
  {
    key: 'index',
    icon: Activity,
    tone: 'index',
    label: copy('摸鱼指数', 'Slack Index'),
    value: fishIndex.value.toFixed(1),
    hint: fishIndexLabel.value
  },
  {
    key: 'active',
    icon: Users,
    tone: 'active',
    label: copy('今日活跃鱼', 'Active Fish'),
    value: String(activeFishCount.value),
    hint: copy('今日出没的鱼', 'Fish seen today')
  },
  {
    key: 'records',
    icon: Waves,
    tone: 'records',
    label: copy('今日上墙', 'Posts Today'),
    value: String(todayRecordCount.value),
    hint: copy('今日新记录', 'New records today')
  },
  {
    key: 'interactions',
    icon: Zap,
    tone: 'interactions',
    label: copy('今日互动', 'Interactions'),
    value: String(interactionCount.value),
    hint: copy('赞·评·投·提名', 'Likes · replies · votes')
  }
]);

/* ------------------------------------------------------------------
 * 提交流程 & 成功弹窗
 * ------------------------------------------------------------------ */
const successOpen = ref(false);
const successPayload = ref<typeof lastResult.value | null>(null);
const lastSubmittedRecordId = ref<number | null>(null);
const localStatusMessage = ref('');
const composeOpen = ref(false);

const onSubmit = async () => {
  if (!canSubmit.value) {
    if (!form.anonymized) {
      localStatusMessage.value = copy('请先勾选匿名化确认。', 'Please confirm anonymization first.');
    } else if (mainText.value.trim().length < 2) {
      localStatusMessage.value = copy('再多写一点，至少 2 个字符。', 'Add a bit more — at least 2 characters.');
    }
    return;
  }
  localStatusMessage.value = '';
  await handleSubmit();
};

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

const closeSuccess = () => { successOpen.value = false; };

const viewRecordDetail = async () => {
  if (successPayload.value?.record?.id) {
    await openProfileRecord(successPayload.value.record.id);
    successOpen.value = false;
  }
};

/* ------------------------------------------------------------------
 * 提交弹窗：把录音棚收进弹窗，点顶部「REC 待机条」召唤
 * ------------------------------------------------------------------ */
const openCompose = async () => {
  composeOpen.value = true;
  await nextTick();
  mainTextarea.value?.focus();
};

const closeCompose = () => { composeOpen.value = false; };

const onComposeKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && composeOpen.value) closeCompose();
};

watch(composeOpen, (open) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = open ? 'hidden' : '';
});

onMounted(() => document.addEventListener('keydown', onComposeKeydown));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onComposeKeydown);
  if (typeof document !== 'undefined') document.body.style.overflow = '';
});

/* ------------------------------------------------------------------
 * 浮动投稿按钮（FAB）：投稿条滚出视口后出现，保证任意位置都能发帖
 * ------------------------------------------------------------------ */
const composerRef = ref<HTMLElement | null>(null);
const showFab = ref(false);
let composerObserver: IntersectionObserver | null = null;

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !composerRef.value) return;
  composerObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      showFab.value = entry ? !entry.isIntersecting : false;
    },
    { threshold: 0 }
  );
  composerObserver.observe(composerRef.value);
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

/* ------------------------------------------------------------------
 * 工具
 * ------------------------------------------------------------------ */
const goLogin = () => router.push('/profile');

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return copy('刚刚', 'just now');
    if (diffMin < 60) return copy(`${diffMin} 分钟前`, `${diffMin}m ago`);
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return copy(`${diffH} 小时前`, `${diffH}h ago`);
    const diffD = Math.round(diffH / 24);
    if (diffD < 30) return copy(`${diffD} 天前`, `${diffD}d ago`);
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
};
</script>

<template>
  <div class="plaza">

    <!-- ============================================================
         顶部：品牌 + 全站状态栏
         ============================================================ -->
    <header class="plaza-top">
      <div class="plaza-masthead">
        <span class="masthead-mark" aria-hidden="true">🐟</span>
        <div class="masthead-text">
          <h1 class="masthead-title">{{ copy('社区广场', 'COMMUNITY PLAZA') }}</h1>
          <p class="masthead-sub">{{ copy('全站匿名摸鱼实况', 'Live anonymous slacking feed') }}</p>
        </div>
      </div>

      <div class="statusbar" :aria-label="copy('全站状态', 'Site status')">
        <article
          v-for="metric in statusMetrics"
          :key="metric.key"
          class="status-tile"
          :class="`tone-${metric.tone}`"
        >
          <div class="status-tile-head">
            <component :is="metric.icon" :size="15" />
            <span>{{ metric.label }}</span>
          </div>
          <strong class="status-value">{{ metric.value }}</strong>
          <small class="status-hint">{{ metric.hint }}</small>
        </article>
      </div>
    </header>

    <!-- ============================================================
         全宽投稿条：社区核心入口，点任意处唤起投稿弹窗
         ============================================================ -->
    <button
      ref="composerRef"
      type="button"
      class="composer-bar"
      @click="openCompose"
    >
      <span class="composer-rec" aria-hidden="true">
        <span class="composer-rec-dot"></span>
        <span class="composer-rec-text">REC</span>
      </span>
      <span class="composer-prompt">
        {{ copy('今天这条鱼，怎么摸的？匿名上墙，老板看不到。', 'How did today\'s fish swim? Posted anonymously — no boss in sight.') }}
      </span>
      <span class="composer-cta">
        <Send :size="18" />
        <span>{{ copy('投放上墙', 'Post it') }}</span>
      </span>
    </button>

    <!-- ============================================================
         三栏舞台：左=筛选+鱼王 / 中=信息流 / 右=话题
         ============================================================ -->
    <div class="plaza-stage">

      <!-- ------- 左栏 ------- -->
      <aside class="rail rail-left">
        <section class="rail-block rail-block--filters">
          <h2 class="rail-title">
            <Sparkles :size="14" />
            <span>{{ copy('信息流', 'Feed') }}</span>
          </h2>
          <div class="filter-list" role="tablist" :aria-label="copy('信息流过滤', 'Feed filter')">
            <button
              v-for="f in filters"
              :key="f.key"
              type="button"
              class="filter-item"
              :class="{ active: communityFilter === f.key }"
              role="tab"
              :aria-selected="communityFilter === f.key"
              @click="setFilter(f.key)"
            >
              <component :is="f.icon" :size="16" />
              <span>{{ f.label }}</span>
            </button>
          </div>
        </section>

        <section class="rail-block rail-block--king">
          <h2 class="rail-title">
            <Crown :size="14" />
            <span>{{ copy('今日鱼王', 'Fish King') }}</span>
          </h2>
          <div v-if="fishKing" class="king-card">
            <span class="king-avatar" aria-hidden="true">{{ fishKing.nickname.slice(0, 1) }}</span>
            <strong class="king-name">{{ fishKing.nickname }}</strong>
            <span class="king-rank">{{ translatedTitle(fishKing.title) }}</span>
            <div class="king-score">
              <span class="king-score-num">{{ fishKing.score.toFixed(1) }}</span>
              <span class="king-score-lbl">FISH POWER</span>
            </div>
          </div>
          <div v-else class="king-empty">
            <span class="king-empty-icon" aria-hidden="true">👑</span>
            <strong>{{ copy('鱼王虚位以待', 'Throne is empty') }}</strong>
            <small>{{ copy('投一条记录就可能上位', 'Post a record to claim it') }}</small>
          </div>
        </section>
      </aside>

      <!-- ------- 中栏：信息流 ------- -->
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
            <li
              v-for="record in communityRecords"
              :key="record.id"
              class="feed-card"
            >
              <!-- 卡头：头像 + 名称 + 分数 -->
              <div class="fc-head">
                <span class="fc-avatar" aria-hidden="true">{{ record.nickname.slice(0, 1) }}</span>
                <div class="fc-who">
                  <strong class="fc-name">{{ record.nickname }}</strong>
                  <small class="fc-time">{{ formatTime(record.createdAt) }}</small>
                </div>
                <div class="fc-score" :title="translatedTitle(record.title)">
                  <span class="fc-score-num">{{ record.score.toFixed(1) }}</span>
                  <span class="fc-score-lbl">{{ translatedTitle(record.title) }}</span>
                </div>
              </div>

              <!-- 内容 -->
              <p class="fc-activity">{{ record.activityText }}</p>
              <p v-if="record.storyText || record.description" class="fc-story">
                {{ record.storyText || record.description }}
              </p>

              <div v-if="record.topics?.length" class="fc-topics">
                <button
                  v-for="topic in record.topics"
                  :key="topic.id"
                  type="button"
                  class="topic-mini"
                  @click="openTopic(topic.slug)"
                >#{{ topic.name }}</button>
              </div>
              <div v-if="record.tags?.length || record.guild" class="fc-tags">
                <span v-for="tag in record.tags" :key="tag.id" class="tag-circle">{{ translatedCircleName(tag) }}</span>
                <span v-if="record.guild" class="tag-guild">
                  {{ copy('', '→ ') }}{{ translatedGuildName(record.guild) }}
                  {{ copy(' +', ' +') }}{{ record.guildContribution.toFixed(1) }}
                </span>
              </div>

              <!-- 操作区 -->
              <div class="fc-foot">
                <div class="fc-actions">
                  <button
                    type="button"
                    class="act-btn like"
                    :class="{ active: record.viewer.liked }"
                    @click="handleFeedLike(record.id)"
                  >♥ {{ record.likeCount }}</button>
                  <button
                    type="button"
                    class="act-btn"
                    @click="openProfileRecord(record.id)"
                  >💬 {{ record.commentCount }}</button>
                  <button
                    type="button"
                    class="act-btn legend"
                    :class="{ active: record.viewer.legendNominated }"
                    :title="copy('发起传奇提名将消耗 10 鱼鳞。', 'Legend nomination costs 10 Fish Scale.')"
                    @click="handleFeedNominate(record.id)"
                  >★ {{ record.legendNominationCount }}</button>
                  <button
                    type="button"
                    class="act-btn report"
                    :class="{ active: record.viewer.reported }"
                    @click="handleFeedReport(record.id)"
                  >⚑ {{ record.reportCount }}</button>
                </div>
                <div class="fc-comment">
                  <input
                    v-model="feedCommentDrafts[record.id]"
                    type="text"
                    :placeholder="copy('留个鱼脚印…', 'Leave a fish print…')"
                    maxlength="120"
                  />
                  <button type="button" class="comment-send" @click="handleFeedComment(record.id)">
                    {{ t('addComment') }}
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </section>
      </main>

      <!-- ------- 右栏：话题 ------- -->
      <aside class="rail rail-right">
        <section class="rail-block rail-block--topics">
          <h2 class="rail-title">
            <Flame :size="14" />
            <span>{{ copy('热门话题', 'Hot Topics') }}</span>
          </h2>
          <div v-if="popularTopics.length" class="topic-list">
            <button
              v-for="topic in popularTopics.slice(0, 12)"
              :key="topic.id"
              type="button"
              class="topic-item"
              @click="openTopic(topic.slug)"
            >
              <span class="topic-hash" aria-hidden="true">#</span>
              <span class="topic-name">{{ topic.name }}</span>
              <span class="topic-count">{{ topic.usage_count }}</span>
            </button>
          </div>
          <div v-else class="rail-empty">
            {{ copy('还没有热门话题', 'No hot topics yet') }}
          </div>
        </section>
      </aside>
    </div>

    <!-- ============================================================
         浮动投稿按钮（FAB）：滚动离开投稿条后出现
         ============================================================ -->
    <transition name="fab-pop">
      <button
        v-show="showFab"
        type="button"
        class="compose-fab"
        :aria-label="copy('投放摸鱼记录', 'Post a slacking record')"
        @click="openCompose"
      >
        <span class="fab-dot" aria-hidden="true"></span>
        <Send :size="20" />
        <span class="fab-label" aria-hidden="true">REC</span>
      </button>
    </transition>

    <!-- ============================================================
         提交区  —  「迷你录音棚」弹窗
         ============================================================ -->
    <transition name="mb-fade">
      <div
        v-if="composeOpen"
        class="mb-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="copy('摸鱼速记口', 'Slack quick-log booth')"
        @click.self="closeCompose"
      >
        <section class="mini-booth">
      <!-- REC 头 -->
      <header class="mb-header">
        <div class="mb-rec">
          <span class="mb-rec-dot" aria-hidden="true"></span>
          <span class="mb-rec-label">REC</span>
          <span class="mb-rec-sub">{{ copy('广场速记口 · 正在收音', 'Plaza quick-log · recording') }}</span>
        </div>
        <button
          type="button"
          class="mb-close"
          :aria-label="copy('关闭', 'Close')"
          @click="closeCompose"
        >
          <X :size="16" />
        </button>
      </header>

      <div class="mb-body">
        <!-- 步骤 01：写这条鱼 -->
        <article class="mb-step">
          <div class="mb-num mb-num-1" aria-hidden="true"><span>01</span></div>
          <div class="mb-step-main">
            <h3 class="mb-step-title">{{ copy('今天这条鱼，怎么摸的？', 'How did today’s fish swim?') }}</h3>
            <p class="mb-step-hint">{{ copy('一句话讲清楚，匿名上墙，老板看不到。', 'One line, posted anonymously. No boss in sight.') }}</p>
            <div class="mb-paper">
              <textarea
                ref="mainTextarea"
                v-model="mainText"
                class="mb-paper-input"
                :placeholder="placeholderMain"
                :maxlength="maxMain + 20"
                rows="2"
                aria-label="main-input"
              ></textarea>
              <span
                class="mb-counter"
                :class="{ over: mainOver, low: !mainOver && mainRemaining <= 10 }"
              >{{ mainText.length }}<i>/</i>{{ maxMain }}</span>
            </div>
          </div>
        </article>

        <!-- 步骤 02：摸了多久 -->
        <article class="mb-step">
          <div class="mb-num mb-num-2" aria-hidden="true"><span>02</span></div>
          <div class="mb-step-main">
            <h3 class="mb-step-title">{{ copy('这条鱼摸了多久？', 'How long was the drift?') }}</h3>
            <p class="mb-step-hint">{{ copy('档位越高，鱼力越猛。', 'Higher tier, fiercer Fish Power.') }}</p>
            <div class="mb-dur-grid">
              <button
                v-for="item in options.durations"
                :key="item.key"
                type="button"
                class="mb-dur-chip"
                :class="{ active: form.duration === item.key }"
                @click="form.duration = item.key"
              >
                <span class="mb-dur-label">{{ translatedOptionLabel(item.key, item.label) }}</span>
                <span class="mb-dur-score">{{ item.score ?? item.baseScore }} {{ copy('分', 'pts') }}</span>
              </button>
            </div>
          </div>
        </article>

        <!-- 步骤 03：投给谁看 -->
        <article class="mb-step">
          <div class="mb-num mb-num-3" aria-hidden="true"><span>03</span></div>
          <div class="mb-step-main">
            <h3 class="mb-step-title">{{ copy('这条鱼放进哪片水域？', 'Which waters does it go to?') }}</h3>
            <p class="mb-step-hint">{{ copy('默认进社区广场，所有摸鱼人都能围观。', 'Defaults to the public plaza for every fish to see.') }}</p>
            <div class="mb-switch-row">
              <label
                class="mb-switch"
                :class="{ on: form.publishToCommunity && !form.privateOnly, disabled: form.privateOnly }"
              >
                <input
                  v-model="form.publishToCommunity"
                  type="checkbox"
                  :disabled="form.privateOnly"
                  @change="handleCommunityScopeChange"
                />
                <span class="mb-track" aria-hidden="true"><span class="mb-thumb"></span></span>
                <span class="mb-switch-text">
                  <strong>{{ copy('进社区广场', 'Community plaza') }}</strong>
                  <small>{{ copy('公共水域，所有人可见', 'Public waters, visible to all') }}</small>
                </span>
              </label>
              <label
                class="mb-switch"
                :class="{ on: form.autoCircles && !form.privateOnly, disabled: form.privateOnly }"
              >
                <input v-model="form.autoCircles" type="checkbox" :disabled="form.privateOnly" />
                <span class="mb-track" aria-hidden="true"><span class="mb-thumb"></span></span>
                <span class="mb-switch-text">
                  <strong>{{ copy('自动进圈子', 'Auto-join circles') }}</strong>
                  <small>{{ copy('按话题归类到兴趣圈', 'Sorted into topic circles') }}</small>
                </span>
              </label>
            </div>
          </div>
        </article>

        <!-- 安全 + 匿名誓言 -->
        <div class="mb-safety">
          <p class="mb-safety-banner">
            <span class="mb-safety-mark" aria-hidden="true">!</span>
            <span>{{ copy('别写真实公司、客户、聊天记录、证件和未匿名截图——这里只摸鱼，不泄密。', 'No real company, client, chat logs, IDs, or un-anonymized screenshots — drift only, no leaks.') }}</span>
          </p>
          <label class="mb-oath" :class="{ ok: form.anonymized }">
            <input v-model="form.anonymized" type="checkbox" />
            <span class="mb-oath-box" aria-hidden="true"><Check :size="13" /></span>
            <span>{{ copy('我确认这条记录已匿名，可以公开上墙。', 'I confirm this record is anonymized and safe to post.') }}</span>
          </label>
        </div>

        <!-- 反馈 + 提交 -->
        <div class="mb-foot">
          <p v-if="localStatusMessage" class="mb-feedback warn">
            <span class="mb-feedback-mark" aria-hidden="true">!</span>
            <span>{{ localStatusMessage }}</span>
          </p>
          <p v-else-if="errorMessage" class="mb-feedback danger">
            <span class="mb-feedback-mark" aria-hidden="true">!</span>
            <span>{{ errorMessage }}</span>
          </p>

          <button
            type="button"
            class="mb-submit"
            :class="{ disabled: submitDisabled }"
            :disabled="submitDisabled"
            @click="onSubmit"
          >
            <span class="mb-submit-icon" aria-hidden="true">
              <span v-if="loading" class="mb-submit-spin"></span>
              <Send v-else :size="20" />
            </span>
            <span class="mb-submit-text">
              <strong>{{ loading ? copy('投放中…', 'Sending…') : copy('投放上榜', 'Send it to the board') }}</strong>
              <small>{{ copy('FISH POWER 由后端结算', 'Fish Power scored server-side') }}</small>
            </span>
            <span class="mb-submit-arrow" aria-hidden="true"></span>
          </button>

          <p v-if="!currentUser" class="mb-login-tip">
            {{ copy('未登录也能匿名上墙；', 'You can post anonymously without an account — ') }}
            <button type="button" class="mb-link" @click="goLogin">
              {{ copy('登录后解锁徽章和鱼鳞', 'sign in to unlock badges & Fish Scale') }}
            </button>
          </p>
        </div>
      </div>
        </section>
      </div>
    </transition>

    <!-- ============================================================
         成功弹窗
         ============================================================ -->
    <transition name="popup-fade">
      <div
        v-if="successOpen && successPayload"
        class="popup-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-title"
        @click.self="closeSuccess"
      >
        <div class="popup-window">
          <button type="button" class="popup-close" aria-label="close" @click="closeSuccess">
            <X :size="14" />
          </button>

          <div class="popup-tape"><span>★ {{ copy('记录成功', 'RECORD OK') }} ★</span></div>

          <div class="popup-score-block">
            <span class="popup-score">{{ successPayload.record.score.toFixed(1) }}</span>
            <span class="popup-score-label">Fish Power</span>
          </div>

          <h3 id="popup-title" class="popup-title">
            {{ translatedTitle(successPayload.record.title) }}
          </h3>

          <p class="popup-comment">
            {{ translatedSystemComment(successPayload.record.systemComment) }}
          </p>

          <ul class="popup-meta">
            <li v-if="successPayload.todayRank">
              <span>{{ copy('今日排名', 'Today') }}</span>
              <strong>#{{ successPayload.todayRank }}</strong>
            </li>
            <li>
              <span>{{ copy('累计', 'Total') }}</span>
              <strong>{{ successPayload.cumulativeScore.toFixed(1) }}</strong>
            </li>
            <li v-if="successPayload.fishScaleReward">
              <span>{{ copy('鱼鳞', 'Scale') }}</span>
              <strong>+{{ successPayload.fishScaleReward.awardedAmount }}</strong>
            </li>
            <li v-if="successPayload.record.status === 'pending'">
              <span>{{ copy('状态', 'Status') }}</span>
              <strong>{{ copy('审核中', 'Pending') }}</strong>
            </li>
          </ul>

          <p v-if="statusMessage" class="popup-status">{{ statusMessage }}</p>

          <div class="popup-actions">
            <button type="button" class="popup-btn ghost" @click="closeSuccess">
              {{ copy('继续摸鱼', 'Keep going') }}
            </button>
            <button type="button" class="popup-btn primary" @click="viewRecordDetail">
              {{ copy('查看详情', 'View detail') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
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
  margin-bottom: 16px;
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

/* ---- 状态栏：4 指标 ---- */
.statusbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.status-tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 15px 16px;
  border: 3px solid var(--color-border);
  box-shadow: 5px 5px 0 var(--color-border);
  color: var(--color-text);
  min-width: 0;
}

.status-tile.tone-index {
  background: var(--color-ink-strong-bg);
  color: var(--color-ink-strong-text);
}
.status-tile.tone-active   { background: var(--color-primary); }
.status-tile.tone-records  { background: var(--color-accent); }
.status-tile.tone-interactions { background: var(--color-warning); }

.status-tile-head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-pixel);
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.status-tile-head span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-value {
  font-family: var(--font-pixel);
  font-size: 34px;
  line-height: 1.05;
  letter-spacing: 0.02em;
}

.status-hint {
  font-size: 11px;
  font-weight: 800;
  opacity: 0.82;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ================================================================
 * 三栏舞台
 * ================================================================ */
.plaza-stage {
  display: grid;
  grid-template-columns: 212px minmax(0, 1fr) 252px;
  gap: 20px;
  align-items: start;
}

/* ---- 侧栏通用 ---- */
.rail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 16px;
}

.rail-block {
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 4px 4px 0 var(--color-border);
}

.rail-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  padding: 11px 14px;
  background: var(--color-ink-strong-bg);
  color: var(--color-ink-strong-text);
  font-family: var(--font-pixel);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.rail-empty {
  padding: 22px 14px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
}

/* ---- 左栏：筛选 ---- */
.filter-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 12px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-family: var(--font-pixel);
  font-size: 12px;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 3px 3px 0 transparent;
  transition: transform 0.08s steps(2, end), box-shadow 0.08s steps(2, end),
    background 0.1s, color 0.1s;
}

.filter-item:hover {
  background: var(--color-surface-soft);
  color: var(--color-text);
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-border);
}

.filter-item.active {
  background: var(--color-primary);
  color: var(--color-primary-text);
  box-shadow: 3px 3px 0 var(--color-border);
}

.filter-item span {
  white-space: nowrap;
}

/* ---- 左栏：今日鱼王 ---- */
.king-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 14px;
  text-align: center;
}

.king-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
  box-shadow: 3px 3px 0 var(--color-border);
  font-family: var(--font-pixel);
  font-size: 20px;
  margin-bottom: 4px;
}

.king-name {
  font-size: 14px;
  font-weight: 900;
  color: var(--color-text);
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.king-rank {
  font-family: var(--font-pixel);
  font-size: 9px;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.king-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: 6px;
  padding-top: 10px;
  width: 100%;
  border-top: 2px dashed var(--color-border-soft);
}

.king-score-num {
  font-family: var(--font-pixel);
  font-size: 28px;
  color: var(--color-text);
  line-height: 1;
}

.king-score-lbl {
  font-family: var(--font-pixel);
  font-size: 8px;
  letter-spacing: 0.14em;
  color: var(--color-text-muted);
}

.king-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 14px;
  text-align: center;
}

.king-empty-icon {
  font-size: 26px;
  opacity: 0.55;
}

.king-empty strong {
  font-size: 13px;
  font-weight: 900;
  color: var(--color-text);
}

.king-empty small {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* ---- 右栏：话题 ---- */
.topic-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px;
}

.topic-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 11px;
  border: 2px solid var(--color-border-soft);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  box-shadow: 3px 3px 0 transparent;
  transition: transform 0.08s steps(2, end), box-shadow 0.08s steps(2, end),
    background 0.1s, border-color 0.1s, color 0.1s;
}

.topic-item:hover {
  background: var(--color-primary);
  border-color: var(--color-border);
  color: var(--color-primary-text);
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-border);
}

.topic-hash {
  font-family: var(--font-pixel);
  font-size: 13px;
  color: var(--color-text-muted);
}

.topic-item:hover .topic-hash,
.topic-item:hover .topic-count {
  color: inherit;
}

.topic-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topic-count {
  font-family: var(--font-pixel);
  font-size: 10px;
  color: var(--color-text-muted);
}

/* ================================================================
 * 全宽投稿条  —  社区核心入口
 * ================================================================ */
.composer-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  margin-bottom: 22px;
  padding: 14px 16px;
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 6px 6px 0 var(--color-border);
  cursor: pointer;
  text-align: left;
  transition: transform 0.1s steps(2, end), box-shadow 0.1s steps(2, end);
}

.composer-bar:hover {
  transform: translate(-3px, -3px);
  box-shadow: 9px 9px 0 var(--color-border);
}

.composer-bar:active {
  transform: translate(1px, 1px);
  box-shadow: 3px 3px 0 var(--color-border);
}

/* REC 身份徽 */
.composer-rec {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 10px 13px;
  border: 2px solid var(--color-border);
  background: var(--color-ink-strong-bg);
  color: var(--color-ink-strong-text);
  font-family: var(--font-pixel);
  font-size: 14px;
  letter-spacing: 0.1em;
}

.composer-rec-dot {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
  border: 2px solid currentColor;
  background: #ff5252;
  box-shadow: inset 0 0 0 2px #b81d1d;
  animation: composer-blink 1.1s steps(2, end) infinite;
}

@keyframes composer-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.25; }
}

/* 仿输入框提示 */
.composer-prompt {
  flex: 1;
  min-width: 0;
  padding: 13px 14px;
  border: 2px dashed var(--color-border-soft);
  background: var(--color-surface-soft);
  color: var(--color-text-muted);
  font-family: var(--font-readable);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: border-color 0.1s, color 0.1s;
}

.composer-bar:hover .composer-prompt {
  border-color: var(--color-border);
  color: var(--color-text);
}

/* 亮色 CTA */
.composer-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 13px 18px;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
  box-shadow: 3px 3px 0 var(--color-border);
  font-family: var(--font-pixel);
  font-size: 13px;
  letter-spacing: 0.04em;
  transition: transform 0.1s steps(2, end), box-shadow 0.1s steps(2, end);
}

.composer-bar:hover .composer-cta {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--color-border);
}

/* ================================================================
 * 浮动投稿按钮（FAB）
 * ================================================================ */
.compose-fab {
  position: fixed;
  right: 26px;
  bottom: 26px;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 64px;
  height: 64px;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
  box-shadow: 4px 4px 0 var(--color-border);
  cursor: pointer;
  transition: transform 0.1s steps(2, end), box-shadow 0.1s steps(2, end);
}

.compose-fab:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--color-border);
}

.compose-fab:active {
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0 var(--color-border);
}

.fab-label {
  font-family: var(--font-pixel);
  font-size: 9px;
  letter-spacing: 0.08em;
}

.fab-dot {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  background: #ff5252;
  box-shadow: inset 0 0 0 2px #b81d1d;
  animation: composer-blink 1.1s steps(2, end) infinite;
}

/* FAB 进出动画 */
.fab-pop-enter-active,
.fab-pop-leave-active {
  transition: transform 0.16s cubic-bezier(0.34, 1.5, 0.64, 1), opacity 0.16s ease;
}

.fab-pop-enter-from,
.fab-pop-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.8);
}

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

.feed-card {
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 4px 4px 0 var(--color-border);
  padding: 16px 18px;
  transition: transform 0.08s steps(2, end), box-shadow 0.08s steps(2, end);
}

.feed-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--color-border);
}

.fc-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fc-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
  font-family: var(--font-pixel);
  font-size: 17px;
}

.fc-who {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.fc-name {
  font-size: 15px;
  font-weight: 900;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fc-time {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 0.02em;
}

.fc-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  max-width: 132px;
}

.fc-score-num {
  font-family: var(--font-pixel);
  font-size: 26px;
  color: var(--color-text);
  line-height: 1;
}

.fc-score-lbl {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  margin-top: 3px;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.fc-activity {
  margin: 12px 0 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.55;
  word-break: break-word;
}

.fc-story {
  margin: 7px 0 0;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.65;
  word-break: break-word;
}

.fc-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
}

.topic-mini {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border: 1.5px solid var(--color-border-soft);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.08s;
}

.topic-mini:hover {
  background: var(--color-primary);
  border-color: var(--color-border);
  color: var(--color-primary-text);
}

.fc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
  font-size: 11px;
}

.tag-circle {
  padding: 3px 8px;
  background: var(--color-accent);
  border: 1.5px solid var(--color-border);
  color: var(--color-text);
  font-weight: 700;
}

.tag-guild {
  padding: 3px 8px;
  background: var(--color-warning);
  border: 1.5px solid var(--color-border);
  color: var(--color-text);
  font-weight: 700;
}

.fc-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 13px;
  border-top: 2px dashed var(--color-border-soft);
}

.fc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.act-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  height: 30px;
  border: 2px solid var(--color-border-soft);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 12px;
  font-family: var(--font-pixel);
  cursor: pointer;
  transition: all 0.08s;
}

.act-btn:hover {
  border-color: var(--color-border);
  color: var(--color-text);
  background: var(--color-surface-soft);
}

.act-btn.active.like   { background: var(--color-danger);  border-color: var(--color-border); color: var(--color-danger-text); }
.act-btn.active.legend { background: var(--color-primary); border-color: var(--color-border); color: var(--color-primary-text); }
.act-btn.active.report { background: var(--color-warning); border-color: var(--color-border); color: var(--color-text); }

.fc-comment {
  display: flex;
  gap: 6px;
  flex: 1;
  min-width: 200px;
}

.fc-comment input {
  flex: 1;
  min-width: 0;
  height: 32px;
  border: 2px solid var(--color-border-soft);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 13px;
  padding: 0 10px;
  outline: none;
  transition: border-color 0.08s;
}

.fc-comment input:focus {
  border-color: var(--color-primary);
}

.comment-send {
  height: 32px;
  padding: 0 12px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-soft);
  color: var(--color-text);
  font-family: var(--font-pixel);
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.08s, color 0.08s;
}

.comment-send:hover {
  background: var(--color-primary);
  color: var(--color-primary-text);
}

/* ================================================================
 * 迷你录音棚弹窗  —  遮罩 + 关闭 + 进出动画
 * ================================================================ */
.mb-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(16px, 5vh, 56px) 16px 44px;
  background: rgba(20, 26, 34, 0.62);
  overflow-y: auto;
}

.mb-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 2px solid var(--color-ink-strong-text);
  background: transparent;
  color: var(--color-ink-strong-text);
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}

.mb-close:hover {
  background: var(--color-ink-strong-text);
  color: var(--color-ink-strong-bg);
}

.mb-fade-enter-active,
.mb-fade-leave-active {
  transition: opacity 0.16s ease;
}

.mb-fade-enter-active .mini-booth,
.mb-fade-leave-active .mini-booth {
  transition: transform 0.18s cubic-bezier(0.34, 1.42, 0.64, 1);
}

.mb-fade-enter-from,
.mb-fade-leave-to {
  opacity: 0;
}

.mb-fade-enter-from .mini-booth,
.mb-fade-leave-to .mini-booth {
  transform: translateY(-18px) scale(0.97);
}

/* ================================================================
 * 迷你录音棚  —  提交页「摸鱼记录机」的浓缩版
 * ================================================================ */
.mini-booth {
  position: relative;
  width: min(560px, 100%);
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 6px 6px 0 var(--color-border);
}

.mini-booth::before {
  content: '';
  position: absolute;
  inset: 6px;
  border: 2px dashed var(--color-border-soft, #d1d8e0);
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
}

.mb-header {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 3px solid var(--color-border);
  background: var(--color-ink-strong-bg);
  color: var(--color-ink-strong-text);
}

.mb-rec {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.mb-rec-dot {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
  border: 2px solid var(--color-ink-strong-text);
  background: #ff5252;
  box-shadow: inset 0 0 0 2px #b81d1d;
  animation: mb-rec-blink 1.1s steps(2, end) infinite;
}

@keyframes mb-rec-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.2; }
}

.mb-rec-label {
  font-family: var(--font-pixel);
  font-size: 14px;
  letter-spacing: 0.1em;
}

.mb-rec-sub {
  font-family: var(--font-readable);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  opacity: 0.72;
}

.mb-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.mb-step {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.mb-num {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-text);
  box-shadow: 3px 3px 0 var(--color-border);
  font-family: var(--font-pixel);
  font-size: 13px;
}

.mb-num-2 { background: var(--color-accent); }
.mb-num-3 { background: var(--color-surface); }

.mb-step-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.mb-step-title {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
  color: var(--color-text);
  line-height: 1.3;
}

.mb-step-hint {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.mb-paper {
  position: relative;
  margin-top: 2px;
  border: 2px solid var(--color-border);
  box-shadow: 3px 3px 0 var(--color-border);
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 27px,
      var(--color-border-soft, #d1d8e0) 27px,
      var(--color-border-soft, #d1d8e0) 28px
    ),
    var(--color-surface);
  transition: box-shadow 0.1s;
}

.mb-paper:focus-within {
  box-shadow: 3px 3px 0 var(--color-border), inset 0 0 0 2px var(--color-primary);
}

.mb-paper-input {
  width: 100%;
  min-height: 84px;
  margin: 0;
  padding: 8px 12px 26px;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-readable);
  font-size: 14px;
  line-height: 28px;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.mb-paper-input::placeholder {
  color: var(--color-text-muted);
  opacity: 0.65;
}

.mb-counter {
  position: absolute;
  right: 6px;
  bottom: 5px;
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  font-family: var(--font-pixel);
  font-size: 10px;
  color: var(--color-text);
  pointer-events: none;
}

.mb-counter i {
  margin: 0 1px;
  font-style: normal;
  color: var(--color-text-muted);
}

.mb-counter.low {
  background: var(--color-warning, #fff7cc);
}

.mb-counter.over {
  background: var(--color-danger);
  color: var(--color-danger-text);
  border-color: var(--color-danger-text);
}

.mb-counter.over i {
  color: var(--color-danger-text);
}

.mb-dur-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

.mb-dur-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 12px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 3px 3px 0 var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: transform 0.08s steps(2, end), box-shadow 0.08s steps(2, end);
}

.mb-dur-chip:hover {
  transform: translate(-1px, -1px);
  background: var(--color-accent);
  box-shadow: 4px 4px 0 var(--color-border);
}

.mb-dur-chip.active {
  background: var(--color-primary);
  color: var(--color-primary-text);
  box-shadow: 3px 3px 0 var(--color-border), inset 0 0 0 2px var(--color-border);
}

.mb-dur-label {
  font-size: 12px;
  font-weight: 900;
}

.mb-dur-score {
  font-family: var(--font-pixel);
  font-size: 9px;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.mb-dur-chip.active .mb-dur-score {
  color: var(--color-primary-text);
  opacity: 0.82;
}

.mb-switch-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 2px;
}

.mb-switch {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 3px 3px 0 var(--color-border);
  cursor: pointer;
  transition: transform 0.08s steps(2, end);
}

.mb-switch:hover:not(.disabled) {
  transform: translate(-1px, -1px);
}

.mb-switch input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.mb-switch.on {
  background: var(--color-accent);
}

.mb-switch.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.mb-track {
  position: relative;
  flex-shrink: 0;
  width: 38px;
  height: 20px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
}

.mb-thumb {
  position: absolute;
  top: -2px;
  left: -2px;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  background: var(--color-text-muted);
  transition: transform 0.12s steps(3, end);
}

.mb-switch.on .mb-track {
  background: var(--color-ink-strong-bg);
}

.mb-switch.on .mb-thumb {
  transform: translateX(20px);
  background: var(--color-primary);
}

.mb-switch-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.mb-switch-text strong {
  font-size: 12px;
  font-weight: 900;
  color: var(--color-text);
}

.mb-switch-text small {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
}

.mb-safety {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px;
  border: 2px solid var(--color-border);
  background: var(--color-warning, #fff7cc);
  box-shadow: 3px 3px 0 var(--color-border);
}

.mb-safety-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.5;
  color: var(--color-text);
}

.mb-safety-mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  background: var(--color-border);
  color: var(--color-warning, #fff7cc);
  font-family: var(--font-pixel);
  font-size: 10px;
}

.mb-oath {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  color: var(--color-text);
  line-height: 1.45;
}

.mb-oath input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.mb-oath-box {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-primary-text);
}

.mb-oath-box :deep(svg) {
  opacity: 0;
}

.mb-oath.ok .mb-oath-box {
  background: var(--color-primary);
}

.mb-oath.ok .mb-oath-box :deep(svg) {
  opacity: 1;
}

.mb-foot {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mb-feedback {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.45;
  color: var(--color-danger-text);
}

.mb-feedback-mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 1px;
  background: var(--color-danger-text);
  color: var(--color-surface);
  font-family: var(--font-pixel);
  font-size: 10px;
}

.mb-submit {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 26px;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  border: 3px solid var(--color-border);
  background: var(--color-ink-strong-bg);
  color: var(--color-ink-strong-text);
  box-shadow: 5px 5px 0 var(--color-border);
  cursor: pointer;
  text-align: left;
  transition: transform 0.08s steps(2, end), box-shadow 0.08s steps(2, end), background 0.1s, color 0.1s;
}

.mb-submit:hover:not(:disabled) {
  transform: translate(-2px, -2px);
  box-shadow: 7px 7px 0 var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
}

.mb-submit:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--color-border);
}

.mb-submit:disabled,
.mb-submit.disabled {
  cursor: not-allowed;
  opacity: 0.5;
  filter: grayscale(0.4);
}

.mb-submit-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 2px solid currentColor;
}

.mb-submit-spin {
  width: 16px;
  height: 16px;
  border: 3px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: mb-spin 0.7s linear infinite;
}

@keyframes mb-spin {
  to { transform: rotate(360deg); }
}

.mb-submit-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.mb-submit-text strong {
  font-family: var(--font-readable);
  font-size: 15px;
  font-weight: 950;
  letter-spacing: 0.02em;
  line-height: 1.1;
}

.mb-submit-text small {
  font-family: var(--font-pixel);
  font-size: 9px;
  letter-spacing: 0.06em;
  opacity: 0.72;
}

.mb-submit-arrow {
  position: relative;
  justify-self: end;
  width: 26px;
  height: 26px;
  border: 2px solid currentColor;
}

.mb-submit-arrow::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  transform: translate(-50%, -50%);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid currentColor;
}

.mb-login-tip {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-align: center;
  line-height: 1.5;
}

.mb-link {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--color-text);
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
  cursor: pointer;
}

.mb-link:hover {
  color: var(--color-focus, #0c8f7b);
}

/* ================================================================
 * 成功弹窗
 * ================================================================ */
.popup-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(20, 26, 34, 0.5);
  backdrop-filter: blur(3px);
}

.popup-window {
  position: relative;
  width: min(400px, 100%);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  box-shadow: 6px 6px 0 var(--color-border);
  display: flex;
  flex-direction: column;
  font-family: var(--font-readable);
  overflow: hidden;
}

.popup-tape {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  background: var(--color-primary);
  border-bottom: 2px solid var(--color-border);
  font-family: var(--font-pixel);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-primary-text);
}

.popup-close {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-primary-text);
  opacity: 0.7;
  transition: opacity 0.08s;
}

.popup-close:hover { opacity: 1; }

.popup-score-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 20px 20px 14px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}

.popup-score {
  font-family: var(--font-pixel);
  font-size: 40px;
  color: var(--color-text);
  letter-spacing: 0.04em;
  line-height: 1;
}

.popup-score-label {
  font-size: 11px;
  font-family: var(--font-pixel);
  color: var(--color-text-muted);
  letter-spacing: 0.12em;
}

.popup-title {
  margin: 0;
  padding: 12px 20px 0;
  font-family: var(--font-pixel);
  font-size: 13px;
  letter-spacing: 0.05em;
  color: var(--color-text);
  text-align: center;
}

.popup-comment {
  margin: 0;
  padding: 6px 20px 0;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.6;
  text-align: center;
}

.popup-meta {
  list-style: none;
  padding: 12px 20px;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 6px;
}

.popup-meta li {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  background: var(--color-surface-soft, #f8f8f8);
  border: 1px solid var(--color-border-soft, #e0e0e0);
  font-size: 10px;
  color: var(--color-text-muted);
  gap: 2px;
}

.popup-meta strong {
  font-family: var(--font-pixel);
  font-size: 13px;
  color: var(--color-text);
}

.popup-status {
  margin: 0;
  padding: 0 20px 8px;
  font-size: 11px;
  color: var(--color-success-text, #047857);
  text-align: center;
}

.popup-actions {
  display: flex;
  gap: 0;
  border-top: 2px solid var(--color-border);
}

.popup-btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  font-family: var(--font-pixel);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.08s;
  letter-spacing: 0.04em;
}

.popup-btn + .popup-btn {
  border-left: 2px solid var(--color-border);
}

.popup-btn.primary {
  background: var(--color-primary);
  color: var(--color-primary-text);
}

.popup-btn.primary:hover { filter: brightness(1.06); }

.popup-btn.ghost {
  background: var(--color-surface);
  color: var(--color-text-muted);
}

.popup-btn.ghost:hover {
  background: var(--color-surface-soft, #f5f5f5);
  color: var(--color-text);
}

.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.16s ease;
}
.popup-fade-enter-active .popup-window,
.popup-fade-leave-active .popup-window {
  transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
}
.popup-fade-enter-from .popup-window,
.popup-fade-leave-to .popup-window {
  transform: translateY(12px) scale(0.97);
}

/* ================================================================
 * 响应式
 * ================================================================ */
@media (max-width: 1080px) {
  .plaza-stage {
    grid-template-columns: 190px minmax(0, 1fr) 216px;
    gap: 16px;
  }
}

@media (max-width: 960px) {
  .plaza-stage {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .rail {
    display: contents;
  }

  .rail-block {
    position: static;
  }

  .rail-block--filters { order: 1; }
  .feed-col            { order: 2; }
  .rail-block--topics  { order: 3; }
  .rail-block--king    { order: 4; }

  .filter-list {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .filter-item {
    flex: 1 1 120px;
    justify-content: center;
  }

  .topic-list {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .topic-item {
    flex: 0 0 auto;
  }

  .topic-name {
    flex: 0 1 auto;
  }
}

@media (max-width: 640px) {
  .statusbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .status-value { font-size: 28px; }

  .masthead-title { font-size: 18px; }
  .masthead-mark { font-size: 28px; }

  .feed-card { padding: 14px; }

  .fc-activity { font-size: 15px; }

  .fc-foot { flex-direction: column; align-items: stretch; }

  .fc-comment { min-width: 0; }

  /* 投稿条窄屏堆叠：提示行占满，REC 徽与 CTA 同排 */
  .composer-bar { flex-wrap: wrap; gap: 10px; }
  .composer-prompt { order: -1; flex-basis: 100%; white-space: normal; }
  .composer-cta { margin-left: auto; }
}

@media (max-width: 420px) {
  .mb-step { grid-template-columns: 32px minmax(0, 1fr); gap: 10px; }
  .mb-num { width: 32px; height: 32px; font-size: 11px; }
  .mb-body { padding: 13px; }
  .mb-switch-row { grid-template-columns: 1fr; }

  .filter-item { flex-basis: calc(50% - 4px); }

  .compose-fab { right: 16px; bottom: 16px; width: 56px; height: 56px; }
}
</style>
