<script setup lang="ts">
/**
 * Community Plaza – v2
 * --------------------------------------------------------------
 * 重新设计的社区广场页面：
 *  - 不沿用旧 community-panel / module-intro 等设计锚点。
 *  - 保留像素风（pixel grid、硬阴影、像素字体）。
 *  - 提交模块集成在页面顶部，只保留一个主输入框。
 *  - 其他必填字段（昵称、时长、描述、匿名确认、发布范围）使用默认值
 *    或最小化的辅助控件，简单高效。
 *  - 提交成功后弹出一个像素风弹窗通知，展示鱼力值结果。
 *  - 不修改任何后端接口、参数、字段、鉴权和评分规则。
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Check, Flame, Send, Sparkles, Star, Trophy, X, Zap } from 'lucide-vue-next';
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
  handleFeedComment,
  handleFeedLike,
  handleFeedNominate,
  handleFeedReport,
  handleSubmit,
  lastResult,
  loading,
  locale,
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
 * 主输入：把同一个输入同时写入 activityText（事项）和 description（故事），
 * 让后端 canSubmit 校验通过，同时只暴露一个输入框给用户。
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
 * 顶部过滤器
 * ------------------------------------------------------------------ */
const filters = computed(() => [
  { key: 'latest', label: copy('最新摸鱼', 'Latest'), icon: Sparkles },
  { key: 'hot', label: copy('今日热门', 'Hot'), icon: Flame },
  { key: 'high', label: copy('高分记录', 'High Score'), icon: Trophy },
  { key: 'legendary', label: copy('传奇候选', 'Legend'), icon: Star }
]);

const setFilter = (key: string) => {
  communityFilter.value = key as typeof communityFilter.value;
};

/* ------------------------------------------------------------------
 * 提交流程 & 成功弹窗
 * ------------------------------------------------------------------ */
const successOpen = ref(false);
const successPayload = ref<typeof lastResult.value | null>(null);
const lastSubmittedRecordId = ref<number | null>(null);

const localStatusMessage = ref('');

const onSubmit = async () => {
  if (!canSubmit.value) {
    // 用户没勾匿名 / 内容太短 → 给一个轻量提示
    if (!form.anonymized) {
      localStatusMessage.value = copy('请先勾选匿名化确认。', 'Please confirm anonymization first.');
    } else if (mainText.value.trim().length < 2) {
      localStatusMessage.value = copy('再多写一点，至少 2 个字符。', 'Add a bit more — at least 2 characters.');
    }
    return;
  }
  localStatusMessage.value = '';
  await handleSubmit();
  // handleSubmit 完成后 lastResult 会更新；通过 watch 触发弹窗
};

watch(
  () => lastResult.value?.record?.id,
  (id) => {
    if (id && id !== lastSubmittedRecordId.value) {
      lastSubmittedRecordId.value = id;
      successPayload.value = lastResult.value;
      successOpen.value = true;
    }
  }
);

const closeSuccess = () => {
  successOpen.value = false;
};

const viewRecordDetail = async () => {
  if (successPayload.value?.record?.id) {
    await openProfileRecord(successPayload.value.record.id);
    successOpen.value = false;
  }
};

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
 * 工具：发布到导航
 * ------------------------------------------------------------------ */
const goLogin = () => router.push('/profile');

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return copy('刚刚', 'just now');
    if (diffMin < 60) return copy(`${diffMin} 分钟前`, `${diffMin} min ago`);
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return copy(`${diffH} 小时前`, `${diffH} h ago`);
    const diffD = Math.round(diffH / 24);
    if (diffD < 30) return copy(`${diffD} 天前`, `${diffD} d ago`);
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
};
</script>

