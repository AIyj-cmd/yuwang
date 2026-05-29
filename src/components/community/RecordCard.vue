<script setup lang="ts">
/**
 * Community V2 · RecordCard
 *
 * 新结构(对齐 STYLE_GUIDE §3.2 / drafts/community-neopixel-v3.html):
 *   [头像] 昵称           [TitleBadge 称号 + 0-10 fishPowerScore]
 *          时间 · #主标签
 *   标题(1 行 clamp)
 *   正文(3 行 clamp,长文展开)
 *   ───────────────────────────
 *   ♥ 12   💬 3   ★ 5   👑   ⋯
 *   (评论框默认隐藏,点 💬 才展开)
 *
 * 数据全部来自 props.record(FeedRecord,已脱敏的社区 feed)。
 * 互动通过 useAppContext 现有 handler 调用真实接口。
 */
import { computed, ref } from 'vue';
import type { FeedRecord } from '../../types';
import { useAppContext } from '../../appContext';
import UserAvatar from '../UserAvatar.vue';
import TitleBadge from './TitleBadge.vue';
import ActionButton from './ActionButton.vue';
import PixelIcon from './PixelIcon.vue';

const props = defineProps<{
  record: FeedRecord;
}>();

const {
  copy,
  t,
  authToken,
  feedCommentDrafts,
  handleFeedLike,
  handleFeedComment,
  handleFeedNominate,
  handleFeedReport,
  translatedTitle
} = useAppContext();

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
 * 正文展开
 * ------------------------------------------------------------------ */
const expanded = ref(false);
const bodyText = computed(() => props.record.storyText || props.record.description || '');
// 启发式判断是否可能溢出 3 行(无 DOM 测量时用字符数兜底)。实际 CSS line-clamp 会兜底真正的折叠。
const isLong = computed(() => bodyText.value.length > 80);

/* ------------------------------------------------------------------
 * 评论框默认折叠
 * ------------------------------------------------------------------ */
const commentOpen = ref(false);
const toggleComment = () => {
  if (!isLoggedIn.value) {
    // 未登录:简单提示,不做跳转(避免抢现有 ResultPage 流程)。
    alert(t('needLogin'));
    return;
  }
  commentOpen.value = !commentOpen.value;
};

const submitComment = async () => {
  if (!isLoggedIn.value) return;
  await handleFeedComment(props.record.id);
  // handler 成功后会清空 feedCommentDrafts[id]
  // 保留 commentOpen,允许继续读取/发更多
};

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
      class="record-avatar"
      :avatar-url="record.avatarUrl"
      :avatar-seed="record.avatarSeed"
      :nickname="record.nickname"
      :size="44"
      :data-variant="avatarVariant"
    />

    <div class="name-line">{{ record.nickname }}</div>

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

    <h3 v-if="record.activityText" class="record-title">{{ record.activityText }}</h3>

    <p v-if="bodyText" class="record-body" :class="{ 'is-expanded': expanded }">
      {{ bodyText }}
    </p>
    <button
      v-if="isLong"
      type="button"
      class="record-expand"
      @click="expanded = !expanded"
    >
      {{ expanded ? copy('收起 ↑', 'Collapse ↑') : copy('展开全文 ↓', 'Read more ↓') }}
    </button>

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
        :active="commentOpen"
        variant="mint"
        :title="copy('评论', 'Comment')"
        @click="toggleComment"
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

    <div v-if="commentOpen" class="record-compose">
      <label class="compose-input">
        <PixelIcon name="comment" :size="14" />
        <input
          v-model="feedCommentDrafts[record.id]"
          type="text"
          maxlength="120"
          :placeholder="copy('120 字以内 · 别写真实公司、客户或聊天记录', 'Within 120 chars; no real company, client, or chat records')"
          @keydown.enter="submitComment"
        />
      </label>
      <button type="button" class="compose-btn" @click="submitComment">
        <PixelIcon name="send" :size="14" />
        <span>{{ copy('发送', 'Send') }}</span>
      </button>
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
.record-body.is-expanded {
  display: block;
  -webkit-line-clamp: unset;
  overflow: visible;
}
.record-expand {
  grid-column: 1 / -1;
  grid-row: 5;
  margin-top: var(--space-1);
  padding: 0;
  background: none;
  border: none;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  cursor: pointer;
  justify-self: start;
}
.record-expand:hover {
  color: var(--color-text-primary);
}

.record-actions {
  grid-column: 1 / -1;
  grid-row: 6;
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

.record-compose {
  grid-column: 1 / -1;
  grid-row: 7;
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--v2-divider);
  display: flex;
  gap: var(--space-2);
  align-items: stretch;
}
.compose-input {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  background: var(--color-bg-subtle);
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
}
.compose-input input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  padding: var(--space-2) 0;
  min-width: 0;
}
.compose-input input::placeholder {
  color: var(--color-text-tertiary);
}
.compose-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: 36px;
  padding: 0 var(--space-4);
  background: var(--color-primary);
  border: 1.5px solid var(--v2-border-emphasis);
  border-radius: var(--radius-md);
  box-shadow: var(--v2-shadow-flat-sm);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-primary-text);
  cursor: pointer;
}
.compose-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--v2-shadow-color);
}

@media (max-width: 720px) {
  .record-card {
    padding: var(--space-4);
  }
}
</style>
