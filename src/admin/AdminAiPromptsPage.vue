<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  fetchAdminAiPrompt,
  fetchAdminAiPrompts,
  restoreDefaultAdminAiPrompt,
  saveAdminAiPrompt,
  testAdminAiPrompt
} from '../services/adminApi';
import type { AdminAiPrompt, AdminAiPromptTestResponse } from '../types/admin';

const prompts = ref<AdminAiPrompt[]>([]);
const selectedKey = ref('ai_judge_system_prompt');
const selectedPrompt = ref<AdminAiPrompt | null>(null);
const defaultContent = ref('');
const loading = ref(false);
const saving = ref(false);
const testing = ref(false);
const error = ref('');
const status = ref('');
const testResult = ref<AdminAiPromptTestResponse | null>(null);

const editor = reactive({
  name: '',
  description: '',
  content: '',
  isActive: true
});

const testInput = reactive({
  duration: '1-2小时',
  activityText: '开会时假装记笔记',
  storyText: '两小时会议里一边点头一边研究今晚吃什么，领导坐在对面。',
  extraNote: ''
});

const selectedMeta = computed(() => selectedPrompt.value);
const contentLength = computed(() => editor.content.length);

const applyPrompt = (prompt: AdminAiPrompt, fallbackDefault = '') => {
  selectedPrompt.value = prompt;
  selectedKey.value = prompt.key;
  editor.name = prompt.name;
  editor.description = prompt.description;
  editor.content = prompt.content;
  editor.isActive = prompt.isActive;
  defaultContent.value = fallbackDefault || defaultContent.value;
};

const loadOne = async (key = selectedKey.value) => {
  const result = await fetchAdminAiPrompt(key);
  applyPrompt(result.prompt, result.defaultContent);
};

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const list = await fetchAdminAiPrompts();
    prompts.value = list.prompts;
    const key = selectedKey.value || list.prompts[0]?.key || 'ai_judge_system_prompt';
    await loadOne(key);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载 Prompt 失败';
  } finally {
    loading.value = false;
  }
};

const selectPrompt = async (key: string) => {
  selectedKey.value = key;
  testResult.value = null;
  await loadOne(key).catch((err) => {
    error.value = err instanceof Error ? err.message : '加载 Prompt 失败';
  });
};

const save = async () => {
  saving.value = true;
  error.value = '';
  status.value = '';
  try {
    const result = await saveAdminAiPrompt(selectedKey.value, {
      name: editor.name,
      description: editor.description,
      content: editor.content,
      isActive: editor.isActive
    });
    applyPrompt(result.prompt);
    await fetchAdminAiPrompts().then((response) => {
      prompts.value = response.prompts;
    });
    status.value = 'Prompt 已保存，版本已递增。';
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存 Prompt 失败';
  } finally {
    saving.value = false;
  }
};

const restoreDefault = async () => {
  if (!window.confirm('确认恢复默认 AI 裁判 Prompt？当前内容会被默认版本替换。')) return;
  error.value = '';
  status.value = '';
  const result = await restoreDefaultAdminAiPrompt(selectedKey.value).catch((err) => {
    error.value = err instanceof Error ? err.message : '恢复默认失败';
    return null;
  });
  if (!result) return;
  applyPrompt(result.prompt, result.defaultContent);
  await fetchAdminAiPrompts().then((response) => {
    prompts.value = response.prompts;
  });
  status.value = '已恢复默认 Prompt。';
};

const runTest = async () => {
  testing.value = true;
  error.value = '';
  status.value = '';
  try {
    testResult.value = await testAdminAiPrompt(selectedKey.value, {
      content: editor.content,
      ...testInput
    });
    status.value = '测试完成，未写入摸鱼记录。';
  } catch (err) {
    error.value = err instanceof Error ? err.message : '测试失败';
  } finally {
    testing.value = false;
  }
};

