<script setup lang="ts">
/**
 * 社区动态详情页(方案 B · 评论闭环)
 *
 * 路由复用:name='record-share' / path='/records/:id'(meta.section='community')。
 *
 * 职责:
 *   - 展示单条记录全文(脱敏后的 social.record:昵称 / 头像 / 称号 / 正文 / 话题 / 只读互动数)。
 *   - 展示公开且审核通过的评论列表(仅安全字段:nickname / content / createdAt / avatarSeed)。
 *   - 登录用户可发表评论:
 *       · 审核通过即时上墙 → 刷新列表 + 同步 feed 评论数 + 成功提示。
 *       · 进入审核 → 显示"已提交,审核通过后展示",绝不伪造为已公开。
 *   - 未登录点击"发表评论" → 唤起既有登录面板 openAuthPanel('login')(不 alert、不跳 /profile)。
 *
 * 全部使用既有真实接口:fetchSocial / postComment / fetchShareCard(分享卡为尽力而为,失败不影响详情)。
 * 不读取 / 不展示任何 userId / username / email / status / reviewNote 等内部字段。
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchShareCard, fetchSocial, postComment } from '../api';
import { useAppContext } from '../appContext';
import type { PublicRecordComment, ShareCard, SocialResponse } from '../types';
import { isDuplicateDisplayText } from '../utils/displayText';
import UserAvatar from '../components/UserAvatar.vue';
import TitleBadge from '../components/community/TitleBadge.vue';
import PixelIcon from '../components/community/PixelIcon.vue';

const route = useRoute();
const router = useRouter();
const { authToken, copy, openTopic, translatedTitle, openAuthPanel, communityRecords } = useAppContext();

/* ------------------------------------------------------------------
 * 本地状态(不污染全局 social,避免影响结果页 / 资料页的 social 视图)
 * ------------------------------------------------------------------ */
const social = ref<SocialResponse | null>(null);
const card = ref<ShareCard | null>(null);
const loading = ref(false);
const notFound = ref(false);
const error = ref('');

const draft = ref('');
const submitting = ref(false);
const submitError = ref('');
const submitNotice = ref('');
const submitNoticeKind = ref<'' | 'pending' | 'success'>('');

const commentsSection = ref<HTMLElement | null>(null);

/* ------------------------------------------------------------------
 * 派生数据
 * ------------------------------------------------------------------ */
const recordId = computed(() => Number(route.params.id));
const isLoggedIn = computed(() => Boolean(authToken.value));
const record = computed(() => social.value?.record ?? null);
const comments = computed<PublicRecordComment[]>(() => social.value?.comments ?? []);
const commentCount = computed(() => social.value?.record.commentCount ?? comments.value.length);

const fishPowerScore = computed<number | null>(() => {
  const r = social.value?.record;
  if (!r) return null;
  const top = (r as unknown as { fishPowerScore?: number }).fishPowerScore;
  if (typeof top === 'number' && Number.isFinite(top)) return top;
  const bd = r.breakdown?.fishPowerScore;
  if (typeof bd === 'number' && Number.isFinite(bd)) return bd;
  if (typeof r.score === 'number' && Number.isFinite(r.score)) return Math.min(10, Math.max(0, r.score));
  return null;
});

const bodyText = computed(() => social.value?.record.storyText || social.value?.record.description || '');
/**
 * 正文展示去重(纯前端):速记快投会把同一段文本同时写入 activity_text 与
 * story_text,导致详情页标题(h1)与正文(p)重复。这里保留标题、维持层级,
 * 仅当正文存在且与标题规范化后不同时才渲染正文;相同则隐藏正文避免重复。
 * isDuplicateDisplayText 任一为空即返回 false,因此正文唯一时不会被误删。
 */
const showBody = computed(
  () => Boolean(bodyText.value) && !isDuplicateDisplayText(record.value?.activityText, bodyText.value)
);
const primaryTagName = computed(() => {
  const first = social.value?.record.topics?.[0]?.name;
  return first ? `#${first}` : '';
});
const shareHighlight = computed(() => card.value?.historicalHighlight || card.value?.rankLabel || '');
const safetyNotice = computed(
  () =>
    card.value?.safetyNotice ||
    copy('匿名娱乐分享,请勿填写真实公司、客户或聊天记录。', 'Anonymous entertainment. Do not include real company, client, or chat records.')
);
const charCount = computed(() => draft.value.trim().length);

