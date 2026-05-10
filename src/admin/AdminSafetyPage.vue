<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { fetchAdminSafety, saveAdminSafetyRules, saveAdminSensitiveWords } from '../services/adminApi';
import type { AdminSensitiveWord, AdminSettings } from '../types/admin';

const words = ref<AdminSensitiveWord[]>([]);
const flags = ref<{ records: unknown[]; comments: unknown[] }>({ records: [], comments: [] });
const rules = reactive<AdminSettings>({
  communityOpen: true,
  commentsOpen: true,
  groupCreationOpen: true,
  legendNominationOpen: true,
  commentMaxLength: 120,
  descriptionMaxLength: 180,
  defaultRecordStatus: 'published',
  safetyNotice: ''
});
const error = ref('');
const draft = reactive<AdminSensitiveWord>({ word: '', category: '隐私身份', severity: 'medium', enabled: true });

const load = async () => {
  error.value = '';
  try {
    const result = await fetchAdminSafety();
    words.value = result.sensitiveWords;
    Object.assign(rules, result.rules);
    flags.value = result.flags;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败';
  }
};

const addWord = () => {
  if (!draft.word.trim()) return;
  words.value = [...words.value, { ...draft }];
  draft.word = '';
};

const removeWord = (index: number) => {
  words.value.splice(index, 1);
};

const saveWords = async () => {
  await saveAdminSensitiveWords(words.value);
  await load();
};

const saveRules = async () => {
  await saveAdminSafetyRules(rules);
  await load();
};

onMounted(load);
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1>安全配置</h1>
        <p>管理敏感词、敏感等级、最近命中内容和全站安全提示。</p>
      </div>
      <button class="admin-button" @click="load">刷新</button>
    </div>

    <p v-if="error" class="admin-error">{{ error }}</p>

    <div class="admin-grid two">
      <article class="admin-panel wide">
        <header>
          <h2>敏感词</h2>
          <button class="admin-button primary" @click="saveWords">保存敏感词</button>
        </header>
        <form class="admin-filter-bar" @submit.prevent="addWord">
          <input v-model="draft.word" placeholder="敏感词" />
          <select v-model="draft.category">
            <option>隐私身份</option>
            <option>公司客户</option>
            <option>聊天截图</option>
            <option>证件号码</option>
            <option>联系方式</option>
            <option>合同报价</option>
            <option>地理位置</option>
          </select>
          <select v-model="draft.severity">
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          <button class="admin-button">添加</button>
        </form>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>词</th><th>类别</th><th>等级</th><th>启用</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="(word, index) in words" :key="`${word.word}-${index}`">
                <td><input v-model="word.word" /></td>
                <td><input v-model="word.category" /></td>
                <td>
                  <select v-model="word.severity">
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </td>
                <td><input v-model="word.enabled" type="checkbox" /></td>
                <td><button class="admin-button small danger" @click="removeWord(index)">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="admin-panel">
        <header>
          <h2>安全提示文案</h2>
          <button class="admin-button primary" @click="saveRules">保存规则</button>
        </header>
        <label>
          <span>安全提示</span>
          <textarea v-model="rules.safetyNotice" rows="6" />
        </label>
        <label>
          <span>评论最大长度</span>
          <input v-model.number="rules.commentMaxLength" type="number" />
        </label>
        <label>
          <span>创意描述最大长度</span>
          <input v-model.number="rules.descriptionMaxLength" type="number" />
        </label>
        <label>
          <span>默认内容状态</span>
          <select v-model="rules.defaultRecordStatus">
            <option value="published">published</option>
            <option value="pending">pending</option>
          </select>
        </label>
      </article>

      <article class="admin-panel">
        <h2>最近命中记录</h2>
        <div v-if="!flags.records.length" class="admin-empty">暂无命中。</div>
        <pre v-for="(item, index) in flags.records" :key="`r-${index}`">{{ item }}</pre>
      </article>

      <article class="admin-panel">
        <h2>最近命中评论</h2>
        <div v-if="!flags.comments.length" class="admin-empty">暂无命中。</div>
        <pre v-for="(item, index) in flags.comments" :key="`c-${index}`">{{ item }}</pre>
      </article>
    </div>
  </section>
</template>