<template>
  <div class="plaza">
    <!-- ============================================================
         HERO + 简化提交盒 (sticky top, compact)
         ============================================================ -->
    <section class="compose-shell" aria-labelledby="compose-title">
      <div class="compose-banner" aria-hidden="true">
        <span class="banner-pixel">▌▌</span>
        <span class="banner-text">{{ copy('社区广场', 'COMMUNITY PLAZA') }}</span>
        <span class="banner-pixel right">▌▌</span>
      </div>

      <div class="compose-card">
        <header class="compose-head">
          <h2 id="compose-title" class="compose-title">
            <Zap :size="16" />
            <span>{{ copy('投放一条匿名摸鱼记录', 'Drop an anonymous slacking record') }}</span>
          </h2>
          <p class="compose-sub">
            {{
              copy(
                '一格输入框就够了。系统会自动按时长计算 Fish Power Score。',
                'One field is enough. Fish Power Score is computed automatically by duration.'
              )
            }}
          </p>
        </header>

        <div class="compose-input-wrap">
          <textarea
            ref="mainTextarea"
            v-model="mainText"
            class="compose-input"
            :placeholder="placeholderMain"
            :maxlength="maxMain + 20"
            rows="2"
            aria-label="main-input"
          ></textarea>
          <div class="compose-counter" :class="{ over: mainOver }">
            {{ mainRemaining }}
          </div>
        </div>

        <div class="compose-controls">
          <div class="control-chip control-duration" role="group" aria-label="duration">
            <span class="chip-label">{{ copy('时长', 'Duration') }}</span>
            <select v-model="form.duration" class="chip-select">
              <option
                v-for="item in options.durations"
                :key="item.key"
                :value="item.key"
              >
                {{ translatedOptionLabel(item.key, item.label) }}
              </option>
            </select>
          </div>

          <label class="control-chip control-anon" :class="{ active: form.anonymized }">
            <input v-model="form.anonymized" type="checkbox" />
            <Check :size="13" />
            <span>{{ copy('已匿名', 'Anonymized') }}</span>
          </label>

          <button
            type="button"
            class="compose-submit"
            :disabled="submitDisabled"
            @click="onSubmit"
          >
            <Send :size="14" />
            <span v-if="loading">{{ copy('上榜中...', 'Submitting...') }}</span>
            <span v-else>{{ copy('上榜', 'Drop it') }}</span>
          </button>
        </div>

        <p v-if="localStatusMessage" class="compose-hint warn">{{ localStatusMessage }}</p>
        <p v-else-if="errorMessage" class="compose-hint danger">{{ errorMessage }}</p>
        <p v-else class="compose-hint">
          {{
            copy(
              '默认发布到社区，已开启自动加入相关圈子；不要写公司、客户和聊天记录。',
              'Defaults to public + auto circles. No real company, client, or chat records.'
            )
          }}
        </p>

        <p v-if="!currentUser" class="compose-tip">
          {{ copy('未登录也能匿名提交。', 'You can post anonymously without login.') }}
          <button type="button" class="link-inline" @click="goLogin">
            {{ copy('登录解锁徽章和钱包', 'Sign in to unlock badges & wallet') }}
          </button>
        </p>
      </div>
    </section>

    <!-- ============================================================
         过滤器 + 话题条
         ============================================================ -->
    <section class="feed-controls">
      <div class="filter-strip" role="tablist" aria-label="community-filter">
        <button
          v-for="f in filters"
          :key="f.key"
          type="button"
          class="filter-btn"
          :class="{ active: communityFilter === f.key }"
          @click="setFilter(f.key)"
          role="tab"
          :aria-selected="communityFilter === f.key"
        >
          <component :is="f.icon" :size="14" />
          <span>{{ f.label }}</span>
        </button>
      </div>

      <div v-if="popularTopics.length" class="topic-strip" aria-label="popular-topics">
        <span class="topic-strip-label">{{ copy('热门话题', 'Topics') }}</span>
        <button
          v-for="topic in popularTopics.slice(0, 8)"
          :key="topic.id"
          type="button"
          class="topic-pill"
          @click="openTopic(topic.slug)"
        >
          #{{ topic.name }}
          <small>{{ topic.usage_count }}</small>
        </button>
      </div>
    </section>

    <!-- ============================================================
         内容流
         ============================================================ -->
    <section class="feed">
      <div v-if="communityLoading" class="feed-state loading">
        <span class="pixel-loader" aria-hidden="true"></span>
        {{ copy('社区广场加载中...', 'Loading community feed...') }}
      </div>

      <div v-else-if="!communityRecords.length" class="feed-state empty">
        <div class="empty-icon" aria-hidden="true">🐟</div>
        <strong>{{ copy('今天还没有鱼浮出水面。', 'No fish surfaced today yet.') }}</strong>
        <span>{{ copy('第一条记录就是今天的鱼王。', 'The first record becomes today’s Fish King.') }}</span>
      </div>

      <ul v-else class="card-grid">
        <li
          v-for="record in communityRecords"
          :key="record.id"
          class="fish-card"
        >
          <header class="fish-card-head">
            <div class="fish-id">
              <span class="avatar-pixel" aria-hidden="true">{{ record.nickname.slice(0, 1) }}</span>
              <div>
                <strong>{{ record.nickname }}</strong>
                <small>{{ formatTime(record.createdAt) }}</small>
              </div>
            </div>
            <div class="fish-score" :title="translatedTitle(record.title)">
              <span class="score-number">{{ record.score.toFixed(1) }}</span>
              <span class="score-title">{{ translatedTitle(record.title) }}</span>
            </div>
          </header>

          <p class="fish-activity">{{ record.activityText }}</p>
          <p v-if="record.storyText || record.description" class="fish-story">
            {{ record.storyText || record.description }}
          </p>

          <div v-if="record.topics?.length" class="fish-topics">
            <button
              v-for="topic in record.topics"
              :key="topic.id"
              type="button"
              class="topic-mini"
              @click="openTopic(topic.slug)"
            >
              #{{ topic.name }}
            </button>
          </div>

          <div v-if="record.tags?.length || record.guild" class="fish-tags">
            <span v-for="tag in record.tags" :key="tag.id">{{ translatedCircleName(tag) }}</span>
            <span v-if="record.guild" class="guild-tag">
              {{ copy('为 ', '→ ') }}{{ translatedGuildName(record.guild) }}
              {{ copy(' 贡献 +', ' +') }}{{ record.guildContribution.toFixed(1) }}
            </span>
          </div>

          <footer class="fish-card-foot">
            <div class="fish-actions">
              <button
                type="button"
                class="act-btn like"
                :class="{ active: record.viewer.liked }"
                @click="handleFeedLike(record.id)"
              >
                ♥ {{ record.likeCount }}
              </button>
              <button
                type="button"
                class="act-btn"
                @click="openProfileRecord(record.id)"
              >
                💬 {{ record.commentCount }}
              </button>
              <button
                type="button"
                class="act-btn legend"
                :class="{ active: record.viewer.legendNominated }"
                :title="copy('发起传奇提名将消耗 10 鱼鳞。', 'Legend nomination costs 10 Fish Scale.')"
                @click="handleFeedNominate(record.id)"
              >
                ★ {{ record.legendNominationCount }}
              </button>
              <button
                type="button"
                class="act-btn report"
                :class="{ active: record.viewer.reported }"
                @click="handleFeedReport(record.id)"
              >
                ⚑ {{ record.reportCount }}
              </button>
            </div>

            <div class="quick-comment">
              <input
                v-model="feedCommentDrafts[record.id]"
                type="text"
                :placeholder="copy('留个鱼脚印…', 'Leave a fish print…')"
                maxlength="120"
              />
              <button type="button" class="quick-send" @click="handleFeedComment(record.id)">
                {{ t('addComment') }}
              </button>
            </div>
          </footer>
        </li>
      </ul>
    </section>

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
          <button type="button" class="popup-close" @click="closeSuccess" aria-label="close">
            <X :size="14" />
          </button>

          <div class="popup-tape">
            <span>★ {{ copy('记录成功', 'RECORD OK') }} ★</span>
          </div>

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
              <span>{{ copy('今日排名', 'Today rank') }}</span>
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
/* ============================================================
 * Plaza shell — 像素风、年轻化、互联网抽象
 * ============================================================ */
