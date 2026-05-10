<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { fetchAdminRecord, updateAdminRecord, updateAdminRecordLegend, updateAdminRecordStatus } from '../services/adminApi';
import type { AdminAuditLog, AdminComment, AdminRecord, AdminReport } from '../types/admin';

const route = useRoute();
const record = ref<AdminRecord | null>(null);
const reports = ref<AdminReport[]>([]);
const comments = ref<AdminComment[]>([]);
const auditLogs = ref<AdminAuditLog[]>([]);
const guild = ref<unknown>(null);
const circles = ref<unknown[]>([]);
const groups = ref<unknown[]>([]);
const reviewNote = ref('');
const hiddenReason = ref('');
const error = ref('');

const id = Number(route.params.id);

const load = async () => {
  error.value = '';
  try {
    const result = await fetchAdminRecord(id);
    record.value = result.record;
    reports.value = result.reports;
    comments.value = result.comments;
    auditLogs.value = result.auditLogs;
    guild.value = result.guild;
    circles.value = result.circles;
    groups.value = result.groups;
    reviewNote.value = result.record.reviewNote;
    hiddenReason.value = result.record.hiddenReason;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  }
};

const act = async (action: 'approve' | 'hide' | 'reject' | 'restore') => {
  if ((action === 'hide' || action === 'reject') && !window.confirm('确认执行该审核动作？')) return;
  await updateAdminRecordStatus(id, {
    action,
    reviewNote: reviewNote.value,
    hiddenReason: hiddenReason.value
  });
  await load();
};

const saveNote = async () => {
  await updateAdminRecord(id, { reviewNote: reviewNote.value, hiddenReason: hiddenReason.value });
  await load();
};

const toggleLegendSelected = async (selected: boolean) => {
  if (selected && !window.confirm('确认选入传奇记录？记录作者将获得 100 鱼鳞。')) return;
  await updateAdminRecordLegend(id, selected);
  await load();
};

onMounted(load);
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1>记录详情 #{{ id }}</h1>
        <p>查看完整内容、分数明细、敏感命中、关联空间和审核历史。</p>
      </div>
      <button type="button" class="admin-button" @click="load">刷新</button>
    </div>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div v-if="record" class="admin-grid two">
      <article class="admin-panel wide">
        <header>
          <h2>{{ record.nickname }} · {{ record.score.toFixed(1) }}</h2>
          <span class="admin-status" :data-status="record.status">{{ record.status }}</span>
        </header>
        <p class="admin-record-body">{{ record.storyText || record.description }}</p>
        <dl class="admin-definition-grid">
          <div><dt>摸鱼事项</dt><dd>{{ record.activityText }}</dd></div>
          <div><dt>时长</dt><dd>{{ record.durationLabel }}</dd></div>
          <div><dt>评分版本</dt><dd>{{ record.scoreVersion }}</dd></div>
          <template v-if="record.scoreVersion !== 'duration_v3'">
            <div><dt>风险</dt><dd>{{ record.riskLabel }}</dd></div>
            <div><dt>伪装</dt><dd>{{ record.disguiseLabel }}</dd></div>
            <div><dt>创意</dt><dd>{{ record.creativityLabel }}</dd></div>
          </template>
          <div><dt>可见性</dt><dd>{{ record.visibility }}</dd></div>
        </dl>
      </article>

      <article class="admin-panel">
        <h2>分数明细</h2>
        <template v-if="record.scoreVersion === 'duration_v3'">
          <div class="admin-list-row"><span>持续时间分</span><strong>{{ record.breakdown.durationScore }}</strong></div>
          <p>本次分数由持续时间档位计算。</p>
        </template>
        <template v-else>
          <div class="admin-list-row"><span>{{ record.scoreVersion === 'time_v2' ? '时间基础分' : '旧版基础分' }}</span><strong>{{ record.breakdown.durationBaseScore }}</strong></div>
          <div class="admin-list-row"><span>风险倍率</span><strong>{{ record.breakdown.riskMultiplier }}</strong></div>
          <div class="admin-list-row"><span>伪装加分</span><strong>{{ record.breakdown.disguiseBonus }}</strong></div>
          <div class="admin-list-row"><span>创意加分</span><strong>{{ record.breakdown.creativityBonus }}</strong></div>
        </template>
        <div class="admin-list-row"><span>传奇入选</span><strong>{{ record.legendSelected ? '已入选' : '未入选' }}</strong></div>
        <div class="admin-row-actions">
          <button class="admin-button primary" :disabled="record.legendSelected" @click="toggleLegendSelected(true)">选入传奇</button>
          <button class="admin-button" :disabled="!record.legendSelected" @click="toggleLegendSelected(false)">取消入选</button>
        </div>
      </article>

      <article class="admin-panel">
        <h2>系统评论</h2>
        <p>{{ record.systemComment }}</p>
        <h2>敏感词命中</h2>
        <div class="admin-chip-list">
          <span v-for="flag in record.sensitiveFlags" :key="flag">{{ flag }}</span>
          <span v-if="!record.sensitiveFlags.length">无</span>
        </div>
      </article>

      <article class="admin-panel">
        <h2>审核操作</h2>
        <label>
          <span>审核备注</span>
          <textarea v-model="reviewNote" rows="4" />
        </label>
        <label>
          <span>隐藏原因</span>
          <textarea v-model="hiddenReason" rows="3" />
        </label>
        <div class="admin-row-actions">
          <button class="admin-button primary" @click="act('approve')">批准发布</button>
          <button class="admin-button danger" @click="act('hide')">隐藏</button>
          <button class="admin-button danger" @click="act('reject')">驳回</button>
          <button class="admin-button" @click="act('restore')">恢复</button>
          <button class="admin-button" @click="saveNote">保存备注</button>
        </div>
      </article>

      <article class="admin-panel">
        <h2>所属空间</h2>
        <div class="admin-list-row"><span>工会</span><strong>{{ guild ? JSON.stringify(guild) : '无' }}</strong></div>
        <div class="admin-list-row"><span>圈子</span><strong>{{ circles.length }}</strong></div>
        <div class="admin-list-row"><span>小组</span><strong>{{ groups.length }}</strong></div>
      </article>

      <article class="admin-panel">
        <h2>举报记录</h2>
        <div v-if="!reports.length" class="admin-empty">暂无举报。</div>
        <div v-for="report in reports" :key="report.id" class="admin-list-row">
          <span>{{ report.reason }}</span>
          <strong>{{ report.status }}</strong>
        </div>
      </article>

      <article class="admin-panel">
        <h2>相关评论</h2>
        <div v-if="!comments.length" class="admin-empty">暂无评论。</div>
        <div v-for="comment in comments" :key="comment.id" class="admin-list-row">
          <span>{{ comment.nickname }}：{{ comment.content }}</span>
          <strong>{{ comment.status }}</strong>
        </div>
      </article>

      <article class="admin-panel">
        <h2>审核历史</h2>
        <div v-if="!auditLogs.length" class="admin-empty">暂无历史。</div>
        <div v-for="log in auditLogs" :key="log.id" class="admin-list-row">
          <span>{{ log.action }}</span>
          <small>{{ log.adminUsername }} · {{ log.createdAt }}</small>
        </div>
      </article>
    </div>
  </section>
</template>