onMounted(load);
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1>AI Prompt 管理</h1>
        <p>管理 AI 裁判人设与输出格式。Prompt 可以影响评语和结构化判断，但最终分数仍由后端确定性结算。</p>
      </div>
      <button type="button" class="admin-button" @click="load">刷新</button>
    </div>

    <p v-if="error" class="admin-error">{{ error }}</p>
    <p v-if="status" class="admin-success">{{ status }}</p>

    <div class="admin-grid two">
      <article class="admin-panel">
        <h2>Prompt 列表</h2>
        <div v-if="loading" class="admin-empty">加载中...</div>
        <div v-else class="admin-prompt-list">
          <button
            v-for="prompt in prompts"
            :key="prompt.key"
            type="button"
            class="admin-prompt-item"
            :class="{ active: prompt.key === selectedKey }"
            @click="selectPrompt(prompt.key)"
          >
            <strong>{{ prompt.name }}</strong>
            <span>{{ prompt.key }}</span>
            <small>v{{ prompt.version }} · {{ prompt.isActive ? 'active' : 'inactive' }}</small>
          </button>
        </div>
      </article>

      <article class="admin-panel wide">
        <header>
          <h2>Prompt 编辑器</h2>
          <span v-if="selectedMeta" class="admin-status" data-status="published">v{{ selectedMeta.version }}</span>
        </header>
        <dl v-if="selectedMeta" class="admin-definition-grid">
          <div><dt>Key</dt><dd>{{ selectedMeta.key }}</dd></div>
          <div><dt>更新时间</dt><dd>{{ selectedMeta.updatedAt || '-' }}</dd></div>
          <div><dt>更新人</dt><dd>{{ selectedMeta.updatedBy || '-' }}</dd></div>
          <div><dt>最近测试</dt><dd>{{ selectedMeta.lastTestedAt || '-' }}</dd></div>
        </dl>
        <label>
          <span>名称</span>
          <input v-model="editor.name" maxlength="80" />
        </label>
        <label>
          <span>描述</span>
          <input v-model="editor.description" maxlength="300" />
        </label>
        <label class="checkbox-line admin-checkbox">
          <input v-model="editor.isActive" type="checkbox" />
          <span>启用</span>
        </label>
        <label>
          <span>Prompt 正文 · {{ contentLength }} / 12000</span>
          <textarea v-model="editor.content" class="admin-prompt-editor" maxlength="12000" />
        </label>
        <div class="admin-row-actions">
          <button class="admin-button primary" type="button" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
          <button class="admin-button" type="button" @click="restoreDefault">恢复默认</button>
          <button class="admin-button" type="button" :disabled="testing" @click="runTest">{{ testing ? '测试中...' : '测试' }}</button>
        </div>
      </article>

      <article class="admin-panel">
        <h2>测试输入</h2>
        <label>
          <span>时长</span>
          <select v-model="testInput.duration">
            <option value="30分钟以下">30分钟以下</option>
            <option value="30分钟-1小时">30分钟-1小时</option>
            <option value="1-2小时">1-2小时</option>
            <option value="2-4小时">2-4小时</option>
            <option value="4小时以上/全天">4小时以上/全天</option>
          </select>
        </label>
        <label>
          <span>摸鱼事项</span>
          <input v-model="testInput.activityText" maxlength="80" />
        </label>
        <label>
          <span>摸鱼故事</span>
          <textarea v-model="testInput.storyText" maxlength="300" rows="5" />
        </label>
        <label>
          <span>补充说明</span>
          <input v-model="testInput.extraNote" maxlength="160" />
        </label>
      </article>

      <article class="admin-panel wide">
        <h2>测试输出</h2>
        <div v-if="!testResult" class="admin-empty admin-test-empty">
          <span>点击测试后展示 AI 原始 JSON、校验结果、确定性分数和最终评语。</span>
          <button class="admin-button primary" type="button" :disabled="testing" @click="runTest">
            {{ testing ? '测试中...' : '立即测试' }}
          </button>
        </div>
        <template v-else>
          <dl class="admin-definition-grid">
            <div><dt>fallback</dt><dd>{{ testResult.fallback ? 'true' : 'false' }}</dd></div>
            <div><dt>fallbackReason</dt><dd>{{ testResult.fallbackReason || '-' }}</dd></div>
            <div><dt>schema</dt><dd>{{ testResult.zod.success ? 'valid' : 'fallback' }}</dd></div>
            <div><dt>scoreVersion</dt><dd>{{ testResult.breakdown.scoreVersion }}</dd></div>
            <div><dt>鱼力值</dt><dd>{{ testResult.breakdown.fishPowerScore }}</dd></div>
            <div><dt>显示分</dt><dd>{{ testResult.breakdown.displayScore?.toFixed(3) }} / 10</dd></div>
          </dl>
          <div class="admin-list-row"><span>最终评语</span><strong>{{ testResult.comment }}</strong></div>
          <h2>Breakdown</h2>
          <pre>{{ JSON.stringify(testResult.breakdown, null, 2) }}</pre>
          <h2>AI JSON</h2>
          <pre>{{ testResult.rawJson || JSON.stringify(testResult.aiJson, null, 2) }}</pre>
        </template>
      </article>
    </div>
  </section>
</template>