.plaza {
  display: flex;
  flex-direction: column;
  gap: 22px;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 4px 0 56px;
  font-family: var(--font-readable);
  color: var(--color-text);
}

/* ----------- HERO + Compose box ----------- */
.compose-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.compose-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 10px 14px;
  background: var(--color-primary);
  border: var(--border-strong, 3px solid var(--color-border));
  box-shadow: var(--shadow-pixel, 6px 6px 0 var(--color-border));
  font-family: var(--font-pixel);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary-text, #18202a);
  position: relative;
}

.compose-banner::before {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px dashed var(--color-border);
  pointer-events: none;
  opacity: 0.5;
}

.banner-pixel {
  font-family: var(--font-pixel);
  color: var(--color-border);
  font-size: 13px;
}

.banner-text {
  font-size: 14px;
}

.compose-card {
  background: var(--color-surface);
  border: var(--border-strong, 3px solid var(--color-border));
  box-shadow: var(--shadow-pixel, 6px 6px 0 var(--color-border));
  padding: 18px 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.compose-card::after {
  content: '';
  position: absolute;
  top: 6px;
  right: 6px;
  width: 10px;
  height: 10px;
  background: var(--color-accent);
  border: 2px solid var(--color-border);
}

.compose-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.compose-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-family: var(--font-pixel);
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.compose-sub {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.compose-input-wrap {
  position: relative;
}

.compose-input {
  width: 100%;
  min-height: 64px;
  padding: 12px 56px 12px 14px;
  border: var(--border-normal, 2px solid var(--color-border));
  background: var(--color-surface-soft, #f7fafc);
  color: var(--color-text);
  font-family: var(--font-readable);
  font-size: 15px;
  line-height: 1.5;
  resize: vertical;
  box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.04);
  outline: none;
}

.compose-input:focus {
  border-color: var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--shadow-small, 3px 3px 0 var(--color-border));
}

.compose-counter {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 2px 6px;
  font-family: var(--font-pixel);
  font-size: 11px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
}

.compose-counter.over {
  background: var(--color-danger);
  color: var(--color-danger-text);
  border-color: var(--color-danger-text);
}

.compose-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.control-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: var(--border-normal, 2px solid var(--color-border));
  background: var(--color-surface);
  font-size: 12px;
  font-family: var(--font-pixel);
  box-shadow: 2px 2px 0 var(--color-border);
  user-select: none;
}

