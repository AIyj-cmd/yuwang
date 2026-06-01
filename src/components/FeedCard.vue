<script setup lang="ts">
import { useAppContext } from '../appContext';
import type { FeedRecord } from '../types';
import UserAvatar from './UserAvatar.vue';

const props = defineProps<{
  record: FeedRecord;
}>();

const {
  copy,
  t,
  feedCommentDrafts,
  handleFeedLike,
  handleFeedComment,
  handleFeedNominate,
  handleFeedReport,
  openProfileRecord,
  openTopic,
  translatedCircleName,
  translatedGuildName,
  translatedTitle
} = useAppContext();

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
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
</script>

<template>
  <li class="feed-card">
    <!-- 卡头：头像 + 名称 + 分数 -->
    <div class="fc-head">
      <UserAvatar
        :avatar-url="record.avatarUrl"
        :avatar-seed="record.avatarSeed"
        :nickname="record.nickname"
        :size="36"
        class="fc-avatar"
      />
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
          :aria-label="copy('点赞', 'Like')"
          @click="handleFeedLike(record.id)"
        >♥ {{ record.likeCount }}</button>
        <button
          type="button"
          class="act-btn"
          :aria-label="copy('评论', 'Comment')"
          @click="openProfileRecord(record.id)"
        >💬 {{ record.commentCount }}</button>
        <button
          type="button"
          class="act-btn legend"
          :class="{ active: record.viewer.legendNominated }"
          :title="copy('发起传奇提名将消耗 10 鱼鳞。', 'Legend nomination costs 10 Fish Scale.')"
          :aria-label="copy('传奇提名', 'Nominate legend')"
          @click="handleFeedNominate(record.id)"
        >★ {{ record.legendNominationCount }}</button>
        <button
          type="button"
          class="act-btn report"
          :class="{ active: record.viewer.reported }"
          :aria-label="copy('举报', 'Report')"
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
</template>

<style scoped>
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
  background: var(--color-border);
  color: var(--color-primary-text);
}

@media (max-width: 640px) {
  .feed-card { padding: 14px; }
  .fc-activity { font-size: 15px; }
  .fc-foot { flex-direction: column; align-items: stretch; }
  .fc-comment { min-width: 0; }
}
</style>
