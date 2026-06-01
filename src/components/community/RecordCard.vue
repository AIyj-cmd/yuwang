<script setup lang="ts">
/**
 * Community V2 · RecordCard
 *
 * 新结构(对齐 STYLE_GUIDE §3.2 / drafts/community-neopixel-v3.html):
 *   [头像] 昵称           [TitleBadge 称号 + 0-10 fishPowerScore]
 *          时间 · #主标签
 *   标题(1 行 clamp)
 *   正文(3 行 clamp)
 *   ───────────────────────────
 *   ♥ 12   💬 3   👑   ⋯
 *
 * 方案 B:正文/头像/昵称/标题点击进入详情页;💬 跳转详情页评论区。
 * 卡片内不再内联展开评论;点赞 / 传奇提名 / 举报仍为卡片快捷操作。
 *
 * 数据全部来自 props.record(FeedRecord,已脱敏的社区 feed)。
 * 互动通过 useAppContext 现有 handler 调用真实接口。
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { FeedRecord } from '../../types';
import { useAppContext } from '../../appContext';
import { isDuplicateDisplayText } from '../../utils/displayText';
import UserAvatar from '../UserAvatar.vue';
import TitleBadge from './TitleBadge.vue';
import ActionButton from './ActionButton.vue';

const props = defineProps<{
  record: FeedRecord;
}>();

const router = useRouter();

const {
  copy,
  t,
  authToken,
  handleFeedLike,
  handleFeedNominate,
  handleFeedReport,
  translatedTitle
} = useAppContext();

/* ------------------------------------------------------------------
 * 进入详情页(方案 B):正文/头像/昵称/标题点击 → 详情;
 * 评论按钮 → 详情并锚定评论区(#comments)。卡片内不再内联展开评论。
 * ------------------------------------------------------------------ */
const goDetail = () => {
  router.push({ name: 'record-share', params: { id: props.record.id } });
};
const goComments = () => {
  router.push({ name: 'record-share', params: { id: props.record.id }, hash: '#comments' });
};

/* ------------------------------------------------------------------
 * 派生展示数据
 * ------------------------------------------------------------------ */
const isLoggedIn = computed(() => Boolean(authToken.value));

// V2: fishPowerScore 为单条 0-10。后端若未补齐字段则降级到 breakdown.fishPowerScore,再降级到 record.score
const fishPowerScore = computed<number | null>(() => {
  const top = (props.record as unknown as { fishPowerScore?: number }).fishPowerScore;
  if (typeof top === 'number' && Number.isFinite(top)) return top;
  const bd = props.record.breakdown?.fishPowerScore;
  if (typeof bd === 'number' && Number.isFinite(bd)) return bd;
  // 老接口的 score 不一定在 [0,10];仍展示但 TitleBadge 会 clamp。
  if (typeof props.record.score === 'number' && Number.isFinite(props.record.score)) {
    return Math.min(10, Math.max(0, props.record.score));
  }
  return null;
});

// V2: primaryTag = 后端给的主标签,否则从 tags[0] / topics[0] 回退
const primaryTagName = computed<string>(() => {
  const v2 = (props.record as unknown as { primaryTag?: { name?: string } | null }).primaryTag;
  if (v2 && typeof v2.name === 'string' && v2.name) return v2.name;
  const firstTopic = props.record.topics?.[0]?.name;
  if (firstTopic) return `#${firstTopic}`;
  const firstTag = props.record.tags?.[0]?.name;
  if (firstTag) return firstTag;
  return '';
});

