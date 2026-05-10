<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { User, Trophy, BadgeCheck, ShieldAlert, MessageCircle, Hash } from 'lucide-vue-next';
import { PxButton, PxCard } from '@mmt817/pixel-ui';
import { fetchGroup, fetchGroupFeed, startGroupChallenge } from '../api';
import { useAppContext } from '../appContext';
import type { FeedRecord, GroupDetailResponse } from '../types';
import PageWorkbench from '../components/layout/PageWorkbench.vue';
import WorkbenchHeader, { type WorkbenchStat } from '../components/layout/WorkbenchHeader.vue';
import WorkbenchGrid from '../components/layout/WorkbenchGrid.vue';

const route = useRoute();
const router = useRouter();
const detail = ref<GroupDetailResponse | null>(null);
const feed = ref<FeedRecord[]>([]);
const loading = ref(false);
const error = ref('');
const status = ref('');

const {
  authToken,
  copy,
  loadWallet,
  openProfileRecord,
  openTopic,
  t,
  translatedChallenge,
  translatedCircleName,
  translatedGuildName,
  translatedTitle
} = useAppContext();

const groupId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
});

const group = computed(() => detail.value?.group ?? null);
const challenges = computed(() => detail.value?.challenges ?? []);

const headerStats = computed<WorkbenchStat[]>(() => [
  { label: copy('成员', 'Members'), value: group.value?.memberCount ?? 0, accent: 'primary' },
  { label: copy('可见性', 'Visibility'), value: group.value?.visibility ?? '-', accent: 'muted' },
  { label: copy('挑战', 'Challenges'), value: challenges.value.length, accent: 'mint' },
  { label: copy('帖子样本', 'Feed'), value: feed.value.length, accent: 'primary' }
]);

const load = async () => {
  if (!Number.isFinite(groupId.value)) {
    error.value = copy('小组 ID 无效。', 'Invalid group ID.');
    return;
  }
  if (!authToken.value) {
    error.value = t('needLogin');
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const [detailResponse, feedResponse] = await Promise.all([
      fetchGroup(groupId.value, authToken.value),
      fetchGroupFeed(groupId.value, authToken.value)
    ]);
    detail.value = detailResponse;
    feed.value = feedResponse.records;
  } catch (err) {
    detail.value = null;
    feed.value = [];
    error.value = err instanceof Error ? err.message : copy('小组加载失败。', 'Failed to load group.');
  } finally {
    loading.value = false;
  }
};

const handleChallenge = async (challengeName: string) => {
  if (!authToken.value) {
    error.value = t('needLogin');
    return;
  }
  if (!group.value) return;
  try {
    const response = await startGroupChallenge(group.value.id, challengeName, authToken.value);
    status.value = response.message || copy('小组挑战已发起，消耗 30 鱼鳞。', 'Challenge started. 30 Fish Scale spent.');
    await loadWallet();
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : copy('发起挑战失败。', 'Failed to start challenge.');
  }
};

const backToList = () => router.push('/groups');

onMounted(load);
watch(groupId, load);
watch(authToken, (value) => {
  if (value) load();
});
</script>