.control-anon {
  cursor: pointer;
  color: var(--color-text-muted);
}

.control-anon input {
  display: none;
}

.control-anon.active {
  background: var(--color-accent);
  color: var(--color-text);
}

.control-anon :deep(svg) {
  opacity: 0.3;
}

.control-anon.active :deep(svg) {
  opacity: 1;
}

.control-duration .chip-label {
  color: var(--color-text-muted);
}

.chip-select {
  appearance: none;
  border: none;
  background: transparent;
  font-family: var(--font-pixel);
  font-size: 12px;
  color: var(--color-text);
  cursor: pointer;
  padding: 0 4px;
  outline: none;
}

.compose-submit {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: var(--border-strong, 3px solid var(--color-border));
  background: var(--color-primary);
  color: var(--color-primary-text);
  font-family: var(--font-pixel);
  font-size: 13px;
  letter-spacing: 0.05em;
  box-shadow: 4px 4px 0 var(--color-border);
  transition: transform 0.05s ease, box-shadow 0.05s ease;
}

.compose-submit:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 var(--color-border);
}

.compose-submit:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--color-border);
}

.compose-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-surface-soft);
  color: var(--color-text-muted);
}

.compose-hint {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.compose-hint.warn {
  color: var(--color-danger-text);
}

.compose-hint.danger {
  color: var(--color-danger-text);
  font-weight: 600;
}

.compose-tip {
  margin: -4px 0 0;
  font-size: 11px;
  color: var(--color-text-muted);
}

.link-inline {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-text);
  text-decoration: underline;
  text-decoration-style: dotted;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
}

