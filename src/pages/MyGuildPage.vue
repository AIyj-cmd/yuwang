<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Crown,
  LogOut,
  Pencil,
  RefreshCw,
  Save,
  ShieldAlert,
  UserMinus,
  X
} from 'lucide-vue-next';
import { PxButton, PxCard, PxInput } from '@mmt817/pixel-ui';
import { useAppContext } from '../appContext';
import { createGuild, leaveGuild, removeGuildMember, updateGuild } from '../api';
import type { Guild, OptionsResponse, User } from '../types';

const router = useRouter();

// 应用上下文（appContext 类型为 Record<string, any>，此处显式收窄类型，不使用 any 兜底）
const ctx = useAppContext();
const currentUser = ctx.currentUser as Ref<User | null>;
const authToken = ctx.authToken as Ref<string | null>;
const options = ctx.options as Ref<OptionsResponse>;
const copy = ctx.copy as (zh: string, en: string) => string;

// 工会资料长度限制，与后端 API 契约保持一致，仅用于前端即时校验，不覆盖后端校验
const NAME_MIN = 2;
const NAME_MAX = 40;
const DESC_MAX = 180;
const ICON_MIN = 1;
const ICON_MAX = 4;
const GUILD_CREATE_COST = 50;
const CACHE_KEY = 'gongwei-yuwang-my-guild';

// 本地维护的工会基本信息（来源于创建 / 更新接口返回的真实数据，非假数据）
type CachedGuild = {
  id: number;
  name: string;
  description: string;
  icon: string;
  role: string;
};

// ---- 本地状态 ----
const guildInfo = ref<CachedGuild | null>(null);
const editing = ref(false);
const leaveConfirm = ref(false);
const pageError = ref('');
const pageStatus = ref('');
const creating = ref(false);
const savingEdit = ref(false);
const leaving = ref(false);
const removing = ref(false);
const removedMembers = ref<number[]>([]);

const createForm = reactive({ name: '', description: '', icon: '鱼' });
const editForm = reactive({ name: '', description: '', icon: '' });
const removeUserId = ref('');

const iconSuggestions = ['鱼', '🐟', '🐠', '🦑', '☕', '😴'];

// ---- 派生状态 ----
const guildId = computed<number | null>(() => currentUser.value?.guildId ?? null);
const hasGuild = computed(() => guildId.value !== null);
// guildInfo 仅由创建 / 编辑成功后写入，二者都只对会长开放，因此有缓存即为会长
const isOwner = computed(() => guildInfo.value?.role === 'owner');

const accessState = computed<'unauthorized' | 'loading' | 'ready'>(() => {
  if (!authToken.value) return 'unauthorized';
  if (!currentUser.value) return 'loading';
  return 'ready';
});

// ---- 本地缓存读写：用于页面刷新后从缓存恢复工会资料 ----
const readCache = (): { userId: number; guild: CachedGuild } | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: unknown; guild?: Partial<CachedGuild> };
    const guild = parsed.guild;
    if (
      parsed &&
      typeof parsed.userId === 'number' &&
      guild &&
      typeof guild.id === 'number' &&
      typeof guild.name === 'string' &&
      typeof guild.description === 'string' &&
      typeof guild.icon === 'string' &&
      typeof guild.role === 'string'
    ) {
      return { userId: parsed.userId, guild: guild as CachedGuild };
    }
  } catch {
    // 缓存损坏时忽略，按“无缓存”处理
  }
  return null;
};

const writeCache = (guild: CachedGuild) => {
  const user = currentUser.value;
  if (!user) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId: user.id, guild }));
  } catch {
    // 隐私模式等场景下 localStorage 不可用，忽略即可
  }
};

const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // 忽略
  }
};

// 根据当前用户认证上下文 + 本地缓存恢复工会资料
const restoreFromContext = () => {
  const user = currentUser.value;
  if (!user || user.guildId === null) {
    guildInfo.value = null;
    return;
  }
  const cached = readCache();
  guildInfo.value = cached && cached.userId === user.id && cached.guild.id === user.guildId ? cached.guild : null;
};

// 把接口返回的 guild 规整为本地缓存结构（防御式读取字段）
const toCachedGuild = (guild: Guild, fallbackRole: string): CachedGuild => ({
  id: guild.id,
  name: typeof guild.name === 'string' ? guild.name : '',
  description: typeof guild.description === 'string' ? guild.description : '',
  icon: typeof guild.icon === 'string' ? guild.icon : '',
  role: typeof guild.role === 'string' && guild.role ? guild.role : fallbackRole
});

