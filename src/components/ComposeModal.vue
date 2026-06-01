<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { Check, Send, X } from 'lucide-vue-next';
import { useAppContext } from '../appContext';
import { useFocusTrap } from '../composables/useFocusTrap';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submitted'): void;
}>();

const {
  canQuickSubmit,
  copy,
  currentUser,
  errorMessage,
  form,
  handleCommunityScopeChange,
  handleSubmit,
  lastResult,
  loading,
  openAuthPanel,
  options,
  statusMessage,
  t,
  translatedOptionLabel
} = useAppContext();

/* ------------------------------------------------------------------
 * 主输入
 * ------------------------------------------------------------------ */
const mainText = computed({
  get: () => form.activityText,
  set: (value: string) => {
    form.activityText = value;
  }
});

const mainTextarea = ref<HTMLTextAreaElement | null>(null);

const maxMain = computed(() => {
  const a = options.value.maxActivityTextLength ?? 60;
  const d = options.value.maxDescriptionLength ?? 120;
  return Math.min(a, d);
});

const mainRemaining = computed(() => maxMain.value - mainText.value.length);
const mainOver = computed(() => mainRemaining.value < 0);
const submitDisabled = computed(() => !canQuickSubmit.value);

const placeholderMain = computed(() =>
  copy(
    '今天主要在干什么？例如：假装看需求文档，其实在挑晚饭。',
    'What were you mainly up to? e.g., pretending to read specs while picking dinner.'
  )
);

const durationFunLabel = (key: string) => {
  const map: Record<string, { zh: string; en: string }> = {
    '30分钟以下': { zh: '刚刚热身', en: 'Just warming up' },
    '30分钟-1小时': { zh: '小摸一会儿', en: 'A little drift' },
    '1-2小时': { zh: '进入状态', en: 'Getting into it' },
    '2-4小时': { zh: '稳定发挥', en: 'Steady flow' },
    '4小时以上/全天': { zh: '今日鱼王候选', en: 'Fish King candidate' }
  };
  const item = map[key];
  return copy(item?.zh ?? key, item?.en ?? key);
};

/* ------------------------------------------------------------------
 * 提交流程
 * ------------------------------------------------------------------ */
const localStatusMessage = ref('');

const onSubmit = async () => {
  if (!canQuickSubmit.value) {
    if (!form.anonymized) {
      localStatusMessage.value = copy('请先勾选匿名化确认。', 'Please confirm anonymization first.');
    } else if (mainText.value.trim().length < 2) {
      localStatusMessage.value = copy('再多写一点，至少 2 个字符。', 'Add a bit more — at least 2 characters.');
    } else if (!form.duration) {
      localStatusMessage.value = copy('请选择摸鱼时长。', 'Please select a duration.');
    }
    return;
  }
  localStatusMessage.value = '';
  await handleSubmit({ quick: true });
};

const goLogin = () => {
  // 关闭速记弹窗并直接打开顶部账户面板的登录表单。
  emit('close');
  openAuthPanel('login');
};

/* ------------------------------------------------------------------
 * 弹窗开关：打开时聚焦输入框，锁定背景滚动
 * ------------------------------------------------------------------ */
const modalRef = ref<HTMLElement | null>(null);
const isActive = computed(() => props.open);

useFocusTrap(modalRef, isActive);