/* ----------- 过滤器条 ----------- */
.feed-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: var(--border-normal, 2px solid var(--color-border));
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-pixel);
  font-size: 12px;
  box-shadow: 2px 2px 0 var(--color-border);
  cursor: pointer;
  transition: transform 0.05s ease, background 0.1s ease;
}

.filter-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-border);
}

.filter-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-text);
  box-shadow: 2px 2px 0 var(--color-border), inset 0 -3px 0 rgba(0, 0, 0, 0.15);
}

.topic-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: var(--color-surface-soft, #f7fafc);
  border: 2px dashed var(--color-border-soft, #d1d8e0);
}

.topic-strip-label {
  font-family: var(--font-pixel);
  font-size: 11px;
  color: var(--color-text-muted);
  margin-right: 4px;
}

.topic-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.topic-pill:hover {
  background: var(--color-accent);
}

.topic-pill small {
  color: var(--color-text-muted);
  font-size: 10px;
}

/* ----------- Feed ----------- */
.feed-state {
  padding: 36px 18px;
  text-align: center;
  border: 2px dashed var(--color-border-soft, #d1d8e0);
  background: var(--color-surface-soft, #f7fafc);
  color: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.feed-state.empty .empty-icon {
  font-size: 36px;
}

.pixel-loader {
  width: 18px;
  height: 18px;
  background:
    linear-gradient(var(--color-border) 0 0) 0 0/6px 6px no-repeat,
    linear-gradient(var(--color-border) 0 0) 6px 0/6px 6px no-repeat,
    linear-gradient(var(--color-border) 0 0) 12px 0/6px 6px no-repeat;
  animation: blink 1s steps(3) infinite;
}

@keyframes blink {
  0% { opacity: 0.3; }
  33% { opacity: 0.6; }
  66% { opacity: 1; }
  100% { opacity: 0.3; }
}

.card-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.fish-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 14px 10px;
  background: var(--color-surface);
  border: var(--border-normal, 2px solid var(--color-border));
  box-shadow: 4px 4px 0 var(--color-border);
  position: relative;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.fish-card:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 var(--color-border);
}

.fish-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 8px;
  height: 8px;
  background: var(--color-accent);
  border-right: 2px solid var(--color-border);
  border-bottom: 2px solid var(--color-border);
}

.fish-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.fish-id {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.avatar-pixel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 2px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
  font-family: var(--font-pixel);
  font-size: 14px;
  flex-shrink: 0;
}

.fish-id strong {
  display: block;
  font-size: 13px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.fish-id small {
  font-size: 11px;
  color: var(--color-text-muted);
}

.fish-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.score-number {
  font-family: var(--font-pixel);
  font-size: 18px;
  color: var(--color-text);
}

.score-title {
  font-size: 10px;
  color: var(--color-text-muted);
  max-width: 110px;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fish-activity {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.45;
  word-break: break-word;
}

.fish-story {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.55;
  word-break: break-word;
}

.fish-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.topic-mini {
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border-soft);
  color: var(--color-text);
  font-size: 11px;
  padding: 2px 6px;
  cursor: pointer;
}

.topic-mini:hover {
  background: var(--color-accent);
  border-color: var(--color-border);
}

.fish-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.fish-tags span {
  background: var(--color-accent);
  border: 1px solid var(--color-border);
  padding: 1px 6px;
}

.guild-tag {
  background: var(--color-warning) !important;
}

.fish-card-foot {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
  border-top: 2px dashed var(--color-border-soft, #d1d8e0);
  padding-top: 8px;
}

.fish-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.act-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 12px;
  font-family: var(--font-pixel);
  cursor: pointer;
  transition: transform 0.05s ease;
}

.act-btn:hover {
  transform: translateY(-1px);
}

.act-btn.active.like {
  background: var(--color-danger);
  color: var(--color-danger-text);
}

.act-btn.active.legend {
  background: var(--color-primary);
}

.act-btn.active.report {
  background: var(--color-warning);
}

.quick-comment {
  display: flex;
  gap: 6px;
}

.quick-comment input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--color-border);
  background: var(--color-surface-soft);
  color: var(--color-text);
  font: inherit;
  font-size: 12px;
  padding: 5px 8px;
  outline: none;
}

.quick-comment input:focus {
  background: var(--color-surface);
  box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.04);
}