const avatarVariant = computed<'mint' | 'coral' | 'primary'>(() => {
  // 用 nickname 哈希为种子,把头像分散到三种主色块
  const seed = (props.record.avatarSeed || props.record.nickname || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (['mint', 'coral', 'primary'] as const)[seed % 3];
});

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return copy('未来', 'future');
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

/* ------------------------------------------------------------------
 * 正文(列表内 3 行截断;点击进入详情页阅读全文)
 * ------------------------------------------------------------------ */
const bodyText = computed(() => props.record.storyText || props.record.description || '');

/* ------------------------------------------------------------------
 * 标题展示去重(纯前端):速记快投会把同一段文本同时写入 activity_text 与
 * story_text,导致标题与正文重复。这里保留 3 行正文,仅当标题存在且与正文
 * 规范化后不同时才渲染标题;两者相同则隐藏标题、避免重复展示。
 * isDuplicateDisplayText 任一为空即返回 false,因此不会误删唯一内容。
 * ------------------------------------------------------------------ */
const showTitle = computed(
  () => Boolean(props.record.activityText) && !isDuplicateDisplayText(props.record.activityText, bodyText.value)
);

/* ------------------------------------------------------------------
 * 互动 handler(委派全局 actions,自动同步全局 communityRecords)
 * ------------------------------------------------------------------ */
const onLike = async () => {
  if (!isLoggedIn.value) return alert(t('needLogin'));
  await handleFeedLike(props.record.id);
};
const onLegend = async () => {
  if (!isLoggedIn.value) return alert(t('needLogin'));
  await handleFeedNominate(props.record.id);
};
const onReport = async () => {
  if (!isLoggedIn.value) return alert(t('needLogin'));
  if (props.record.viewer?.reported) return; // 已活跃举报,后端会幂等返回 alreadyReported,前端避免重复点击体验
  await handleFeedReport(props.record.id);
};
</script>

<template>
  <article class="record-card">
    <UserAvatar
      class="record-avatar record-clickable"
      :avatar-url="record.avatarUrl"
      :avatar-seed="record.avatarSeed"
      :nickname="record.nickname"
      :size="44"
      :data-variant="avatarVariant"
      @click="goDetail"
    />

    <div class="name-line record-clickable" @click="goDetail">{{ record.nickname }}</div>

    <div class="meta-line">
      <span class="meta-time">{{ formatTime(record.createdAt) }}</span>
      <template v-if="primaryTagName">
        <span class="dot" aria-hidden="true"></span>
        <span class="meta-tag">{{ primaryTagName }}</span>
      </template>
    </div>

    <TitleBadge
      class="record-title-badge"
      :title="translatedTitle(record.title)"
      :score="fishPowerScore"
    />

    <h3
      v-if="showTitle"
      class="record-title record-clickable"
      role="link"
      tabindex="0"
      @click="goDetail"
      @keydown.enter="goDetail"
    >
      {{ record.activityText }}
    </h3>

    <p v-if="bodyText" class="record-body record-clickable" @click="goDetail">
      {{ bodyText }}
    </p>

    <div class="record-actions">
      <ActionButton
        icon="heart"
        :count="record.likeCount"
        :active="record.viewer?.liked"
        :disabled="!isLoggedIn"
        variant="warm"
        :title="copy('点赞', 'Like')"
        @click="onLike"
      />
      <ActionButton
        icon="comment"
        :count="record.commentCount"
        variant="mint"
        :title="copy('查看评论', 'View comments')"
        @click="goComments"
      />
      <ActionButton
        icon="crown"
        :count="record.legendNominationCount"
        :active="record.viewer?.legendNominated"
        :disabled="!isLoggedIn"
        variant="legend"
        :title="copy('传奇提名 · 首次 10 鱼鳞', 'Nominate · 10 scale')"
        @click="onLegend"
      />
      <ActionButton
        icon="flag"
        :count="record.reportCount"
        :active="record.viewer?.reported"
        :disabled="!isLoggedIn"
        variant="danger"
        :title="record.viewer?.reported ? copy('已举报,审核中', 'Reported, under review') : copy('举报', 'Report')"
        @click="onReport"
      />
      <ActionButton
        class="action-more"
        icon="more"
        variant="neutral"
        :icon-only="true"
        :title="copy('更多', 'More')"
        :label="copy('更多', 'More')"
      />
    </div>

  </article>
</template>

<style scoped>
.record-card {
  background: var(--color-bg-card);
  /* v1.2:不依赖被 themes 覆盖的 --color-border,使用 V2 专属柔和米灰 */
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  box-shadow: var(--v2-shadow-flat-md);
  padding: 18px 20px 14px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  column-gap: var(--space-3);
  row-gap: var(--space-1);
  align-items: start;
}

.record-avatar {
  grid-column: 1;
  grid-row: 1 / span 2;
  border-radius: var(--radius-md) !important;
  /* v1.2:头像不再黑色 2px 强描边,改为柔和米灰 1.5px */
  border: 1.5px solid var(--v2-border-emphasis) !important;
  margin-top: 2px;
}
.record-avatar[data-variant='mint'] :deep(.user-avatar) {
  background: var(--color-accent-mint);
}
.record-avatar[data-variant='coral'] :deep(.user-avatar) {
  background: var(--color-accent-coral);
}
.record-avatar[data-variant='primary'] :deep(.user-avatar) {
  background: var(--color-primary);
}

.name-line {
  grid-column: 2;
  grid-row: 1;
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta-line {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}
.meta-line .dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-text-secondary);
}
.meta-time {
  font-family: var(--font-mono);
  font-weight: var(--weight-semibold);
}
.meta-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  background: var(--color-accent-mint-soft);
  /* 边色跟随主题的次级边框,避免在 night / arcade 下出现固定浅薄荷线 */
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-on-mint);
}
.record-title-badge {
  grid-column: 3;
  grid-row: 1 / span 2;
}

.record-title {
  grid-column: 1 / -1;
  grid-row: 3;
  margin-top: var(--space-3);
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}
.record-body {
  grid-column: 1 / -1;
  grid-row: 4;
  margin-top: var(--space-2);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-body);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
}
/* 可点击进入详情的内容元素(头像 / 昵称 / 标题 / 正文) */
.record-clickable {
  cursor: pointer;
}
.record-title.record-clickable:hover {
  color: var(--color-text-primary);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.record-clickable:focus-visible {
  outline: 2px solid var(--color-accent-mint);
  outline-offset: 2px;
  border-radius: var(--radius-md);
}

.record-actions {
  grid-column: 1 / -1;
  grid-row: 5;
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  /* v1.3:分隔线降到极柔,只起到分隔作用,不再像旧工具栏顶线 */
  border-top: 1px solid var(--v2-divider-soft);
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
}
/*
 * v1.4 双保险:Pixel UI 全局给所有 <button> 注入硬阴影。
 * 这里在 actions 区域内对任何子 button 兜底清零,
 * 即使将来误用了非 ActionButton 的原生 button,也不会出现黑色月牙。
 */
.record-actions :deep(button) {
  box-shadow: none !important;
  filter: none !important;
}
.record-actions :deep(button::before),
.record-actions :deep(button::after) {
  content: none !important;
  box-shadow: none !important;
}
/* 更多按钮:右对齐;视觉走 ActionButton.icon-only,自带柔和胶囊 */
.action-more {
  margin-left: auto;
}

@media (max-width: 720px) {
  .record-card {
    padding: var(--space-4);
  }
}
</style>