watch(
  () => props.open,
  async (open) => {
    if (open) {
      localStatusMessage.value = '';
      await nextTick();
      mainTextarea.value?.focus();
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // 在关闭时恢复（通过 onUnmounted 或下次打开前）
      const restore = () => { document.body.style.overflow = orig; };
      const stop = watch(() => props.open, (v) => { if (!v) { restore(); stop(); } });
    }
  }
);

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open) {
    emit('close');
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <transition name="mb-fade">
    <div
      v-if="open"
      ref="modalRef"
      class="mb-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="copy('摸鱼速记口', 'Slack quick-log booth')"
      @click.self="$emit('close')"
    >
      <section class="mini-booth">
        <!-- REC 头 -->
        <header class="mb-header">
          <div class="mb-rec">
            <span class="mb-rec-dot" aria-hidden="true"></span>
            <span class="mb-rec-label">REC</span>
            <span class="mb-rec-sub">{{ copy('广场速记口 · 正在收音', 'Plaza quick-log · recording') }}</span>
          </div>
          <button
            type="button"
            class="mb-close"
            :aria-label="copy('关闭', 'Close')"
            @click="$emit('close')"
          >
            <X :size="16" />
          </button>
        </header>

        <div class="mb-body">
          <!-- 步骤 01：写这条鱼 -->
          <article class="mb-step">
            <div class="mb-num mb-num-1" aria-hidden="true"><span>01</span></div>
            <div class="mb-step-main">
              <h3 class="mb-step-title">{{ copy('今天这条鱼，怎么摸的？', 'How did today\'s fish swim?') }}</h3>
              <p class="mb-step-hint">{{ copy('一句话讲清楚，匿名上墙，老板看不到。', 'One line, posted anonymously. No boss in sight.') }}</p>
              <div class="mb-paper">
                <textarea
                  ref="mainTextarea"
                  v-model="mainText"
                  class="mb-paper-input"
                  :placeholder="placeholderMain"
                  :maxlength="maxMain + 20"
                  rows="2"
                  aria-label="main-input"
                ></textarea>
                <span
                  class="mb-counter"
                  :class="{ over: mainOver, low: !mainOver && mainRemaining <= 10 }"
                >{{ mainText.length }}<i>/</i>{{ maxMain }}</span>
              </div>
            </div>
          </article>

          <!-- 步骤 02：摸了多久 -->
          <article class="mb-step">
            <div class="mb-num mb-num-2" aria-hidden="true"><span>02</span></div>
            <div class="mb-step-main">
              <h3 class="mb-step-title">{{ copy('这条鱼摸了多久？', 'How long was the drift?') }}</h3>
              <p class="mb-step-hint">{{ copy('档位越高，鱼力越猛。', 'Higher tier, fiercer Fish Power.') }}</p>
              <div class="mb-dur-grid">
                <button
                  v-for="item in options.durations"
                  :key="item.key"
                  type="button"
                  class="mb-dur-chip"
                  :class="{ active: form.duration === item.key }"
                  @click="form.duration = item.key"
                >
                  <span class="mb-dur-label">{{ translatedOptionLabel(item.key, item.label) }}</span>
                  <span class="mb-dur-score">{{ durationFunLabel(item.key) }}</span>
                </button>
              </div>
            </div>
          </article>

          <!-- 步骤 03：投给谁看 -->
          <article class="mb-step">
            <div class="mb-num mb-num-3" aria-hidden="true"><span>03</span></div>
            <div class="mb-step-main">
              <h3 class="mb-step-title">{{ copy('这条鱼放进哪片水域？', 'Which waters does it go to?') }}</h3>
              <p class="mb-step-hint">{{ copy('默认进社区广场，所有摸鱼人都能围观。', 'Defaults to the public plaza for every fish to see.') }}</p>
              <div class="mb-switch-row">
                <label
                  class="mb-switch"
                  :class="{ on: form.publishToCommunity && !form.privateOnly, disabled: form.privateOnly }"
                >
                  <input
                    v-model="form.publishToCommunity"
                    type="checkbox"
                    :disabled="form.privateOnly"
                    @change="handleCommunityScopeChange"
                  />
                  <span class="mb-track" aria-hidden="true"><span class="mb-thumb"></span></span>
                  <span class="mb-switch-text">
                    <strong>{{ copy('进社区广场', 'Community plaza') }}</strong>
                    <small>{{ copy('公共水域，所有人可见', 'Public waters, visible to all') }}</small>
                  </span>
                </label>

              </div>
            </div>
          </article>

          <!-- 安全 + 匿名誓言 -->
          <div class="mb-safety">
            <p class="mb-safety-banner">
              <span class="mb-safety-mark" aria-hidden="true">!</span>
              <span>{{ copy('别写真实公司、客户、聊天记录、证件和未匿名截图——这里只摸鱼，不泄密。', 'No real company, client, chat logs, IDs, or un-anonymized screenshots — drift only, no leaks.') }}</span>
            </p>
            <label class="mb-oath" :class="{ ok: form.anonymized }">
              <input v-model="form.anonymized" type="checkbox" />
              <span class="mb-oath-box" aria-hidden="true"><Check :size="13" /></span>
              <span>{{ copy('我确认这条记录已匿名，可以公开上墙。', 'I confirm this record is anonymized and safe to post.') }}</span>
            </label>
          </div>

          <!-- 反馈 + 提交 -->
          <div class="mb-foot">
            <p v-if="localStatusMessage" class="mb-feedback warn">
              <span class="mb-feedback-mark" aria-hidden="true">!</span>
              <span>{{ localStatusMessage }}</span>
            </p>
            <p v-else-if="errorMessage" class="mb-feedback danger">
              <span class="mb-feedback-mark" aria-hidden="true">!</span>
              <span>{{ errorMessage }}</span>
            </p>

            <button
              type="button"
              class="mb-submit"
              :class="{ disabled: submitDisabled }"
              :disabled="submitDisabled"
              @click="onSubmit"
            >
              <span class="mb-submit-icon" aria-hidden="true">
                <span v-if="loading" class="mb-submit-spin"></span>
                <Send v-else :size="20" />
              </span>
              <span class="mb-submit-text">
                <strong>{{ loading ? copy('投放中…', 'Sending…') : copy('投放上榜', 'Send it to the board') }}</strong>
                <small>{{ copy('FISH POWER 由后端结算', 'Fish Power scored server-side') }}</small>
              </span>
              <span class="mb-submit-arrow" aria-hidden="true"></span>
            </button>

            <p v-if="!currentUser" class="mb-login-tip">
              {{ copy('未登录也能匿名上墙；', 'You can post anonymously without an account — ') }}
              <button type="button" class="mb-link" @click="goLogin">
                {{ copy('登录后解锁徽章和鱼鳞', 'sign in to unlock badges & Fish Scale') }}
              </button>
            </p>
          </div>
        </div>
      </section>
    </div>
  </transition>
</template>

<style scoped>
.mb-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(16px, 5vh, 56px) 16px 44px;
  background: rgba(20, 26, 34, 0.62);
  overflow-y: auto;
}

