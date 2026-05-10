<script setup lang="ts">
import { computed, reactive } from 'vue';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ClipboardCheck,
  Coins,
  Crown,
  Hash,
  Heart,
  Inbox,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Share2,
  ShieldAlert,
  Star,
  Trophy,
  User,
  Wallet,
  X
} from 'lucide-vue-next';
import { PxButton, PxCard, PxInput, PxTag } from '@mmt817/pixel-ui';
import { TITLE_LEVELS } from '../../shared/scoring';
import { useAppContext } from '../appContext';
import PageWorkbench from './layout/PageWorkbench.vue';
import WorkbenchHeader, { type WorkbenchStat } from './layout/WorkbenchHeader.vue';
import WorkbenchGrid from './layout/WorkbenchGrid.vue';

const props = defineProps<{ section: string }>();
const activeSection = computed(() => props.section);
const {
  activeBoard,
  addTopic,
  addTopicFromDraft,
  activityTextRemaining,
  adminQueue,
  allProfileBadges,
  announcements,
  canSubmit,
  checkin,
  checkinNote,
  circleFeed,
  circlesData,
  clearLeaderboardFilter,
  commentText,
  communityFilter,
  communityLoading,
  communityRecords,
  copy,
  currentProfileTitle,
  currentUser,
  descriptionRemaining,
  displayedBadges,
  errorMessage,
  feedbackForm,
  feedbackLoading,
  feedbackSubmitted,
  feedCommentDrafts,
  filterKeyword,
  form,
  formatLevelRange,
  groupFeed,
  groupForm,
  groupsData,
  guildsData,
  isTopicSelected,
  handleCheckin,
  handleComment,
  handleCommunityScopeChange,
  handleCreateGroup,
  handleFeedComment,
  handleFeedLike,
  handleFeedNominate,
  handleFeedReport,
  handleFeedbackSubmit,
  handleGroupChallenge,
  handleInteraction,
  handleJoinCircle,
  handleJoinGroup,
  handleJoinGuild,
  handlePrivateOnlyChange,
  handleReviewComment,
  handleReviewRecord,
  handleShare,
  handleSubmit,
  inviteCode,
  isCurrentLevel,
  joinedGroups,
  lastResult,
  leaderboardLoading,
  leaderboardResultCount,
  leaderboardRows,
  loadAnnouncements,
  loadLeaderboard,
  loadWallet,
  loading,
  locale,
  localizedLeaderboardTypes,
  openProfileRecord,
  openTopic,
  options,
  popularTopics,
  profile,
  profileForm,
  resetForm,
  removeTopic,
  saveProfile,
  selectedBoard,
  selectedCircle,
  selectedCircleRecords,
  selectedGroup,
  selectedGroupRecords,
  selectedGuild,
  selectedRecord,
  selectCircle,
  selectGroup,
  sensitiveHits,
  shareCard,
  showAllBadges,
  social,
  stats,
  statusMessage,
  t,
  topicDraft,
  topicError,
  topicSuggestions,
  translatedAnnouncement,
  translatedBadge,
  translatedChallenge,
  translatedCircleBoards,
  translatedCircleDescription,
  translatedCircleName,
  translatedGuildDescription,
  translatedGuildName,
  translatedMetric,
  translatedOptionLabel,
  translatedSystemComment,
  translatedTitle,
  unlockedBadges,
  walletData,
  walletTransactions
} = useAppContext();

const commonHeaderStats = computed<WorkbenchStat[]>(() => {
  const rows: WorkbenchStat[] = [];
  rows.push({ label: copy('今日记录', 'Today'), value: stats.value?.todayRecords ?? 0, accent: 'primary' });
  rows.push({ label: copy('总记录', 'Total'), value: stats.value?.totalRecords ?? 0, accent: 'muted' });
  rows.push({ label: copy('最高分', 'Top Score'), value: stats.value?.topScore ?? 0, accent: 'mint' });
  if (walletData.value?.wallet) {
    rows.push({ label: copy('鱼鳞余额', 'Fish Scale'), value: walletData.value.wallet.fishScaleBalance, accent: 'primary' });
  }
  return rows;
});

const leaderboardHeaderStats = computed<WorkbenchStat[]>(() => {
  const rows: WorkbenchStat[] = [];
  rows.push({ label: copy('当前榜单', 'Active Board'), value: selectedBoard.value?.label ?? t('leaderboard'), accent: 'primary' });
  rows.push({ label: copy('共计条目', 'Rows'), value: leaderboardResultCount.value, accent: 'mint' });
  rows.push({ label: copy('今日记录', 'Today'), value: stats.value?.todayRecords ?? 0, accent: 'muted' });
  rows.push({ label: copy('最高分', 'Top Score'), value: stats.value?.topScore ?? 0, accent: 'mint' });
  return rows;
});

const profileHeaderStats = computed<WorkbenchStat[]>(() => {
  const rows: WorkbenchStat[] = [];
  rows.push({ label: copy('累计分数', 'Total Score'), value: profile.value?.totalScore.toFixed(1) ?? '0.0', accent: 'primary' });
  rows.push({ label: copy('记录数', 'Records'), value: profile.value?.records.length ?? 0, accent: 'muted' });
  rows.push({ label: copy('已解锁徽章', 'Badges'), value: `${unlockedBadges.value.length} / ${allProfileBadges.value.length}`, accent: 'mint' });
  if (walletData.value?.wallet) {
    rows.push({ label: copy('鱼鳞余额', 'Fish Scale'), value: walletData.value.wallet.fishScaleBalance, accent: 'primary' });
  }
  return rows;
});

const walletHeaderStats = computed<WorkbenchStat[]>(() => {
  if (!walletData.value?.wallet) return [];
  return [
    { label: copy('当前余额', 'Balance'), value: walletData.value.wallet.fishScaleBalance, accent: 'primary' },
    { label: copy('累计获得', 'Earned'), value: walletData.value.wallet.fishScaleTotalEarned, accent: 'mint' },
    { label: copy('累计消费', 'Spent'), value: walletData.value.wallet.fishScaleTotalSpent, accent: 'danger' },
    { label: copy('鱼鳞等级', 'Scale Level'), value: walletData.value.wallet.level, accent: 'muted' }
  ];
});

const communityHeaderStats = computed<WorkbenchStat[]>(() => [
  { label: copy('公开记录', 'Public'), value: communityRecords.value.length, accent: 'primary' },
  { label: copy('热门话题', 'Topics'), value: popularTopics.value.length, accent: 'mint' },
  { label: copy('今日记录', 'Today'), value: stats.value?.todayRecords ?? 0, accent: 'muted' },
  { label: copy('最高分', 'Top Score'), value: stats.value?.topScore ?? 0, accent: 'mint' }
]);

const safetyHeaderStats = computed<WorkbenchStat[]>(() => [
  { label: copy('敏感词', 'Sensitive Terms'), value: options.value.sensitiveTerms.length, accent: 'danger' },
  { label: copy('故事上限', 'Story Limit'), value: options.value.maxDescriptionLength, accent: 'muted' },
  { label: copy('今日记录', 'Today'), value: stats.value?.todayRecords ?? 0, accent: 'primary' },
  { label: copy('总记录', 'Total'), value: stats.value?.totalRecords ?? 0, accent: 'mint' }
]);

const checkinHeaderStats = computed<WorkbenchStat[]>(() => [
  { label: copy('连续签到', 'Streak'), value: `${checkin.value?.streak ?? 0} ${copy('天', 'd')}`, accent: 'primary' },
  { label: copy('累计签到', 'Total'), value: `${checkin.value?.total ?? 0} ${copy('次', 'x')}`, accent: 'mint' },
  { label: copy('今日日期', 'Today'), value: checkin.value?.today ?? '-', accent: 'muted' },
  { label: copy('状态', 'Status'), value: checkin.value?.checkedToday ? copy('已签到', 'Checked') : copy('待签到', 'Pending'), accent: checkin.value?.checkedToday ? 'mint' : 'danger' }
]);

const submitRecentRecords = computed(() => communityRecords.value.slice(0, 3));

// Collapsible comment compose on community feed. We track per-record open
// state locally so the input is hidden by default and expands on click.
const commentComposerOpen = reactive<Record<number, boolean>>({});
const toggleCommentComposer = (recordId: number) => {
  commentComposerOpen[recordId] = !commentComposerOpen[recordId];
  if (commentComposerOpen[recordId] && feedCommentDrafts[recordId] === undefined) {
    feedCommentDrafts[recordId] = '';
  }
};
</script>

