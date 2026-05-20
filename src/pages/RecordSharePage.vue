<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Share2 } from 'lucide-vue-next';
import { PxCard } from '@mmt817/pixel-ui';
import { fetchShareCard, fetchSocial } from '../api';
import { useAppContext } from '../appContext';
import type { ShareCard, SocialResponse } from '../types';

const route = useRoute();
const { authToken, copy, openTopic, translatedTitle } = useAppContext();
const card = ref<ShareCard | null>(null);
const social = ref<SocialResponse | null>(null);
const loading = ref(false);
const error = ref('');
const recordId = computed(() => Number(route.params.id));

const load = async () => {
  if (!Number.isInteger(recordId.value) || recordId.value <= 0) return;
  loading.value = true;
  error.value = '';
  try {
    const [shareCard, socialResponse] = await Promise.all([
      fetchShareCard(recordId.value, authToken.value),
      fetchSocial(recordId.value, authToken.value)
    ]);
    card.value = shareCard;
    social.value = socialResponse;
  } catch (err) {
    card.value = null;
    social.value = null;
    error.value = err instanceof Error ? err.message : copy('分享记录不可访问。', 'This shared record is not available.');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
watch(recordId, load);
</script>

<template>
  <section class="workspace single-view record-share-page">
    <aside class="right-rail">
      <PxCard class="panel social-panel">
        <template #header>
          <div class="panel-title between">
            <span><Share2 :size="18" /> {{ copy('摸鱼分享卡', 'Share Card') }}</span>
            <small>{{ copy('公开记录可未登录查看', 'Public records are visible without login') }}</small>
          </div>
        </template>
        <div v-if="loading" class="loading-line">{{ copy('分享卡加载中...', 'Loading share card...') }}</div>
        <p v-else-if="error" class="error-line">{{ error }}</p>
        <template v-else-if="card && social">
          <div class="share-card">
            <strong>{{ card.title }}</strong>
            <span>{{ card.subtitle }}</span>
            <div class="share-card-meta">
              <span>{{ card.rankLabel }}</span>
              <span v-if="card.rankIsRealtime">{{ copy('今日排名会随当天新记录变化', 'Today rank may change as new records arrive') }}</span>
              <span>{{ copy('分享', 'Shares') }} {{ card.shareCount ?? social.record.shareCount }}</span>
            </div>
            <p>{{ card.shareText }}</p>
            <small>{{ card.safetyNotice }}</small>
          </div>

          <section class="profile-section">
            <div class="profile-section-head">
              <strong>{{ social.record.activityText }}</strong>
              <small>{{ social.record.score.toFixed(1) }} · {{ translatedTitle(social.record.title) }}</small>
            </div>
            <p class="module-copy">{{ social.record.storyText || social.record.description }}</p>
            <div v-if="social.record.topics?.length" class="topic-chip-list record-topic-list">
              <button v-for="topic in social.record.topics" :key="topic.id" type="button" class="topic-chip" @click="openTopic(topic.slug)">#{{ topic.name }}</button>
            </div>
          </section>
        </template>
      </PxCard>
    </aside>
  </section>
</template>