/* ------------------------------------------------------------------
 * 时间格式化(与 RecordCard 一致的相对时间)
 * ------------------------------------------------------------------ */
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
 * 滚动到评论区(路由 hash=#comments 时)
 * ------------------------------------------------------------------ */
const scrollToComments = async () => {
  await nextTick();
  commentsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* ------------------------------------------------------------------
 * 加载详情:social 为主数据,share-card 为尽力而为(失败不阻断)
 * ------------------------------------------------------------------ */
const load = async (opts?: { scroll?: boolean }) => {
  if (!Number.isInteger(recordId.value) || recordId.value <= 0) {
    social.value = null;
    card.value = null;
    notFound.value = true;
    error.value = copy('这条鱼找不到了。', 'This record could not be found.');
    return;
  }
  loading.value = true;
  error.value = '';
  notFound.value = false;
  try {
    const response = await fetchSocial(recordId.value, authToken.value);
    social.value = response;
    card.value = await fetchShareCard(recordId.value, authToken.value).catch(() => null);
    if (opts?.scroll && route.hash === '#comments') {
      await scrollToComments();
    }
  } catch (err) {
    social.value = null;
    card.value = null;
    notFound.value = true;
    error.value =
      err instanceof Error && err.message
        ? err.message
        : copy('这条鱼暂时无法访问,可能未公开或已被移除。', 'This record is unavailable. It may be private or removed.');
  } finally {
    loading.value = false;
  }
};

/* ------------------------------------------------------------------
 * 同步社区 feed 的评论数(仅当评论已公开,使用服务端真实计数,非伪造)
 * ------------------------------------------------------------------ */
const syncFeedCommentCount = (count: number) => {
  if (typeof count !== 'number' || !Number.isFinite(count)) return;
  const list = communityRecords?.value;
  if (!Array.isArray(list)) return;
  const target = list.find((item: { id: number }) => item.id === recordId.value);
  if (target) target.commentCount = count;
};

/* ------------------------------------------------------------------
 * 发表评论:通过 id 差集判定"已公开" vs "进入审核"
 * ------------------------------------------------------------------ */
const submit = async () => {
  if (!isLoggedIn.value) {
    openAuthPanel('login');
    return;
  }
  const content = draft.value.trim();
  submitError.value = '';
  submitNotice.value = '';
  submitNoticeKind.value = '';
  if (content.length < 2 || content.length > 120) {
    submitError.value = copy('评论需 2–120 字。', 'Comment must be 2–120 characters.');
    return;
  }
  submitting.value = true;
  try {
    const prevIds = new Set((social.value?.comments ?? []).map((c) => c.id));
    const response = await postComment(recordId.value, content, authToken.value);
    social.value = response;
    const added = response.comments.some((c) => !prevIds.has(c.id));
    draft.value = '';
    if (added) {
      submitNoticeKind.value = 'success';
      submitNotice.value = copy('评论已发布。', 'Comment posted.');
      syncFeedCommentCount(response.record.commentCount);
    } else {
      submitNoticeKind.value = 'pending';
      submitNotice.value = copy('评论已提交,审核通过后会展示。', 'Comment submitted. It will appear after review.');
    }
  } catch (err) {
    // 失败保留草稿,便于重试
    submitError.value =
      err instanceof Error && err.message
        ? err.message
        : copy('评论发送失败,请稍后再试。', 'Failed to post comment. Please try again.');
  } finally {
    submitting.value = false;
  }
};

const promptLogin = () => openAuthPanel('login');
const goCommunity = () => router.push({ name: 'community' });

/* ------------------------------------------------------------------
 * 生命周期
 * ------------------------------------------------------------------ */
onMounted(() => load({ scroll: true }));
watch(recordId, () => load({ scroll: true }));
// 登录态变化(在详情页内登录 / 登出)→ 重新拉取视角相关数据,不滚动
watch(
  () => authToken.value,
  () => load()
);
</script>

<template>
  <section class="record-detail-page">
    <div class="detail-inner">
      <button type="button" class="back-link" @click="goCommunity">
        <span aria-hidden="true">←</span> {{ copy('返回社区', 'Back to community') }}
      </button>

      <div v-if="loading" class="state-block loading">
        {{ copy('加载中...', 'Loading...') }}
      </div>

      <div v-else-if="notFound" class="state-block error">
        <strong>{{ copy('记录不可访问', 'Record unavailable') }}</strong>
        <p>{{ error }}</p>
        <button type="button" class="ghost-btn" @click="goCommunity">{{ copy('返回社区', 'Back to community') }}</button>
      </div>

      <template v-else-if="record">
        <!-- 记录正文 -->
        <article class="detail-record">
          <header class="detail-head">
            <UserAvatar
              class="detail-avatar"
              :avatar-url="record.avatarUrl"
              :avatar-seed="record.avatarSeed"
              :nickname="record.nickname"
              :size="48"
            />
            <div class="detail-head-main">
              <div class="detail-name">{{ record.nickname }}</div>
              <div class="detail-meta">
                <span class="meta-time">{{ formatTime(record.createdAt) }}</span>
                <template v-if="primaryTagName">
                  <span class="dot" aria-hidden="true"></span>
                  <span class="meta-tag">{{ primaryTagName }}</span>
                </template>
              </div>
            </div>
            <TitleBadge class="detail-title-badge" :title="translatedTitle(record.title)" :score="fishPowerScore" />
          </header>

          <h1 v-if="record.activityText" class="detail-title">{{ record.activityText }}</h1>
          <p v-if="showBody" class="detail-body">{{ bodyText }}</p>

          <div v-if="record.topics?.length" class="detail-topics">
            <button
              v-for="topic in record.topics"
              :key="topic.id"
              type="button"
              class="topic-chip"
              @click="openTopic(topic.slug)"
            >
              #{{ topic.name }}
            </button>
          </div>

          <p v-if="shareHighlight" class="detail-highlight">{{ shareHighlight }}</p>

          <div class="detail-metrics" role="list">
            <span class="metric" role="listitem" :title="copy('点赞', 'Likes')" :aria-label="copy('点赞', 'Likes')">
              <PixelIcon name="heart" :size="15" />{{ record.likeCount }}
            </span>
            <span class="metric" role="listitem" :title="copy('评论', 'Comments')" :aria-label="copy('评论', 'Comments')">
              <PixelIcon name="comment" :size="15" />{{ record.commentCount }}
            </span>
            <span class="metric" role="listitem" :title="copy('传奇提名', 'Legend nominations')" :aria-label="copy('传奇提名', 'Legend nominations')">
              <PixelIcon name="crown" :size="15" />{{ record.legendNominationCount }}
            </span>
          </div>

          <small class="detail-safety">{{ safetyNotice }}</small>
        </article>

        <!-- 评论区 -->
        <section id="comments" ref="commentsSection" class="detail-comments">
          <div class="comments-head">
            <h2>{{ copy('评论', 'Comments') }}</h2>
            <span class="comments-count">{{ commentCount }}</span>
          </div>

          <!-- 评论输入(登录) / 登录引导(未登录) -->
          <div v-if="isLoggedIn" class="comment-form">
            <textarea
              v-model="draft"
              class="comment-input"
              rows="3"
              maxlength="120"
              :placeholder="copy('说点什么吧(2–120 字)· 别写真实公司、客户或聊天记录', 'Say something (2–120 chars). No real company, client, or chat records.')"
            ></textarea>
            <div class="comment-form-foot">
              <span class="char-count" :class="{ over: charCount > 120 }">{{ charCount }}/120</span>
              <button type="button" class="primary-btn" :disabled="submitting" @click="submit">
                {{ submitting ? copy('发送中...', 'Posting...') : copy('发表评论', 'Post comment') }}
              </button>
            </div>
            <p v-if="submitError" class="form-error">{{ submitError }}</p>
            <p v-else-if="submitNotice" class="form-notice" :data-kind="submitNoticeKind">{{ submitNotice }}</p>
          </div>
          <div v-else class="comment-login-prompt">
            <span>{{ copy('登录后即可参与评论', 'Log in to join the conversation') }}</span>
            <button type="button" class="primary-btn" @click="promptLogin">{{ copy('发表评论', 'Post comment') }}</button>
          </div>

          <!-- 评论列表 -->
          <ul v-if="comments.length" class="comment-list">
            <li v-for="comment in comments" :key="comment.id" class="comment-item">
              <UserAvatar
                class="comment-avatar"
                :avatar-seed="comment.avatarSeed"
                :nickname="comment.nickname"
                :size="36"
              />
              <div class="comment-main">
                <div class="comment-meta">
                  <strong class="comment-name">{{ comment.nickname }}</strong>
                  <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                </div>
                <p class="comment-content">{{ comment.content }}</p>
              </div>
            </li>
          </ul>
          <div v-else class="comments-empty">
            {{ copy('还没有鱼友留言,来坐第一个小板凳。', 'No comments yet. Be the first to leave one.') }}
          </div>
        </section>
      </template>
    </div>
  </section>
</template>

<style scoped>
.record-detail-page {
  padding: var(--space-5) var(--space-4) var(--space-8);
}
.detail-inner {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* 返回链接 */
.back-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) 0;
  background: none;
  border: none;
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.back-link:hover {
  color: var(--color-text-primary);
}

/* 加载 / 错误状态 */
.state-block {
  background: var(--color-bg-card);
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  box-shadow: var(--v2-shadow-flat-md);
  padding: var(--space-6);
  text-align: center;
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}
.state-block strong {
  font-size: var(--text-md);
  color: var(--color-text-primary);
}
.state-block p {
  margin: 0;
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}

/* 记录卡 */
.detail-record {
  background: var(--color-bg-card);
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  box-shadow: var(--v2-shadow-flat-md);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.detail-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  column-gap: var(--space-3);
  align-items: center;
}
.detail-avatar {
  border-radius: var(--radius-md) !important;
  border: 1.5px solid var(--v2-border-emphasis) !important;
}
.detail-head-main {
  min-width: 0;
}
.detail-name {
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: 2px;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
.detail-meta .dot {
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
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-on-mint);
}
.detail-title-badge {
  justify-self: end;
}

.detail-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
}
.detail-body {
  margin: 0;
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-body);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.detail-topics {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.topic-chip {
  padding: 2px var(--space-3);
  background: var(--color-bg-subtle);
  border: 1px solid var(--v2-border-card);
  border-radius: var(--radius-pill);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.topic-chip:hover {
  color: var(--color-text-primary);
  border-color: var(--v2-border-emphasis);
}
.detail-highlight {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
}

.detail-metrics {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--v2-divider-soft);
}
.metric {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--color-text-secondary);
}
.detail-safety {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: var(--leading-normal);
  overflow-wrap: anywhere;
}

/* 评论区 */
.detail-comments {
  background: var(--color-bg-card);
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  box-shadow: var(--v2-shadow-flat-md);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  scroll-margin-top: var(--space-5);
}
.comments-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.comments-head h2 {
  margin: 0;
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}
.comments-count {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--color-text-secondary);
  padding: 1px var(--space-2);
  background: var(--color-bg-subtle);
  border-radius: var(--radius-pill);
}