<template>
  <PageWorkbench>
    <WorkbenchHeader
      :icon="User"
      :title="group ? group.name : copy('小组详情', 'Group Detail')"
      :subtitle="group ? group.description || copy('还没有公告。', 'No notice yet.') : copy('正在加载小组信息...', 'Loading group information...')"
      :stats="headerStats"
    >
      <template #actions>
        <button class="workbench-action" type="button" @click="backToList">
          {{ copy('返回我的小组', 'Back to Groups') }}
        </button>
      </template>
    </WorkbenchHeader>

    <p v-if="error" class="error-line">{{ error }}</p>
    <p v-if="status" class="status-line">{{ status }}</p>

    <WorkbenchGrid columns="three">
      <template #left>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><User :size="16" /><span>{{ copy('小组公告', 'Group Notice') }}</span></div>
          </template>
          <div v-if="group" class="module-intro">
            <strong>{{ group.name }}</strong>
            <span>{{ group.description || copy('还没有公告。', 'No notice yet.') }}</span>
          </div>
          <div v-else-if="loading" class="loading-line">{{ copy('加载中...', 'Loading...') }}</div>
          <div v-else class="empty-list">{{ copy('暂无小组信息。', 'No group info.') }}</div>

          <dl v-if="group" class="side-stats">
            <div><dt>{{ copy('可见性', 'Visibility') }}</dt><dd>{{ group.visibility }}</dd></div>
            <div><dt>{{ copy('成员', 'Members') }}</dt><dd>{{ group.memberCount }}</dd></div>
            <div><dt>{{ copy('邀请码', 'Code') }}</dt><dd>{{ group.inviteCode }}</dd></div>
            <div><dt>{{ copy('角色', 'Role') }}</dt><dd>{{ group.role || '-' }}</dd></div>
          </dl>
        </PxCard>
      </template>

      <template #main>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title between">
              <span><Trophy :size="16" /> {{ copy('小组挑战', 'Group Challenges') }}</span>
              <small>{{ challenges.length }} {{ copy('项', 'items') }}</small>
            </div>
          </template>
          <div v-if="challenges.length" class="task-list">
            <article v-for="challenge in challenges" :key="challenge.name">
              <strong>{{ translatedChallenge(challenge).name }}</strong>
              <span>{{ translatedChallenge(challenge).condition }} · {{ copy('奖励', 'Reward') }} {{ translatedChallenge(challenge).reward }}</span>
              <PxButton type="primary" size="small" @click="handleChallenge(challenge.name)">
                {{ copy('发起挑战 · 30 鱼鳞', 'Start · 30 Scale') }}
              </PxButton>
            </article>
          </div>
          <div v-else class="empty-list">{{ copy('暂无挑战，先提交几条记录吧。', 'No challenges yet.') }}</div>
        </PxCard>

        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title between">
              <span><Trophy :size="16" /> {{ copy('小组记录流', 'Group Feed') }}</span>
              <small>{{ feed.length }} {{ copy('条', 'items') }}</small>
            </div>
          </template>
          <div v-if="loading" class="loading-line">{{ copy('记录加载中...', 'Loading records...') }}</div>
          <div v-else-if="feed.length" class="record-card-list">
            <article v-for="record in feed" :key="record.id" class="record-card">
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
              <p>{{ record.storyText || record.description }}</p>
              <div v-if="record.topics?.length" class="topic-chip-list record-topic-list">
                <button v-for="topic in record.topics" :key="topic.id" type="button" class="topic-chip" @click="openTopic(topic.slug)">
                  <Hash :size="12" /> {{ topic.name }}
                </button>
              </div>
              <div class="record-tags">
                <span v-for="tag in record.tags" :key="tag.id">{{ translatedCircleName(tag) }}</span>
                <span v-if="record.guild">{{ copy('贡献到 ', 'Contrib. ') }}{{ translatedGuildName(record.guild) }} +{{ record.guildContribution.toFixed(1) }}</span>
              </div>
              <div class="record-actions">
                <button type="button" @click="openProfileRecord(record.id)">
                  <MessageCircle :size="14" />
                  {{ t('comments') }} {{ record.commentCount }}
                </button>
              </div>
            </article>
          </div>
          <div v-else class="empty-list">{{ copy('小组记录流还没有内容。', 'No group records yet.') }}</div>
        </PxCard>
      </template>

      <template #side>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><BadgeCheck :size="16" /><span>{{ copy('小组须知', 'Guidelines') }}</span></div>
          </template>
          <ul class="rule-list">
            <li>{{ copy('不要写真实公司名、部门名或客户名。', 'No real company, department, or client names.') }}</li>
            <li>{{ copy('小组挑战消耗 30 鱼鳞。', 'Group challenges cost 30 Fish Scale.') }}</li>
            <li>{{ copy('邀请码不收集真实身份。', 'Invite codes do not collect identity.') }}</li>
            <li>{{ copy('记录会按可见性过滤后展示。', 'Records are filtered by visibility.') }}</li>
          </ul>
        </PxCard>

        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><ShieldAlert :size="16" /><span>{{ copy('安全提示', 'Safety Notice') }}</span></div>
          </template>
          <p class="safety-inline">{{ copy('小组内容仍受全局安全规则约束，违规内容会进入审核队列。', 'Groups still obey global safety rules; violations go to review.') }}</p>
        </PxCard>
      </template>
    </WorkbenchGrid>
  </PageWorkbench>
</template>