// ---- 表单校验 ----
const trimmedLen = (value: string) => value.trim().length;

const validateFields = (fields: { name: string; description: string; icon: string }): string => {
  const nameLen = trimmedLen(fields.name);
  if (nameLen < NAME_MIN || nameLen > NAME_MAX) {
    return copy(`工会名称需要 ${NAME_MIN}-${NAME_MAX} 个字符。`, `Guild name must be ${NAME_MIN}-${NAME_MAX} characters.`);
  }
  if (trimmedLen(fields.description) > DESC_MAX) {
    return copy(`工会简介最多 ${DESC_MAX} 个字符。`, `Guild description allows at most ${DESC_MAX} characters.`);
  }
  const iconLen = trimmedLen(fields.icon);
  if (iconLen < ICON_MIN || iconLen > ICON_MAX) {
    return copy(`工会图标需要 ${ICON_MIN}-${ICON_MAX} 个字符。`, `Guild icon must be ${ICON_MIN}-${ICON_MAX} characters.`);
  }
  return '';
};

const canCreate = computed(() => !creating.value && validateFields(createForm) === '');
const canSaveEdit = computed(() => !savingEdit.value && validateFields(editForm) === '');

const errMessage = (error: unknown, fallbackZh: string, fallbackEn: string): string =>
  error instanceof Error && error.message ? error.message : copy(fallbackZh, fallbackEn);

// ---- 操作：创建工会 ----
const pickCreateIcon = (icon: string) => {
  createForm.icon = icon;
};
const pickEditIcon = (icon: string) => {
  editForm.icon = icon;
};

const handleCreate = async () => {
  pageError.value = '';
  pageStatus.value = '';
  const invalid = validateFields(createForm);
  if (invalid) {
    pageError.value = invalid;
    return;
  }
  if (!authToken.value) {
    pageError.value = copy('需要登录后操作。', 'Log in to continue.');
    return;
  }
  creating.value = true;
  try {
    const res = await createGuild(
      {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        icon: createForm.icon.trim()
      },
      authToken.value
    );
    // 创建者自动成为会长，role 缺省时回退为 owner
    const cached = toCachedGuild(res.guild, 'owner');
    writeCache(cached);
    guildInfo.value = cached;
    // 把新工会同步进认证上下文，刷新后仍可识别当前工会
    if (currentUser.value) currentUser.value.guildId = cached.id;
    createForm.name = '';
    createForm.description = '';
    createForm.icon = '鱼';
    editing.value = false;
    leaveConfirm.value = false;
    removedMembers.value = [];
    pageStatus.value = res.message || copy('工会创建成功，会长已上任。', 'Guild created. You are now the owner.');
  } catch (error) {
    pageError.value = errMessage(error, '创建工会失败', 'Failed to create guild');
  } finally {
    creating.value = false;
  }
};

// ---- 操作：编辑工会 ----
const startEdit = () => {
  pageError.value = '';
  pageStatus.value = '';
  editForm.name = guildInfo.value?.name ?? '';
  editForm.description = guildInfo.value?.description ?? '';
  editForm.icon = guildInfo.value?.icon ?? '';
  editing.value = true;
};

const cancelEdit = () => {
  editing.value = false;
  pageError.value = '';
};

const handleSaveEdit = async () => {
  pageError.value = '';
  pageStatus.value = '';
  const invalid = validateFields(editForm);
  if (invalid) {
    pageError.value = invalid;
    return;
  }
  const id = guildId.value;
  if (id === null) {
    pageError.value = copy('找不到当前工会。', 'Current guild not found.');
    return;
  }
  if (!authToken.value) {
    pageError.value = copy('需要登录后操作。', 'Log in to continue.');
    return;
  }
  savingEdit.value = true;
  try {
    const res = await updateGuild(
      id,
      {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        icon: editForm.icon.trim()
      },
      authToken.value
    );
    // 没有独立的工会详情接口，PATCH 返回的数据即最新资料，用它重新填充页面
    const cached = toCachedGuild(res.guild, guildInfo.value?.role || 'owner');
    writeCache(cached);
    guildInfo.value = cached;
    editing.value = false;
    pageStatus.value = res.message || copy('工会资料已更新。', 'Guild profile updated.');
  } catch (error) {
    pageError.value = errMessage(error, '更新工会资料失败', 'Failed to update guild');
  } finally {
    savingEdit.value = false;
  }
};

