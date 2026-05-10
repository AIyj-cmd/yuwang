<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Hash, MessageCircle } from 'lucide-vue-next';
import { PxCard, PxInput } from '@mmt817/pixel-ui';
import { fetchTopicDetail } from '../api';
import { useAppContext } from '../appContext';
import type { TopicDetailResponse } from '../types';
import PageWorkbench from '../components/layout/PageWorkbench.vue';
import WorkbenchHeader, { type WorkbenchStat } from '../components/layout/WorkbenchHeader.vue';
import WorkbenchGrid from '../components/layout/WorkbenchGrid.vue';

const route = useRoute();
const detail = ref<TopicDetailResponse | null>(null);
const loading = ref(false);
const error = ref('');

const {
  authToken,
  copy,
  feedCommentDrafts,
  handleFeedComment,
  handleFeedLike,
  handleFeedNominate,
  handleFeedReport,
  openProfileRecord,
  openTopic,
  t,
  translatedCircleName,
  translatedGuildName,
  translatedTitle
} = useAppContext();

const slug = computed(() => String(route.params.slug ?? ''));
const topic = computed(() => detail.value?.topic ?? null);
const records = computed(() => detail.value?.records ?? []);
const popularTopics = computed(() => detail.value?.popularTopics ?? []);

const headerStats = computed<WorkbenchStat[]>(() => [
  { label: copy('使用次数', 'Uses'), value: topic.value?.usage_count ?? 0, accent: 'primary' },
  { label: copy('相关记录', 'Records'), value: records.value.length, accent: 'mint' },
  { label: copy('相关话题', 'Related'), value: popularTopics.value.length, accent: 'muted' }
]);

const load = async () => {
  if (!slug.value) return;
  loading.value = true;
  error.value = '';
  try {
    detail.value = await fetchTopicDetail(slug.value, authToken.value);
  } catch (err) {
    detail.value = null;
    error.value = err instanceof Error ? err.message : copy('话题加载失败。', 'Failed to load topic.');
  } finally {
    loading.value = false;
  }
};

const reloadAfter = async (action: (recordId: number) => Promise<void>, recordId: number) => {
  await action(recordId);
  await load();
};

onMounted(load);
watch(slug, load);
</script>

<template>
  <PageWorkbench>
    <WorkbenchHeader
      :icon="Hash"
      :title="topic ? `#${topic.name}` : copy('话题详情页', 'Topic Detail')"
      :subtitle="copy('这些记录都带着同一个匿名小标签。话题只做聚合，不参与评分。', 'These records share the same anonymous tag. Topics only aggregate.')"
      :stats="headerStats"
    />

    <WorkbenchGrid columns="three">
      <template #left>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><Hash :size="16" /><span>{{ copy('相关热门话题', 'Popular Topics') }}</span></div>
          </template>
          <div v-if="popularTopics.length" class="topic-chip-list">
            <button v-for="item in popularTopics" :key="item.id" type="button" class="topic-chip" @click="openTopic(item.slug)">
              #{{ item.name }} <span>{{ item.usage_count }}</span>
            </button>
          </div>
          <div v-else class="empty-list">{{ copy('暂无相关话题。', 'No related topics.') }}</div>
        </PxCard>
      </template>

      <template #main>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title between">
              <span><Hash :size="18" /> {{ topic ? `#${topic.name}` : copy('话题详情', 'Topic') }}</span>
              <small v-if="topic">{{ topic.usage_count }} {{ copy('次使用', 'uses') }}</small>
            </div>
          </template>

          <div v-if="loading" class="loading-line">{{ copy('话题加载中...', 'Loading topic...') }}</div>
          <p v-else-if="error" class="error-line">{{ error }}</p>
          <template v-else-if="topic">
            <div v-if="records.length" class="record-card-list">
              <article v-for="record in records" :key="record.id" class="record-card">
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
                <strong class="record-activity">{{ record.activityText }}</strong>
                <p>{{ record.description }}</p>
                <div v-if="record.topics?.length" class="topic-chip-list record-topic-list">
                  <button v-for="item in record.topics" :key="item.id" type="button" class="topic-chip" @click="openTopic(item.slug)">#{{ item.name }}</button>
                </div>
                <div class="record-tags">
                  <span v-for="tag in record.tags" :key="tag.id">{{ translatedCircleName(tag) }}</span>
                  <span v-if="record.guild">{{ copy('贡献到 ', 'Contributed to ') }}{{ translatedGuildName(record.guild) }} +{{ record.guildContribution.toFixed(1) }}</span>
                </div>
                <div class="record-actions">
                  <button type="button" :class="{ active: record.viewer.liked }" @click="reloadAfter(handleFeedLike, record.id)">{{ t('like') }} {{ record.likeCount }}</button>
                  <button type="button" @click="openProfileRecord(record.id)">{{ t('comments') }} {{ record.commentCount }}</button>
                  <button type="button" :class="{ active: record.viewer.legendNominated }" @click="reloadAfter(handleFeedNominate, record.id)">{{ copy('传奇提名', 'Nominate') }} {{ record.legendNominationCount }}</button>
                  <button type="button" :class="{ active: record.viewer.reported }" @click="reloadAfter(handleFeedReport, record.id)">{{ copy('举报', 'Report') }} {{ record.reportCount }}</button>
                </div>
                <div class="feed-comment-row">
                  <PxInput v-model="feedCommentDrafts[record.id]" :placeholder="copy('120 字以内，别写真实公司、客户或聊天记录', 'Within 120 chars.')" clearable />
                  <button type="button" @click="reloadAfter(handleFeedComment, record.id)"><MessageCircle :size="14" />{{ t('addComment') }}</button>
                </div>
              </article>
            </div>
            <div v-else class="empty-list">{{ copy('这个话题下面还没有鱼游过。', 'No fish has swum under this topic yet.') }}</div>
          </template>
        </PxCard>
      </template>

      <template #side>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><MessageCircle :size="16" /><span>{{ copy('互动说明', 'Interactions') }}</span></div>
          </template>
          <ul class="rule-list">
            <li>{{ copy('点赞、收藏、传奇提名都会实时更新。', 'Likes, favorites, legend nominations update live.') }}</li>
            <li>{{ copy('评论 2-120 字，禁止写真实身份信息。', 'Comments 2-120 chars. No real identity info.') }}</li>
            <li>{{ copy('举报会进入人工审核。', 'Reports go to review queue.') }}</li>
          </ul>
        </PxCard>
      </template>
    </WorkbenchGrid>
  </PageWorkbench>
</template>
