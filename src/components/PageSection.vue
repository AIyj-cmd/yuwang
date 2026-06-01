<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ClipboardCheck,
  Coins,
  Crown,
  Hash,
  Heart,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Share2,
  ShieldAlert,
  Star,
  Trophy,
  User,
  X
} from 'lucide-vue-next';
import { PxButton, PxCard, PxInput, PxTag } from '@mmt817/pixel-ui';
import { TITLE_LEVELS } from '../../shared/scoring';
import { shareRecord } from '../api';
import { useAppContext } from '../appContext';
import { copyToClipboard } from '../utils/clipboard';
import { useProfileInsights } from '../composables/useProfileInsights';
import { useSearch } from '../composables/useSearch';
import UserAvatar from './UserAvatar.vue';
import { fetchRelatedRecords } from '../services/discoveryApi';
import type { FeedRecord } from '../types';

const props = defineProps<{ section: string }>();
const activeSection = computed(() => props.section);
const router = useRouter();
const {
  activeBoard,
  addTopic,
  addTopicFromDraft,
  activityTextRemaining,
  adminQueue,
  allProfileBadges,
  announcements,
  authToken,
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
  handleSubmit,
  inviteCode,
  isCurrentLevel,
  joinedGroups,
  lastResult,
  leaderboardLoading,
  leaderboardResultCount,
  leaderboardRows,
  loadAnnouncements,
  loadGuilds,
  loadLeaderboard,
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
} = useAppContext();

watch(activeSection, () => {
  errorMessage.value = '';
  statusMessage.value = '';
});

const { searchQuery, searchResults, searchLoading, searchError, hasSearched, resultCount, runSearch, clearSearch } = useSearch(
  () => authToken.value
);
const { profileInsights, profileInsightsLoading, loadProfileInsights } = useProfileInsights();
const relatedRecords = ref<FeedRecord[]>([]);
const relatedLoading = ref(false);


const openUser = async (username: string) => {
  await router.push(`/users/${encodeURIComponent(username)}`);
};

const openGuild = async (id: number) => {
  await router.push(`/guilds/${id}`);
};

const openCircleRoute = async (id: number) => {
  await router.push(`/circles/${id}`);
};

const openGroupRoute = async (id: number) => {
  await router.push(`/groups/${id}`);
};

const shareUrlForRecord = (recordId: number) => `${window.location.origin}/records/${recordId}`;



const handleShareAction = async (action: 'generate' | 'copy_text' | 'share_link') => {
  const record = selectedRecord.value;
  if (!record) {
    errorMessage.value = t('noRecord');
    statusMessage.value = '';
    return;
  }
  try {
    const card = await shareRecord(record.id, action);
    shareCard.value = card;
    if (action === 'copy_text') {
      await copyToClipboard(card.shareText);
      statusMessage.value = copy('分享文案已复制。', 'Share text copied.');
    } else if (action === 'share_link') {
      await copyToClipboard(shareUrlForRecord(record.id));
      statusMessage.value = copy('分享链接已复制。', 'Share link copied.');
    } else {
      statusMessage.value = copy('分享卡已生成。', 'Share card generated.');
    }
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : copy('分享失败', 'Share failed');
    statusMessage.value = '';
  }
};

const loadRelatedRecords = async (recordId?: number) => {
  if (!recordId) {
    relatedRecords.value = [];
    return;
  }
  relatedLoading.value = true;
  try {
    relatedRecords.value = (await fetchRelatedRecords(recordId, authToken.value)).records;
  } catch {
    relatedRecords.value = [];
  } finally {
    relatedLoading.value = false;
  }
};

watch(
  () => selectedRecord.value?.id,
  (recordId) => {
    void loadRelatedRecords(recordId);
  },
  { immediate: true }
);

watch(
  () => profile.value?.user.username,
  (username) => {
    void loadProfileInsights(username);
  },
  { immediate: true }
);
</script>