.mb-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 2px solid var(--color-ink-strong-text);
  background: transparent;
  color: var(--color-ink-strong-text);
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}

.mb-close:hover {
  background: var(--color-ink-strong-text);
  color: var(--color-ink-strong-bg);
}

.mb-fade-enter-active,
.mb-fade-leave-active {
  transition: opacity 0.16s ease;
}

.mb-fade-enter-active .mini-booth,
.mb-fade-leave-active .mini-booth {
  transition: transform 0.18s cubic-bezier(0.34, 1.42, 0.64, 1);
}

.mb-fade-enter-from,
.mb-fade-leave-to {
  opacity: 0;
}

.mb-fade-enter-from .mini-booth,
.mb-fade-leave-to .mini-booth {
  transform: translateY(-18px) scale(0.97);
}

/* ================================================================
 * 迷你录音棚  —  提交页「摸鱼记录机」的浓缩版
 * ================================================================ */
.mini-booth {
  position: relative;
  width: min(560px, 100%);
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 6px 6px 0 var(--color-border);
}

.mini-booth::before {
  content: '';
  position: absolute;
  inset: 6px;
  border: 2px dashed var(--color-border-soft, #d1d8e0);
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
}

.mb-header {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 3px solid var(--color-border);
  background: var(--color-ink-strong-bg);
  color: var(--color-ink-strong-text);
}

.mb-rec {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.mb-rec-dot {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
  border: 2px solid var(--color-ink-strong-text);
  background: #ff5252;
  box-shadow: inset 0 0 0 2px #b81d1d;
  animation: mb-rec-blink 1.1s steps(2, end) infinite;
}

@keyframes mb-rec-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.2; }
}

.mb-rec-label {
  font-family: var(--font-pixel);
  font-size: 14px;
  letter-spacing: 0.1em;
}

.mb-rec-sub {
  font-family: var(--font-readable);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  opacity: 0.72;
}

.mb-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.mb-step {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.mb-num {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-text);
  box-shadow: 3px 3px 0 var(--color-border);
  font-family: var(--font-pixel);
  font-size: 13px;
}

.mb-num-2 { background: var(--color-accent); }
.mb-num-3 { background: var(--color-surface); }

.mb-step-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.mb-step-title {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
  color: var(--color-text);
  line-height: 1.3;
}

.mb-step-hint {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.mb-paper {
  position: relative;
  margin-top: 2px;
  border: 2px solid var(--color-border);
  box-shadow: 3px 3px 0 var(--color-border);
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 27px,
      var(--color-border-soft, #d1d8e0) 27px,
      var(--color-border-soft, #d1d8e0) 28px
    ),
    var(--color-surface);
  transition: box-shadow 0.1s;
}

.mb-paper:focus-within {
  box-shadow: 3px 3px 0 var(--color-border), inset 0 0 0 2px var(--color-primary);
}

.mb-paper-input {
  width: 100%;
  min-height: 84px;
  margin: 0;
  padding: 8px 12px 26px;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-readable);
  font-size: 14px;
  line-height: 28px;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.mb-paper-input::placeholder {
  color: var(--color-text-muted);
  opacity: 0.65;
}

.mb-counter {
  position: absolute;
  right: 6px;
  bottom: 5px;
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  font-family: var(--font-pixel);
  font-size: 10px;
  color: var(--color-text);
  pointer-events: none;
}

.mb-counter i {
  margin: 0 1px;
  font-style: normal;
  color: var(--color-text-muted);
}

.mb-counter.low {
  background: var(--color-warning, #fff7cc);
}

.mb-counter.over {
  background: var(--color-danger);
  color: var(--color-danger-text);
  border-color: var(--color-danger-text);
}

.mb-counter.over i {
  color: var(--color-danger-text);
}

.mb-dur-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

.mb-dur-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 12px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 3px 3px 0 var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: transform 0.08s steps(2, end), box-shadow 0.08s steps(2, end);
}

.mb-dur-chip:hover {
  transform: translate(-1px, -1px);
  background: var(--color-accent);
  box-shadow: 4px 4px 0 var(--color-border);
}

.mb-dur-chip.active {
  background: var(--color-primary);
  color: var(--color-primary-text);
  box-shadow: 3px 3px 0 var(--color-border), inset 0 0 0 2px var(--color-border);
}

.mb-dur-label {
  font-size: 12px;
  font-weight: 900;
}

.mb-dur-score {
  font-family: var(--font-readable);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-text);
}

.mb-dur-chip.active .mb-dur-score {
  color: var(--color-primary-text);
  opacity: 0.9;
}

.mb-switch-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 2px;
}