// ---- 操作：退出工会（二次确认） ----
const requestLeave = () => {
  pageError.value = '';
  pageStatus.value = '';
  leaveConfirm.value = true;
};
const cancelLeave = () => {
  leaveConfirm.value = false;
};

const confirmLeave = async () => {
  const id = guildId.value;
  if (id === null) {
    pageError.value = copy('找不到当前工会。', 'Current guild not found.');
    return;
  }
  if (!authToken.value) {
    pageError.value = copy('需要登录后操作。', 'Log in to continue.');
    return;
  }
  leaving.value = true;
  try {
    const res = await leaveGuild(id, authToken.value);
    clearCache();
    guildInfo.value = null;
    // 退出成功后同步认证上下文，页面状态立即切换为“未加入工会”
    if (currentUser.value) currentUser.value.guildId = null;
    leaveConfirm.value = false;
    editing.value = false;
    removedMembers.value = [];
    pageStatus.value = res.message || copy('已退出工会。', 'You have left the guild.');
  } catch (error) {
    leaveConfirm.value = false;
    pageError.value = errMessage(error, '退出工会失败', 'Failed to leave guild');
  } finally {
    leaving.value = false;
  }
};

// ---- 操作：移除成员（会长） ----
const handleRemoveMember = async () => {
  pageError.value = '';
  pageStatus.value = '';
  const id = guildId.value;
  if (id === null) {
    pageError.value = copy('找不到当前工会。', 'Current guild not found.');
    return;
  }
  if (!authToken.value) {
    pageError.value = copy('需要登录后操作。', 'Log in to continue.');
    return;
  }
  const raw = removeUserId.value.trim();
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
    pageError.value = copy('请输入有效的成员用户 ID（正整数）。', 'Enter a valid member user ID (a positive integer).');
    return;
  }
  const targetId = Number(raw);
  if (currentUser.value && targetId === currentUser.value.id) {
    pageError.value = copy('不能把自己移出工会，会长请使用下方“退出工会”。', 'You cannot remove yourself. Use "Leave guild" below instead.');
    return;
  }
  removing.value = true;
  try {
    const res = await removeGuildMember(id, targetId, authToken.value);
    // 第一阶段没有成员列表接口，成功后乐观地把该成员记入本地“已移除”列表
    if (!removedMembers.value.includes(targetId)) {
      removedMembers.value = [targetId, ...removedMembers.value];
    }
    removeUserId.value = '';
    pageStatus.value = res.message || copy(`成员 #${targetId} 已移出工会。`, `Member #${targetId} has been removed.`);
  } catch (error) {
    pageError.value = errMessage(error, '移除成员失败', 'Failed to remove member');
  } finally {
    removing.value = false;
  }
};

const goCommunity = () => {
  void router.replace('/');
};

// 监听认证上下文变化：用户或工会归属变化时重新恢复工会资料
watch(
  () => `${currentUser.value?.id ?? ''}:${currentUser.value?.guildId ?? ''}`,
  () => {
    restoreFromContext();
  },
  { immediate: true }
);

// 登录态丢失时跳回首页（与路由守卫对未登录用户的处理保持一致）
watch(authToken, (value) => {
  if (!value) void router.replace('/');
});

onMounted(() => {
  if (!authToken.value) void router.replace('/');
});
</script>

