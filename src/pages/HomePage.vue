<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Coins,
  Crown,
  Hash,
  Heart,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  Star,
  Trophy,
  X
} from 'lucide-vue-next';
import { PxButton, PxInput } from '@mmt817/pixel-ui';
import { useAppContext } from '../appContext';
import { shareRecord } from '../api';

const ctx = useAppContext();
const copy = ctx.copy;
const t = ctx.t;
const locale = ctx.locale;
const form = ctx.form;
const options = ctx.options;
const joinedGroups = ctx.joinedGroups;
const topicDraft = ctx.topicDraft;
const topicError = ctx.topicError;
const topicSuggestions = ctx.topicSuggestions;
const isTopicSelected = ctx.isTopicSelected;
const addTopic = ctx.addTopic;
const addTopicFromDraft = ctx.addTopicFromDraft;
const removeTopic = ctx.removeTopic;
const errorMessage = ctx.errorMessage;
const statusMessage = ctx.statusMessage;
const sensitiveHits = ctx.sensitiveHits;
const activityTextRemaining = ctx.activityTextRemaining;
const descriptionRemaining = ctx.descriptionRemaining;
const loading = ctx.loading;
const canSubmit = ctx.canSubmit;
const handleSubmit = ctx.handleSubmit;
const resetForm = ctx.resetForm;
const handlePrivateOnlyChange = ctx.handlePrivateOnlyChange;
const handleCommunityScopeChange = ctx.handleCommunityScopeChange;
const handleInteraction = ctx.handleInteraction;
const openTopic = ctx.openTopic;
const lastResult = ctx.lastResult;
const selectedRecord = ctx.selectedRecord;
const social = ctx.social;
const shareCard = ctx.shareCard;
const stats = ctx.stats;
const currentUser = ctx.currentUser;
const translatedTitle = ctx.translatedTitle;
const translatedSystemComment = ctx.translatedSystemComment;
const translatedOptionLabel = ctx.translatedOptionLabel;

const router = useRouter();

const pixelPattern = [
  'i', 'i', 'i', 'i', 'i', 'i',
  'i', 'i', 'fill', 'fill', 'i', 'i',
  'i', 'fill', 'fill-3', 'fill', 'fill-2', 'i',
  'i', 'fill', 'fill', 'fill', 'fill-2', 'fill-2',
  'i', 'i', 'fill', 'fill', 'i', 'i',
  'i', 'i', 'i', 'i', 'i', 'i'
];

const heroTotal = computed(() => stats.value?.totalRecords ?? 0);
const heroToday = computed(() => stats.value?.todayRecords ?? 0);
const heroTop = computed(() => stats.value?.topScore ?? 0);

const showResultModal = ref(false);

const submitAndReveal = async () => {
  if (!canSubmit.value) return;
  const previous = lastResult.value;
  await handleSubmit();
  if (lastResult.value && lastResult.value !== previous) {
    showResultModal.value = true;
  }
};

const closeModal = () => { showResultModal.value = false; };
const onBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) closeModal();
};
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && showResultModal.value) closeModal();
};

watch(showResultModal, (open) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = open ? 'hidden' : '';
});

onMounted(() => document.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  if (typeof document !== 'undefined') document.body.style.overflow = '';
});

const focusBooth = () => {
  const el = document.getElementById('booth');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const openLeaderboard = () => { void router.push('/leaderboard'); };

const copyToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
};

type ShareAction = 'generate' | 'copy_text' | 'share_link';