<template>
  <section class="workspace">
    <!-- =============================== SUBMIT =============================== -->
    <PageWorkbench v-if="activeSection === 'submit'">
      <WorkbenchHeader
        :icon="Send"
        :title="t('submitRecord')"
        :subtitle="copy('记录一段匿名化办公精神状态，系统会按持续时间计算 Fish Power Score。', 'Record an anonymized slice of office mood. The system calculates a Fish Power Score from the duration tier.')"
        :stats="commonHeaderStats"
      />

      <WorkbenchGrid columns="two">
        <template #main>
          <PxCard id="submit" class="panel submit-panel fill">
            <template #header>
              <div class="panel-title"><Inbox :size="18" /><span>{{ copy('提交表单', 'Submission Form') }}</span></div>
            </template>

            <form class="record-form" @submit.prevent="handleSubmit">
              <label class="field">
                <span>{{ t('nickname') }}</span>
                <PxInput v-model="form.nickname" :placeholder="copy('匿名鱼', 'Anonymous Fish')" clearable />
              </label>

              <label class="field">
                <span>{{ copy('你刚才主要在干什么？', 'What were you mainly doing?') }}</span>
                <PxInput
                  v-model="form.activityText"
                  :maxlength="options.maxActivityTextLength"
                  :placeholder="copy('例如：假装看需求文档，其实在研究今晚吃什么', 'Example: pretending to read requirements while deciding dinner')"
                  clearable
                />
                <small class="field-hint">
                  {{ copy('这是自由填写的摸鱼事项，不参与额外加分。', 'Free-form activity text; does not add score by itself.') }}
                </small>
              </label>

              <label class="field">
                <span>{{ copy('这次摸了多久？', 'How long did this drift last?') }}</span>
                <select v-model="form.duration">
                  <option v-for="item in options.durations" :key="item.key" :value="item.key">
                    {{ translatedOptionLabel(item.key, item.label) }} · {{ item.score ?? item.baseScore }} {{ copy('分', 'pts') }}
                  </option>
                </select>
                <small class="field-hint">
                  {{ copy('Fish Power Score 由持续时间档位决定。', 'Fish Power Score is decided only by duration tier.') }}
                </small>
              </label>

              <label class="field">
                <span>{{ copy('补充一下现场情况', 'Add the scene details') }}</span>
                <textarea
                  v-model="form.description"
                  :maxlength="options.maxDescriptionLength + 20"
                  :placeholder="copy('比如：风险场景、伪装方式、你是怎么圆过去的。不要写公司名、客户名、聊天记录。', 'For example: the risky scene, the disguise, and how you explained it. Do not include company, client, or chat records.')"
                />
              </label>

              <section class="topic-field">
                <div class="topic-field-head">
                  <span><Hash :size="15" />{{ copy('添加话题', 'Add Topics') }}</span>
                  <small>{{ form.topics.length }} / 5</small>
                </div>
                <p class="field-hint">{{ copy('话题用于发现和圈子归类，不参与评分。', 'Topics help discovery and circle matching; they do not affect scoring.') }}</p>
                <div class="topic-input-row">
                  <input
                    v-model="topicDraft"
                    type="text"
                    maxlength="32"
                    :placeholder="copy('例如：今日精神状态，按回车添加', 'Example: office mood. Press Enter to add')"
                    @keydown.enter.prevent="addTopicFromDraft"
                  />
                  <button type="button" @click="addTopicFromDraft">{{ copy('添加', 'Add') }}</button>
                </div>
                <p v-if="topicError" class="topic-error">{{ topicError }}</p>
                <div v-if="form.topics.length" class="topic-chip-list editable">
                  <button v-for="topic in form.topics" :key="topic" type="button" class="topic-chip selected" @click="removeTopic(topic)">
                    #{{ topic }} <X :size="13" />
                  </button>
                </div>
                <div v-else class="topic-empty">{{ copy('还没有话题，这条鱼暂时没有标签。', 'No topics yet.') }}</div>
                <div class="topic-suggestions">
                  <button
                    v-for="topic in topicSuggestions"
                    :key="topic"
                    type="button"
                    :class="{ active: isTopicSelected(topic) }"
                    :disabled="isTopicSelected(topic)"
                    @click="addTopic(topic)"
                  >
                    #{{ topic }}
                  </button>
                </div>
              </section>

              <div id="content-guard" class="form-meta" :class="{ danger: activityTextRemaining < 0 || descriptionRemaining < 0 || sensitiveHits.length > 0 }">
                <span>{{ copy('事项剩余', 'Activity remaining') }} {{ activityTextRemaining }} · {{ copy('故事剩余', 'Story remaining') }} {{ descriptionRemaining }}</span>
                <span v-if="sensitiveHits.length">{{ copy('疑似敏感词：', 'Sensitive terms: ') }}{{ sensitiveHits.join(locale === 'en-US' ? ', ' : '、') }}</span>
                <span v-else>{{ copy('无图片上传 · 后端重新计算分数 · 可疑内容进入审核', 'No image upload · Server recalculates score · Suspicious content goes to review') }}</span>
              </div>

              <label class="checkbox-line">
                <input v-model="form.anonymized" type="checkbox" />
                <span>{{ t('anonymized') }}</span>
              </label>

              <section class="publish-scope">
                <div class="profile-section-head">
                  <strong>{{ copy('发布范围', 'Publish Scope') }}</strong>
                  <small>{{ copy('匿名化之后再公开展示', 'Anonymize before publishing') }}</small>
                </div>
                <label class="checkbox-line">
                  <input v-model="form.publishToCommunity" type="checkbox" :disabled="form.privateOnly" @change="handleCommunityScopeChange" />
                  <span>{{ copy('发布到社区广场', 'Publish to Community Plaza') }}</span>
                </label>
                <label class="checkbox-line">
                  <input v-model="form.autoCircles" type="checkbox" :disabled="form.privateOnly" />
                  <span>{{ copy('自动加入相关圈子', 'Auto-add to related circles') }}</span>
                </label>
                <label class="checkbox-line">
                  <input v-model="form.privateOnly" type="checkbox" @change="handlePrivateOnlyChange" />
                  <span>{{ copy('仅自己可见', 'Private only') }}</span>
                </label>
                <div v-if="joinedGroups.length" class="scope-groups">
                  <span>{{ copy('同步到我的小组', 'Sync to My Groups') }}</span>
                  <label v-for="group in joinedGroups" :key="group.id" class="scope-group-option">
                    <input v-model="form.groupIds" type="checkbox" :value="group.id" :disabled="form.privateOnly" />
                    <span>{{ group.name }}</span>
                  </label>
                </div>
                <p v-else class="scope-note">{{ copy('还没有可同步的小组。可以去「我的小组」创建一个地下茶水间。', 'No group available. Create one in My Groups.') }}</p>
              </section>

              <p v-if="errorMessage" class="error-line"><AlertTriangle :size="16" />{{ errorMessage }}</p>
              <p v-if="statusMessage" class="status-line"><Check :size="16" />{{ statusMessage }}</p>

              <div class="form-actions">
                <PxButton type="primary" native-type="submit" :disabled="!canSubmit" :loading="loading">
                  <Send :size="16" />{{ t('submit') }}
                </PxButton>
                <PxButton type="base" native-type="button" @click="resetForm">
                  <RefreshCw :size="16" />{{ t('reset') }}
                </PxButton>
              </div>
            </form>
          </PxCard>
        </template>

        <template #side>
          <PxCard id="result" class="panel result-panel fill">
            <template #header>
              <div class="panel-title"><Trophy :size="18" /><span>{{ t('result') }}</span></div>
            </template>

            <div v-if="selectedRecord" class="result-body">
              <div class="score-block">
                <span class="score-number">{{ selectedRecord.score.toFixed(1) }}</span>
                <span class="score-label">Fish Power Score</span>
              </div>
              <div class="result-tags">
                <PxTag type="primary">{{ copy('称号', 'Title') }} {{ translatedTitle(selectedRecord.title) }}</PxTag>
                <PxTag type="warning" v-if="lastResult">{{ copy('今日第', 'Today #') }} {{ lastResult.todayRank || '-' }} {{ copy('名', '') }}</PxTag>
                <PxTag type="success" v-if="lastResult">{{ copy('累计', 'Total') }} {{ lastResult.cumulativeScore.toFixed(1) }}</PxTag>
                <PxTag type="success" v-if="lastResult?.fishScaleReward">{{ copy('鱼鳞 +', 'Fish Scale +') }}{{ lastResult.fishScaleReward.awardedAmount }}</PxTag>
                <PxTag type="info" v-if="selectedRecord.guildContribution > 0">{{ copy('工会贡献 +', 'Guild +') }}{{ selectedRecord.guildContribution.toFixed(1) }}</PxTag>
                <PxTag type="info" v-if="selectedRecord.status === 'pending'">{{ t('pending') }}</PxTag>
              </div>
              <p v-if="lastResult?.fishScaleReward" class="status-line"><Coins :size="16" />{{ lastResult.fishScaleReward.message || copy(`本次摸鱼获得 +${lastResult.fishScaleReward.awardedAmount} 鱼鳞。`, `This record earned +${lastResult.fishScaleReward.awardedAmount} Fish Scale.`) }}</p>
              <p class="comment">{{ translatedSystemComment(selectedRecord.systemComment) }}</p>

              <dl class="breakdown result-summary">
                <div><dt>{{ copy('持续时间', 'Duration') }}</dt><dd>{{ selectedRecord.durationLabel }}</dd></div>
                <div><dt>{{ copy('摸鱼事项', 'Activity') }}</dt><dd>{{ selectedRecord.activityText }}</dd></div>
                <div><dt>{{ copy('摸鱼故事', 'Story') }}</dt><dd>{{ selectedRecord.storyText || selectedRecord.description }}</dd></div>
                <div><dt>{{ copy('持续时间分', 'Duration Score') }}</dt><dd>{{ selectedRecord.breakdown.durationScore ?? selectedRecord.breakdown.durationBaseScore }}</dd></div>
              </dl>

              <div v-if="selectedRecord.topics?.length" class="topic-chip-list record-topic-list">
                <button v-for="topic in selectedRecord.topics" :key="topic.id" type="button" class="topic-chip" @click="openTopic(topic.slug)">#{{ topic.name }}</button>
              </div>

              <div class="interaction-bar">
                <button type="button" :class="{ active: social?.viewer.liked }" @click="handleInteraction('like')">
                  <Heart :size="16" />{{ t('like') }} {{ selectedRecord.likeCount }}
                </button>
                <button type="button" :class="{ active: social?.viewer.favorited }" @click="handleInteraction('favorite')">
                  <Star :size="16" />{{ t('favorite') }} {{ selectedRecord.favoriteCount }}
                </button>
                <button type="button" :class="{ active: social?.viewer.voted }" :title="copy('发起传奇提名将消耗 10 鱼鳞。', 'Legend nomination costs 10 Fish Scale.')" @click="handleInteraction('vote')">
                  <Crown :size="16" />{{ copy('传奇提名 · 10 鱼鳞', 'Nominate · 10 Scale') }} {{ selectedRecord.voteCount }}
                </button>
                <button type="button" @click="handleShare"><Share2 :size="16" />{{ t('share') }}</button>
              </div>
            </div>

            <div v-else class="empty-result">
              <span class="empty-score">--.-</span>
              <p>{{ copy('本次得分预览', 'Preview your next score') }}</p>
              <p class="score-label">{{ copy('提交后会显示称号、今日排名、鱼鳞奖励、系统评论和互动入口。', 'After submission you will see title, rank, fish scale, system comment, and interactions here.') }}</p>
              <section class="safety-checklist">
                <strong>{{ copy('提交前安全检查', 'Pre-submit Safety Check') }}</strong>
                <ul>
                  <li>{{ copy('不写真实公司名', 'No real company names') }}</li>
                  <li>{{ copy('不写客户资料', 'No client details') }}</li>
                  <li>{{ copy('不上传截图', 'No screenshot uploads') }}</li>
                  <li>{{ copy('不写聊天记录', 'No chat records') }}</li>
                </ul>
              </section>
            </div>
          </PxCard>
        </template>
      </WorkbenchGrid>

      <!-- bottom strip -->
      <div class="workbench-strip">
        <PxCard class="panel strip-card fill">
          <template #header>
            <div class="panel-title"><Hash :size="16" /><span>{{ copy('热门话题', 'Popular Topics') }}</span></div>
          </template>
          <div v-if="popularTopics.length" class="topic-chip-list">
            <button v-for="topic in popularTopics" :key="topic.id" type="button" class="topic-chip" @click="openTopic(topic.slug)">
              #{{ topic.name }} <span>{{ topic.usage_count }}</span>
            </button>
          </div>
          <div v-else class="empty-list">{{ copy('还没有被频繁使用的话题。', 'No trending topics yet.') }}</div>
        </PxCard>

        <PxCard class="panel strip-card fill">
          <template #header>
            <div class="panel-title"><ShieldAlert :size="16" /><span>{{ copy('安全边界', 'Safety Boundary') }}</span></div>
          </template>
          <p class="safety-inline">{{ copy(options.safetyNotice, 'Do not submit company secrets, privacy, employee IDs, chat records, client data, or non-anonymized screenshots. For entertainment only.') }}</p>
        </PxCard>

        <PxCard class="panel strip-card fill">
          <template #header>
            <div class="panel-title"><Inbox :size="16" /><span>{{ copy('最近提交摘要', 'Recent Submissions') }}</span></div>
          </template>
          <div v-if="submitRecentRecords.length" class="mini-feed-list">
            <article v-for="record in submitRecentRecords" :key="record.id" class="mini-feed-item">
              <strong>{{ record.nickname }}</strong>
              <span>{{ record.score.toFixed(1) }} · {{ translatedTitle(record.title) }}</span>
              <small>{{ record.activityText }}</small>
            </article>
          </div>
          <div v-else class="empty-list">{{ copy('今天还没有鱼浮出水面。', 'No fish surfaced today yet.') }}</div>
        </PxCard>
      </div>
    </PageWorkbench>

    <!-- =============================== RESULT =============================== -->
    <PageWorkbench v-else-if="activeSection === 'result' || activeSection === 'social'">
      <WorkbenchHeader
        :icon="Trophy"
        :title="activeSection === 'social' ? t('comments') : t('result')"
        :subtitle="copy('查看分数、称号、今日排名、系统评论，以及点赞、收藏、传奇提名和分享卡。', 'See score, title, today\'s rank, system comment, and interaction actions.')"
        :stats="commonHeaderStats"
      />

      <WorkbenchGrid columns="two">
        <template #main>
          <PxCard id="result" class="panel result-panel fill">
            <template #header>
              <div class="panel-title"><Trophy :size="18" /><span>{{ t('result') }}</span></div>
            </template>
            <div v-if="selectedRecord" class="result-body">
              <div class="score-block">
                <span class="score-number">{{ selectedRecord.score.toFixed(1) }}</span>
                <span class="score-label">Fish Power Score</span>
              </div>
              <div class="result-tags">
                <PxTag type="primary">{{ translatedTitle(selectedRecord.title) }}</PxTag>
                <PxTag type="warning" v-if="lastResult">{{ copy('今日第', 'Today #') }} {{ lastResult.todayRank || '-' }}</PxTag>
                <PxTag type="success" v-if="lastResult">{{ copy('累计', 'Total') }} {{ lastResult.cumulativeScore.toFixed(1) }}</PxTag>
                <PxTag type="info" v-if="selectedRecord.guildContribution > 0">{{ copy('工会贡献 +', 'Guild +') }}{{ selectedRecord.guildContribution.toFixed(1) }}</PxTag>
              </div>
              <p class="comment">{{ translatedSystemComment(selectedRecord.systemComment) }}</p>
              <dl class="breakdown result-summary">
                <div><dt>{{ copy('持续时间', 'Duration') }}</dt><dd>{{ selectedRecord.durationLabel }}</dd></div>
                <div><dt>{{ copy('摸鱼事项', 'Activity') }}</dt><dd>{{ selectedRecord.activityText }}</dd></div>
                <div><dt>{{ copy('摸鱼故事', 'Story') }}</dt><dd>{{ selectedRecord.storyText || selectedRecord.description }}</dd></div>
                <div><dt>{{ copy('持续时间分', 'Duration Score') }}</dt><dd>{{ selectedRecord.breakdown.durationScore ?? selectedRecord.breakdown.durationBaseScore }}</dd></div>
              </dl>
              <div class="interaction-bar">
                <button type="button" :class="{ active: social?.viewer.liked }" @click="handleInteraction('like')"><Heart :size="16" />{{ t('like') }} {{ selectedRecord.likeCount }}</button>
                <button type="button" :class="{ active: social?.viewer.favorited }" @click="handleInteraction('favorite')"><Star :size="16" />{{ t('favorite') }} {{ selectedRecord.favoriteCount }}</button>
                <button type="button" :class="{ active: social?.viewer.voted }" @click="handleInteraction('vote')"><Crown :size="16" />{{ copy('传奇提名', 'Nominate') }} {{ selectedRecord.voteCount }}</button>
                <button type="button" @click="handleShare"><Share2 :size="16" />{{ t('share') }}</button>
              </div>
            </div>
            <div v-else class="empty-result">
              <span class="empty-score">--.-</span>
              <p>{{ t('noRecord') }}</p>
            </div>
          </PxCard>
        </template>

        <template #side>
          <PxCard id="social" class="panel social-panel fill">
            <template #header>
              <div class="panel-title between">
                <span><MessageCircle :size="18" /> {{ t('comments') }}</span>
                <small v-if="selectedRecord">{{ selectedRecord.commentCount }} comments</small>
              </div>
            </template>
            <div v-if="selectedRecord" class="social-body">
              <div class="share-card" v-if="shareCard">
                <strong>{{ locale === 'en-US' ? `${selectedRecord.nickname} scored ${selectedRecord.score.toFixed(1)} Fish Power` : shareCard.title }}</strong>
                <span>{{ locale === 'en-US' ? `${translatedTitle(selectedRecord.title)} · Gongwei Yuwang` : shareCard.subtitle }}</span>
                <p>{{ locale === 'en-US' ? `I got ${selectedRecord.score.toFixed(1)} Fish Power on Gongwei Yuwang.` : shareCard.shareText }}</p>
              </div>
              <div class="comments-list" v-if="social?.comments.length">
                <div v-for="comment in social.comments" :key="comment.id" class="comment-item">
                  <strong>{{ comment.nickname }}</strong>
                  <span>{{ comment.content }}</span>
                </div>
              </div>
              <div v-else class="empty-list">{{ t('noComments') }}</div>
              <div class="comment-compose">
                <PxInput v-model="commentText" :placeholder="t('comments')" clearable />
                <PxButton type="primary" size="small" @click="handleComment">{{ t('addComment') }}</PxButton>
              </div>
            </div>
            <div v-else class="empty-list">{{ t('noRecord') }}</div>
          </PxCard>
        </template>
      </WorkbenchGrid>
    </PageWorkbench>

    <!-- =============================== LEADERBOARD =============================== -->
    <PageWorkbench v-else-if="activeSection === 'leaderboard'">
      <WorkbenchHeader
        :icon="Trophy"
        :title="t('leaderboard')"
        :subtitle="copy('按用户聚合展示分数、互动和传奇提名，不展开单条内容。', 'User-aggregated scores, interactions, and legend nominations.')"
        :stats="leaderboardHeaderStats"
      >
        <template #actions>
          <button class="workbench-action" type="button" @click="loadLeaderboard">
            <RefreshCw :size="14" />{{ copy('刷新', 'Refresh') }}
          </button>
        </template>
      </WorkbenchHeader>

      <WorkbenchGrid columns="three">
        <template #left>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Trophy :size="16" /><span>{{ copy('榜单类型', 'Board Type') }}</span></div>
            </template>
            <div class="board-type-list">
              <button
                v-for="board in localizedLeaderboardTypes"
                :key="board.key"
                class="board-type-button"
                :class="{ active: activeBoard === board.key }"
                type="button"
                @click="activeBoard = board.key"
              >
                <strong>{{ board.label }}</strong>
                <small>{{ board.description }}</small>
              </button>
            </div>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Search :size="16" /><span>{{ copy('筛选', 'Filter') }}</span></div>
            </template>
            <div class="filter-body">
              <PxInput v-model="filterKeyword" :placeholder="t('filter')" clearable>
                <template #prefix><Search :size="14" /></template>
              </PxInput>
              <button v-if="filterKeyword" class="profile-toggle-button" type="button" @click="clearLeaderboardFilter">
                {{ copy('清空筛选', 'Clear Filter') }}
              </button>
            </div>
          </PxCard>
        </template>

        <template #main>
          <PxCard id="leaderboard" class="panel leaderboard-panel fill">
            <template #header>
              <div class="panel-title between">
                <span>{{ selectedBoard?.label ?? t('leaderboard') }}</span>
                <small>{{ selectedBoard?.description }} · {{ leaderboardResultCount }} {{ copy('条', 'rows') }}</small>
              </div>
            </template>

            <div v-if="leaderboardLoading" class="loading-line">{{ copy('排行榜加载中...', 'Loading leaderboards...') }}</div>
            <ol v-else-if="leaderboardRows.length" class="leaderboard-list">
              <li
                v-for="row in leaderboardRows"
                :key="`${activeBoard}-${row.rank}-${row.nickname}-${row.createdAt}`"
                :class="['leaderboard-item', row.rank === 1 ? 'rank-1' : row.rank === 2 ? 'rank-2' : row.rank === 3 ? 'rank-3' : '']"
              >
                <button type="button" class="leaderboard-row leaderboard-row-summary">
                  <span class="rank">#{{ row.rank }}</span>
                  <div class="leader-main">
                    <strong>{{ row.nickname }}</strong>
                    <span>{{ row.username ? `@${row.username}` : copy('匿名昵称聚合', 'Anonymous nickname aggregate') }}</span>
                    <p>{{ copy('共提交', 'Submitted') }} {{ row.count ?? 0 }} {{ copy('条记录', 'records') }}</p>
                  </div>
                  <div class="leader-score">
                    <strong>{{ row.score.toFixed(1) }}</strong>
                    <span>{{ translatedMetric(row) }}</span>
                    <small>{{ t('like') }} {{ row.likeCount }} · {{ t('favorite') }} {{ row.favoriteCount }} · {{ copy('传奇', 'Legend') }} {{ row.voteCount }}</small>
                  </div>
                </button>
              </li>
            </ol>
            <div v-else class="empty-list">{{ copy('暂无记录，第一条鱼还没入库。', 'No records yet.') }}</div>
          </PxCard>
        </template>

        <template #side>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Crown :size="16" /><span>{{ copy('榜单三甲', 'Top Three') }}</span></div>
            </template>
            <div v-if="leaderboardRows.length" class="top-three">
              <article
                v-for="row in leaderboardRows.slice(0, 3)"
                :key="`top-${row.rank}-${row.nickname}`"
                :class="['top-three-card', `rank-${row.rank}`]"
              >
                <span class="top-three-rank">#{{ row.rank }}</span>
                <strong>{{ row.nickname }}</strong>
                <small>{{ row.score.toFixed(1) }} · {{ translatedMetric(row) }}</small>
              </article>
            </div>
            <div v-else class="empty-list">{{ copy('榜单还在等第一条鱼。', 'Waiting for the first fish.') }}</div>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><BadgeCheck :size="16" /><span>{{ copy('榜单规则', 'Board Rules') }}</span></div>
            </template>
            <ul class="rule-list">
              <li>{{ copy('按用户聚合，不展开单条记录。', 'Aggregated by user, not per record.') }}</li>
              <li>{{ copy('Fish Power Score 仅由持续时间决定。', 'Fish Power Score only depends on duration.') }}</li>
              <li>{{ copy('传奇榜需要社区提名。', 'Legend board requires community nominations.') }}</li>
              <li>{{ copy('伪装榜统计伪装加成。', 'Disguise board counts disguise bonuses.') }}</li>
            </ul>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><User :size="16" /><span>{{ copy('我的位置', 'My Position') }}</span></div>
            </template>
            <div v-if="currentUser" class="my-position">
              <strong>{{ currentUser.displayName }}</strong>
              <span>@{{ currentUser.username }}</span>
              <p>{{ copy('提交更多记录后，这里会显示你在当前榜单的位置和与上一名的差距。', 'Submit more records to see your position and gap on the current board.') }}</p>
            </div>
            <div v-else class="empty-list">{{ copy('登录后查看自己的位置', 'Sign in to view your position') }}</div>
          </PxCard>
        </template>
      </WorkbenchGrid>
    </PageWorkbench>

    <!-- =============================== COMMUNITY =============================== -->
    <PageWorkbench v-else-if="activeSection === 'community'">
      <WorkbenchHeader
        :icon="MessageCircle"
        :title="t('community')"
        :subtitle="copy('公共水域，只展示已公开且通过审核的记录。', 'Public waters: only public approved records are shown.')"
        :stats="communityHeaderStats"
      />

      <WorkbenchGrid columns="three">
        <template #left>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Inbox :size="16" /><span>{{ copy('排序', 'Sort') }}</span></div>
            </template>
            <div class="feed-filters vertical">
              <button type="button" :class="{ active: communityFilter === 'latest' }" @click="communityFilter = 'latest'">{{ copy('最新摸鱼', 'Latest') }}</button>
              <button type="button" :class="{ active: communityFilter === 'hot' }" @click="communityFilter = 'hot'">{{ copy('今日热门', 'Hot Today') }}</button>
              <button type="button" :class="{ active: communityFilter === 'high' }" @click="communityFilter = 'high'">{{ copy('高分记录', 'High Score') }}</button>
              <button type="button" :class="{ active: communityFilter === 'legendary' }" @click="communityFilter = 'legendary'">{{ copy('传奇候选', 'Legend Candidates') }}</button>
            </div>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Hash :size="16" /><span>{{ copy('话题筛选', 'Topics') }}</span></div>
            </template>
            <div v-if="popularTopics.length" class="topic-chip-list compact-topic-list">
              <button v-for="topic in popularTopics" :key="topic.id" type="button" class="topic-chip" @click="openTopic(topic.slug)">
                #{{ topic.name }} <span>{{ topic.usage_count }}</span>
              </button>
            </div>
            <div v-else class="empty-list">{{ copy('暂无热门话题。', 'No popular topics yet.') }}</div>
          </PxCard>
        </template>

        <template #main>
          <PxCard id="community" class="panel community-panel fill">
            <template #header>
              <div class="panel-title between">
                <span><MessageCircle :size="18" /> {{ copy('社区信息流', 'Community Feed') }}</span>
                <small>{{ communityRecords.length }} {{ copy('条', 'items') }}</small>
              </div>
            </template>
            <div v-if="communityLoading" class="loading-line">{{ copy('社区广场加载中...', 'Loading community feed...') }}</div>
            <div v-else-if="communityRecords.length" class="record-card-list">
              <article v-for="record in communityRecords" :key="record.id" class="record-card">
                <header>
                  <div>
                    <strong>{{ record.nickname }}</strong>
                    <small>{{ new Date(record.createdAt).toLocaleString() }}</small>
                  </div>
                  <div class="record-score">
                    <strong>{{ record.score.toFixed(1) }}</strong>
                    <span>{{ translatedTitle(record.title) }}</span>
                  </div>
                </header>
                <small class="record-duration">{{ record.durationLabel }}</small>
                <strong class="record-activity">{{ record.activityText }}</strong>
                <p>{{ record.storyText || record.description }}</p>
                <div v-if="record.topics?.length" class="topic-chip-list record-topic-list">
                  <button v-for="topic in record.topics" :key="topic.id" type="button" class="topic-chip" @click="openTopic(topic.slug)">#{{ topic.name }}</button>
                </div>
                <div class="record-tags">
                  <span v-for="tag in record.tags" :key="tag.id">{{ translatedCircleName(tag) }}</span>
                  <span v-if="record.guild">{{ copy('为', 'For ') }}{{ translatedGuildName(record.guild) }}{{ copy('贡献 +', ' +') }}{{ record.guildContribution.toFixed(1) }}</span>
                </div>
                <div class="record-actions">
                  <button type="button" :class="{ active: record.viewer.liked }" @click="handleFeedLike(record.id)">{{ t('like') }} {{ record.likeCount }}</button>
                  <button type="button" @click="openProfileRecord(record.id)">{{ t('comments') }} {{ record.commentCount }}</button>
                  <button type="button" :class="{ active: record.viewer.legendNominated }" @click="handleFeedNominate(record.id)">{{ copy('传奇提名', 'Nominate') }} {{ record.legendNominationCount }}</button>
                  <button type="button" :class="{ active: record.viewer.reported }" @click="handleFeedReport(record.id)">{{ copy('举报', 'Report') }} {{ record.reportCount }}</button>
                  <button type="button" class="toggle-compose" @click="toggleCommentComposer(record.id)">
                    {{ commentComposerOpen[record.id] ? copy('收起', 'Hide') : copy('写评论', 'Comment') }}
                  </button>
                </div>
                <div v-if="commentComposerOpen[record.id]" class="feed-comment-row">
                  <PxInput v-model="feedCommentDrafts[record.id]" :placeholder="copy('120 字以内，别写真实公司或客户', 'Within 120 chars.')" clearable />
                  <button type="button" @click="handleFeedComment(record.id)">{{ t('addComment') }}</button>
                </div>
              </article>
            </div>
            <div v-else class="empty-list">{{ copy('今天还没有鱼浮出水面。', 'No fish surfaced today yet.') }}</div>
          </PxCard>
        </template>

        <template #side>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Trophy :size="16" /><span>{{ copy('今日鱼塘状态', 'Pond Status') }}</span></div>
            </template>
            <dl class="side-stats">
              <div><dt>{{ copy('今日记录', 'Today') }}</dt><dd>{{ stats?.todayRecords ?? 0 }}</dd></div>
              <div><dt>{{ copy('总记录', 'Total') }}</dt><dd>{{ stats?.totalRecords ?? 0 }}</dd></div>
              <div><dt>{{ copy('最高分', 'Top Score') }}</dt><dd>{{ stats?.topScore ?? 0 }}</dd></div>
              <div><dt>{{ copy('公共条数', 'Public') }}</dt><dd>{{ communityRecords.length }}</dd></div>
            </dl>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Hash :size="16" /><span>{{ copy('热门话题', 'Popular Topics') }}</span></div>
            </template>
            <div v-if="popularTopics.length" class="topic-chip-list">
              <button v-for="topic in popularTopics" :key="topic.id" type="button" class="topic-chip" @click="openTopic(topic.slug)">
                #{{ topic.name }} <span>{{ topic.usage_count }}</span>
              </button>
            </div>
            <div v-else class="empty-list">{{ copy('暂无热门话题。', 'No trending topics.') }}</div>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><ShieldAlert :size="16" /><span>{{ copy('安全提示', 'Safety Notice') }}</span></div>
            </template>
            <p class="safety-inline">{{ copy(options.safetyNotice, 'Keep content anonymous. No company, client, or chat details.') }}</p>
          </PxCard>
        </template>
      </WorkbenchGrid>
    </PageWorkbench>

    <!-- =============================== PROFILE =============================== -->
    <PageWorkbench v-else-if="activeSection === 'profile'">
      <WorkbenchHeader
        :icon="User"
        :title="currentUser ? currentUser.displayName : t('profile')"
        :subtitle="currentUser ? currentProfileTitle : copy('登录后查看等级、徽章和历史记录。', 'Sign in to view level, badges and history.')"
        :stats="profileHeaderStats"
      />

      <PxCard v-if="!currentUser" class="panel fill">
        <template #header>
          <div class="panel-title"><User :size="18" /><span>{{ t('profile') }}</span></div>
        </template>
        <div class="empty-list">{{ t('needLogin') }}</div>
      </PxCard>

      <WorkbenchGrid v-else columns="three">
        <template #left>
          <PxCard id="profile" class="panel profile-panel fill">
            <template #header>
              <div class="panel-title"><User :size="18" /><span>{{ copy('资料编辑', 'Profile Edit') }}</span></div>
            </template>
            <div class="record-form">
              <label class="field"><span>{{ t('displayName') }}</span><PxInput v-model="profileForm.displayName" clearable /></label>
              <label class="field"><span>Bio</span><textarea v-model="profileForm.bio" maxlength="120" /></label>
              <PxButton type="primary" size="small" @click="saveProfile">{{ t('save') }}</PxButton>
              <div class="profile-stats" v-if="profile">
                <span>Total {{ profile.totalScore.toFixed(1) }}</span>
                <span>{{ profile.records.length }} records</span>
              </div>
            </div>
          </PxCard>
        </template>

        <template #main>
          <PxCard v-if="profile" class="panel fill">
            <template #header>
              <div class="panel-title"><Trophy :size="16" /><span>{{ t('levels') }}</span></div>
            </template>
            <ul class="level-list profile-levels">
              <li v-for="level in TITLE_LEVELS" :key="level.title" :class="{ active: isCurrentLevel(level) }">
                <span>{{ translatedTitle(level.title) }}</span>
                <small>{{ formatLevelRange(level) }}</small>
              </li>
            </ul>
          </PxCard>

          <PxCard v-if="profile" class="panel fill">
            <template #header>
              <div class="panel-title between">
                <span><BadgeCheck :size="16" /> {{ t('badges') }}</span>
                <small>{{ unlockedBadges.length }} / {{ allProfileBadges.length }}</small>
              </div>
            </template>
            <div class="profile-badge-grid">
              <article v-for="badge in displayedBadges" :key="badge.key" class="profile-badge-card" :class="{ unlocked: badge.unlocked }">
                <BadgeCheck :size="16" />
                <strong>{{ translatedBadge(badge).label }}</strong>
                <span>{{ translatedBadge(badge).description }}</span>
                <small>{{ badge.unlocked ? t('unlocked') : t('locked') }}</small>
              </article>
              <div v-if="!displayedBadges.length" class="empty-list">{{ copy('登录并互动后解锁徽章。', 'Sign in and interact to unlock badges.') }}</div>
            </div>
            <button class="profile-toggle-button" type="button" @click="showAllBadges = !showAllBadges">
              {{ showAllBadges ? copy('只看已解锁', 'Unlocked only') : copy('查看全部徽章', 'View all badges') }}
            </button>
          </PxCard>
        </template>

        <template #side>
          <PxCard v-if="profile" class="panel fill">
            <template #header>
              <div class="panel-title"><Inbox :size="16" /><span>{{ copy('近期记录', 'Recent Records') }}</span></div>
            </template>
            <div v-if="profile.records.length" class="profile-record-list">
              <button v-for="record in profile.records.slice(0, 6)" :key="record.id" class="profile-record-button" type="button" @click="openProfileRecord(record.id)">
                <span>{{ translatedTitle(record.title) }}</span>
                <strong>{{ record.score.toFixed(1) }}</strong>
                <small>{{ record.activityText }} · {{ record.status }}</small>
              </button>
            </div>
            <div v-else class="empty-list">{{ copy('还没有记录，去提交第一条吧。', 'No records yet. Submit your first one.') }}</div>
          </PxCard>

          <PxCard v-if="walletData" class="panel fill">
            <template #header>
              <div class="panel-title"><Coins :size="16" /><span>{{ copy('鱼鳞流水', 'Fish Scale Flow') }}</span></div>
            </template>
            <dl class="side-stats">
              <div><dt>{{ copy('余额', 'Balance') }}</dt><dd>{{ walletData.wallet.fishScaleBalance }}</dd></div>
              <div><dt>{{ copy('累计获得', 'Earned') }}</dt><dd class="scale-plus">{{ walletData.wallet.fishScaleTotalEarned }}</dd></div>
              <div><dt>{{ copy('累计消费', 'Spent') }}</dt><dd class="scale-minus">{{ walletData.wallet.fishScaleTotalSpent }}</dd></div>
              <div><dt>{{ copy('鱼鳞等级', 'Scale Lv') }}</dt><dd>{{ walletData.wallet.level }}</dd></div>
            </dl>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Crown :size="16" /><span>{{ copy('下一等级', 'Next Level') }}</span></div>
            </template>
            <p class="module-copy">{{ copy('持续提交匿名记录可以累计分数，解锁下一等级称号。', 'Keep submitting anonymous records to accumulate score and unlock the next level title.') }}</p>
          </PxCard>
        </template>
      </WorkbenchGrid>
    </PageWorkbench>

    <!-- =============================== WALLET =============================== -->
    <PageWorkbench v-else-if="activeSection === 'wallet'">
      <WorkbenchHeader
        :icon="Wallet"
        :title="t('wallet')"
        :subtitle="copy('查看鱼鳞余额、收支与等级，规则和流水一目了然。', 'Track Fish Scale balance, flow, and level alongside rules and history.')"
        :stats="walletHeaderStats"
      >
        <template #actions>
          <button class="workbench-action" type="button" @click="loadWallet">
            <RefreshCw :size="14" />{{ copy('刷新钱包', 'Refresh') }}
          </button>
        </template>
      </WorkbenchHeader>

      <PxCard v-if="!currentUser" class="panel fill">
        <template #header>
          <div class="panel-title"><Wallet :size="18" /><span>{{ t('wallet') }}</span></div>
        </template>
        <div class="empty-list">{{ t('needLogin') }}</div>
      </PxCard>

      <template v-else-if="walletData">
        <PxCard class="panel fill wallet-balance-hero">
          <div class="balance-hero">
            <div class="balance-hero-text">
              <span class="balance-hero-label">{{ copy('当前鱼鳞余额', 'Current Fish Scale Balance') }}</span>
              <strong class="balance-hero-amount">{{ walletData.wallet.fishScaleBalance }}</strong>
              <small>{{ walletData.notice }}</small>
            </div>
            <div class="balance-hero-meta">
              <span>{{ copy('鱼鳞等级', 'Scale Level') }}</span>
              <strong>{{ walletData.wallet.level }}</strong>
            </div>
          </div>
        </PxCard>

        <WorkbenchGrid columns="two">
          <template #main>
            <PxCard class="panel fill">
              <template #header>
                <div class="panel-title"><Coins :size="16" /><span>{{ copy('统计卡片', 'Stat Cards') }}</span></div>
              </template>
              <section class="profile-section profile-summary wallet-summary">
                <div>
                  <span>{{ copy('当前余额', 'Balance') }}</span>
                  <strong>{{ walletData.wallet.fishScaleBalance }}</strong>
                </div>
                <div>
                  <span>{{ copy('累计获得', 'Earned') }}</span>
                  <strong class="scale-plus">{{ walletData.wallet.fishScaleTotalEarned }}</strong>
                </div>
                <div>
                  <span>{{ copy('累计消费', 'Spent') }}</span>
                  <strong class="scale-minus">{{ walletData.wallet.fishScaleTotalSpent }}</strong>
                </div>
                <div>
                  <span>{{ copy('鱼鳞等级', 'Scale Level') }}</span>
                  <strong>{{ walletData.wallet.level }}</strong>
                </div>
              </section>
            </PxCard>

            <PxCard class="panel fill">
              <template #header>
                <div class="panel-title between">
                  <span><Inbox :size="16" /> {{ copy('流水时间线', 'Flow Timeline') }}</span>
                  <small>{{ walletTransactions?.total ?? walletData.recentTransactions.length }} {{ copy('条', 'items') }}</small>
                </div>
              </template>
              <div v-if="(walletTransactions?.transactions ?? walletData.recentTransactions).length" class="wallet-transaction-list">
                <article v-for="transaction in walletTransactions?.transactions ?? walletData.recentTransactions" :key="transaction.id" class="wallet-transaction">
                  <div>
                    <strong :class="transaction.amount >= 0 ? 'scale-plus' : 'scale-minus'">{{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}</strong>
                    <span>{{ transaction.reason }}</span>
                  </div>
                  <small>{{ transaction.type }} · {{ transaction.balanceAfter }} · {{ new Date(transaction.createdAt).toLocaleString() }}</small>
                </article>
              </div>
              <div v-else class="empty-list">{{ copy('还没有鱼鳞流水。', 'No Fish Scale transactions yet.') }}</div>
            </PxCard>
          </template>

          <template #side>
            <PxCard class="panel fill">
              <template #header>
                <div class="panel-title"><BadgeCheck :size="16" /><span>{{ copy('鱼鳞规则', 'Fish Scale Rules') }}</span></div>
              </template>
              <ul class="rule-list">
                <li>{{ copy('提交匿名记录可获得鱼鳞奖励。', 'Submit anonymous records to earn Fish Scale.') }}</li>
                <li>{{ copy('互动、分享与传奇提名都会影响流水。', 'Interactions, sharing, and legend nominations change the flow.') }}</li>
                <li>{{ copy('创建小组消耗 50 鱼鳞。', 'Creating a group costs 50 Fish Scale.') }}</li>
                <li>{{ copy('发起小组挑战消耗 30 鱼鳞。', 'Starting a group challenge costs 30 Fish Scale.') }}</li>
                <li>{{ copy('传奇提名单次消耗 10 鱼鳞。', 'Each legend nomination costs 10 Fish Scale.') }}</li>
              </ul>
            </PxCard>

            <PxCard class="panel fill">
              <template #header>
                <div class="panel-title"><ShieldAlert :size="16" /><span>{{ copy('安全提示', 'Safety Notice') }}</span></div>
              </template>
              <p class="safety-inline">{{ copy('鱼鳞仅作为娱乐化积分，不可提现，不代表真实金额。', 'Fish Scale is a playful score only. It cannot be redeemed and does not represent real money.') }}</p>
            </PxCard>
          </template>
        </WorkbenchGrid>
      </template>
      <PxCard v-else class="panel fill">
        <div class="empty-list">{{ copy('钱包加载中...', 'Loading wallet...') }}</div>
      </PxCard>
    </PageWorkbench>

    <!-- =============================== GUILDS =============================== -->
    <PageWorkbench v-else-if="activeSection === 'guilds'">
      <WorkbenchHeader
        :icon="Crown"
        :title="t('guilds')"
        :subtitle="copy('身份归属 / 赛季竞争。一次只能加入一个工会。', 'Identity and seasonal competition. One guild at a time.')"
        :stats="commonHeaderStats"
      />

      <WorkbenchGrid columns="three">
        <template #left>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Crown :size="16" /><span>{{ copy('工会列表', 'Guild List') }}</span></div>
            </template>
            <div class="entity-grid entity-grid-vertical">
              <article v-for="guild in guildsData?.guilds ?? []" :key="guild.id" class="entity-card" :class="{ active: guild.joined }">
                <b>{{ guild.icon }}</b>
                <strong>{{ translatedGuildName(guild) }}</strong>
                <span>{{ translatedGuildDescription(guild) }}</span>
                <small>{{ translatedTitle(guild.level) }} · {{ guild.memberCount }} {{ copy('人', 'members') }} · {{ guild.totalContribution.toFixed(1) }}</small>
                <button type="button" @click="handleJoinGuild(guild.id)">{{ guild.joined ? copy('当前工会', 'Current') : copy('加入工会', 'Join') }}</button>
              </article>
            </div>
          </PxCard>
        </template>

        <template #main>
          <PxCard id="guilds" class="panel guild-panel fill">
            <template #header>
              <div class="panel-title between">
                <span><Crown :size="18" /> {{ guildsData?.myGuild ? translatedGuildName(guildsData.myGuild) : copy('工会详情', 'Guild Detail') }}</span>
                <small>{{ copy('贡献 = Fish Power * 0.3 + 互动加成', 'Contribution = FishPower * 0.3 + interaction bonus') }}</small>
              </div>
            </template>
            <div class="module-intro">
              <strong>{{ guildsData?.myGuild ? `${copy('我的工会：', 'My guild: ')}${translatedGuildName(guildsData.myGuild)}` : copy('你还没有加入任何工会。', 'You have not joined a guild yet.') }}</strong>
              <span>{{ copy('提交记录后，会按 Fish Power Score * 0.3 加互动加成为当前工会贡献积分。', 'Each record contributes FishPower * 0.3 plus interaction bonuses to the current guild.') }}</span>
            </div>
            <div v-if="selectedGuild?.records.length" class="record-card-list compact">
              <article v-for="record in selectedGuild.records" :key="record.id" class="record-card compact-card">
                <strong>{{ record.nickname }} · {{ record.score.toFixed(1) }}</strong>
                <span>{{ translatedTitle(record.title) }} · {{ copy('贡献 +', 'Contribution +') }}{{ record.guildContribution.toFixed(1) }}</span>
              </article>
            </div>
            <div v-else class="empty-list">{{ copy('这个工会暂时还没开始集体摸鱼。', 'This guild has not started yet.') }}</div>
          </PxCard>
        </template>

        <template #side>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Trophy :size="16" /><span>{{ copy('工会排行榜', 'Guild Ranking') }}</span></div>
            </template>
            <ol v-if="guildsData?.ranking.length" class="compact-ranking">
              <li v-for="row in guildsData.ranking" :key="row.userId">
                <span>#{{ row.rank }} {{ row.nickname }}</span>
                <strong>{{ row.contribution.toFixed(1) }}</strong>
              </li>
            </ol>
            <div v-else class="empty-list">{{ copy('工会排行榜还在等第一条贡献。', 'Waiting for first contribution.') }}</div>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><BadgeCheck :size="16" /><span>{{ copy('工会任务', 'Guild Tasks') }}</span></div>
            </template>
            <div class="task-list">
              <article>
                <strong>{{ copy('今日集体摸鱼任务', 'Today’s Team Task') }}</strong>
                <span>{{ copy('全员今日提交 3 条公开记录', 'Submit 3 public records today') }}</span>
              </article>
              <article>
                <strong>{{ copy('本周累计任务', 'Weekly Task') }}</strong>
                <span>{{ copy('本周累计贡献达到 500', 'Reach 500 total contribution this week') }}</span>
              </article>
              <article>
                <strong>{{ copy('传奇操作挑战', 'Legend Challenge') }}</strong>
                <span>{{ copy('产生 1 条传奇提名记录', 'Generate 1 legend-nominated record') }}</span>
              </article>
            </div>
          </PxCard>
        </template>
      </WorkbenchGrid>
    </PageWorkbench>

    <!-- =============================== CIRCLES =============================== -->
    <PageWorkbench v-else-if="activeSection === 'circles'">
      <WorkbenchHeader
        :icon="Star"
        :title="t('circles')"
        :subtitle="copy('圈子解决“我关心什么”。可加入多个主题圈。', 'Circles answer “what do I care about?” Join multiple.')"
        :stats="commonHeaderStats"
      />

      <WorkbenchGrid columns="three">
        <template #left>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Star :size="16" /><span>{{ copy('推荐圈子', 'Recommended') }}</span></div>
            </template>
            <div class="entity-grid entity-grid-vertical">
              <article v-for="circle in circlesData?.circles ?? []" :key="circle.id" class="entity-card" :class="{ active: selectedCircle?.circle.id === circle.id }">
                <b>{{ circle.icon }}</b>
                <strong>{{ translatedCircleName(circle) }}</strong>
                <span>{{ translatedCircleDescription(circle) }}</span>
                <small>{{ circle.memberCount }} {{ copy('人', 'members') }} · {{ circle.recordCount }} {{ copy('条', 'records') }}</small>
                <div class="entity-actions">
                  <button type="button" @click="selectCircle(circle.id)">{{ copy('详情', 'View') }}</button>
                  <button type="button" @click="handleJoinCircle(circle.id)">{{ circle.joined ? copy('已加入', 'Joined') : copy('加入', 'Join') }}</button>
                </div>
              </article>
            </div>
          </PxCard>
        </template>

        <template #main>
          <PxCard id="circles" class="panel circle-panel fill">
            <template #header>
              <div class="panel-title between">
                <span><Star :size="18" /> {{ selectedCircle ? translatedCircleName(selectedCircle.circle) : t('circles') }}</span>
                <small>{{ selectedCircle?.circle.recordCount ?? 0 }} {{ copy('条记录', 'records') }}</small>
              </div>
            </template>
            <p class="module-copy">{{ selectedCircle ? translatedCircleDescription(selectedCircle.circle) : copy('选择一个圈子查看内容。', 'Select a circle to view content.') }}</p>
            <div v-if="selectedCircleRecords.length" class="record-card-list compact">
              <article v-for="record in selectedCircleRecords" :key="record.id" class="record-card compact-card">
                <strong>{{ record.nickname }} · {{ record.score.toFixed(1) }}</strong>
                <span>{{ record.durationLabel }} · {{ record.activityText }} · {{ record.storyText || record.description }}</span>
                <div class="record-actions">
                  <button type="button" @click="handleFeedLike(record.id)">{{ t('like') }} {{ record.likeCount }}</button>
                  <button type="button" @click="handleFeedNominate(record.id)">{{ copy('传奇', 'Legend') }} {{ record.legendNominationCount }}</button>
                  <button type="button" @click="openProfileRecord(record.id)">{{ t('comments') }} {{ record.commentCount }}</button>
                </div>
              </article>
            </div>
            <div v-else class="empty-list">{{ copy('这个圈子暂时风平浪静。', 'This circle is quiet for now.') }}</div>
          </PxCard>
        </template>

        <template #side>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><BadgeCheck :size="16" /><span>{{ copy('圈子榜单', 'Circle Boards') }}</span></div>
            </template>
            <div class="record-tags board-tags">
              <span v-for="board in translatedCircleBoards(selectedCircle?.circle)" :key="board">{{ board }}</span>
              <span v-if="!translatedCircleBoards(selectedCircle?.circle).length">{{ copy('暂无榜单', 'No boards') }}</span>
            </div>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><ShieldAlert :size="16" /><span>{{ copy('圈子规则', 'Circle Rules') }}</span></div>
            </template>
            <ul class="rule-list">
              <li>{{ copy('按事项 / 故事 / 话题自动归类。', 'Auto-classified by activity / story / topic.') }}</li>
              <li>{{ copy('可加入多个圈子。', 'Multiple circles allowed.') }}</li>
              <li>{{ copy('圈子不参与工会贡献。', 'Circles do not contribute to guilds.') }}</li>
            </ul>
          </PxCard>
        </template>
      </WorkbenchGrid>
    </PageWorkbench>

    <!-- =============================== GROUPS =============================== -->
    <PageWorkbench v-else-if="activeSection === 'groups'">
      <WorkbenchHeader
        :icon="User"
        :title="t('groups')"
        :subtitle="copy('小范围熟人 / 邀请空间。创建小组将消耗 50 鱼鳞。', 'Small invite spaces. Creating a group costs 50 Fish Scale.')"
        :stats="commonHeaderStats"
      />

      <PxCard v-if="!currentUser" class="panel fill">
        <div class="empty-list">{{ t('needLogin') }}</div>
      </PxCard>

      <WorkbenchGrid v-else columns="three">
        <template #left>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><User :size="16" /><span>{{ copy('我加入的小组', 'My Groups') }}</span></div>
            </template>
            <div v-if="joinedGroups.length" class="entity-grid entity-grid-vertical">
              <article v-for="group in joinedGroups" :key="group.id" class="entity-card" :class="{ active: selectedGroup?.group.id === group.id }">
                <b>{{ copy('组', 'G') }}</b>
                <strong>{{ group.name }}</strong>
                <span>{{ group.description || copy('还没有公告。', 'No notice yet.') }}</span>
                <small>{{ group.visibility }} · {{ group.memberCount }} {{ copy('人', 'members') }} · {{ copy('邀请码', 'Code') }} {{ group.inviteCode }}</small>
                <button type="button" @click="selectGroup(group.id)">{{ copy('查看小组', 'View') }}</button>
              </article>
            </div>
            <div v-else class="empty-list">{{ copy('还没有小组。', 'No groups yet.') }}</div>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Inbox :size="16" /><span>{{ copy('加入 / 创建', 'Join / Create') }}</span></div>
            </template>
            <label class="field"><span>{{ copy('邀请码', 'Invite Code') }}</span>
              <div class="feed-comment-row">
                <PxInput v-model="inviteCode" placeholder="ABC123" clearable />
                <button type="button" @click="handleJoinGroup">{{ copy('加入', 'Join') }}</button>
              </div>
            </label>
            <label class="field"><span>{{ copy('小组名称', 'Group Name') }}</span><PxInput v-model="groupForm.name" :placeholder="copy('地下茶水间', 'Underground break room')" clearable /></label>
            <label class="field"><span>{{ copy('小组公告', 'Group Notice') }}</span><textarea v-model="groupForm.description" maxlength="120" /></label>
            <label class="field"><span>{{ copy('小组类型', 'Type') }}</span>
              <select v-model="groupForm.visibility">
                <option value="public">{{ copy('公开小组', 'Public') }}</option>
                <option value="invite">{{ copy('邀请码小组', 'Invite-only') }}</option>
              </select>
            </label>
            <button class="profile-toggle-button" type="button" @click="handleCreateGroup">
              {{ copy('创建小组 · 50 鱼鳞', 'Create · 50 Scale') }}
            </button>
          </PxCard>
        </template>

        <template #main>
          <PxCard id="groups" class="panel group-panel fill">
            <template #header>
              <div class="panel-title between">
                <span><User :size="18" /> {{ selectedGroup?.group.name ?? copy('小组详情', 'Group Detail') }}</span>
                <small>{{ selectedGroup?.group.memberCount ?? 0 }} {{ copy('人', 'members') }}</small>
              </div>
            </template>
            <div v-if="selectedGroup" class="task-list">
              <article v-for="challenge in selectedGroup.challenges" :key="challenge.name">
                <strong>{{ translatedChallenge(challenge).name }}</strong>
                <span>{{ translatedChallenge(challenge).condition }} · {{ copy('奖励', 'Reward') }} {{ translatedChallenge(challenge).reward }}</span>
                <button class="profile-toggle-button" type="button" @click="handleGroupChallenge(challenge.name)">
                  {{ copy('发起挑战 · 30 鱼鳞', 'Start · 30 Scale') }}
                </button>
              </article>
            </div>
            <div v-if="selectedGroupRecords.length" class="record-card-list compact">
              <article v-for="record in selectedGroupRecords" :key="record.id" class="record-card compact-card">
                <strong>{{ record.nickname }} · {{ record.score.toFixed(1) }}</strong>
                <span>{{ record.durationLabel }} · {{ record.activityText }} · {{ record.storyText || record.description }}</span>
              </article>
            </div>
            <div v-else-if="selectedGroup" class="empty-list">{{ copy('小组记录流还没有内容。', 'No group records yet.') }}</div>
            <div v-else class="empty-list">{{ copy('选择一个小组查看详情。', 'Select a group.') }}</div>
          </PxCard>
        </template>

        <template #side>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><ShieldAlert :size="16" /><span>{{ copy('小组须知', 'Group Guidelines') }}</span></div>
            </template>
            <ul class="rule-list">
              <li>{{ copy('不要使用真实公司名、部门名或客户名。', 'Do not use real company, department, or client names.') }}</li>
              <li>{{ copy('创建小组消耗 50 鱼鳞。', 'Creating a group costs 50 Fish Scale.') }}</li>
              <li>{{ copy('小组挑战消耗 30 鱼鳞。', 'Group challenges cost 30 Fish Scale.') }}</li>
              <li>{{ copy('邀请码不收集真实身份。', 'Invite codes do not collect identity.') }}</li>
            </ul>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><BadgeCheck :size="16" /><span>{{ copy('推荐挑战', 'Suggested') }}</span></div>
            </template>
            <div class="task-list">
              <article>
                <strong>{{ copy('稳定发疯周', 'Steady Chaos Week') }}</strong>
                <span>{{ copy('连续 7 天提交匿名记录。', 'Submit 7 days in a row.') }}</span>
              </article>
              <article>
                <strong>{{ copy('摸鱼伪装赛', 'Disguise Race') }}</strong>
                <span>{{ copy('一周累计伪装加成。', 'Weekly disguise bonus race.') }}</span>
              </article>
            </div>
          </PxCard>
        </template>
      </WorkbenchGrid>
    </PageWorkbench>

    <!-- =============================== ABOUT =============================== -->
    <PageWorkbench v-else-if="activeSection === 'about'">
      <WorkbenchHeader
        :icon="BadgeCheck"
        :title="t('about')"
        :subtitle="copy('工位鱼王记录办公室精神状态，不是违规教程。', 'Gongwei Yuwang records office mood, not rule-breaking tutorials.')"
        :stats="commonHeaderStats"
      />

      <WorkbenchGrid columns="three">
        <template #left>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><BadgeCheck :size="16" /><span>{{ copy('我们在做什么', 'What We Do') }}</span></div>
            </template>
            <p class="module-copy">{{ copy('提交一条匿名摸鱼记录，系统按固定规则计算 Fish Power Score，再把结果放进排行榜、社区、圈子、小组和个人主页。', 'Submit an anonymous record. The system calculates Fish Power Score with fixed rules and shows it in leaderboards, community, circles, groups, and profiles.') }}</p>
          </PxCard>
        </template>

        <template #main>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><ShieldAlert :size="16" /><span>{{ copy('我们不做什么', 'What We Do Not Do') }}</span></div>
            </template>
            <p class="module-copy">{{ copy('不鼓励真实违反职场规则，不提供图片上传，不收集真实公司名、客户名、部门名、地理位置或身份信息。', 'We do not encourage real workplace rule violations, provide image uploads, or collect real company, client, department, location, or identity information.') }}</p>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Inbox :size="16" /><span>{{ copy('当前模块', 'Current Modules') }}</span></div>
            </template>
            <div class="record-tags">
              <span>{{ t('submitRecord') }}</span>
              <span>{{ copy('用户聚合排行榜', 'User-aggregated leaderboards') }}</span>
              <span>{{ t('safety') }}</span>
              <span>{{ t('communitySystem') }}</span>
              <span>{{ t('checkin') }}</span>
            </div>
          </PxCard>
        </template>

        <template #side>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Trophy :size="16" /><span>{{ copy('关键数字', 'Key Numbers') }}</span></div>
            </template>
            <dl class="side-stats">
              <div><dt>{{ copy('总记录', 'Total') }}</dt><dd>{{ stats?.totalRecords ?? 0 }}</dd></div>
              <div><dt>{{ copy('今日记录', 'Today') }}</dt><dd>{{ stats?.todayRecords ?? 0 }}</dd></div>
              <div><dt>{{ copy('最高分', 'Top Score') }}</dt><dd>{{ stats?.topScore ?? 0 }}</dd></div>
            </dl>
          </PxCard>
        </template>
      </WorkbenchGrid>
    </PageWorkbench>

    <!-- =============================== FEEDBACK =============================== -->
    <PageWorkbench v-else-if="activeSection === 'feedback'">
      <WorkbenchHeader
        :icon="MessageCircle"
        :title="t('feedback')"
        :subtitle="copy('反馈前请先匿名化，不要写真实公司或客户信息。', 'Anonymize before submitting feedback.')"
        :stats="commonHeaderStats"
      />

      <WorkbenchGrid columns="two">
        <template #main>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><MessageCircle :size="16" /><span>{{ copy('提交建议', 'Submit Feedback') }}</span></div>
            </template>
            <form class="record-form" @submit.prevent="handleFeedbackSubmit">
              <label class="field">
                <span>{{ copy('建议类型', 'Type') }}</span>
                <select v-model="feedbackForm.category">
                  <option value="feature">{{ copy('功能建议', 'Feature') }}</option>
                  <option value="bug">{{ copy('问题反馈', 'Bug') }}</option>
                  <option value="content">{{ copy('内容与安全', 'Content & Safety') }}</option>
                  <option value="other">{{ copy('其他', 'Other') }}</option>
                </select>
              </label>
              <label class="field">
                <span>{{ copy('建议内容', 'Feedback') }}</span>
                <textarea v-model="feedbackForm.content" maxlength="300" :placeholder="copy('写清楚你希望怎么改。', 'Describe what should change.')" />
              </label>
              <label class="field">
                <span>{{ copy('联系方式（可选）', 'Contact (optional)') }}</span>
                <PxInput v-model="feedbackForm.contact" :placeholder="copy('可留站内昵称', 'Use an in-app nickname')" clearable />
              </label>
              <p class="scope-note">{{ copy('最长 300 字。敏感内容会被拒绝或进入待处理状态。', 'Max 300 chars. Sensitive content is rejected or queued.') }}</p>
              <div class="form-actions">
                <button class="profile-toggle-button" type="submit" :disabled="feedbackLoading">
                  <Send :size="14" />
                  {{ feedbackLoading ? copy('提交中', 'Submitting') : copy('提交建议', 'Submit') }}
                </button>
              </div>
              <div v-if="feedbackSubmitted" class="status-line"><Check :size="15" />{{ copy('建议已入库。', 'Feedback saved.') }}</div>
            </form>
          </PxCard>
        </template>

        <template #side>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><BadgeCheck :size="16" /><span>{{ copy('反馈守则', 'Feedback Guide') }}</span></div>
            </template>
            <ul class="rule-list">
              <li>{{ copy('写清期望行为和当前问题。', 'Describe expected vs. current behavior.') }}</li>
              <li>{{ copy('不要写真实公司名和客户资料。', 'No real company or client data.') }}</li>
              <li>{{ copy('不要粘贴聊天记录或截图。', 'No chat logs or screenshots.') }}</li>
              <li>{{ copy('支持功能、玩法、文案、安全类反馈。', 'Supports feature, mechanics, copy, and safety feedback.') }}</li>
            </ul>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><ShieldAlert :size="16" /><span>{{ copy('安全提示', 'Safety Notice') }}</span></div>
            </template>
            <p class="safety-inline">{{ copy(options.safetyNotice, 'Keep content anonymous.') }}</p>
          </PxCard>
        </template>
      </WorkbenchGrid>
    </PageWorkbench>

    <!-- =============================== ANNOUNCEMENTS =============================== -->
    <PageWorkbench v-else-if="activeSection === 'announcements'">
      <WorkbenchHeader
        :icon="AlertTriangle"
        :title="t('announcements')"
        :subtitle="copy('社区公告，记录模块更新与重要规则变化。', 'Community announcements: module updates and rule changes.')"
        :stats="commonHeaderStats"
      >
        <template #actions>
          <button class="workbench-action" type="button" @click="loadAnnouncements">
            <RefreshCw :size="14" />{{ copy('刷新', 'Refresh') }}
          </button>
        </template>
      </WorkbenchHeader>

      <WorkbenchGrid columns="two">
        <template #main>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><AlertTriangle :size="16" /><span>{{ copy('公告流', 'Announcement Feed') }}</span></div>
            </template>
            <div v-if="announcements.length" class="announcement-list">
              <article v-for="item in announcements" :key="item.id" class="module-section announcement-item">
                <div class="profile-section-head">
                  <strong>{{ translatedAnnouncement(item).title }}</strong>
                  <small>{{ item.createdAt }} · {{ item.level }}</small>
                </div>
                <p class="module-copy">{{ translatedAnnouncement(item).body }}</p>
              </article>
            </div>
            <div v-else class="empty-list">{{ copy('暂时没有公告。', 'No announcements.') }}</div>
          </PxCard>
        </template>

        <template #side>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><BadgeCheck :size="16" /><span>{{ copy('公告说明', 'About') }}</span></div>
            </template>
            <p class="module-copy">{{ copy('公告会按发布时间排序，涵盖模块更新、赛季变化和重要规则。', 'Announcements are ordered by date and cover modules, seasons, and rules.') }}</p>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Inbox :size="16" /><span>{{ copy('快速入口', 'Shortcuts') }}</span></div>
            </template>
            <ul class="rule-list">
              <li>{{ t('safety') }}</li>
              <li>{{ t('checkin') }}</li>
              <li>{{ t('leaderboard') }}</li>
            </ul>
          </PxCard>
        </template>
      </WorkbenchGrid>
    </PageWorkbench>

    <!-- =============================== CHECKIN =============================== -->
    <PageWorkbench v-else-if="activeSection === 'checkin'">
      <WorkbenchHeader
        :icon="Check"
        :title="t('checkin')"
        :subtitle="copy('签到只记录连续天数，不要求透露真实身份。', 'Check-in only tracks streaks. No real identity required.')"
        :stats="checkinHeaderStats"
      />

      <PxCard v-if="!currentUser" class="panel fill">
        <div class="empty-list">{{ t('needLogin') }}</div>
      </PxCard>

      <WorkbenchGrid v-else columns="two">
        <template #main>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Check :size="16" /><span>{{ copy('今日签到', 'Today') }}</span></div>
            </template>
            <div class="checkin-body">
              <div class="module-intro">
                <strong>{{ checkin?.checkedToday ? copy('今天已经签到', 'Checked in today') : copy('今天还没签到', 'Not checked in today') }}</strong>
                <span>{{ copy('签到只记录连续天数，不要求透露真实公司或部门。', 'Check-in tracks streaks only.') }}</span>
              </div>
              <label class="field">
                <span>{{ copy('今日精神状态备注（可选）', 'Mood note (optional)') }}</span>
                <PxInput v-model="checkinNote" :placeholder="copy('例如：稳定发疯，但已匿名化', 'Example: stable chaos, anonymized')" clearable />
              </label>
              <button class="profile-toggle-button" type="button" :disabled="checkin?.checkedToday" @click="handleCheckin">
                {{ checkin?.checkedToday ? copy('今日已签到', 'Checked In') : copy('立即签到', 'Check In Now') }}
              </button>
            </div>
          </PxCard>
        </template>

        <template #side>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Trophy :size="16" /><span>{{ copy('签到统计', 'Check-in Stats') }}</span></div>
            </template>
            <section class="profile-section profile-summary">
              <div>
                <span>{{ copy('连续签到', 'Streak') }}</span>
                <strong>{{ checkin?.streak ?? 0 }} {{ copy('天', 'd') }}</strong>
              </div>
              <div>
                <span>{{ copy('累计签到', 'Total') }}</span>
                <strong>{{ checkin?.total ?? 0 }} {{ copy('次', 'x') }}</strong>
              </div>
              <div>
                <span>{{ copy('今日日期', 'Today') }}</span>
                <strong>{{ checkin?.today ?? '-' }}</strong>
              </div>
            </section>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><ShieldAlert :size="16" /><span>{{ copy('签到守则', 'Check-in Rules') }}</span></div>
            </template>
            <ul class="rule-list">
              <li>{{ copy('每天只计一次签到。', 'Once per day.') }}</li>
              <li>{{ copy('备注不要写真实公司或部门。', 'Do not mention real company/department.') }}</li>
              <li>{{ copy('连续签到可累积称号奖励。', 'Streaks accumulate playful title rewards.') }}</li>
            </ul>
          </PxCard>
        </template>
      </WorkbenchGrid>
    </PageWorkbench>

    <!-- =============================== SAFETY / PROTECTION =============================== -->
    <PageWorkbench v-else-if="activeSection === 'safety'">
      <WorkbenchHeader
        :icon="ShieldAlert"
        :title="t('safety')"
        :subtitle="copy('长度限制、敏感词、审核、提交边界。', 'Length limits, sensitive terms, review, and submission boundaries.')"
        :stats="safetyHeaderStats"
      />

      <WorkbenchGrid columns="two">
        <template #main>
          <PxCard id="safety" class="panel safety-panel fill">
            <template #header>
              <div class="panel-title"><ShieldAlert :size="16" /><span>{{ copy('内容保护', 'Content Guard') }}</span></div>
            </template>
            <p class="safety-inline">{{ copy(options.safetyNotice, 'Do not submit company secrets, privacy, employee IDs, chat records, client data, or non-anonymized screenshots.') }}</p>
            <div class="protection-grid" :aria-label="copy('内容保护策略', 'Content protection strategy')">
              <div class="protection-item">
                <strong>{{ copy('长度限制', 'Length Limit') }}</strong>
                <span>{{ copy('摸鱼故事最多', 'Story max') }} {{ options.maxDescriptionLength }} {{ copy('字。', 'chars.') }}</span>
              </div>
              <div class="protection-item">
                <strong>{{ copy('敏感词拦截', 'Sensitive Terms') }}</strong>
                <span>{{ copy('命中敏感词时前后端都会提示。', 'Both sides warn on sensitive hits.') }}</span>
              </div>
              <div class="protection-item">
                <strong>{{ copy('审核兜底', 'Review Fallback') }}</strong>
                <span>{{ copy('疑似敏感内容进入人工审核队列。', 'Suspicious content goes to manual review.') }}</span>
              </div>
              <div class="protection-item">
                <strong>{{ copy('提交边界', 'Submission Boundary') }}</strong>
                <span>{{ copy('不支持图片上传，分数始终由后端重算。', 'No image upload. Score recalculated by server.') }}</span>
              </div>
            </div>
          </PxCard>
        </template>

        <template #side>
          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><Trophy :size="16" /><span>{{ copy('运行状态', 'Runtime') }}</span></div>
            </template>
            <dl class="side-stats">
              <div><dt>{{ t('total') }}</dt><dd>{{ stats?.totalRecords ?? 0 }}</dd></div>
              <div><dt>{{ t('today') }}</dt><dd>{{ stats?.todayRecords ?? 0 }}</dd></div>
              <div><dt>{{ t('top') }}</dt><dd>{{ stats?.topScore ?? 0 }}</dd></div>
              <div><dt>SQLite</dt><dd>{{ copy('已启用', 'Enabled') }}</dd></div>
            </dl>
          </PxCard>

          <PxCard class="panel fill">
            <template #header>
              <div class="panel-title"><BadgeCheck :size="16" /><span>{{ copy('推荐阅读', 'Read More') }}</span></div>
            </template>
            <ul class="rule-list">
              <li>{{ t('about') }}</li>
              <li>{{ t('feedback') }}</li>
              <li>{{ t('announcements') }}</li>
            </ul>
          </PxCard>
        </template>
      </WorkbenchGrid>
    </PageWorkbench>

    <!-- =============================== ADMIN =============================== -->
    <PageWorkbench v-else-if="activeSection === 'admin'">
      <WorkbenchHeader
        :icon="ClipboardCheck"
        :title="t('admin')"
        :subtitle="copy('待审核内容与管理员快速操作。', 'Pending content and quick admin actions.')"
        :stats="commonHeaderStats"
      />

      <PxCard v-if="currentUser?.isAdmin" id="admin" class="panel admin-panel fill">
        <div v-if="adminQueue && (adminQueue.records.length || adminQueue.comments.length)" class="review-list">
          <div v-for="record in adminQueue.records" :key="`record-${record.id}`" class="review-item">
            <strong>#{{ record.id }} {{ record.nickname }}</strong>
            <span>{{ record.reviewNote || record.activityText || record.description }}</span>
            <div>
              <PxButton type="success" size="small" @click="handleReviewRecord(record.id, 'approved')">{{ t('approve') }}</PxButton>
              <PxButton type="danger" size="small" @click="handleReviewRecord(record.id, 'rejected')">{{ t('reject') }}</PxButton>
            </div>
          </div>
          <div v-for="comment in adminQueue.comments" :key="`comment-${comment.id}`" class="review-item">
            <strong>Comment #{{ comment.id }} {{ comment.nickname }}</strong>
            <span>{{ comment.reviewNote || comment.content }}</span>
            <div>
              <PxButton type="success" size="small" @click="handleReviewComment(comment.id, 'approved')">{{ t('approve') }}</PxButton>
              <PxButton type="danger" size="small" @click="handleReviewComment(comment.id, 'rejected')">{{ t('reject') }}</PxButton>
            </div>
          </div>
        </div>
        <div v-else class="empty-list">{{ t('noPending') }}</div>
      </PxCard>
      <PxCard v-else class="panel fill">
        <div class="empty-list">{{ copy('需要管理员账号才能查看审核队列。', 'Admin account required.') }}</div>
      </PxCard>
    </PageWorkbench>
  </section>
</template>