<template>
  <section class="workspace single-view my-guild-page">
    <aside class="right-rail">
      <PxCard class="panel my-guild-panel">
        <template #header>
          <div class="panel-title between">
            <span><Crown :size="18" /> {{ copy('工会管理', 'Guild Management') }}</span>
            <small>/my-guild</small>
          </div>
        </template>

        <!-- 未登录：路由守卫已拦截，此处为兜底提示 -->
        <div v-if="accessState === 'unauthorized'" class="gc-state gc-state--error">
          <ShieldAlert :size="22" />
          <strong>{{ copy('需要登录后才能管理工会', 'Sign in to manage your guild') }}</strong>
          <span>{{ copy('请用右上角的账号菜单登录。正在带你回到社区广场。', 'Use the account menu at the top right to sign in. Taking you back to the community.') }}</span>
          <button type="button" class="gc-retry" @click="goCommunity">
            <ArrowRight :size="14" /> {{ copy('回到社区广场', 'Back to community') }}
          </button>
        </div>

        <!-- 加载中：token 存在但用户信息尚未就绪 -->
        <div v-else-if="accessState === 'loading'" class="gc-state gc-state--loading">
          <div class="gc-skeleton"></div>
          <div class="gc-skeleton"></div>
          <p class="loading-line">{{ copy('正在确认你的账号与工会状态...', 'Checking your account and guild status...') }}</p>
        </div>

        <template v-else>
          <!-- 全局成功 / 错误反馈 -->
          <p v-if="pageError" class="error-line"><AlertTriangle :size="16" /> {{ pageError }}</p>
          <p v-if="pageStatus" class="status-line"><Check :size="16" /> {{ pageStatus }}</p>

          <!-- ========== 未加入工会：创建入口（empty 引导） ========== -->
          <div v-if="!hasGuild" class="mg-block">
            <div class="module-intro">
              <strong>{{ copy('你还没有加入任何工会', 'You have not joined a guild yet') }}</strong>
              <span>{{
                copy(
                  `创建一支属于自己的摸鱼组织并担任会长。创建会消耗 ${GUILD_CREATE_COST} 鱼鳞，余额不足将无法创建。`,
                  `Create your own slacking guild and become its owner. Creating one costs ${GUILD_CREATE_COST} Fish Scale; an insufficient balance will block creation.`
                )
              }}</span>
            </div>

            <form class="mg-form" @submit.prevent="handleCreate">
              <div class="field">
                <span>{{ copy('工会图标', 'Guild icon') }}</span>
                <PxInput v-model="createForm.icon" :placeholder="copy('1-4 个字符，可用 emoji', '1-4 characters, emoji ok')" />
                <div class="mg-icon-picker">
                  <button
                    v-for="icon in iconSuggestions"
                    :key="`create-icon-${icon}`"
                    type="button"
                    class="mg-icon-chip"
                    :class="{ active: createForm.icon === icon }"
                    @click="pickCreateIcon(icon)"
                  >
                    {{ icon }}
                  </button>
                </div>
              </div>

              <label class="field">
                <span>
                  {{ copy('工会名称', 'Guild name') }}
                  <em class="mg-counter" :class="{ 'mg-counter--over': createForm.name.trim().length > NAME_MAX }">
                    {{ createForm.name.trim().length }}/{{ NAME_MAX }}
                  </em>
                </span>
                <PxInput v-model="createForm.name" :placeholder="copy('2-40 个字符，例如：摸鱼地下研究所', '2-40 characters')" />
              </label>

              <label class="field">
                <span>
                  {{ copy('工会简介 / 公告', 'Guild intro / notice') }}
                  <em class="mg-counter">{{ createForm.description.trim().length }}/{{ DESC_MAX }}</em>
                </span>
                <textarea
                  v-model="createForm.description"
                  :maxlength="DESC_MAX"
                  rows="4"
                  :placeholder="copy('介绍这支工会的摸鱼风格（选填，最多 180 字）。', 'Describe your guild (optional, max 180 characters).')"
                ></textarea>
              </label>

              <p class="safety-inline">{{ options.safetyNotice }}</p>

              <PxButton type="primary" native-type="submit" :disabled="!canCreate" :loading="creating">
                <Crown :size="14" /> {{ copy('创建工会', 'Create guild') }}
              </PxButton>
            </form>
          </div>

          <!-- ========== 已有工会：信息展示 + 操作 ========== -->
          <div v-else class="mg-block">
            <!-- 工会概览 -->
            <div class="mg-guild">
              <div class="mg-guild__emblem">{{ guildInfo?.icon || '?' }}</div>
              <div class="mg-guild__meta">
                <span class="mg-guild__kicker">{{ copy('我的工会', 'MY GUILD') }}</span>
                <strong v-if="guildInfo">{{ guildInfo.name }}</strong>
                <strong v-else>{{ copy('工会', 'Guild') }} #{{ guildId }}</strong>
                <div class="mg-tags">
                  <em v-if="isOwner" class="mg-tag mg-tag--owner"><Crown :size="11" /> {{ copy('会长', 'Owner') }}</em>
                  <em v-else-if="guildInfo" class="mg-tag">{{ copy('成员', 'Member') }}</em>
                  <em class="mg-tag mg-tag--ghost">ID {{ guildId }}</em>
                </div>
              </div>
            </div>

            <p v-if="guildInfo && guildInfo.description" class="mg-desc">{{ guildInfo.description }}</p>
            <p v-else-if="guildInfo" class="mg-desc mg-desc--empty">
              {{ copy('这支工会还没有写简介 / 公告。', 'This guild has no intro / notice yet.') }}
            </p>
            <div v-else class="gc-state">
              <RefreshCw :size="20" />
              <strong>{{ copy('工会资料未在本设备缓存', 'Guild profile is not cached on this device') }}</strong>
              <span>{{
                copy(
                  '你已加入这支工会（见上方 ID），但它的名称和简介没有保存在当前浏览器。你仍然可以编辑资料或退出工会，编辑成功后资料会显示出来。',
                  'You are in this guild (see the ID above), but its name and intro are not stored in this browser. You can still edit it or leave it; details appear after a successful edit.'
                )
              }}</span>
            </div>

            <!-- 编辑入口 -->
            <div v-if="!editing" class="mg-actions">
              <PxButton type="primary" size="small" @click="startEdit">
                <Pencil :size="13" /> {{ copy('编辑工会', 'Edit guild') }}
              </PxButton>
            </div>

            <!-- 编辑表单（预填当前信息） -->
            <form v-else class="mg-form mg-card" @submit.prevent="handleSaveEdit">
              <div class="mg-section-head">
                <strong><Pencil :size="14" /> {{ copy('编辑工会资料', 'Edit guild profile') }}</strong>
                <small>{{ copy('仅会长可修改', 'Owner only') }}</small>
              </div>

              <div class="field">
                <span>{{ copy('工会图标', 'Guild icon') }}</span>
                <PxInput v-model="editForm.icon" :placeholder="copy('1-4 个字符', '1-4 characters')" />
                <div class="mg-icon-picker">
                  <button
                    v-for="icon in iconSuggestions"
                    :key="`edit-icon-${icon}`"
                    type="button"
                    class="mg-icon-chip"
                    :class="{ active: editForm.icon === icon }"
                    @click="pickEditIcon(icon)"
                  >
                    {{ icon }}
                  </button>
                </div>
              </div>

              <label class="field">
                <span>
                  {{ copy('工会名称', 'Guild name') }}
                  <em class="mg-counter" :class="{ 'mg-counter--over': editForm.name.trim().length > NAME_MAX }">
                    {{ editForm.name.trim().length }}/{{ NAME_MAX }}
                  </em>
                </span>
                <PxInput v-model="editForm.name" :placeholder="copy('2-40 个字符', '2-40 characters')" />
              </label>

              <label class="field">
                <span>
                  {{ copy('工会简介 / 公告', 'Guild intro / notice') }}
                  <em class="mg-counter">{{ editForm.description.trim().length }}/{{ DESC_MAX }}</em>
                </span>
                <textarea
                  v-model="editForm.description"
                  :maxlength="DESC_MAX"
                  rows="4"
                  :placeholder="copy('最多 180 字。', 'Max 180 characters.')"
                ></textarea>
              </label>

              <p class="safety-inline">{{ options.safetyNotice }}</p>

              <div class="mg-form-actions">
                <PxButton type="primary" native-type="submit" size="small" :disabled="!canSaveEdit" :loading="savingEdit">
                  <Save :size="13" /> {{ copy('保存修改', 'Save changes') }}
                </PxButton>
                <PxButton type="base" native-type="button" size="small" @click="cancelEdit">
                  <X :size="13" /> {{ copy('取消', 'Cancel') }}
                </PxButton>
              </div>
            </form>

            <!-- 成员管理：仅会长可见 -->
            <section v-if="isOwner" class="mg-section">
              <div class="mg-section-head">
                <strong><UserMinus :size="14" /> {{ copy('成员管理', 'Member management') }}</strong>
                <small>{{ copy('会长操作', 'Owner action') }}</small>
              </div>
              <p class="field-hint">{{
                copy(
                  '输入要移出工会的成员用户 ID。第一阶段没有成员列表接口，移除成功后会在下方记录本次操作。会长不能移除自己或其他会长。',
                  'Enter the user ID of the member to remove. There is no member-list API in this phase, so successful removals are logged below. Owners cannot remove themselves or other owners.'
                )
              }}</p>
              <form class="mg-remove" @submit.prevent="handleRemoveMember">
                <PxInput v-model="removeUserId" :placeholder="copy('成员用户 ID，例如 1024', 'Member user ID, e.g. 1024')" />
                <PxButton
                  type="danger"
                  native-type="submit"
                  size="small"
                  :disabled="removing || !removeUserId.trim()"
                  :loading="removing"
                >
                  <UserMinus :size="13" /> {{ copy('移除成员', 'Remove') }}
                </PxButton>
              </form>
              <div v-if="removedMembers.length" class="mg-removed">
                <span>{{ copy('本次会话已移除：', 'Removed this session: ') }}</span>
                <em v-for="uid in removedMembers" :key="`removed-${uid}`">#{{ uid }}</em>
              </div>
            </section>

            <!-- 退出工会 -->
            <section class="mg-section mg-section--danger">
              <div class="mg-section-head">
                <strong><LogOut :size="14" /> {{ copy('退出工会', 'Leave guild') }}</strong>
              </div>
              <p v-if="isOwner" class="field-hint">{{
                copy(
                  '你是会长，不能直接退出工会。需先移出全部成员后再处理，或交由管理员协助。',
                  'You are the owner and cannot leave directly. Remove all members first, or ask an admin for help.'
                )
              }}</p>
              <p v-else class="field-hint">{{
                copy(
                  '退出后你将不再属于这支工会，历史摸鱼记录的工会归属保持不变。',
                  'After leaving you are no longer in this guild. Past slacking records keep their guild attribution.'
                )
              }}</p>

              <div v-if="!leaveConfirm" class="mg-actions">
                <PxButton type="base" size="small" @click="requestLeave">
                  <LogOut :size="13" /> {{ copy('退出工会', 'Leave guild') }}
                </PxButton>
              </div>
              <div v-else class="mg-confirm">
                <span>{{ copy('确认要退出当前工会吗？此操作无法撤销。', 'Are you sure you want to leave this guild? This cannot be undone.') }}</span>
                <div class="mg-form-actions">
                  <PxButton type="danger" size="small" :loading="leaving" @click="confirmLeave">
                    <Check :size="13" /> {{ copy('确认退出', 'Confirm leave') }}
                  </PxButton>
                  <PxButton type="base" size="small" :disabled="leaving" @click="cancelLeave">
                    <X :size="13" /> {{ copy('取消', 'Cancel') }}
                  </PxButton>
                </div>
              </div>
            </section>
          </div>
        </template>
      </PxCard>
    </aside>
  </section>
