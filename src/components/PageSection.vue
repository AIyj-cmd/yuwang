<script setup lang="ts">
import { computed } from 'vue';
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
import { useAppContext } from '../appContext';

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
              <option v-for="item in options.durations" :key="item.key" :value="item.key">{{ translatedOptionLabel(item.key, item.label) }} · {{ item.score ?? item.baseScore }} {{ copy('分', 'pts') }}</option>
            </select>
            <small class="field-hint">
              {{ copy('Fish Power Score 只由持续时间决定，故事再离谱也不加分，但可能会被鱼友们推上热榜。', 'Fish Power Score is decided only by duration. A wild story adds no score, but other users may push it onto hot lists.') }}
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
            <p v-if="topicError" class="topic-error" role="alert" aria-live="assertive">{{ topicError }}</p>
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
              <input v-model="form.autoCircles" type="checkbox" :disabled="form.privateOnly" />
              <span>{{ copy('自动加入相关圈子', 'Auto-add to related circles') }}</span>
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

          <p v-if="errorMessage" class="error-line" role="alert" aria-live="assertive"><AlertTriangle :size="16" />{{ errorMessage }}</p>
          <p v-if="statusMessage" class="status-line" role="status" aria-live="polite"><Check :size="16" />{{ statusMessage }}</p>

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
      <PxCard v-if="activeSection === 'wallet'" id="wallet" class="panel wallet-panel">
        <template #header>
          <div class="panel-title between">
            <span><Coins :size="18" /> {{ t('wallet') }}</span>
            <button class="profile-toggle-button" type="button" @click="loadWallet">{{ copy('刷新钱包', 'Refresh Wallet') }}</button>
          </div>
        </template>
        <div v-if="!currentUser" class="empty-list">{{ t('needLogin') }}</div>
        <div v-else-if="walletData" class="wallet-body">
          <div class="module-intro">
            <strong>{{ copy('鱼鳞 Fish Scale', 'Fish Scale') }}</strong>
            <span>{{ walletData.notice }}</span>
          </div>
          <section class="profile-section profile-summary wallet-summary">
            <div>
              <span>{{ copy('当前余额', 'Balance') }}</span>
              <strong>{{ walletData.wallet.fishScaleBalance }}</strong>
            </div>
            <div>
              <span>{{ copy('累计获得', 'Total Earned') }}</span>
              <strong>{{ walletData.wallet.fishScaleTotalEarned }}</strong>
            </div>
            <div>
              <span>{{ copy('累计消费', 'Total Spent') }}</span>
              <strong>{{ walletData.wallet.fishScaleTotalSpent }}</strong>
            </div>
            <div>
              <span>{{ copy('鱼鳞等级', 'Scale Level') }}</span>
              <strong>{{ walletData.wallet.level }}</strong>
            </div>
          </section>
          <section class="profile-section">
            <div class="profile-section-head">
              <strong>{{ copy('最近流水', 'Recent Transactions') }}</strong>
              <small>{{ walletTransactions?.total ?? walletData.recentTransactions.length }} {{ copy('条', 'items') }}</small>
            </div>
            <div class="wallet-transaction-list" v-if="(walletTransactions?.transactions ?? walletData.recentTransactions).length">
              <article v-for="transaction in walletTransactions?.transactions ?? walletData.recentTransactions" :key="transaction.id" class="wallet-transaction">
                <div>
                  <strong :class="transaction.amount >= 0 ? 'scale-plus' : 'scale-minus'">{{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}</strong>
                  <span>{{ transaction.reason }}</span>
                </div>
                <small>{{ transaction.type }} · {{ transaction.balanceAfter }} · {{ new Date(transaction.createdAt).toLocaleString() }}</small>
              </article>
            </div>
            <div v-else class="empty-list">{{ copy('还没有鱼鳞流水，先提交一条匿名记录。', 'No Fish Scale transactions yet. Submit an anonymous record first.') }}</div>
          </section>
        </div>
        <div v-else class="empty-list">{{ copy('钱包加载中...', 'Loading wallet...') }}</div>
      </PxCard>

      <PxCard v-if="activeSection === 'submit' || activeSection === 'result'" id="result" class="panel result-panel">
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
          <p class="scope-note">{{ copy('本次分数由持续时间档位计算。', 'This score is calculated from the duration tier.') }}</p>

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
            <button type="button" :class="{ active: social?.viewer.voted }" :title="copy('发起传奇提名将消耗 10 鱼鳞。', 'Starting a legend nomination costs 10 Fish Scale.')" @click="handleInteraction('vote')">
              <Crown :size="16" />{{ copy('传奇提名 · 10 鱼鳞', 'Nominate · 10 Scale') }} {{ selectedRecord.voteCount }}
            </button>
            <button type="button" @click="handleShare"><Share2 :size="16" />{{ t('share') }}</button>
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
            <p>{{ locale === 'en-US' ? `I got ${selectedRecord.score.toFixed(1)} Fish Power on Gongwei Yuwang. This is anonymous entertainment, not a workplace rule-breaking guide.` : shareCard.shareText }}</p>
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

      <PxCard v-if="activeSection === 'guilds'" id="guilds" class="panel guild-panel">
        <template #header>
          <div class="panel-title between">
            <span><Crown :size="18" /> {{ t('guilds') }}</span>
            <small>{{ copy('身份归属和赛季竞争', 'Identity and seasonal competition') }}</small>
          </div>
        </template>
        <div class="module-intro">
          <strong>{{ guildsData?.myGuild ? `${copy('我的工会：', 'My guild: ')}${translatedGuildName(guildsData.myGuild)}` : copy('你还没有加入任何工会，先找个组织摸鱼。', 'You have not joined a guild yet. Find an organization first.') }}</strong>
          <span>{{ copy('提交记录后，会按 Fish Power Score * 0.3 加互动加成为当前工会贡献积分。', 'After submitting a record, Fish Power Score * 0.3 plus interaction bonuses contributes to the current guild.') }}</span>
        </div>
        <div class="guild-layout">
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('工会列表', 'Guild List') }}</strong><small>{{ copy('同一时间只能加入一个', 'Only one guild at a time') }}</small></div>
            <div class="entity-grid">
              <article v-for="guild in guildsData?.guilds ?? []" :key="guild.id" class="entity-card" :class="{ active: guild.joined }">
                <b>{{ guild.icon }}</b>
                <strong>{{ translatedGuildName(guild) }}</strong>
                <span>{{ translatedGuildDescription(guild) }}</span>
                <small>{{ translatedTitle(guild.level) }} · {{ guild.memberCount }} {{ copy('人', 'members') }} · {{ guild.totalContribution.toFixed(1) }}</small>
                <button type="button" @click="handleJoinGuild(guild.id)">{{ guild.joined ? copy('当前工会', 'Current Guild') : copy('加入工会', 'Join Guild') }}</button>
              </article>
            </div>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('工会排行榜', 'Guild Ranking') }}</strong><small>{{ copy('成员贡献榜', 'Member contribution') }}</small></div>
            <ol v-if="guildsData?.ranking.length" class="compact-ranking">
              <li v-for="row in guildsData.ranking" :key="row.userId">
                <span>#{{ row.rank }} {{ row.nickname }}</span>
                <strong>{{ row.contribution.toFixed(1) }}</strong>
              </li>
            </ol>
            <div v-else class="empty-list">{{ copy('工会排行榜还在等第一条贡献。', 'The guild ranking is waiting for its first contribution.') }}</div>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('工会任务', 'Guild Tasks') }}</strong><small>{{ copy('固定娱乐任务', 'Fixed playful tasks') }}</small></div>
            <div class="task-list">
              <article>
                <strong>{{ copy('今日集体摸鱼任务', 'Today’s Team Slacking Task') }}</strong>
                <span>{{ copy('全员今日提交 3 条公开记录', 'Submit 3 public records as a guild today') }}</span>
              </article>
              <article>
                <strong>{{ copy('本周累计任务', 'Weekly Contribution Task') }}</strong>
                <span>{{ copy('本周累计贡献达到 500', 'Reach 500 total contribution this week') }}</span>
              </article>
              <article>
                <strong>{{ copy('传奇操作挑战', 'Legend Move Challenge') }}</strong>
                <span>{{ copy('产生 1 条传奇提名记录', 'Generate 1 legend-nominated record') }}</span>
              </article>
            </div>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('工会成员榜', 'Guild Members') }}</strong><small>{{ selectedGuild ? translatedGuildName(selectedGuild.guild) : copy('加入后查看', 'Join to view') }}</small></div>
            <div v-if="selectedGuild?.records.length" class="record-card-list compact">
              <article v-for="record in selectedGuild.records" :key="record.id" class="record-card compact-card">
                <strong>{{ record.nickname }} · {{ record.score.toFixed(1) }}</strong>
                <span>{{ translatedTitle(record.title) }} · {{ copy('贡献 +', 'Contribution +') }}{{ record.guildContribution.toFixed(1) }}</span>
              </article>
            </div>
            <div v-else class="empty-list">{{ copy('这个工会暂时还没开始集体摸鱼。', 'This guild has not started slacking together yet.') }}</div>
          </section>
        </div>
      </PxCard>

      <PxCard v-if="activeSection === 'circles'" id="circles" class="panel circle-panel">
        <template #header>
          <div class="panel-title between">
            <span><Star :size="18" /> {{ t('circles') }}</span>
            <small>{{ copy('主题兴趣聚合', 'Topic interest spaces') }}</small>
          </div>
        </template>
        <div class="module-intro">
          <strong>{{ selectedCircle ? translatedCircleName(selectedCircle.circle) : t('circles') }}</strong>
          <span>{{ copy('圈子解决“我关心什么”。新记录会按摸鱼事项、摸鱼故事和话题关键词自动归类。', 'Circles answer “what do I care about?” New records are auto-classified by activity, story, and topic keywords.') }}</span>
        </div>
        <div class="circle-layout">
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('推荐圈子', 'Recommended Circles') }}</strong><small>{{ copy('可加入多个', 'Join multiple') }}</small></div>
            <div class="entity-grid">
              <article v-for="circle in circlesData?.circles ?? []" :key="circle.id" class="entity-card" :class="{ active: selectedCircle?.circle.id === circle.id }">
                <b>{{ circle.icon }}</b>
                <strong>{{ translatedCircleName(circle) }}</strong>
                <span>{{ translatedCircleDescription(circle) }}</span>
                <small>{{ circle.memberCount }} {{ copy('人', 'members') }} · {{ circle.recordCount }} {{ copy('条记录', 'records') }}</small>
                <div class="entity-actions">
                  <button type="button" @click="selectCircle(circle.id)">{{ copy('详情', 'Details') }}</button>
                  <button type="button" @click="handleJoinCircle(circle.id)">{{ circle.joined ? copy('已加入', 'Joined') : copy('加入', 'Join') }}</button>
                </div>
              </article>
            </div>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('圈子详情', 'Circle Details') }}</strong><small>{{ selectedCircle?.circle.recordCount ?? 0 }} {{ copy('条记录', 'records') }}</small></div>
            <p class="module-copy">{{ selectedCircle ? translatedCircleDescription(selectedCircle.circle) : copy('这个圈子暂时风平浪静。', 'This circle is quiet for now.') }}</p>
            <div class="record-tags board-tags">
              <span v-for="board in translatedCircleBoards(selectedCircle?.circle)" :key="board">{{ board }}</span>
            </div>
            <div v-if="selectedCircleRecords.length" class="record-card-list compact">
              <article v-for="record in selectedCircleRecords" :key="record.id" class="record-card compact-card">
                <strong>{{ record.nickname }} · {{ record.score.toFixed(1) }}</strong>
                <span>{{ record.durationLabel }} · {{ record.activityText }} · {{ record.storyText || record.description }}</span>
                <div class="record-actions">
                  <button type="button" @click="handleFeedLike(record.id)">{{ t('like') }} {{ record.likeCount }}</button>
                  <button type="button" :title="copy('发起传奇提名将消耗 10 鱼鳞。', 'Starting a legend nomination costs 10 Fish Scale.')" @click="handleFeedNominate(record.id)">{{ copy('传奇 · 10 鱼鳞', 'Legend · 10 Scale') }} {{ record.legendNominationCount }}</button>
                  <button type="button" @click="openProfileRecord(record.id)">{{ t('comments') }} {{ record.commentCount }}</button>
                </div>
              </article>
            </div>
            <div v-else class="empty-list">{{ copy('这个圈子暂时风平浪静。', 'This circle is quiet for now.') }}</div>
          </section>
        </div>
      </PxCard>

      <PxCard v-if="activeSection === 'groups'" id="groups" class="panel group-panel">
        <template #header>
          <div class="panel-title between">
            <span><User :size="18" /> {{ t('groups') }}</span>
            <small>{{ copy('小范围熟人 / 邀请空间', 'Small invite spaces') }}</small>
          </div>
        </template>
        <div v-if="!currentUser" class="empty-list">{{ t('needLogin') }}</div>
        <div v-else class="group-layout">
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('创建小组', 'Create Group') }}</strong><small>{{ copy('不要使用真实公司名、部门名、客户名', 'Do not use real company, department, or client names') }}</small></div>
            <label class="field"><span>{{ copy('小组名称', 'Group Name') }}</span><PxInput v-model="groupForm.name" :placeholder="copy('地下茶水间', 'Underground break room')" clearable /></label>
            <label class="field"><span>{{ copy('小组公告', 'Group Notice') }}</span><textarea v-model="groupForm.description" maxlength="120" :placeholder="copy('小组公告，仍然不要写真实身份信息。', 'Group notice. Still do not include real identity information.')" /></label>
            <label class="field"><span>{{ copy('小组类型', 'Group Type') }}</span>
              <select v-model="groupForm.visibility">
                <option value="public">{{ copy('公开小组', 'Public Group') }}</option>
                <option value="invite">{{ copy('邀请码小组', 'Invite-code Group') }}</option>
              </select>
            </label>
            <p class="scope-note">{{ copy('创建小组将消耗 50 鱼鳞。', 'Creating a group costs 50 Fish Scale.') }}</p>
            <button class="profile-toggle-button" type="button" @click="handleCreateGroup">{{ copy('创建小组 · 50 鱼鳞', 'Create Group · 50 Scale') }}</button>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('输入邀请码加入', 'Join by Invite Code') }}</strong><small>{{ copy('仅保存邀请码，不收集真实身份', 'Only invite code is stored; no real identity is collected') }}</small></div>
            <div class="feed-comment-row">
              <PxInput v-model="inviteCode" placeholder="ABC123" clearable />
              <button type="button" @click="handleJoinGroup">{{ copy('加入', 'Join') }}</button>
            </div>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('我加入的小组', 'My Joined Groups') }}</strong><small>{{ joinedGroups.length }} {{ copy('个', 'groups') }}</small></div>
            <div v-if="joinedGroups.length" class="entity-grid">
              <article v-for="group in joinedGroups" :key="group.id" class="entity-card" :class="{ active: selectedGroup?.group.id === group.id }">
                <b>{{ copy('组', 'G') }}</b>
                <strong>{{ group.name }}</strong>
                <span>{{ group.description || copy('还没有公告。', 'No notice yet.') }}</span>
                <small>{{ group.visibility }} · {{ group.memberCount }} {{ copy('人', 'members') }} · {{ copy('邀请码', 'Code') }} {{ group.inviteCode }}</small>
                <button type="button" @click="selectGroup(group.id)">{{ copy('查看小组', 'View Group') }}</button>
              </article>
            </div>
            <div v-else class="empty-list">{{ copy('还没有小组，创建一个地下茶水间。', 'No groups yet. Create an underground break room.') }}</div>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('小组详情', 'Group Details') }}</strong><small>{{ selectedGroup?.group.name ?? copy('选择一个小组', 'Select a group') }}</small></div>
            <div v-if="selectedGroup" class="task-list">
              <article v-for="challenge in selectedGroup.challenges" :key="challenge.name">
                <strong>{{ translatedChallenge(challenge).name }}</strong>
                <span>{{ translatedChallenge(challenge).condition }} · {{ copy('奖励「', 'Reward: ') }}{{ translatedChallenge(challenge).reward }}{{ copy('」', '') }}</span>
                <button class="profile-toggle-button" type="button" @click="handleGroupChallenge(challenge.name)">
                  {{ copy('发起挑战 · 30 鱼鳞', 'Start Challenge · 30 Scale') }}
                </button>
              </article>
            </div>
            <div v-if="selectedGroupRecords.length" class="record-card-list compact">
              <article v-for="record in selectedGroupRecords" :key="record.id" class="record-card compact-card">
                <strong>{{ record.nickname }} · {{ record.score.toFixed(1) }}</strong>
                <span>{{ record.durationLabel }} · {{ record.activityText }} · {{ record.storyText || record.description }}</span>
              </article>
            </div>
            <div v-else class="empty-list">{{ copy('小组记录流还没有内容。', 'The group feed has no content yet.') }}</div>
          </section>
        </div>
      </PxCard>

      <PxCard v-if="activeSection === 'about'" id="about" class="panel about-panel">
        <template #header>
          <div class="panel-title"><BadgeCheck :size="18" /><span>{{ t('about') }}</span></div>
        </template>
        <div class="module-intro">
          <strong>{{ copy('工位鱼王记录的是办公室精神状态，不是违规教程。', 'Gongwei Yuwang records office mood, not rule-breaking tutorials.') }}</strong>
          <span>{{ copy('这里把摸鱼写成娱乐化记录、称号和排行榜，用轻量社区方式缓解打工人的荒诞感。', 'It turns slacking stories into playful records, titles, and leaderboards to capture modern office absurdity.') }}</span>
        </div>
        <div class="about-grid">
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('我们在做什么', 'What We Do') }}</strong><small>{{ copy('可用工具优先', 'Usable tool first') }}</small></div>
            <p class="module-copy">{{ copy('提交一条匿名摸鱼记录，系统按固定规则计算 Fish Power Score，再把结果放进排行榜、社区、圈子、小组和个人主页。', 'Submit an anonymous record. The system calculates Fish Power Score with fixed rules and shows it in leaderboards, community, circles, groups, and profiles.') }}</p>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('我们不做什么', 'What We Do Not Do') }}</strong><small>{{ copy('安全边界', 'Safety boundary') }}</small></div>
            <p class="module-copy">{{ copy('不鼓励真实违反职场规则，不提供图片上传，不收集真实公司名、客户名、部门名、地理位置或身份信息。', 'We do not encourage real workplace rule violations, provide image uploads, or collect real company, client, department, location, or identity information.') }}</p>
          </section>
          <section class="module-section">
            <div class="profile-section-head"><strong>{{ copy('当前模块', 'Current Modules') }}</strong><small>{{ copy('账号区入口', 'MVP section entries') }}</small></div>
            <div class="record-tags">
              <span>{{ t('submitRecord') }}</span>
              <span>{{ copy('用户聚合排行榜', 'User-aggregated leaderboards') }}</span>
              <span>{{ t('safety') }}</span>
              <span>{{ t('communitySystem') }}</span>
              <span>{{ t('checkin') }}</span>
            </div>
          </section>
        </div>
      </PxCard>

      <PxCard v-if="activeSection === 'feedback'" id="feedback" class="panel feedback-panel">
        <template #header>
          <div class="panel-title"><MessageCircle :size="18" /><span>{{ t('feedback') }}</span></div>
        </template>
        <div class="module-intro">
          <strong>{{ copy('提交建议前先匿名化。', 'Anonymize before submitting feedback.') }}</strong>
          <span>{{ copy('可以反馈功能、玩法、文案和问题，但不要写真实公司、客户、部门、电话、聊天记录或截图内容。', 'You can suggest features, mechanics, copy, or bug reports, but do not include real companies, clients, departments, phone numbers, chat records, or screenshots.') }}</span>
        </div>
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
            <button class="profile-toggle-button" type="submit" :disabled="feedbackLoading">
              <Send :size="14" />
              {{ feedbackLoading ? copy('提交中', 'Submitting') : copy('提交建议', 'Submit Feedback') }}
            </button>
          </div>
          <div v-if="feedbackSubmitted" class="status-line"><Check :size="15" />{{ copy('建议已入库，后续会按优先级处理。', 'Feedback saved and will be handled by priority.') }}</div>
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

      <PxCard v-if="activeSection === 'checkin'" id="checkin" class="panel checkin-panel">
        <template #header>
          <div class="panel-title"><Check :size="18" /><span>{{ t('checkin') }}</span></div>
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

      <PxCard v-if="activeSection === 'leaderboard'" id="leaderboard" class="panel leaderboard-panel">
        <template #header>
          <div class="panel-title between">
            <span>{{ selectedBoard?.label ?? t('leaderboard') }}</span>
            <small>{{ selectedBoard?.description }}</small>
          </div>
        </template>

        <div class="leaderboard-controls" :aria-label="copy('排行榜切换', 'Leaderboard switcher')">
          <div class="leaderboard-control-head">
            <div>
              <strong>{{ selectedBoard?.label }}</strong>
              <small>{{ selectedBoard?.description }} · {{ leaderboardResultCount }} {{ copy('条', 'rows') }}</small>
            </div>
            <button type="button" :title="copy('刷新排行榜', 'Refresh leaderboards')" @click="loadLeaderboard">
              <RefreshCw :size="14" />
              {{ copy('刷新', 'Refresh') }}
            </button>
          </div>
          <div class="leaderboard-board-list">
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
          <div class="leaderboard-filter-row">
            <label class="leaderboard-filter">
              <span>{{ t('filter') }}</span>
              <PxInput v-model="filterKeyword" :placeholder="t('filter')" clearable>
                <template #prefix><Search :size="14" /></template>
              </PxInput>
            </label>
            <button v-if="filterKeyword" class="leaderboard-clear-button" type="button" @click="clearLeaderboardFilter">{{ copy('清空筛选', 'Clear Filter') }}</button>
          </div>
        </div>

        <div v-if="leaderboardLoading" class="loading-line">{{ copy('排行榜加载中...', 'Loading leaderboards...') }}</div>
        <ol v-else-if="leaderboardRows.length" class="leaderboard-list">
          <li v-for="row in leaderboardRows" :key="`${activeBoard}-${row.rank}-${row.nickname}-${row.createdAt}`">
            <button type="button" class="leaderboard-row leaderboard-row-summary">
              <span class="rank">#{{ row.rank }}</span>
              <div class="leader-main">
                <strong>{{ row.nickname }}</strong>
                <span>{{ row.username ? `@${row.username}` : copy('匿名昵称聚合', 'Anonymous nickname aggregate') }}</span>
                <p>{{ copy('共提交', 'Submitted') }} {{ row.count ?? 0 }} {{ copy('条记录，当前排行榜只展示用户汇总，不展开单条内容。', 'records. This leaderboard only shows user summaries, not individual records.') }}</p>
              </div>
              <div class="leader-score">
                <strong>{{ row.score.toFixed(1) }}</strong>
                <span>{{ translatedMetric(row) }}</span>
                <small>{{ t('like') }} {{ row.likeCount }} · {{ t('favorite') }} {{ row.favoriteCount }} · {{ copy('传奇', 'Legend') }} {{ row.voteCount }}</small>
              </div>
            </button>
          </li>
        </ol>
        <div v-else class="empty-list">{{ copy('暂无记录，第一条鱼还没入库。', 'No records yet. The first fish has not entered the database.') }}</div>
      </PxCard>

      <div v-if="activeSection === 'safety'" class="info-grid">
        <PxCard id="safety" class="panel safety-panel">
          <template #header><div class="panel-title"><ShieldAlert :size="18" /><span>{{ t('safety') }}</span></div></template>
          <p>{{ copy(options.safetyNotice, 'Do not submit company secrets, personal privacy, employee IDs, chat records, client data, or non-anonymized screenshots. This platform is for entertainment only and does not support real workplace rule violations.') }}</p>
          <div class="protection-grid" :aria-label="copy('内容保护策略', 'Content protection strategy')">
            <div class="protection-item">
              <strong>{{ copy('长度限制', 'Length Limit') }}</strong>
              <span>{{ copy('摸鱼故事最多', 'Story max') }} {{ options.maxDescriptionLength }} {{ copy('字，超出后无法提交。', 'characters. Longer content cannot be submitted.') }}</span>
            </div>
            <div class="protection-item">
              <strong>{{ copy('敏感词拦截', 'Sensitive Terms') }}</strong>
              <span>{{ copy('命中', 'If') }} {{ options.sensitiveTerms.length }} {{ copy('个明显敏感词时，前端和后端都会提示。', 'obvious sensitive terms are matched, both frontend and backend will warn.') }}</span>
            </div>
            <div class="protection-item">
              <strong>{{ copy('审核兜底', 'Review Fallback') }}</strong>
              <span>{{ copy('手机号、邮箱、链接、疑似公司全称等内容会进入人工审核队列。', 'Phone numbers, emails, links, and suspected full company names go to manual review.') }}</span>
            </div>
            <div class="protection-item">
              <strong>{{ copy('提交边界', 'Submission Boundary') }}</strong>
              <span>{{ copy('不提供图片、截图或文件上传；分数始终由后端按枚举重新计算。', 'No image, screenshot, or file upload. Scores are always recalculated by the backend from enums.') }}</span>
            </div>
          </div>
          <div class="stats-line" v-if="stats">
            <span>{{ t('total') }} {{ stats.totalRecords }}</span>
            <span>{{ t('today') }} {{ stats.todayRecords }}</span>
            <span>{{ t('top') }} {{ stats.topScore }}</span>
            <span>{{ copy('SQLite 已启用', 'SQLite enabled') }}</span>
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