.quick-send {
  padding: 5px 10px;
  border: 1px solid var(--color-border);
  background: var(--color-accent);
  color: var(--color-text);
  font-family: var(--font-pixel);
  font-size: 11px;
  cursor: pointer;
}

/* ----------- 成功弹窗 ----------- */
.popup-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(24, 32, 42, 0.55);
  backdrop-filter: blur(2px);
}

.popup-window {
  position: relative;
  width: min(420px, 100%);
  background: var(--color-surface);
  border: var(--border-strong, 3px solid var(--color-border));
  box-shadow: 8px 8px 0 var(--color-border);
  padding: 22px 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: var(--font-readable);
}

.popup-tape {
  align-self: flex-start;
  padding: 4px 10px;
  background: var(--color-primary);
  border: 2px solid var(--color-border);
  font-family: var(--font-pixel);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-primary-text);
  transform: rotate(-2deg) translateX(-6px);
}

.popup-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.popup-close:hover {
  background: var(--color-danger);
  color: var(--color-danger-text);
}

.popup-score-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 0 6px;
  border-bottom: 2px dashed var(--color-border-soft, #d1d8e0);
}

.popup-score {
  font-family: var(--font-pixel);
  font-size: 36px;
  color: var(--color-text);
  letter-spacing: 0.04em;
}

.popup-score-label {
  font-size: 11px;
  font-family: var(--font-pixel);
  color: var(--color-text-muted);
  letter-spacing: 0.1em;
}

.popup-title {
  margin: 0;
  font-family: var(--font-pixel);
  font-size: 14px;
  letter-spacing: 0.04em;
  color: var(--color-text);
  text-align: center;
}

.popup-comment {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.55;
  text-align: center;
}

.popup-meta {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 6px;
}

.popup-meta li {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  font-size: 11px;
  color: var(--color-text-muted);
}

.popup-meta strong {
  font-family: var(--font-pixel);
  font-size: 14px;
  color: var(--color-text);
}

.popup-status {
  margin: 0;
  font-size: 11px;
  color: var(--color-success-text, #047857);
  text-align: center;
}

.popup-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.popup-btn {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid var(--color-border);
  font-family: var(--font-pixel);
  font-size: 12px;
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--color-border);
  transition: transform 0.05s ease, box-shadow 0.05s ease;
}

.popup-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--color-border);
}

.popup-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--color-border);
}

.popup-btn.primary {
  background: var(--color-primary);
  color: var(--color-primary-text);
}

.popup-btn.ghost {
  background: var(--color-surface);
  color: var(--color-text);
}

/* ----------- 动画 ----------- */
.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.18s ease;
}

.popup-fade-enter-active .popup-window,
.popup-fade-leave-active .popup-window {
  transition: transform 0.18s ease;
}

.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
}

.popup-fade-enter-from .popup-window,
.popup-fade-leave-to .popup-window {
  transform: translateY(8px) scale(0.98);
}

/* ----------- 响应式 ----------- */
@media (max-width: 720px) {
  .plaza {
    gap: 16px;
  }

  .compose-card,
  .compose-banner {
    box-shadow: 4px 4px 0 var(--color-border);
  }

  .compose-controls {
    gap: 8px;
  }

  .compose-submit {
    width: 100%;
    margin-left: 0;
    justify-content: center;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }

  .fish-card {
    box-shadow: 3px 3px 0 var(--color-border);
  }

  .banner-text {
    font-size: 12px;
  }
}

@media (max-width: 420px) {
  .filter-btn span {
    display: none;
  }

  .quick-comment {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
