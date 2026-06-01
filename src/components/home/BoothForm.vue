<script setup lang="ts">
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Hash,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-vue-next';
import { PxInput } from '@mmt817/pixel-ui';
import { useAppContext } from '../../appContext';

const {
  activityTextRemaining,
  addTopic,
  addTopicFromDraft,
  canSubmit,
  copy,
  descriptionRemaining,
  errorMessage,
  form,
  handleCommunityScopeChange,
  handlePrivateOnlyChange,
  isTopicSelected,
  joinedGroups,
  loading,
  options,
  removeTopic,
  resetForm,
  sensitiveHits,
  statusMessage,
  t,
  topicDraft,
  topicError,
  topicSuggestions,
  translatedOptionLabel
} = useAppContext();

const emit = defineEmits<{
  (e: 'submit'): void;
}>();
</script>

<template>
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

      <form class="booth-body" @submit.prevent="emit('submit')">
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
                <span class="chip-score">{{ (item as any).score ?? (item as any).baseScore }} {{ copy('分', 'pts') }}</span>
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
            {{ copy('疑似敏感词：', 'Sensitive terms: ') }}{{ sensitiveHits.join(copy(', ', ', ')) }}
          </p>
          <p v-if="errorMessage" class="booth-error">
            <AlertTriangle :size="14" />
            {{ errorMessage }}
          </p>
          <p v-if="statusMessage" class="booth-status">
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
</template>