.mb-switch {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 3px 3px 0 var(--color-border);
  cursor: pointer;
  transition: transform 0.08s steps(2, end);
}

.mb-switch:hover:not(.disabled) {
  transform: translate(-1px, -1px);
}

.mb-switch input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.mb-switch.on {
  background: var(--color-accent);
}

.mb-switch.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.mb-track {
  position: relative;
  flex-shrink: 0;
  width: 38px;
  height: 20px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
}

.mb-thumb {
  position: absolute;
  top: -2px;
  left: -2px;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  background: var(--color-text-muted);
  transition: transform 0.12s steps(3, end);
}

.mb-switch.on .mb-track {
  background: var(--color-ink-strong-bg);
}

.mb-switch.on .mb-thumb {
  transform: translateX(20px);
  background: var(--color-primary);
}

.mb-switch-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.mb-switch-text strong {
  font-size: 12px;
  font-weight: 900;
  color: var(--color-text);
}

.mb-switch-text small {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
}

.mb-safety {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px;
  border: 2px solid var(--color-border);
  background: var(--color-warning, #fff7cc);
  box-shadow: 3px 3px 0 var(--color-border);
}

.mb-safety-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.5;
  color: var(--color-text);
}

.mb-safety-mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  background: var(--color-border);
  color: var(--color-warning, #fff7cc);
  font-family: var(--font-pixel);
  font-size: 10px;
}

.mb-oath {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  color: var(--color-text);
  line-height: 1.45;
}

.mb-oath input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.mb-oath-box {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-primary-text);
}

.mb-oath-box :deep(svg) {
  opacity: 0;
}

.mb-oath.ok .mb-oath-box {
  background: var(--color-primary);
}

.mb-oath.ok .mb-oath-box :deep(svg) {
  opacity: 1;
}

.mb-foot {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mb-feedback {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.45;
  color: var(--color-danger-text);
}

.mb-feedback-mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 1px;
  background: var(--color-danger-text);
  color: var(--color-surface);
  font-family: var(--font-pixel);
  font-size: 10px;
}

.mb-submit {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 26px;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  border: 3px solid var(--color-border);
  background: var(--color-ink-strong-bg);
  color: var(--color-ink-strong-text);
  box-shadow: 5px 5px 0 var(--color-border);
  cursor: pointer;
  text-align: left;
  transition: transform 0.08s steps(2, end), box-shadow 0.08s steps(2, end), background 0.1s, color 0.1s;
}

.mb-submit:hover:not(:disabled) {
  transform: translate(-2px, -2px);
  box-shadow: 7px 7px 0 var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
}

.mb-submit:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--color-border);
}

.mb-submit:disabled,
.mb-submit.disabled {
  cursor: not-allowed;
  opacity: 0.5;
  filter: grayscale(0.4);
}

.mb-submit-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 2px solid currentColor;
}

.mb-submit-spin {
  width: 16px;
  height: 16px;
  border: 3px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: mb-spin 0.7s linear infinite;
}

@keyframes mb-spin {
  to { transform: rotate(360deg); }
}

.mb-submit-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.mb-submit-text strong {
  font-family: var(--font-readable);
  font-size: 15px;
  font-weight: 950;
  letter-spacing: 0.02em;
  line-height: 1.1;
}

.mb-submit-text small {
  font-family: var(--font-pixel);
  font-size: 9px;
  letter-spacing: 0.06em;
  opacity: 0.72;
}

.mb-submit-arrow {
  position: relative;
  justify-self: end;
  width: 26px;
  height: 26px;
  border: 2px solid currentColor;
}

.mb-submit-arrow::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  transform: translate(-50%, -50%);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid currentColor;
}

.mb-login-tip {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-align: center;
  line-height: 1.5;
}

.mb-link {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--color-text);
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
  cursor: pointer;
}

.mb-link:hover {
  color: var(--color-focus, #0c8f7b);
}

@media (max-width: 420px) {
  .mb-step { grid-template-columns: 32px minmax(0, 1fr); gap: 10px; }
  .mb-num { width: 32px; height: 32px; font-size: 11px; }
  .mb-body { padding: 13px; }
}
</style>