<template>
  <section class="workspace" :class="{ 'single-view': activeSection !== 'submit' }">
    <div v-if="activeSection === 'submit' || activeSection === 'profile'" class="left-rail">
      <PxCard v-if="activeSection === 'submit'" id="submit" class="panel submit-panel">
        <template #header>
          <div class="panel-title"><Send :size="18" /><span>{{ t('submitRecord') }}</span></div>
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
              {{ copy('这是自由填写的摸鱼事项，不参与额外加分。', 'This is free-form activity text and does not add score by itself.') }}
            </small>
          </label>

          <label class="field">
            <span>{{ copy('这次摸了多久？', 'How long did this drift last?') }}</span>
            <select v-model="form.duration">
              <option v-for="item in options.durations" :key="item.key" :value="item.key">{{ translatedOptionLabel(item.key, item.label) }} · {{ (item as any).score ?? (item as any).baseScore }} {{ copy('分', 'pts') }}</option>
            </select>
            <small class="field-hint">
              {{ copy('AI 裁判只判断烈度、结局和评语，最终鱼力值由后端固定规则结算。', 'AI judges intensity, outcome, and comment only. Final Fish Power is calculated by fixed backend rules.') }}
            </small>
          </label>

          <label class="field">
            <span>{{ copy('补充一下现场情况', 'Add the scene details') }}</span>
            <textarea
              v-model="form.description"
              :maxlength="options.maxDescriptionLength + 20"
              :placeholder="copy('比如：风险场景、伪装方式、你是怎么圆过去的。请不要写公司名、客户名、聊天记录或真实隐私。', 'For example: the risky scene, the disguise, and how you explained it. Do not include company names, client names, chat records, or real privacy.')"
            />
          </label>

          <section class="topic-field">
            <div class="topic-field-head">
              <span><Hash :size="15" />{{ copy('添加话题', 'Add Topics') }}</span>
              <small>{{ form.topics.length }} / 5</small>
            </div>
            <p class="field-hint">{{ copy('话题可选，只用于发现和圈子归类，不参与评分。', 'Topics are optional and only help discovery and circle matching; they do not affect scoring.') }}</p>
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
            <div v-else class="topic-empty">{{ copy('还没有话题，这条鱼暂时没有标签。', 'No topics yet. This fish has no labels for now.') }}</div>
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

          <div class="safety-inline">{{ copy(options.safetyNotice, 'Do not submit company secrets, personal privacy, employee IDs, chat records, client data, or non-anonymized screenshots. This platform is for entertainment only and does not support real workplace rule violations.') }}</div>

          <label class="checkbox-line">
            <input v-model="form.anonymized" type="checkbox" />
            <span>{{ t('anonymized') }}</span>
          </label>

          <section class="publish-scope">
            <div class="profile-section-head">
              <strong>{{ copy('发布范围', 'Publish Scope') }}</strong>
              <small>{{ copy('请先匿名化你的精神状态，再公开展示', 'Anonymize your office mood before publishing') }}</small>
            </div>
            <label class="checkbox-line">
              <input v-model="form.publishToCommunity" type="checkbox" :disabled="form.privateOnly" @change="handleCommunityScopeChange" />
              <span>{{ copy('发布到社区广场', 'Publish to Community Plaza') }}</span>
            </label>

            <label class="checkbox-line">
              <input v-model="form.privateOnly" type="checkbox" @change="handlePrivateOnlyChange" />
              <span>{{ copy('仅自己可见，与社区广场互斥', 'Private only, mutually exclusive with Community Plaza') }}</span>
            </label>
            <div v-if="joinedGroups.length" class="scope-groups">
              <span>{{ copy('同步到我的小组', 'Sync to My Groups') }}</span>
              <label v-for="group in joinedGroups" :key="group.id" class="scope-group-option">
                <input v-model="form.groupIds" type="checkbox" :value="group.id" :disabled="form.privateOnly" />
                <span>{{ group.name }}</span>
              </label>
            </div>
            <p v-else class="scope-note">{{ copy('还没有可同步的小组。可以去「我的小组」创建一个地下茶水间。', 'No group is available for syncing yet. Create one in My Groups.') }}</p>
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

      <PxCard v-if="activeSection === 'profile' && currentUser" id="profile" class="panel profile-panel">
        <template #header>
          <div class="panel-title"><User :size="18" /><span>{{ t('profile') }}</span></div>
        </template>
        <div class="record-form">
          <label class="field"><span>{{ t('displayName') }}</span><PxInput v-model="profileForm.displayName" clearable /></label>
          <label class="field"><span>Bio</span><textarea v-model="profileForm.bio" maxlength="120" /></label>
          <PxButton type="primary" size="small" @click="saveProfile">{{ t('save') }}</PxButton>
          <div class="profile-stats" v-if="profile">
            <span>Total {{ profile.totalScore.toFixed(1) }}</span>
            <span>{{ profile.records.length }} records</span>
          </div>
          <div v-if="profile" class="profile-dashboard">
            <section class="profile-section profile-summary">
              <div>
                <span>{{ copy('当前等级', 'Current Level') }}</span>
                <strong>{{ currentProfileTitle }}</strong>
              </div>
              <div>
                <span>{{ copy('累计 Fish Power Score', 'Total Fish Power Score') }}</span>
                <strong>{{ profile.totalScore.toFixed(1) }}</strong>
              </div>
              <div>
                <span>{{ t('badges') }}</span>
                <strong>{{ unlockedBadges.length }} / {{ allProfileBadges.length }}</strong>
              </div>
            </section>

            <section class="profile-section profile-insights">
              <div class="profile-section-head">
                <strong>{{ copy('摸鱼画像', 'Slacking Persona') }}</strong>
                <small>{{ copy('只统计公开且审核通过的记录', 'Only approved public records') }}</small>
              </div>
              <div v-if="profileInsightsLoading" class="loading-line">{{ copy('画像生成中...', 'Loading insights...') }}</div>
              <template v-else-if="profileInsights">
                <div class="module-intro">
                  <strong>{{ profileInsights.persona.label }}</strong>
                  <span>{{ profileInsights.persona.description }}</span>
                </div>
                <section v-if="profileInsights.totalRecords > 0" class="profile-section profile-summary">
                  <div>
                    <span>{{ copy('总摸鱼次数', 'Total Records') }}</span>
                    <strong>{{ profileInsights.totalRecords }}</strong>
                  </div>
                  <div>
                    <span>{{ copy('平均得分', 'Average Score') }}</span>
                    <strong>{{ profileInsights.averageScore.toFixed(1) }}</strong>
                  </div>
                  <div>
                    <span>{{ copy('本周活跃', 'This Week') }}</span>
                    <strong>{{ profileInsights.weekActivity.records }} / {{ profileInsights.weekActivity.score.toFixed(1) }}</strong>
                  </div>
                  <div>
                    <span>{{ copy('本月活跃', 'This Month') }}</span>
                    <strong>{{ profileInsights.monthActivity.records }} / {{ profileInsights.monthActivity.score.toFixed(1) }}</strong>
                  </div>
                </section>
                <div v-if="profileInsights.totalRecords > 0" class="record-tags">
                  <span>{{ copy('常用类型', 'Top Type') }}：{{ profileInsights.topSlackingType?.label ?? '-' }}</span>
                  <span>{{ copy('常用伪装', 'Top Disguise') }}：{{ profileInsights.topDisguise?.label ?? '-' }}</span>
                  <span>{{ t('like') }} {{ profileInsights.interactions.likes }}</span>
                  <span>{{ t('comments') }} {{ profileInsights.interactions.comments }}</span>
                  <span>{{ copy('传奇', 'Legend') }} {{ profileInsights.interactions.legendNominations }}</span>
                </div>
                <button v-if="profileInsights.highestRecord" class="profile-record-button" type="button" @click="openProfileRecord(profileInsights.highestRecord.id)">
                  <span>{{ copy('最高分记录', 'Highest Record') }} · {{ translatedTitle(profileInsights.highestRecord.title) }}</span>
                  <strong>{{ profileInsights.highestRecord.score.toFixed(1) }}</strong>
                  <small>{{ profileInsights.highestRecord.activityText }}</small>
                </button>
                <div v-if="profileInsights.totalRecords === 0" class="empty-list">
                  {{ copy('公开水域还没有记录，提交一条公开匿名记录后画像会自动生成。', 'No public records yet. Submit an anonymous public record to generate insights.') }}
                  <button class="profile-toggle-button" type="button" @click="router.push('/')">{{ copy('去提交', 'Submit') }}</button>
                </div>
              </template>
            </section>

            <section class="profile-section">
              <div class="profile-section-head">
                <strong>{{ t('levels') }}</strong>
                <small>{{ copy('按账号累计分数展示', 'Based on account total score') }}</small>
              </div>
              <ul class="level-list profile-levels">
                <li v-for="level in TITLE_LEVELS" :key="level.title" :class="{ active: isCurrentLevel(level) }">
                  <span>{{ translatedTitle(level.title) }}</span>
                  <small>{{ formatLevelRange(level) }}</small>
                </li>
              </ul>
            </section>

            <section class="profile-section">
              <div class="profile-section-head">
                <strong>{{ t('badges') }}</strong>
                <small>{{ unlockedBadges.length }} {{ t('unlocked') }}</small>
              </div>
              <div class="profile-badge-grid">
                <article v-for="badge in displayedBadges" :key="badge.key" class="profile-badge-card" :class="{ unlocked: badge.unlocked }">
                  <BadgeCheck :size="16" />
                  <strong>{{ translatedBadge(badge).label }}</strong>
                  <span>{{ translatedBadge(badge).description }}</span>
                  <small>{{ badge.unlocked ? t('unlocked') : t('locked') }}</small>
                </article>
                <div v-if="!displayedBadges.length" class="empty-list">{{ copy('登录并互动后解锁徽章和成就。', 'Sign in and interact to unlock badges and achievements.') }}</div>
              </div>
              <button class="profile-toggle-button" type="button" @click="showAllBadges = !showAllBadges">
                {{ showAllBadges ? copy('只看已解锁', 'Unlocked only') : copy('查看全部徽章', 'View all badges') }}
              </button>
            </section>

            <section v-if="profile.records.length" class="profile-section">
              <div class="profile-section-head">
                <strong>{{ copy('近期记录', 'Recent Records') }}</strong>
                <small>{{ profile.records.length }} {{ copy('条', 'records') }}</small>
              </div>
              <div class="profile-record-list">
                <button v-for="record in profile.records.slice(0, 5)" :key="record.id" class="profile-record-button" type="button" @click="openProfileRecord(record.id)">
                  <span>{{ translatedTitle(record.title) }}</span>
                  <strong>{{ record.score.toFixed(1) }}</strong>
                  <small>{{ record.activityText }} · {{ record.status }}</small>
                </button>
              </div>
            </section>
          </div>
        </div>
      </PxCard>
      <PxCard v-else-if="activeSection === 'profile'" class="panel profile-panel">
        <template #header>
          <div class="panel-title"><User :size="18" /><span>{{ t('profile') }}</span></div>
        </template>
        <div class="empty-list">{{ t('needLogin') }}</div>
      </PxCard>
    </div>

    <aside v-if="activeSection !== 'profile'" class="right-rail">
      <PxCard v-if="activeSection === 'submit' || activeSection === 'result'" id="result" class="panel result-panel">
        <template #header>
          <div class="panel-title"><Trophy :size="18" /><span>{{ t('result') }}</span></div>
        </template>

        <div v-if="selectedRecord" class="result-body">
          <div class="score-block">
            <span class="score-number">{{ selectedRecord.breakdown.displayScore !== undefined ? selectedRecord.breakdown.displayScore.toFixed(3) : selectedRecord.score.toFixed(1) }}</span>
            <span class="score-label">{{ selectedRecord.breakdown.displayScore !== undefined ? copy('今日评分 / 10', 'Today Score / 10') : 'Fish Power Score' }}</span>
          </div>
          <div class="result-tags">
            <PxTag type="primary">{{ copy('称号', 'Title') }} {{ translatedTitle(selectedRecord.title) }}</PxTag>
            <PxTag type="info">{{ copy('鱼力值', 'Fish Power') }} {{ selectedRecord.score.toFixed(1) }}</PxTag>
            <PxTag type="warning" v-if="lastResult">{{ copy('今日第', 'Today #') }} {{ lastResult.todayRank || '-' }} {{ copy('名', '') }}</PxTag>
            <PxTag type="success" v-if="lastResult">{{ copy('累计', 'Total') }} {{ lastResult.cumulativeScore.toFixed(1) }}</PxTag>
            <PxTag type="success" v-if="lastResult?.fishScaleReward">{{ copy('鱼鳞 +', 'Fish Scale +') }}{{ lastResult.fishScaleReward.awardedAmount }}</PxTag>
            <PxTag type="info" v-if="selectedRecord.guildContribution > 0">{{ copy('工会贡献 +', 'Guild +') }}{{ selectedRecord.guildContribution.toFixed(1) }}</PxTag>
            <PxTag type="info" v-if="selectedRecord.status === 'pending'">{{ t('pending') }}</PxTag>
          </div>
          <p v-if="lastResult?.fishScaleReward" class="status-line"><Coins :size="16" />{{ lastResult.fishScaleReward.message || copy(`本次摸鱼获得 +${lastResult.fishScaleReward.awardedAmount} 鱼鳞。`, `This record earned +${lastResult.fishScaleReward.awardedAmount} Fish Scale.`) }}</p>
          <p class="comment">{{ translatedSystemComment(selectedRecord.systemComment) }}</p>
          <p class="scope-note">
            {{
              selectedRecord.scoreVersion.startsWith('ai_judge_v1')
                ? copy('裁判评语由 AI 生成，鱼力值由后端固定规则结算。', 'The judge comment is AI-generated; Fish Power is calculated by fixed backend rules.')
                : copy('本次分数由持续时间档位计算。', 'This score is calculated from the duration tier.')
            }}
          </p>

          <dl class="breakdown result-summary">
            <div><dt>{{ copy('持续时间', 'Duration') }}</dt><dd>{{ selectedRecord.durationLabel }}</dd></div>
            <div><dt>{{ copy('摸鱼事项', 'Activity') }}</dt><dd>{{ selectedRecord.activityText }}</dd></div>
            <div><dt>{{ copy('摸鱼故事', 'Story') }}</dt><dd>{{ selectedRecord.storyText || selectedRecord.description }}</dd></div>
            <template v-if="selectedRecord.scoreVersion.startsWith('ai_judge_v1')">
              <div><dt>{{ copy('时长基础分', 'Duration Base') }}</dt><dd>{{ selectedRecord.breakdown.baseScore }}</dd></div>
              <div><dt>{{ copy('烈度', 'Intensity') }}</dt><dd>{{ selectedRecord.breakdown.intensityLabel }} ×{{ selectedRecord.breakdown.intensityMultiplier }}</dd></div>
              <div><dt>{{ copy('结局', 'Outcome') }}</dt><dd>{{ selectedRecord.breakdown.outcomeLabel }} +{{ selectedRecord.breakdown.outcomeBonus }}</dd></div>
              <div><dt>{{ copy('特殊加成', 'Special Bonus') }}</dt><dd>+{{ selectedRecord.breakdown.specialBonusTotal ?? 0 }}</dd></div>
              <div><dt>{{ copy('原始分', 'Raw Score') }}</dt><dd>{{ selectedRecord.breakdown.rawScore }}</dd></div>
              <div><dt>{{ copy('显示分', 'Display Score') }}</dt><dd>{{ selectedRecord.breakdown.displayScore?.toFixed(3) }} / 10</dd></div>
            </template>
            <div v-else><dt>{{ copy('持续时间分', 'Duration Score') }}</dt><dd>{{ selectedRecord.breakdown.durationScore ?? selectedRecord.breakdown.durationBaseScore }}</dd></div>
          </dl>

          <div v-if="selectedRecord.scoreVersion.startsWith('ai_judge_v1') && selectedRecord.breakdown.specialBonuses?.length" class="record-tags">
            <span v-for="bonus in selectedRecord.breakdown.specialBonuses" :key="`${bonus.label}-${bonus.points}`">{{ bonus.label }} +{{ bonus.points }}</span>
          </div>

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
            <button type="button" :class="{ active: social?.viewer.voted }" :title="copy('发起传奇提名将消耗 10 鱼鳞。', 'Starting a legend nomination costs 10 Fish Scale.')" @click="handleInteraction('vote')">
              <Crown :size="16" />{{ copy('传奇提名 · 10 鱼鳞', 'Nominate · 10 Scale') }} {{ selectedRecord.voteCount }}
            </button>
            <button type="button" @click="handleShareAction('generate')"><Share2 :size="16" />{{ copy('生成分享卡', 'Generate Card') }}</button>
            <button type="button" @click="handleShareAction('copy_text')">{{ copy('复制文案', 'Copy Text') }}</button>
            <button type="button" @click="handleShareAction('share_link')">{{ copy('分享链接', 'Share Link') }}</button>
          </div>

          <dl v-if="selectedRecord.guildContribution > 0" class="breakdown">
            <div><dt>{{ copy('工会贡献', 'Guild Contribution') }}</dt><dd>+{{ selectedRecord.guildContribution.toFixed(1) }}</dd></div>
          </dl>
        </div>

        <div v-else class="empty-result">
          <span class="empty-score">--.-</span>
          <p>{{ copy('提交一条匿名记录后，这里会显示分数、称号、今日排名、系统评论和互动。', 'Submit an anonymous record to see the score, title, daily rank, system comment, and interactions.') }}</p>
        </div>
      </PxCard>

      <PxCard v-if="activeSection === 'social'" id="social" class="panel social-panel">
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
            <div class="share-card-meta">
              <span>{{ shareCard.rankLabel || copy('历史高光', 'Highlight') }}</span>
              <span v-if="shareCard.shareCount !== undefined">{{ copy('分享', 'Shares') }} {{ shareCard.shareCount }}</span>
              <span v-if="shareCard.rankIsRealtime">{{ copy('今日排名会随当天新记录变化', 'Today rank may change as new records arrive') }}</span>
            </div>
            <div v-if="shareCard.topicTags?.length" class="record-tags">
              <span v-for="tag in shareCard.topicTags" :key="tag">#{{ tag }}</span>
            </div>
            <p>{{ locale === 'en-US' ? `I got ${selectedRecord.score.toFixed(1)} Fish Power on Gongwei Yuwang. This is anonymous entertainment, not a workplace rule-breaking guide.` : shareCard.shareText }}</p>
            <small>{{ shareCard.safetyNotice || copy('匿名娱乐分享卡，不支持图片上传。', 'Anonymous entertainment card. No image upload.') }}</small>
          </div>
          <section v-if="relatedLoading || relatedRecords.length" class="profile-section related-records">
            <div class="profile-section-head">
              <strong>{{ copy('你可能还想看', 'You May Also Like') }}</strong>
              <small>{{ copy('按话题、类型、圈子和相近得分推荐', 'By topic, type, circle, and nearby score') }}</small>
            </div>
            <div v-if="relatedLoading" class="loading-line">{{ copy('推荐加载中...', 'Loading recommendations...') }}</div>
            <div v-else class="record-card-list compact">
              <article v-for="record in relatedRecords" :key="`related-${record.id}`" class="record-card compact-card">
                <strong>{{ record.nickname }} · {{ record.score.toFixed(1) }}</strong>
                <span>{{ record.activityText }} · {{ translatedTitle(record.title) }}</span>
                <div class="record-actions">
                  <button type="button" @click="openProfileRecord(record.id)">{{ copy('查看', 'Open') }}</button>
                </div>
              </article>
            </div>
          </section>
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

      <PxCard v-if="activeSection === 'community'" id="community" class="panel community-panel">
        <template #header>
          <div class="panel-title between">
            <span><MessageCircle :size="18" /> {{ t('community') }}</span>
            <small>{{ copy('公共水域，只展示已公开且通过审核的记录', 'Public waters: only public approved records are shown') }}</small>
          </div>
        </template>
        <div class="module-intro">
          <strong>{{ copy('这条鱼正在公共水域游动', 'This fish is swimming in public waters') }}</strong>
          <span>{{ copy('社区广场解决“我能看到什么”。不要写公司名，鱼也需要保护隐私。', 'Community Plaza answers “what can I see?” Do not write company names; fish need privacy too.') }}</span>
        </div>
        <section class="module-section discovery-search">
          <div class="profile-section-head">
            <strong>{{ copy('搜索与发现', 'Search & Discovery') }}</strong>
            <small>{{ copy('记录、话题、用户、工会、圈子、小组', 'Records, topics, users, guilds, circles, groups') }}</small>
          </div>
          <div class="feed-comment-row">
            <PxInput
              v-model="searchQuery"
              :placeholder="copy('输入关键词，不会返回全站空搜索结果', 'Enter a keyword. Empty search returns nothing')"
              clearable
              @keyup.enter="runSearch()"
            />
            <button type="button" @click="runSearch()"><Search :size="14" />{{ copy('搜索', 'Search') }}</button>
            <button v-if="hasSearched" type="button" @click="clearSearch">{{ copy('清空', 'Clear') }}</button>
          </div>
          <div v-if="searchLoading" class="loading-line">{{ copy('搜索中...', 'Searching...') }}</div>
          <p v-else-if="searchError" class="error-line">{{ searchError }}</p>
          <div v-else-if="hasSearched" class="search-results">
            <div v-if="!searchResults.query" class="empty-list">{{ copy('先输入一个关键词，鱼塘不会因为空搜索就全量开闸。', 'Enter a keyword first. Empty search does not open the whole pond.') }}</div>
            <div v-else-if="resultCount === 0" class="empty-list">{{ copy('没有找到匹配内容，可能这条鱼还没有留下水纹。', 'No matching content found yet.') }}</div>
            <template v-else>
              <section v-if="searchResults.records.length" class="search-result-group">
                <strong>{{ copy('记录', 'Records') }}</strong>
                <button v-for="record in searchResults.records" :key="`search-record-${record.id}`" type="button" @click="openProfileRecord(record.id)">
                  <span>{{ record.activityText }}</span>
                  <small>{{ record.nickname }} · {{ record.score.toFixed(1) }} · {{ translatedTitle(record.title) }}</small>
                </button>
              </section>
              <section v-if="searchResults.topics.length" class="search-result-group">
                <strong>{{ copy('话题', 'Topics') }}</strong>
                <button v-for="topic in searchResults.topics" :key="`search-topic-${topic.id}`" type="button" @click="openTopic(topic.slug)">
                  <span>#{{ topic.name }}</span>
                  <small>{{ topic.usage_count }} {{ copy('次使用', 'uses') }}</small>
                </button>
              </section>
              <section v-if="searchResults.users.length" class="search-result-group">
                <strong>{{ copy('用户', 'Users') }}</strong>
                <button v-for="user in searchResults.users" :key="`search-user-${user.id}`" type="button" @click="openUser(user.username)">
                  <span>{{ user.displayName }} @{{ user.username }}</span>
                  <small>{{ translatedTitle(user.title) }} · {{ user.totalScore.toFixed(1) }}</small>
                </button>
              </section>
              <section v-if="searchResults.guilds.length" class="search-result-group">
                <strong>{{ copy('工会', 'Guilds') }}</strong>
                <button v-for="guild in searchResults.guilds" :key="`search-guild-${guild.id}`" type="button" @click="openGuild(guild.id)">
                  <span>{{ translatedGuildName(guild) }}</span>
                  <small>{{ guild.memberCount }} {{ copy('人', 'members') }} · {{ guild.totalContribution.toFixed(1) }}</small>
                </button>
              </section>
              <section v-if="searchResults.circles.length" class="search-result-group">
                <strong>{{ copy('圈子', 'Circles') }}</strong>
                <button v-for="circle in searchResults.circles" :key="`search-circle-${circle.id}`" type="button" @click="openCircleRoute(circle.id)">
                  <span>{{ translatedCircleName(circle) }}</span>
                  <small>{{ circle.recordCount }} {{ copy('条记录', 'records') }}</small>
                </button>
              </section>
              <section v-if="searchResults.groups.length" class="search-result-group">
                <strong>{{ copy('小组', 'Groups') }}</strong>
                <button v-for="group in searchResults.groups" :key="`search-group-${group.id}`" type="button" @click="openGroupRoute(group.id)">
                  <span>{{ group.name }}</span>
                  <small>{{ group.visibility }} · {{ group.memberCount }} {{ copy('人', 'members') }}</small>
                </button>
              </section>
            </template>
          </div>
        </section>
        <div class="feed-filters">
          <button type="button" :class="{ active: communityFilter === 'latest' }" @click="communityFilter = 'latest'">{{ copy('最新摸鱼', 'Latest') }}</button>
          <button type="button" :class="{ active: communityFilter === 'hot' }" @click="communityFilter = 'hot'">{{ copy('今日热门', 'Hot Today') }}</button>
          <button type="button" :class="{ active: communityFilter === 'high' }" @click="communityFilter = 'high'">{{ copy('高分记录', 'High Score') }}</button>
          <button type="button" :class="{ active: communityFilter === 'legendary' }" @click="communityFilter = 'legendary'">{{ copy('传奇候选', 'Legend Candidates') }}</button>
        </div>
        <div v-if="popularTopics.length" class="popular-topic-strip">
          <strong>{{ copy('热门话题', 'Popular Topics') }}</strong>
          <button v-for="topic in popularTopics" :key="topic.id" type="button" @click="openTopic(topic.slug)">
            #{{ topic.name }} <span>{{ topic.usage_count }}</span>
          </button>
        </div>
        <div class="safety-inline">{{ copy(options.safetyNotice, 'Do not submit company secrets, personal privacy, employee IDs, chat records, client data, or non-anonymized screenshots. This platform is for entertainment only and does not support real workplace rule violations.') }}</div>
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
              <span v-if="record.guild">{{ copy('为', 'Contributed to ') }}{{ translatedGuildName(record.guild) }}{{ copy('贡献 +', ' +') }}{{ record.guildContribution.toFixed(1) }}</span>
            </div>
            <div class="record-actions">
              <button type="button" :class="{ active: record.viewer.liked }" @click="handleFeedLike(record.id)">{{ t('like') }} {{ record.likeCount }}</button>
              <button type="button" @click="openProfileRecord(record.id)">{{ t('comments') }} {{ record.commentCount }}</button>
              <button type="button" :class="{ active: record.viewer.legendNominated }" :title="copy('发起传奇提名将消耗 10 鱼鳞。', 'Starting a legend nomination costs 10 Fish Scale.')" @click="handleFeedNominate(record.id)">{{ copy('传奇提名 · 10 鱼鳞', 'Nominate · 10 Scale') }} {{ record.legendNominationCount }}</button>
              <button type="button" :class="{ active: record.viewer.reported }" @click="handleFeedReport(record.id)">{{ copy('举报', 'Report') }} {{ record.reportCount }}</button>
            </div>
            <div class="feed-comment-row">
              <PxInput v-model="feedCommentDrafts[record.id]" :placeholder="copy('120 字以内，别写真实公司、客户或聊天记录', 'Within 120 chars. No real company, client, or chat records.')" clearable />
              <button type="button" @click="handleFeedComment(record.id)">{{ t('addComment') }}</button>
            </div>
          </article>
        </div>
        <div v-else class="empty-list">{{ copy('今天还没有鱼浮出水面。', 'No fish surfaced today yet.') }}</div>
      </PxCard>


      <section v-if="activeSection === 'circles'" class="workspace circle-workspace">
        <!-- 左侧：圈子导航 -->
        <aside class="left-rail">
          <PxCard class="panel circle-nav-panel">
            <template #header>
              <div class="circle-nav-header">
                <div class="circle-nav-brand-icon">
                  <Star :size="26" stroke-width="2.5" />
                </div>
                <div class="circle-nav-brand-text">
                  <strong>{{ t('circles') }}</strong>
                  <small>{{ copy('主题兴趣聚合', 'Topic interest spaces') }}</small>
                </div>
              </div>
            </template>

            <div v-if="circlesData?.joined?.length" class="circle-nav-section">
              <div class="circle-nav-section-title">{{ copy('我的圈子', 'My Circles') }}</div>
              <div class="circle-nav-list">
                <button
                  v-for="circle in circlesData.joined"
                  :key="`joined-${circle.id}`"
                  type="button"
                  class="circle-nav-item"
                  :class="{ active: selectedCircle?.circle.id === circle.id }"
                  @click="selectCircle(circle.id)"
                >
                  <span class="circle-nav-icon">{{ circle.icon }}</span>
                  <div class="circle-nav-info">
                    <strong>{{ translatedCircleName(circle) }}</strong>
                    <small>{{ circle.recordCount }} {{ copy('条', 'records') }}</small>
                  </div>
                </button>
              </div>
            </div>

            <div v-if="circlesData?.hot?.length" class="circle-nav-section">
              <div class="circle-nav-section-title">{{ copy('热门圈子', 'Hot Circles') }}</div>
              <div class="circle-nav-list">
                <button
                  v-for="circle in circlesData.hot"
                  :key="`hot-${circle.id}`"
                  type="button"
                  class="circle-nav-item"
                  :class="{ active: selectedCircle?.circle.id === circle.id }"
                  @click="selectCircle(circle.id)"
                >
                  <span class="circle-nav-icon">{{ circle.icon }}</span>
                  <div class="circle-nav-info">
                    <strong>{{ translatedCircleName(circle) }}</strong>
                    <small>{{ circle.recordCount }} {{ copy('条', 'records') }}</small>
                  </div>
                </button>
              </div>
            </div>

            <div v-if="circlesData?.recommended?.length" class="circle-nav-section">
              <div class="circle-nav-section-title">{{ copy('推荐圈子', 'Recommended') }}</div>
              <div class="circle-nav-list">
                <button
                  v-for="circle in circlesData.recommended"
                  :key="`rec-${circle.id}`"
                  type="button"
                  class="circle-nav-item"
                  :class="{ active: selectedCircle?.circle.id === circle.id }"
                  @click="selectCircle(circle.id)"
                >
                  <span class="circle-nav-icon">{{ circle.icon }}</span>
                  <div class="circle-nav-info">
                    <strong>{{ translatedCircleName(circle) }}</strong>
                    <small>{{ circle.recordCount }} {{ copy('条', 'records') }}</small>
                  </div>
                </button>
              </div>
            </div>

            <div v-if="!circlesData" class="loading-line">{{ copy('加载中...', 'Loading...') }}</div>
          </PxCard>
        </aside>

        <!-- 右侧：圈子内容 -->
        <aside class="right-rail">
          <div v-if="selectedCircle" class="circle-hero">
            <div class="circle-hero-badge">
              <div class="circle-hero-badge-frame"></div>
              <div class="circle-hero-badge-icon">{{ selectedCircle.circle.icon }}</div>
            </div>
            <div class="circle-hero-info">
              <h2 class="circle-hero-name">{{ translatedCircleName(selectedCircle.circle) }}</h2>
              <p class="circle-hero-desc">{{ translatedCircleDescription(selectedCircle.circle) }}</p>
              <div class="circle-hero-meta">
                <span>{{ selectedCircle.circle.memberCount }} {{ copy('人', 'members') }}</span>
                <span>·</span>
                <span>{{ selectedCircle.circle.recordCount }} {{ copy('条记录', 'records') }}</span>
              </div>
            </div>
            <div class="circle-hero-action">
              <PxButton
                v-if="!selectedCircle.circle.joined"
                type="primary"
                size="small"
                @click="handleJoinCircle(selectedCircle.circle.id)"
              >
                {{ copy('加入', 'Join') }}
              </PxButton>
              <PxButton
                v-else
                type="base"
                size="small"
                plain
                disabled
              >
                {{ copy('已加入', 'Joined') }}
              </PxButton>
            </div>
          </div>

          <div v-if="selectedCircle && translatedCircleBoards(selectedCircle.circle).length" class="circle-boards">
            <span
              v-for="board in translatedCircleBoards(selectedCircle.circle)"
              :key="board"
              class="circle-board-tag"
            >
              {{ board }}
            </span>
          </div>

          <div v-if="selectedCircleRecords.length" class="circle-feed">
            <article
              v-for="record in selectedCircleRecords"
              :key="record.id"
              class="circle-record"
            >
              <div class="circle-record-header">
                <strong>{{ record.nickname }}</strong>
                <span>{{ record.score.toFixed(1) }} · {{ translatedTitle(record.title) }}</span>
              </div>
              <p class="circle-record-body">{{ record.activityText }}</p>
              <div class="circle-record-footer">
                <span>{{ record.durationLabel }}</span>
                <span>{{ new Date(record.createdAt).toLocaleDateString() }}</span>
              </div>
              <div class="circle-record-actions">
                <button type="button" :class="{ active: record.viewer?.liked }" @click="handleFeedLike(record.id)">
                  <Heart :size="14" /> {{ t('like') }} {{ record.likeCount }}
                </button>
                <button type="button" @click="openProfileRecord(record.id)">
                  <MessageCircle :size="14" /> {{ t('comments') }} {{ record.commentCount }}
                </button>
                <button type="button" :class="{ active: record.viewer?.legendNominated }" @click="handleFeedNominate(record.id)">
                  <Star :size="14" /> {{ record.legendNominationCount }}
                </button>
              </div>
            </article>
          </div>

          <div v-else-if="selectedCircle" class="empty-list">
            {{ copy('这个圈子暂时风平浪静。', 'This circle is quiet for now.') }}
          </div>

          <div v-else class="loading-line">
            {{ copy('圈子加载中...', 'Loading circles...') }}
          </div>
        </aside>
      </section>

      <div v-if="activeSection === 'groups'" id="groups" class="group-page">
        <header class="gp-masthead">
          <span class="gp-mark" aria-hidden="true">👥</span>
          <div class="gp-mast-text">
            <h1 class="gp-mast-title">{{ t('groups') }}</h1>
            <span class="gp-mast-sub">{{ copy('小范围熟人 / 邀请空间', 'Small invite spaces') }}</span>
          </div>
          <span v-if="currentUser" class="gp-mast-chip">{{ copy('已加入', 'Joined') }} {{ joinedGroups.length }}</span>
        </header>

        <div v-if="!currentUser" class="empty-list">{{ t('needLogin') }}</div>
        <template v-else>
          <div class="gp-joinbar">
            <span class="gp-jb-badge"><Hash :size="14" /> {{ copy('邀请码', 'Invite Code') }}</span>
            <input v-model="inviteCode" type="text" placeholder="ABC123" />
            <button type="button" class="gp-jb-cta" @click="handleJoinGroup"><Send :size="14" /> {{ copy('加入小组', 'Join Group') }}</button>
          </div>
          <p class="gp-jb-hint">{{ copy('仅保存邀请码，不收集真实身份。', 'Only the invite code is stored — no real identity collected.') }}</p>

          <section class="gp-card">
            <div class="gp-card-head gp-head-create">
              <span class="gp-card-title">{{ copy('创建小组', 'Create Group') }}</span>
              <span class="gp-card-meta">{{ copy('不要使用真实公司 / 部门 / 客户名', 'No real company / department / client names') }}</span>
            </div>
            <div class="gp-card-body">
              <label class="field"><span>{{ copy('小组名称', 'Group Name') }}</span><input v-model="groupForm.name" type="text" :placeholder="copy('地下茶水间', 'Underground break room')" /></label>
              <label class="field"><span>{{ copy('小组公告', 'Group Notice') }}</span><textarea v-model="groupForm.description" maxlength="120" :placeholder="copy('小组公告，仍然不要写真实身份信息。', 'Group notice. Still do not include real identity information.')" /></label>
              <label class="field"><span>{{ copy('小组类型', 'Group Type') }}</span>
                <select v-model="groupForm.visibility">
                  <option value="public">{{ copy('公开小组', 'Public Group') }}</option>
                  <option value="invite">{{ copy('邀请码小组', 'Invite-code Group') }}</option>
                </select>
              </label>
              <p class="scope-note">{{ copy('创建小组将消耗 50 鱼鳞。', 'Creating a group costs 50 Fish Scale.') }}</p>
              <button class="gp-btn-primary" type="button" @click="handleCreateGroup">{{ copy('创建小组 · 50 鱼鳞', 'Create Group · 50 Scale') }}</button>
            </div>
          </section>

          <section class="gp-card">
            <div class="gp-card-head gp-head-joined">
              <span class="gp-card-title">{{ copy('我加入的小组', 'My Joined Groups') }}</span>
              <span class="gp-card-meta">{{ joinedGroups.length }} {{ copy('个', 'groups') }}</span>
            </div>
            <div class="gp-card-body">
              <div v-if="joinedGroups.length" class="gp-group-grid">
                <article v-for="group in joinedGroups" :key="group.id" class="gp-group-card" :class="{ active: selectedGroup?.group.id === group.id }">
                  <div class="gp-gc-top">
                    <b class="gp-gc-badge">{{ copy('组', 'G') }}</b>
                    <strong class="gp-gc-name">{{ group.name }}</strong>
                  </div>
                  <span class="gp-gc-desc">{{ group.description || copy('还没有公告。', 'No notice yet.') }}</span>
                  <small class="gp-gc-meta">{{ group.visibility }} · {{ group.memberCount }} {{ copy('人', 'members') }} · {{ group.inviteCode }}</small>
                  <div class="gp-gc-foot"><button type="button" class="gp-btn-soft" @click="selectGroup(group.id)">{{ copy('查看小组', 'View Group') }}</button></div>
                </article>
              </div>
              <div v-else class="empty-list">{{ copy('还没有小组，创建一个地下茶水间。', 'No groups yet. Create an underground break room.') }}</div>
            </div>
          </section>

          <section class="gp-card">
            <div class="gp-card-head gp-head-detail">
              <span class="gp-card-title">{{ copy('小组详情', 'Group Details') }}</span>
              <span class="gp-card-meta">{{ selectedGroup?.group.name ?? copy('选择一个小组', 'Select a group') }}</span>
            </div>
            <div class="gp-card-body">
              <div v-if="selectedGroup?.currentGoal" class="gp-goal">
                <div class="gp-goal-head">
                  <strong>{{ copy('本周协作目标', 'Weekly Goal') }}</strong>
                  <small>{{ selectedGroup.currentGoal.goal.periodKey }}</small>
                </div>
                <p class="gp-goal-stat">{{ selectedGroup.currentGoal.completed ? copy('目标已完成', 'Goal Complete') : copy('累计 Fish Power Score', 'Total Fish Power Score') }} <b>{{ selectedGroup.currentGoal.currentValue.toFixed(1) }} / {{ selectedGroup.currentGoal.targetValue }}</b> · {{ selectedGroup.currentGoal.percent }}% · {{ selectedGroup.currentGoal.goal.rewardTitle }}</p>
                <div class="gp-bar" :aria-label="copy('小组目标进度', 'Group goal progress')">
                  <span :style="{ width: `${selectedGroup.currentGoal.percent}%` }"></span>
                </div>
                <ol v-if="selectedGroup.currentGoal.contributions.length" class="gp-rank">
                  <li v-for="member in selectedGroup.currentGoal.contributions" :key="member.userId">
                    <span>{{ member.displayName }} · {{ member.recordCount }} {{ copy('条', 'records') }}</span>
                    <b>{{ member.score.toFixed(1) }}</b>
                  </li>
                </ol>
              </div>
              <template v-if="selectedGroup && selectedGroup.challenges.length">
                <p class="gp-sec-label">{{ copy('小组挑战', 'Group Challenges') }}</p>
                <div v-for="challenge in selectedGroup.challenges" :key="challenge.name" class="gp-row">
                  <div class="gp-row-head">
                    <strong>{{ translatedChallenge(challenge).name }}</strong>
                    <button class="gp-btn-soft" type="button" @click="handleGroupChallenge(challenge.name)">{{ copy('发起挑战 · 30 鱼鳞', 'Start Challenge · 30 Scale') }}</button>
                  </div>
                  <span class="gp-row-sub">{{ translatedChallenge(challenge).condition }} · {{ copy('奖励「', 'Reward: ') }}{{ translatedChallenge(challenge).reward }}{{ copy('」', '') }}</span>
                </div>
              </template>
              <template v-if="selectedGroupRecords.length">
                <p class="gp-sec-label">{{ copy('小组记录流', 'Group Feed') }}</p>
                <div v-for="record in selectedGroupRecords" :key="record.id" class="gp-row">
                  <div class="gp-row-rec">
                    <b>{{ record.nickname }} · {{ record.score.toFixed(1) }}</b>
                    <span>{{ record.durationLabel }} · {{ record.activityText }} · {{ record.storyText || record.description }}</span>
                  </div>
                </div>
              </template>
              <div v-else class="empty-list">{{ copy('小组记录流还没有内容。', 'The group feed has no content yet.') }}</div>
            </div>
          </section>
        </template>
      </div>

      <PxCard v-if="activeSection === 'about'" id="about" class="panel about-panel">
        <template #header>
          <div class="panel-title"><BadgeCheck :size="18" /><span>{{ t('about') }}</span></div>
        </template>

        <div class="about-body">
          <div class="about-hero">
            <h1 class="about-brand-name">{{ copy('工位鱼王', 'Gongwei Yuwang') }}</h1>
            <p class="about-lead">{{ copy('把“摸鱼”正经计分的娱乐社区——匿名记录办公室精神状态，认真到有点荒诞。', 'An entertainment community that scores your office downtime — anonymous workplace-mood records, taken absurdly seriously.') }}</p>
          </div>

          <section class="about-block">
            <h2 class="about-section-title"><span>{{ copy('这是什么', 'What This Is') }}</span></h2>
            <p class="about-text">{{ copy('工位鱼王是一个轻量、偏娱乐的社区。你提交一条匿名“摸鱼记录”——摸鱼类型、持续时间、风险场景、伪装方式，再配一段创意描述。系统按固定规则算出 Fish Power Score，并据此发放称号、徽章和成就。我们记录的是一种心态，不是教你怎么违规。', 'Gongwei Yuwang is a lightweight, for-fun community. You submit an anonymous slacking record — type, duration, risk setting, disguise, and a short creative note. The system computes a Fish Power Score by fixed rules, then hands out titles, badges, and achievements. We log a state of mind, not a how-to for breaking rules.') }}</p>
          </section>

          <section class="about-block">
            <h2 class="about-section-title"><span>{{ copy('一条记录会经历什么', 'Where a Record Goes') }}</span></h2>
            <p class="about-text">{{ copy('提交之后，分数由后端按固定公式计算、保留一位小数——客户端永远不决定最终得分。算好的记录会进入今日、周、月、赛季、伪装、会议和传奇排行榜，出现在你的个人主页，并按你选择的发布范围流向社区、圈子和小组。', 'Once you submit, the score is computed by the backend with a fixed formula, kept to one decimal — the client never decides the final number. The scored record then enters the daily, weekly, monthly, season, disguise, meeting, and legendary leaderboards, appears on your profile, and travels to the community, circles, and groups by the visibility you picked.') }}</p>
          </section>

          <section class="about-block">
            <h2 class="about-section-title"><span>{{ copy('四个去处', 'Four Places It Lives') }}</span></h2>
            <p class="about-text">{{ copy('你的记录不会只待在一个地方。社交分四层，各管一件事。', 'Your record does not stay in one place. The social side has four layers, each with its own job.') }}</p>

            <div class="about-cards">
              <div class="about-card">
                <div class="about-card-head">
                  <MessageCircle :size="14" />
                  <strong>{{ copy('社区广场', 'Community') }}</strong>
                </div>
                <p>{{ copy('全站公共内容流，点赞、评论、举报和传奇提名都在这里。', 'The site-wide public feed — likes, comments, reports, and legend nominations all happen here.') }}</p>
              </div>
              <div class="about-card">
                <div class="about-card-head">
                  <Crown :size="14" />
                  <strong>{{ copy('工会', 'Guild') }}</strong>
                </div>
                <p>{{ copy('选一个工会安家，把摸鱼贡献变成赛季竞争和工会排行。', 'Pick one guild as home and turn your slacking into seasonal competition and rankings.') }}</p>
              </div>
              <div class="about-card">
                <div class="about-card-head">
                  <Star :size="14" />
                  <strong>{{ copy('圈子', 'Circle') }}</strong>
                </div>
                <p>{{ copy('按兴趣加入多个主题圈子，新记录会自动归类进去。', 'Join multiple themed circles by interest; new records are auto-sorted in.') }}</p>
              </div>
              <div class="about-card">
                <div class="about-card-head">
                  <User :size="14" />
                  <strong>{{ copy('小组', 'Group') }}</strong>
                </div>
                <p>{{ copy('熟人或邀请码组成的小空间，有自己的记录流、挑战和周目标。', 'A small space of friends or invite codes, with its own feed, challenges, and weekly goals.') }}</p>
              </div>
            </div>
          </section>

          <section class="about-block">
            <h2 class="about-section-title"><span>{{ copy('我们不做什么', "What We Don't Do") }}</span></h2>
            <p class="about-text">{{ copy('这是娱乐社区，不是违规教程。我们不鼓励真实违反职场规则，不提供图片、截图或文件上传，也不收集真实公司名、部门名、客户名、员工身份或地理位置。摸鱼是一种态度，不是泄密。', 'This is an entertainment community, not a rule-breaking guide. We do not encourage real workplace violations, do not allow image, screenshot, or file uploads, and do not collect real company, department, or client names, employee identities, or locations. Slacking is an attitude, not a leak.') }}</p>
          </section>

          <section class="about-block">
            <h2 class="about-section-title"><span>{{ copy('安全与内容保护', 'Safety & Content Protection') }}</span></h2>
            <div class="about-note">
              <AlertTriangle :size="16" />
              <p>{{ copy(options.safetyNotice, 'Do not submit company secrets, personal privacy, employee IDs, chat records, client data, or non-anonymized screenshots. This platform is for entertainment only and does not support real workplace rule violations.') }}</p>
            </div>

            <div class="about-cards">
              <div class="about-card">
                <div class="about-card-head">
                  <Hash :size="14" />
                  <strong>{{ copy('长度限制', 'Length Limit') }}</strong>
                </div>
                <p>{{ copy('创意描述最多', 'Creative notes capped at') }} {{ options.maxDescriptionLength }} {{ copy('字，超出后无法提交。', 'characters; longer text cannot be submitted.') }}</p>
              </div>
              <div class="about-card">
                <div class="about-card-head">
                  <ShieldAlert :size="14" />
                  <strong>{{ copy('敏感词拦截', 'Sensitive Terms') }}</strong>
                </div>
                <p>{{ copy('命中', 'If') }} {{ options.sensitiveTerms.length }} {{ copy('个明显敏感词时，前端和后端都会提示。', 'obvious sensitive terms are matched, both frontend and backend will warn.') }}</p>
              </div>
              <div class="about-card">
                <div class="about-card-head">
                  <ClipboardCheck :size="14" />
                  <strong>{{ copy('审核兜底', 'Review Fallback') }}</strong>
                </div>
                <p>{{ copy('手机号、邮箱、链接、疑似公司全称等内容会进入人工审核队列。', 'Phone numbers, emails, links, and suspected full company names go to manual review.') }}</p>
              </div>
              <div class="about-card">
                <div class="about-card-head">
                  <BadgeCheck :size="14" />
                  <strong>{{ copy('提交边界', 'Submission Boundary') }}</strong>
                </div>
                <p>{{ copy('不提供图片、截图或文件上传；分数始终由后端按枚举重新计算。', 'No image, screenshot, or file upload. Scores are always recalculated by the backend from enums.') }}</p>
              </div>
            </div>
          </section>

          <section class="about-block about-block-last">
          <h2 class="about-section-title"><span>{{ copy('意见反馈', 'Feedback') }}</span></h2>
          <p class="about-text about-feedback-intro">{{ copy('想到改进、踩到 bug，或者对内容安全有意见，都可以写下来。建议会入库，按优先级处理。', 'Spotted an improvement, hit a bug, or have a content-safety concern? Write it down — feedback is logged and handled by priority.') }}</p>
          <form class="record-form" @submit.prevent="handleFeedbackSubmit">
            <label class="field">
              <span>{{ copy('建议类型', 'Feedback Type') }}</span>
              <select v-model="feedbackForm.category">
                <option value="feature">{{ copy('功能建议', 'Feature') }}</option>
                <option value="bug">{{ copy('问题反馈', 'Bug') }}</option>
                <option value="content">{{ copy('内容与安全', 'Content & Safety') }}</option>
                <option value="other">{{ copy('其他', 'Other') }}</option>
              </select>
            </label>
            <label class="field">
              <span>{{ copy('建议内容', 'Feedback') }}</span>
              <textarea v-model="feedbackForm.content" maxlength="300" :placeholder="copy('写清楚你希望怎么改，别写真实公司或客户信息。', 'Describe what should change. Do not include real company or client information.')" />
            </label>
            <label class="field">
              <span>{{ copy('联系方式（可选）', 'Contact (optional)') }}</span>
              <PxInput v-model="feedbackForm.contact" :placeholder="copy('可留站内昵称，不建议填写手机号或微信号', 'Use an in-app nickname. Avoid phone numbers or chat IDs.')" clearable />
            </label>
            <p class="scope-note">{{ copy('建议最长 300 字；命中明显敏感内容会被拒绝或进入待处理状态。', 'Feedback is limited to 300 characters. Obvious sensitive content will be rejected or queued.') }}</p>
            <div class="form-actions">
              <PxButton type="primary" native-type="submit" size="small" :disabled="feedbackLoading" :loading="feedbackLoading">
                <Send :size="14" />
                {{ feedbackLoading ? copy('提交中', 'Submitting') : copy('提交建议', 'Submit Feedback') }}
              </PxButton>
            </div>
            <div v-if="feedbackSubmitted" class="feedback-success">
              <Check :size="16" />
              {{ copy('建议已入库，后续会按优先级处理。', 'Feedback saved and will be handled by priority.') }}
            </div>
          </form>
        </section>
        </div>
      </PxCard>

      <!-- 反馈独立页面 -->
      <PxCard v-if="activeSection === 'feedback'" id="feedback" class="panel feedback-panel">
        <template #header>
          <div class="panel-title"><MessageCircle :size="18" /><span>{{ t('feedback') }}</span></div>
        </template>
        <form class="record-form" @submit.prevent="handleFeedbackSubmit">
          <label class="field">
            <span>{{ copy('建议类型', 'Feedback Type') }}</span>
            <select v-model="feedbackForm.category">
              <option value="feature">{{ copy('功能建议', 'Feature') }}</option>
              <option value="bug">{{ copy('问题反馈', 'Bug') }}</option>
              <option value="content">{{ copy('内容与安全', 'Content & Safety') }}</option>
              <option value="other">{{ copy('其他', 'Other') }}</option>
            </select>
          </label>
          <label class="field">
            <span>{{ copy('建议内容', 'Feedback') }}</span>
            <textarea v-model="feedbackForm.content" maxlength="300" :placeholder="copy('写清楚你希望怎么改，别写真实公司或客户信息。', 'Describe what should change. Do not include real company or client information.')" />
          </label>
          <label class="field">
            <span>{{ copy('联系方式（可选）', 'Contact (optional)') }}</span>
            <PxInput v-model="feedbackForm.contact" :placeholder="copy('可留站内昵称，不建议填写手机号或微信号', 'Use an in-app nickname. Avoid phone numbers or chat IDs.')" clearable />
          </label>
          <p class="scope-note">{{ copy('建议最长 300 字；命中明显敏感内容会被拒绝或进入待处理状态。', 'Feedback is limited to 300 characters. Obvious sensitive content will be rejected or queued.') }}</p>
          <div class="form-actions">
            <PxButton type="primary" native-type="submit" size="small" :disabled="feedbackLoading" :loading="feedbackLoading">
              <Send :size="14" />
              {{ feedbackLoading ? copy('提交中', 'Submitting') : copy('提交建议', 'Submit Feedback') }}
            </PxButton>
          </div>
          <div v-if="feedbackSubmitted" class="feedback-success">
            <Check :size="16" />
            {{ copy('建议已入库，后续会按优先级处理。', 'Feedback saved and will be handled by priority.') }}
          </div>
        </form>
      </PxCard>

      <PxCard v-if="activeSection === 'announcements'" id="announcements" class="panel announcements-panel">
        <template #header>
          <div class="panel-title between">
            <span><AlertTriangle :size="18" /> {{ t('announcements') }}</span>
            <button class="profile-toggle-button" type="button" @click="loadAnnouncements">{{ copy('刷新公告', 'Refresh Announcements') }}</button>
          </div>
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
        <div v-else class="empty-list">{{ copy('暂时没有公告，说明鱼塘风平浪静。', 'No announcements for now. The pond is calm.') }}</div>
      </PxCard>

      <!-- 签到集合在钱包页面，section 名："每日打卡站" -->
      <PxCard v-if="activeSection === 'checkin' || activeSection === 'wallet'" id="checkin" class="panel checkin-panel">
        <template #header>
          <div class="panel-title"><Check :size="18" /><span>{{ activeSection === 'wallet' ? copy('每日打卡站', 'Daily Check-in') : t('checkin') }}</span></div>
        </template>
        <div v-if="!currentUser" class="empty-list">{{ t('needLogin') }}</div>
        <div v-else class="checkin-body">
          <div class="module-intro">
            <strong>{{ checkin?.checkedToday ? copy('今天已经签到', 'Checked in today') : copy('今天还没签到', 'Not checked in today') }}</strong>
            <span>{{ copy('签到只记录连续天数，不要求你透露真实公司、部门、地理位置或任何身份信息。', 'Check-in only tracks streaks. It does not ask for real company, department, location, or identity information.') }}</span>
          </div>
          <div class="profile-section profile-summary">
            <div>
              <span>{{ copy('连续签到', 'Streak') }}</span>
              <strong>{{ checkin?.streak ?? 0 }} {{ copy('天', 'days') }}</strong>
            </div>
            <div>
              <span>{{ copy('累计签到', 'Total Check-ins') }}</span>
              <strong>{{ checkin?.total ?? 0 }} {{ copy('次', 'times') }}</strong>
            </div>
            <div>
              <span>{{ copy('今日日期', 'Today') }}</span>
              <strong>{{ checkin?.today ?? '-' }}</strong>
            </div>
          </div>
          <label class="field">
            <span>{{ copy('今日精神状态备注（可选）', 'Today’s mood note (optional)') }}</span>
            <PxInput v-model="checkinNote" :placeholder="copy('例如：稳定发疯，但已匿名化', 'Example: stable chaos, anonymized')" clearable />
          </label>
          <button class="profile-toggle-button" type="button" :disabled="checkin?.checkedToday" @click="handleCheckin">
            {{ checkin?.checkedToday ? copy('今日已签到', 'Checked In') : copy('立即签到', 'Check In Now') }}
          </button>
        </div>
      </PxCard>

      <div v-if="activeSection === 'leaderboard'" id="leaderboard">
        <div class="circle-nav-header" style="margin-bottom: 14px;">
          <div class="circle-nav-brand-icon">
            <Trophy :size="26" stroke-width="2.5" />
          </div>
          <div class="circle-nav-brand-text">
            <strong>{{ selectedBoard?.label ?? t('leaderboard') }}</strong>
            <small>{{ selectedBoard?.description }}</small>
          </div>
        </div>
        <PxCard class="panel leaderboard-panel">

        <!-- 工具条：榜单切换 + 搜索 + 刷新 -->
        <div class="leaderboard-toolbar" :aria-label="copy('排行榜工具栏', 'Leaderboard toolbar')">
          <div class="leaderboard-board-tabs">
            <button
              v-for="board in localizedLeaderboardTypes"
              :key="board.key"
              class="leaderboard-board-button"
              :class="{ active: activeBoard === board.key }"
              type="button"
              @click="activeBoard = board.key"
            >
              {{ board.label }}
            </button>
          </div>
          <div class="leaderboard-tools">
            <PxInput
              v-model="filterKeyword"
              class="leaderboard-filter-input"
              :placeholder="t('filter')"
              clearable
            >
              <template #prefix><Search :size="14" /></template>
            </PxInput>
            <button v-if="filterKeyword" class="leaderboard-clear-button" type="button" @click="clearLeaderboardFilter">{{ copy('清空', 'Clear') }}</button>
            <button type="button" class="leaderboard-refresh-button" :title="copy('刷新排行榜', 'Refresh leaderboards')" @click="loadLeaderboard">
              <RefreshCw :size="14" />
            </button>
          </div>
        </div>

        <!-- 统计条 -->
        <div v-if="leaderboardRows.length" class="leaderboard-stats-bar">
          <div class="leaderboard-stat">
            <strong>{{ leaderboardResultCount }}</strong>
            <span>{{ copy('参与人数', 'Participants') }}</span>
          </div>
          <div class="leaderboard-stat">
            <strong>{{ leaderboardRows[0].score.toFixed(1) }}</strong>
            <span>{{ copy('最高分', 'Top Score') }}</span>
          </div>
          <div class="leaderboard-stat">
            <strong>{{ selectedBoard?.label ?? '-' }}</strong>
            <span>{{ copy('当前榜单', 'Current Board') }}</span>
          </div>
        </div>

        <!-- loading -->
        <div v-if="leaderboardLoading" class="loading-line">{{ copy('排行榜加载中...', 'Loading leaderboards...') }}</div>

        <template v-else-if="leaderboardRows.length">
          <!-- 领奖台：≥3 人才显示 -->
          <template v-if="leaderboardRows.length >= 3">
            <div class="leaderboard-divider">— {{ copy('TOP 3 · 本期领奖台', 'TOP 3 · Podium') }} —</div>
            <div class="leaderboard-podium-wrap">
              <div class="leaderboard-podium">
                <!-- 银牌 #2 -->
                <article class="lb-pod lb-pod--silver">
                  <div class="lb-pod-badge">#2</div>
                  <div class="lb-pod-avatar">
                    <UserAvatar :avatarUrl="leaderboardRows[1].avatarUrl" :avatarSeed="leaderboardRows[1].avatarSeed" :nickname="leaderboardRows[1].nickname" :size="68" />
                  </div>
                  <div class="lb-pod-name">{{ leaderboardRows[1].nickname }}</div>
                  <div class="lb-pod-user">{{ leaderboardRows[1].username ? `@${leaderboardRows[1].username}` : copy('匿名', 'anon') }}</div>
                  <div class="lb-pod-score">{{ leaderboardRows[1].score.toFixed(1) }}</div>
                  <div class="lb-pod-meta">{{ leaderboardRows[1].count ?? 0 }} {{ copy('条记录', 'records') }}</div>
                  <div class="lb-pod-reactions">
                    <span><Heart :size="11" /> {{ leaderboardRows[1].likeCount }}</span>
                    <span><Star :size="11" /> {{ leaderboardRows[1].favoriteCount }}</span>
                    <span><Crown :size="11" /> {{ leaderboardRows[1].voteCount }}</span>
                  </div>
                </article>
                <!-- 金牌 #1 -->
                <article class="lb-pod lb-pod--gold">
                  <div class="lb-pod-badge">#1</div>
                  <div class="lb-pod-crown"><Crown :size="22" /></div>
                  <div class="lb-pod-avatar">
                    <UserAvatar :avatarUrl="leaderboardRows[0].avatarUrl" :avatarSeed="leaderboardRows[0].avatarSeed" :nickname="leaderboardRows[0].nickname" :size="80" />
                  </div>
                  <div class="lb-pod-name">{{ leaderboardRows[0].nickname }}</div>
                  <div class="lb-pod-user">{{ leaderboardRows[0].username ? `@${leaderboardRows[0].username}` : copy('匿名', 'anon') }}</div>
                  <div class="lb-pod-score">{{ leaderboardRows[0].score.toFixed(1) }}</div>
                  <div class="lb-pod-meta">{{ leaderboardRows[0].count ?? 0 }} {{ copy('条记录 · 鱼力值', 'records · Fish Power') }}</div>
                  <div class="lb-pod-reactions">
                    <span><Heart :size="11" /> {{ leaderboardRows[0].likeCount }}</span>
                    <span><Star :size="11" /> {{ leaderboardRows[0].favoriteCount }}</span>
                    <span><Crown :size="11" /> {{ leaderboardRows[0].voteCount }}</span>
                  </div>
                </article>
                <!-- 铜牌 #3 -->
                <article class="lb-pod lb-pod--bronze">
                  <div class="lb-pod-badge">#3</div>
                  <div class="lb-pod-avatar">
                    <UserAvatar :avatarUrl="leaderboardRows[2].avatarUrl" :avatarSeed="leaderboardRows[2].avatarSeed" :nickname="leaderboardRows[2].nickname" :size="68" />
                  </div>
                  <div class="lb-pod-name">{{ leaderboardRows[2].nickname }}</div>
                  <div class="lb-pod-user">{{ leaderboardRows[2].username ? `@${leaderboardRows[2].username}` : copy('匿名', 'anon') }}</div>
                  <div class="lb-pod-score">{{ leaderboardRows[2].score.toFixed(1) }}</div>
                  <div class="lb-pod-meta">{{ leaderboardRows[2].count ?? 0 }} {{ copy('条记录', 'records') }}</div>
                  <div class="lb-pod-reactions">
                    <span><Heart :size="11" /> {{ leaderboardRows[2].likeCount }}</span>
                    <span><Star :size="11" /> {{ leaderboardRows[2].favoriteCount }}</span>
                    <span><Crown :size="11" /> {{ leaderboardRows[2].voteCount }}</span>
                  </div>
                </article>
              </div>
            </div>
            <div class="leaderboard-divider">— {{ copy('第 4 名起 · 继续往下游', 'From 4th place') }} —</div>
          </template>

          <!-- 降级态分割线（< 3 人） -->
          <div v-if="leaderboardRows.length < 3" class="leaderboard-divider">— {{ copy('全部记录', 'All records') }} —</div>

          <!-- 普通列表（< 3 人显示全部，≥ 3 人从第 4 名起） -->
          <ol class="leaderboard-list">
            <li
              v-for="row in (leaderboardRows.length >= 3 ? leaderboardRows.slice(3) : leaderboardRows)"
              :key="`${activeBoard}-${row.rank}-${row.nickname}-${row.createdAt}`"
            >
              <button
                type="button"
                class="leaderboard-row"
                :class="{ 'is-me': currentUser && row.username === currentUser.username }"
              >
                <div class="lb-row-rank">{{ row.rank }}</div>
                <div class="lb-row-avatar">
                  <UserAvatar :avatarUrl="row.avatarUrl" :avatarSeed="row.avatarSeed" :nickname="row.nickname" :size="30" />
                </div>
                <div class="lb-row-main">
                  <div class="lb-row-name">
                    {{ row.nickname }}
                    <span v-if="currentUser && row.username === currentUser.username" class="lb-you-tag">{{ copy('YOU', 'YOU') }}</span>
                  </div>
                  <div class="lb-row-sub">
                    {{ row.username ? `@${row.username}` : copy('匿名昵称聚合', 'Anonymous') }}
                    · {{ copy('共提交', 'Submitted') }} {{ row.count ?? 0 }} {{ copy('条', 'records') }}
                  </div>
                </div>
                <div class="lb-row-score-col">
                  <strong>{{ row.score.toFixed(1) }}</strong>
                  <div class="lb-row-reactions">
                    <span><Heart :size="11" /> {{ row.likeCount }}</span>
                    <span><Star :size="11" /> {{ row.favoriteCount }}</span>
                    <span><Crown :size="11" /> {{ row.voteCount }}</span>
                  </div>
                </div>
              </button>
            </li>
          </ol>
        </template>

        <!-- 空态 -->
        <div v-else class="empty-list">{{ copy('暂无记录，第一条鱼还没入库。', 'No records yet. The first fish has not entered the database.') }}</div>
        </PxCard>
      </div>

      <!-- 安全内容集合在关于我们页面 -->
      <div v-if="activeSection === 'safety' || activeSection === 'about'" class="info-grid">
        <PxCard id="safety" class="panel safety-panel">
          <template #header><div class="panel-title"><ShieldAlert :size="18" /><span>{{ t('safety') }}</span></div></template>

          <div class="safety-warning">
            <AlertTriangle :size="18" />
            <p>{{ copy(options.safetyNotice, 'Do not submit company secrets, personal privacy, employee IDs, chat records, client data, or non-anonymized screenshots. This platform is for entertainment only and does not support real workplace rule violations.') }}</p>
          </div>

          <div class="protection-list" :aria-label="copy('内容保护策略', 'Content protection strategy')">
            <div class="protection-item-flat">
              <div class="protection-item-head">
                <Hash :size="14" />
                <strong>{{ copy('长度限制', 'Length Limit') }}</strong>
              </div>
              <p>{{ copy('摸鱼故事最多', 'Story max') }} {{ options.maxDescriptionLength }} {{ copy('字，超出后无法提交。', 'characters. Longer content cannot be submitted.') }}</p>
            </div>
            <div class="protection-item-flat">
              <div class="protection-item-head">
                <ShieldAlert :size="14" />
                <strong>{{ copy('敏感词拦截', 'Sensitive Terms') }}</strong>
              </div>
              <p>{{ copy('命中', 'If') }} {{ options.sensitiveTerms.length }} {{ copy('个明显敏感词时，前端和后端都会提示。', 'obvious sensitive terms are matched, both frontend and backend will warn.') }}</p>
            </div>
            <div class="protection-item-flat">
              <div class="protection-item-head">
                <ClipboardCheck :size="14" />
                <strong>{{ copy('审核兜底', 'Review Fallback') }}</strong>
              </div>
              <p>{{ copy('手机号、邮箱、链接、疑似公司全称等内容会进入人工审核队列。', 'Phone numbers, emails, links, and suspected full company names go to manual review.') }}</p>
            </div>
            <div class="protection-item-flat">
              <div class="protection-item-head">
                <BadgeCheck :size="14" />
                <strong>{{ copy('提交边界', 'Submission Boundary') }}</strong>
              </div>
              <p>{{ copy('不提供图片、截图或文件上传；分数始终由后端按枚举重新计算。', 'No image, screenshot, or file upload. Scores are always recalculated by the backend from enums.') }}</p>
            </div>
          </div>

          <div class="about-stats" v-if="stats">
            <div class="about-stats-item">
              <b>{{ stats.totalRecords }}</b>
              <span>{{ t('total') }}</span>
            </div>
            <div class="about-stats-item">
              <b>{{ stats.todayRecords }}</b>
              <span>{{ t('today') }}</span>
            </div>
            <div class="about-stats-item">
              <b>{{ stats.topScore }}</b>
              <span>{{ t('top') }}</span>
            </div>
            <div class="about-stats-item">
              <b>SQLite</b>
              <span>{{ copy('已启用', 'Enabled') }}</span>
            </div>
          </div>
        </PxCard>
      </div>

      <PxCard v-if="activeSection === 'admin' && currentUser?.isAdmin" id="admin" class="panel admin-panel">
        <template #header><div class="panel-title"><ClipboardCheck :size="18" /><span>{{ t('admin') }}</span></div></template>
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
      <PxCard v-else-if="activeSection === 'admin'" class="panel admin-panel">
        <template #header><div class="panel-title"><ClipboardCheck :size="18" /><span>{{ t('admin') }}</span></div></template>
        <div class="empty-list">{{ copy('需要管理员账号才能查看审核队列。', 'An admin account is required to view the review queue.') }}</div>
      </PxCard>
    </aside>
  </section>
</template>