/* 输入框 */
.comment-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.comment-input {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 72px;
  padding: var(--space-3);
  background: var(--color-bg-subtle);
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--color-text-primary);
  outline: none;
}
.comment-input::placeholder {
  color: var(--color-text-tertiary);
}
.comment-input:focus {
  border-color: var(--v2-border-emphasis);
}
.comment-form-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.char-count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}
.char-count.over {
  color: var(--color-accent-coral, #d96a5a);
}
.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
.primary-btn:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--v2-shadow-color);
}
.primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ghost-btn {
  height: 34px;
  padding: 0 var(--space-4);
  background: transparent;
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.ghost-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--v2-border-emphasis);
}

.form-error,
.form-notice {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  overflow-wrap: anywhere;
}
.form-error {
  color: var(--color-accent-coral, #d96a5a);
}
.form-notice[data-kind='success'] {
  color: var(--color-text-on-mint);
  font-weight: var(--weight-semibold);
}
.form-notice[data-kind='pending'] {
  color: var(--color-text-secondary);
}

/* 登录引导 */
.comment-login-prompt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-subtle);
  border: 1px dashed var(--v2-border-card);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* 列表 */
.comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.comment-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: var(--space-3);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--v2-divider-soft);
}
.comment-item:first-child {
  border-top: none;
}
.comment-avatar {
  border-radius: var(--radius-md) !important;
  border: 1.5px solid var(--v2-border-card) !important;
}
.comment-main {
  min-width: 0;
}
.comment-meta {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.comment-name {
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
}
.comment-time {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}
.comment-content {
  margin: 4px 0 0;
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-body);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.comments-empty {
  padding: var(--space-5) var(--space-3);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

@media (max-width: 720px) {
  .record-detail-page {
    padding: var(--space-4) var(--space-3) var(--space-7);
  }
  .detail-record,
  .detail-comments {
    padding: var(--space-4);
  }
  .detail-title-badge {
    display: none;
  }
}
</style>
