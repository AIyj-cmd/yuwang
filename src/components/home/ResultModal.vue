<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowRight,
  Check,
  Coins,
  Crown,
  Heart,
  Share2,
  Sparkles,
  Star,
  Trophy,
  X
} from 'lucide-vue-next';
import { PxButton } from '@mmt817/pixel-ui';
import { shareRecord } from '../../api';
import { copyToClipboard } from '../../utils/clipboard';
import { useFocusTrap } from '../../composables/useFocusTrap';
import { useAppContext } from '../../appContext';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'reset'): void;
}>();

const {
  copy,
  errorMessage,
  handleInteraction,
  lastResult,
  locale,
  selectedRecord,
  shareCard,
  social,
  statusMessage,
  t,
  translatedSystemComment,
  translatedTitle
} = useAppContext();

const router = useRouter();
const resultModalRef = ref<HTMLElement | null>(null);
useFocusTrap(resultModalRef, toRef(props, 'open'));

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

const closeModal = () => emit('close');
const onBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) closeModal();
};
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open) closeModal();
};

watch(
  () => props.open,
  (open) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = open ? 'hidden' : '';
    }
  }
);

onMounted(() => document.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  if (typeof document !== 'undefined') document.body.style.overflow = '';
});

const goToCommunity = () => {
  closeModal();
  void router.push('/community');
};
const goToLeaderboard = () => {
  closeModal();
  void router.push('/leaderboard');
};
const resetAndScroll = () => {
  emit('reset');
};
</script>

<template>
  <transition name="modal-fade">
    <div
      v-if="open"
      ref="resultModalRef"
      class="result-modal-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="copy('鱼力鉴定结果', 'Fish Power Verdict')"
      @click="onBackdropClick"
    >
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
              <button v-for="topic in selectedRecord.topics" :key="topic.id" type="button" class="topic-chip" @click="$router.push(`/topics/${topic.slug}`)">#{{ topic.name }}</button>
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
              <Sparkles :size="14" />
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