</template>

<style scoped>
.mg-block {
  display: grid;
  gap: 16px;
}

.mg-form {
  display: grid;
  gap: 14px;
}

/* 把字段标签与字数统计排到一行两端 */
.mg-form .field > span {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.mg-card {
  padding: 14px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-soft);
}

.mg-counter {
  font-style: normal;
  font-size: 11px;
  font-weight: 900;
  color: var(--color-text-muted);
}

.mg-counter--over {
  color: var(--color-danger-text);
}

/* 工会概览卡片 */
.mg-guild {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  box-shadow: var(--shadow-small);
}

.mg-guild__emblem {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  font-size: 26px;
  line-height: 1;
}

.mg-guild__meta {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.mg-guild__kicker {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: var(--color-primary-text);
  opacity: 0.7;
}

.mg-guild__meta strong {
  font-size: 18px;
  font-weight: 900;
  color: var(--color-primary-text);
  word-break: break-word;
}

.mg-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.mg-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 11px;
  font-weight: 900;
  font-style: normal;
}

.mg-tag--owner {
  background: var(--color-accent);
}

.mg-tag--ghost {
  background: var(--color-surface-soft);
  color: var(--color-text-muted);
}

/* 工会简介 */
.mg-desc {
  margin: 0;
  padding: 12px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-soft);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.6;
  white-space: pre-line;
  word-break: break-word;
}