const handleShareAction = async (action: ShareAction) => {
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
      await copyToClipboard(window.location.origin + '/records/' + record.id);
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

const resetAndScroll = () => { resetForm(); closeModal(); focusBooth(); };
const goToCommunity = () => { closeModal(); void router.push('/community'); };
const goToLeaderboard = () => { closeModal(); openLeaderboard(); };

const headlineScore = computed(() => {
  const record = selectedRecord.value;
  if (!record) return '--';
  if (record.breakdown?.displayScore !== undefined) return record.breakdown.displayScore.toFixed(3);
  return record.score.toFixed(1);
});

const headlineLabel = computed(() => {
  const record = selectedRecord.value;
  if (!record) return 'Fish Power Score';
  return record.breakdown?.displayScore !== undefined
    ? copy('今日评分 / 10', 'Today Score / 10')
    : 'Fish Power Score';
});

const showAiBreakdown = computed(() => {
  const v = selectedRecord.value?.scoreVersion;
  return typeof v === 'string' && v.startsWith('ai_judge_v1');
});
</script>

<template>
  <section class="home-hero" :aria-label="copy('首页头图', 'Home hero')">
    <div class="hero-copy">
      <div class="hero-tag">
        <span>{{ copy('匿名 · 像素 · 摸鱼上榜', 'Anonymous · Pixel · On the Board') }}</span>
      </div>
      <h1 class="hero-title">
        <span>{{ copy('上班别太用力。', 'Don’t work too hard.') }}</span>
        <span class="hero-accent">{{ copy('把今天摸的鱼，记上榜。', 'Log today’s drift. Hit the board.') }}</span>
      </h1>
      <p class="hero-sub">{{ copy('匿名提交一段摸鱼瞬间，AI 帮你打分写评语，老板看不到。和工位上的同温层一起上榜、组工会、刷传奇。', 'Drop an anonymous slack moment, get an AI verdict, climb the boards. No boss in sight.') }}</p>
      <div class="hero-cta-row">
        <button type="button" class="hero-cta primary" @click="focusBooth">
          <span>{{ currentUser ? copy('继续上榜', 'Submit Another') : copy('开始上榜', 'Start the Board') }}</span>
          <ArrowRight :size="16" />
        </button>
        <button type="button" class="hero-cta ghost" @click="openLeaderboard">
          <Trophy :size="16" />
          <span>{{ copy('看今日鱼王', 'See Today’s Fish King') }}</span>
        </button>
      </div>
      <div class="hero-stats" v-if="stats">
        <div class="hero-stat"><strong>{{ heroTotal }}</strong><span>{{ copy('总记录', 'Records') }}</span></div>
        <div class="hero-stat"><strong>{{ heroToday }}</strong><span>{{ copy('今日上榜', 'Today') }}</span></div>
        <div class="hero-stat"><strong>{{ heroTop }}</strong><span>{{ copy('最高鱼力', 'Top Power') }}</span></div>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="hero-pixel-grid">
        <i v-for="(cell, index) in pixelPattern" :key="index" :class="cell" />
      </div>
      <div class="hero-fish">🐟</div>
    </div>
  </section>

  <section id="booth" class="booth" :aria-label="copy('摸鱼记录机', 'Slack Logging Booth')">
    <div class="booth-frame">
      <header class="booth-header">
        <div class="booth-rec">
          <span class="rec-dot" aria-hidden="true"></span>
          <span class="rec-label">REC</span>
          <span class="rec-sub">{{ copy('摸鱼记录机 · 正在收音', 'Slack Logger · Recording') }}</span>
        </div>
        <div class="booth-meta">
          <span class="booth-nickname-tag">
            <span>{{ copy('鱼名', 'Alias') }}</span>
            <PxInput v-model="form.nickname" :placeholder="copy('匿名鱼', 'Anonymous Fish')" clearable class="booth-nickname-input" />
          </span>
          <button type="button" class="booth-reset" @click="resetForm" :title="t('reset')">
            <RefreshCw :size="14" />
            <span>{{ t('reset') }}</span>
          </button>
        </div>
      </header>

      <form class="booth-body" @submit.prevent="submitAndReveal">
        <article class="booth-step step-activity">
          <div class="step-num"><span>01</span></div>
          <div class="step-content">
            <h3 class="step-title">{{ copy('我刚才主要在干什么？', 'What were you doing?') }}</h3>
            <p class="step-hint">{{ copy('一句话，自由发挥。AI 不靠这句加分，但同温层靠它笑出声。', 'One line, freestyle.') }}</p>
            <div class="big-input-wrap">
              <PxInput v-model="form.activityText" :maxlength="options.maxActivityTextLength" :placeholder="copy('例如：假装看需求文档，其实在研究今晚吃什么', 'Example: pretending to read requirements while deciding dinner')" clearable />
              <small class="counter" :class="{ danger: activityTextRemaining < 0 }">{{ activityTextRemaining }}</small>
            </div>
          </div>
        </article>

        <article class="booth-step step-duration">
          <div class="step-num"><span>02</span></div>
          <div class="step-content">
            <h3 class="step-title">{{ copy('这次摸了多久？', 'How long did this drift?') }}</h3>
            <p class="step-hint">{{ copy('选个档位，时间越长档位越凶。AI 在烈度、结局上还会再叠加。', 'Pick a tier. Longer = nastier.') }}</p>
            <div class="duration-grid">
              <button v-for="item in options.durations" :key="'dur-' + item.key" type="button" class="duration-chip" :class="{ active: form.duration === item.key }" @click="form.duration = item.key">
                <span class="chip-label">{{ translatedOptionLabel(item.key, item.label) }}</span>
                <span class="chip-score">{{ item.score ?? item.baseScore }} {{ copy('分', 'pts') }}</span>
              </button>
            </div>
          </div>
        </article>

        <article class="booth-step step-story">
          <div class="step-num"><span>03</span></div>
          <div class="step-content">
            <h3 class="step-title">{{ copy('讲一下现场情况', 'The scene') }}</h3>
            <p class="step-hint">{{ copy('风险场景、伪装方式、怎么圆过去。不要写公司、客户、聊天、截图。', 'Risk, disguise, recovery. No company / client / chat info.') }}</p>
            <div class="story-paper">
              <textarea v-model="form.description" :maxlength="options.maxDescriptionLength + 20" :placeholder="copy('比如：会议中假装查文档，其实在追剧。', 'Example: pretending to look up docs in a meeting, actually watching a show.')" rows="5"></textarea>
              <small class="counter" :class="{ danger: descriptionRemaining < 0 }">{{ descriptionRemaining }}</small>
            </div>
          </div>
        </article>

        <article class="booth-step step-topics">
          <div class="step-num"><span>04</span></div>
          <div class="step-content">
            <h3 class="step-title">
              {{ copy('贴几个标签', 'Slap some tags') }}
              <small class="step-counter">{{ form.topics.length }} / 5</small>
            </h3>
            <p class="step-hint">{{ copy('可选，只用于发现和圈子归类。', 'Optional.') }}</p>
            <div class="topic-input-row">
              <input v-model="topicDraft" type="text" maxlength="32" :placeholder="copy('输入标签后按回车', 'Type a tag, press Enter')" @keydown.enter.prevent="addTopicFromDraft" />
              <button type="button" class="topic-add" @click="addTopicFromDraft">
                <Hash :size="13" />
                <span>{{ copy('添加', 'Add') }}</span>
              </button>
            </div>
            <p v-if="topicError" class="topic-error">{{ topicError }}</p>
            <div v-if="form.topics.length" class="topic-chip-list editable">
              <button v-for="topic in form.topics" :key="topic" type="button" class="topic-chip selected" @click="removeTopic(topic)">
                #{{ topic }} <X :size="11" />
              </button>
            </div>
            <div class="topic-suggestions">
              <button v-for="topic in topicSuggestions" :key="topic" type="button" class="topic-chip" :class="{ active: isTopicSelected(topic) }" :disabled="isTopicSelected(topic)" @click="addTopic(topic)">
                #{{ topic }}
              </button>
            </div>
          </div>
        </article>

        <article class="booth-step step-publish">
          <div class="step-num"><span>05</span></div>
          <div class="step-content">
            <h3 class="step-title">{{ copy('要发给谁看？', 'Broadcast scope') }}</h3>
            <p class="step-hint">{{ copy('先匿名化再公开。私人模式与社区广场互斥。', 'Anonymize first.') }}</p>
            <div class="switch-grid">
              <label class="pixel-switch" :class="{ on: form.publishToCommunity && !form.privateOnly }">
                <input type="checkbox" v-model="form.publishToCommunity" :disabled="form.privateOnly" @change="handleCommunityScopeChange" />
                <div class="switch-track" aria-hidden="true"><div class="switch-thumb"></div></div>
                <div class="switch-text">
                  <strong>{{ copy('社区广场', 'Community Plaza') }}</strong>
                  <small>{{ copy('公共水域，所有人可见', 'Public waters, visible to all') }}</small>
                </div>
              </label>
              <label class="pixel-switch" :class="{ on: form.autoCircles && !form.privateOnly }">
                <input type="checkbox" v-model="form.autoCircles" :disabled="form.privateOnly" />
                <div class="switch-track" aria-hidden="true"><div class="switch-thumb"></div></div>
                <div class="switch-text">
                  <strong>{{ copy('自动加圈子', 'Auto-add to Circles') }}</strong>
                  <small>{{ copy('按话题自动归类', 'Auto-tag to relevant circles') }}</small>
                </div>
              </label>
              <label class="pixel-switch" :class="{ on: form.privateOnly }">
                <input type="checkbox" v-model="form.privateOnly" @change="handlePrivateOnlyChange" />
                <div class="switch-track" aria-hidden="true"><div class="switch-thumb"></div></div>
                <div class="switch-text">
                  <strong>{{ copy('仅自己可见', 'Private Only') }}</strong>
                  <small>{{ copy('只存档，不放出去', 'Archive only.') }}</small>
                </div>
              </label>
            </div>

            <div v-if="joinedGroups.length" class="group-sync">
              <p class="group-sync-title">{{ copy('同步到我的小组', 'Sync to My Groups') }}</p>
              <div class="group-chip-row">
                <label v-for="group in joinedGroups" :key="group.id" class="group-chip" :class="{ on: form.groupIds.includes(group.id), disabled: form.privateOnly }">
                  <input type="checkbox" v-model="form.groupIds" :value="group.id" :disabled="form.privateOnly" />
                  <Check v-if="form.groupIds.includes(group.id)" :size="12" />
                  <span>{{ group.name }}</span>
                </label>
              </div>
            </div>
            <p v-else class="group-empty">{{ copy('还没有小组。可以去「小组」开一个地下茶水间。', 'No groups yet.') }}</p>
          </div>
        </article>

        <article class="booth-safety">
          <div class="safety-banner">
            <AlertTriangle :size="16" />
            <span>{{ copy(options.safetyNotice, 'Do not submit company secrets, personal privacy, IDs, chat records, client data, or non-anonymized screenshots. Entertainment only.') }}</span>
          </div>
          <label class="oath-line" :class="{ ok: form.anonymized }">
            <input type="checkbox" v-model="form.anonymized" />
            <div class="oath-box" aria-hidden="true">
              <Check v-if="form.anonymized" :size="14" />
            </div>
            <span>{{ t('anonymized') }}</span>
          </label>
          <p v-if="sensitiveHits.length" class="sensitive-line">
            {{ copy('疑似敏感词：', 'Sensitive terms: ') }}{{ sensitiveHits.join(locale === 'en-US' ? ', ' : '、') }}
          </p>
          <p v-if="errorMessage" class="booth-error">
            <AlertTriangle :size="14" />
            {{ errorMessage }}
          </p>
          <p v-if="statusMessage && !showResultModal" class="booth-status">
            <Check :size="14" />
            {{ statusMessage }}
          </p>
        </article>

        <div class="booth-submit-row">
          <button type="submit" class="booth-submit" :class="{ disabled: !canSubmit }" :disabled="!canSubmit || loading">
            <span class="bs-icon" aria-hidden="true">
              <Sparkles v-if="!loading" :size="22" />
              <span v-else class="bs-spinner"></span>
            </span>
            <span class="bs-text">
              <strong>{{ loading ? copy('投放中...', 'Sending...') : copy('投放上榜', 'Send it to the Board') }}</strong>
              <small>{{ copy('Fish Power Score 由后端固定规则结算', 'Fish Power computed server-side') }}</small>
            </span>
            <span class="bs-arrow" aria-hidden="true"><ChevronRight :size="22" /></span>
          </button>
          <p class="booth-bottom-hint">{{ copy('结果会作为弹窗给出 · 不会污染你的工位', 'Result pops in a modal.') }}</p>
        </div>
      </form>
    </div>
  </section>

  <transition name="modal-fade">
    <div v-if="showResultModal" class="result-modal-backdrop" role="dialog" aria-modal="true" :aria-label="copy('鱼力鉴定结果', 'Fish Power Verdict')" @click="onBackdropClick">
      <div class="result-modal">
        <header class="result-modal-head">
          <div class="rm-title-block">
            <span class="rm-tag">TRANSMISSION INCOMING</span>
            <h2>{{ copy('鱼力鉴定结果', 'Fish Power Verdict') }}</h2>
          </div>
          <button type="button" class="rm-close" :aria-label="copy('关闭', 'Close')" @click="closeModal">
            <X :size="20" />
          </button>
        </header>

        <div v-if="selectedRecord" class="result-modal-body">
          <div class="rm-score-stage">
            <div class="rm-score-frame">
              <span class="rm-score-number">{{ headlineScore }}</span>
              <span class="rm-score-label">{{ headlineLabel }}</span>
            </div>
            <div class="rm-score-tags">
              <span class="rm-chip primary">
                <Crown :size="13" />
                {{ translatedTitle(selectedRecord.title) }}
              </span>
              <span class="rm-chip">
                <Sparkles :size="13" />
                {{ copy('鱼力', 'Power') }} {{ selectedRecord.score.toFixed(1) }}
              </span>
              <span class="rm-chip warn" v-if="lastResult">
                <Trophy :size="13" />
                {{ copy('今日第', 'Today #') }} {{ lastResult.todayRank || '-' }}
              </span>
              <span class="rm-chip" v-if="lastResult">{{ copy('累计', 'Total') }} {{ lastResult.cumulativeScore.toFixed(1) }}</span>
              <span class="rm-chip success" v-if="lastResult?.fishScaleReward">
                <Coins :size="13" />
                +{{ lastResult.fishScaleReward.awardedAmount }} {{ copy('鱼鳞', 'Scale') }}
              </span>
              <span class="rm-chip" v-if="selectedRecord.guildContribution > 0">{{ copy('工会 +', 'Guild +') }}{{ selectedRecord.guildContribution.toFixed(1) }}</span>
              <span class="rm-chip warn" v-if="selectedRecord.status === 'pending'">{{ t('pending') }}</span>
            </div>
          </div>

          <div class="rm-verdict">
            <div class="rm-verdict-head">
              <span class="rm-verdict-tag">AI · {{ copy('系统判定', 'Verdict') }}</span>
            </div>
            <p class="rm-verdict-text">{{ translatedSystemComment(selectedRecord.systemComment) }}</p>
            <p class="rm-verdict-note">
              {{ showAiBreakdown
                ? copy('裁判评语由 AI 生成，鱼力值由后端固定规则结算。', 'Comment AI-generated. Fish Power computed by the server.')
                : copy('本次分数由持续时间档位计算。', 'Score derived from the duration tier.') }}
            </p>
          </div>

          <div class="rm-breakdown">
            <p class="rm-section-label">{{ copy('得分明细', 'Score Breakdown') }}</p>
            <dl class="rm-stats">
              <div><dt>{{ copy('持续', 'Duration') }}</dt><dd>{{ selectedRecord.durationLabel }}</dd></div>
              <template v-if="showAiBreakdown">
                <div><dt>{{ copy('基础分', 'Base') }}</dt><dd>{{ selectedRecord.breakdown.baseScore }}</dd></div>
                <div><dt>{{ copy('烈度', 'Intensity') }}</dt><dd>{{ selectedRecord.breakdown.intensityLabel }} ×{{ selectedRecord.breakdown.intensityMultiplier }}</dd></div>
                <div><dt>{{ copy('结局', 'Outcome') }}</dt><dd>{{ selectedRecord.breakdown.outcomeLabel }} +{{ selectedRecord.breakdown.outcomeBonus }}</dd></div>
                <div><dt>{{ copy('特殊加成', 'Bonus') }}</dt><dd>+{{ selectedRecord.breakdown.specialBonusTotal ?? 0 }}</dd></div>
                <div><dt>{{ copy('原始', 'Raw') }}</dt><dd>{{ selectedRecord.breakdown.rawScore }}</dd></div>
                <div><dt>{{ copy('显示', 'Display') }}</dt><dd>{{ selectedRecord.breakdown.displayScore?.toFixed(3) }} / 10</dd></div>
              </template>
              <template v-else>
                <div><dt>{{ copy('档位分', 'Tier Score') }}</dt><dd>{{ selectedRecord.breakdown.durationScore ?? selectedRecord.breakdown.durationBaseScore }}</dd></div>
              </template>
            </dl>

            <div v-if="showAiBreakdown && selectedRecord.breakdown.specialBonuses?.length" class="rm-bonus-list">
              <span v-for="bonus in selectedRecord.breakdown.specialBonuses" :key="bonus.label + '-' + bonus.points">{{ bonus.label }} +{{ bonus.points }}</span>
            </div>

            <div v-if="selectedRecord.topics?.length" class="rm-topic-list">
              <button v-for="topic in selectedRecord.topics" :key="topic.id" type="button" class="topic-chip" @click="openTopic(topic.slug)">#{{ topic.name }}</button>
            </div>
          </div>

          <div class="rm-actions">
            <button type="button" class="rm-action" :class="{ active: social?.viewer.liked }" @click="handleInteraction('like')">
              <Heart :size="15" />
              <span>{{ t('like') }}</span>
              <em>{{ selectedRecord.likeCount }}</em>
            </button>
            <button type="button" class="rm-action" :class="{ active: social?.viewer.favorited }" @click="handleInteraction('favorite')">
              <Star :size="15" />
              <span>{{ t('favorite') }}</span>
              <em>{{ selectedRecord.favoriteCount }}</em>
            </button>
            <button type="button" class="rm-action" :class="{ active: social?.viewer.voted }" :title="copy('发起传奇提名将消耗 10 鱼鳞。', 'Legend nominate costs 10 Fish Scale.')" @click="handleInteraction('vote')">
              <Crown :size="15" />
              <span>{{ copy('传奇', 'Legend') }}</span>
              <em>{{ selectedRecord.voteCount }}</em>
            </button>
            <button type="button" class="rm-action" @click="handleShareAction('generate')">
              <Share2 :size="15" />
              <span>{{ copy('分享卡', 'Card') }}</span>
            </button>
            <button type="button" class="rm-action subtle" @click="handleShareAction('copy_text')">{{ copy('复制文案', 'Copy Text') }}</button>
            <button type="button" class="rm-action subtle" @click="handleShareAction('share_link')">{{ copy('复制链接', 'Copy Link') }}</button>
          </div>

          <footer class="rm-footer">
            <PxButton type="primary" size="small" @click="resetAndScroll">
              <Send :size="14" />
              {{ copy('再来一条', 'One More') }}
            </PxButton>
            <PxButton type="base" size="small" @click="goToLeaderboard">
              <Trophy :size="14" />
              {{ copy('看排行榜', 'Go Ranks') }}
            </PxButton>
            <PxButton type="base" size="small" @click="goToCommunity">
              {{ copy('去社区围观', 'Open Plaza') }}
              <ArrowRight :size="14" />
            </PxButton>
          </footer>
        </div>

        <div v-else class="result-modal-empty">
          <span class="empty-score">--.-</span>
          <p>{{ copy('提交一条匿名记录后，这里会显示分数、称号、排名和评语。', 'Submit a record to see your score, title, rank, and verdict.') }}</p>
          <PxButton type="primary" size="small" @click="closeModal">{{ copy('回去填', 'Back') }}</PxButton>
        </div>
      </div>
    </div>
  </transition>
</template>