.mg-desc--empty {
  color: var(--color-text-muted);
  font-weight: 800;
}

.mg-actions,
.mg-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 分区块：成员管理 / 退出工会 */
.mg-section {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-soft);
}

.mg-section--danger {
  background: var(--color-danger);
}

.mg-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mg-section-head strong {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 900;
  color: var(--color-text);
}

.mg-section-head small {
  font-size: 11px;
  font-weight: 800;
  color: var(--color-text-muted);
}

/* 移除成员输入行 */
.mg-remove {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
}

.mg-removed {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text);
}

.mg-removed em {
  font-style: normal;
  padding: 2px 7px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  font-weight: 900;
}

/* 退出二次确认 */
.mg-confirm {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
}

.mg-confirm > span {
  font-size: 12.5px;
  font-weight: 900;
  line-height: 1.6;
  color: var(--color-danger-text);
}

/* 图标快捷选择 */
.mg-icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mg-icon-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 32px;
  padding: 0 6px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 2px 2px 0 var(--color-border);
  color: var(--color-text);
  font-size: 15px;
  font-weight: 900;
}

.mg-icon-chip:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-border);
}

.mg-icon-chip.active {
  background: var(--color-accent);
}

.mg-icon-chip:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 480px) {
  .mg-remove {
    grid-template-columns: 1fr;
  }
}
</style>
