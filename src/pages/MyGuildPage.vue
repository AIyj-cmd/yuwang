<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Crown,
  RefreshCw,
  Save,
  ShieldAlert,
  X
} from 'lucide-vue-next';
import { PxButton, PxCard, PxInput } from '@mmt817/pixel-ui';
import { useAppContext } from '../appContext';
import { createGuild, leaveGuild, removeGuildMember, updateGuild } from '../api';
import type { Guild, CachedGuild } from '../types';
import GuildCreateForm from '../components/guild/GuildCreateForm.vue';
import GuildEditForm from '../components/guild/GuildEditForm.vue';
import GuildLeaveSection from '../components/guild/GuildLeaveSection.vue';
import GuildMemberManage from '../components/guild/GuildMemberManage.vue';
import GuildProfileDisplay from '../components/guild/GuildProfileDisplay.vue';

const router = useRouter();

const { authToken, copy, currentUser, options } = useAppContext();

const CACHE_KEY = 'gongwei-yuwang-my-guild';

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

const guildId = computed<number | null>(() => currentUser.value?.guildId ?? null);
const hasGuild = computed(() => guildId.value !== null);
const isOwner = computed(() => guildInfo.value?.role === 'owner');

const accessState = computed<'unauthorized' | 'loading' | 'ready'>(() => {
  if (!authToken.value) return 'unauthorized';
  if (!currentUser.value) return 'loading';
  return 'ready';
});

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
    // ignore
  }
  return null;
};

const writeCache = (guild: CachedGuild) => {
  const user = currentUser.value;
  if (!user) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId: user.id, guild }));
  } catch {
    // ignore
  }
};

const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
};

const restoreFromContext = () => {
  const user = currentUser.value;
  if (!user || user.guildId === null) {
    guildInfo.value = null;
    return;
  }
  const cached = readCache();
  guildInfo.value = cached && cached.userId === user.id && cached.guild.id === user.guildId ? cached.guild : null;
};

const toCachedGuild = (guild: Guild, fallbackRole: string): CachedGuild => ({
  id: guild.id,
  name: typeof guild.name === 'string' ? guild.name : '',
  description: typeof guild.description === 'string' ? guild.description : '',
  icon: typeof guild.icon === 'string' ? guild.icon : '',
  role: typeof guild.role === 'string' && guild.role ? guild.role : fallbackRole
});

const errMessage = (error: unknown, fallbackZh: string, fallbackEn: string): string =>
  error instanceof Error && error.message ? error.message : copy(fallbackZh, fallbackEn);

const handleCreate = async (payload: { name: string; description: string; icon: string }) => {
  pageError.value = '';
  pageStatus.value = '';
  if (!authToken.value) {
    pageError.value = copy('需要登录后操作。', 'Log in to continue.');
    return;
  }
  creating.value = true;
  try {
    const res = await createGuild(payload, authToken.value);
    const cached = toCachedGuild(res.guild, 'owner');
    writeCache(cached);
    guildInfo.value = cached;
    if (currentUser.value) currentUser.value.guildId = cached.id;
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

const startEdit = () => {
  pageError.value = '';
  pageStatus.value = '';
  editing.value = true;
};

const cancelEdit = () => {
  editing.value = false;
  pageError.value = '';
};

const handleSaveEdit = async (payload: { name: string; description: string; icon: string }) => {
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
  savingEdit.value = true;
  try {
    const res = await updateGuild(id, payload, authToken.value);
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

const handleRemoveMember = async (targetId: number) => {
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
  if (currentUser.value && targetId === currentUser.value.id) {
    pageError.value = copy('不能把自己移出工会，会长请使用下方“退出工会”。', 'You cannot remove yourself. Use "Leave guild" below instead.');
    return;
  }
  removing.value = true;
  try {
    const res = await removeGuildMember(id, targetId, authToken.value);
    if (!removedMembers.value.includes(targetId)) {
      removedMembers.value = [targetId, ...removedMembers.value];
    }
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

watch(
  () => `${currentUser.value?.id ?? ''}:${currentUser.value?.guildId ?? ''}`,
  () => {
    restoreFromContext();
  },
  { immediate: true }
);

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

        <div v-if="accessState === 'unauthorized'" class="gc-state gc-state--error">
          <ShieldAlert :size="22" />
          <strong>{{ copy('需要登录后才能管理工会', 'Sign in to manage your guild') }}</strong>
          <span>{{ copy('请用右上角的账号菜单登录。正在带你回到社区广场。', 'Use the account menu at the top right to sign in. Taking you back to the community.') }}</span>
          <button type="button" class="gc-retry" @click="goCommunity">
            <ArrowRight :size="14" /> {{ copy('回到社区广场', 'Back to community') }}
          </button>
        </div>

        <div v-else-if="accessState === 'loading'" class="gc-state gc-state--loading">
          <div class="gc-skeleton"></div>
          <div class="gc-skeleton"></div>
          <p class="loading-line">{{ copy('正在确认你的账号与工会状态...', 'Checking your account and guild status...') }}</p>
        </div>

        <template v-else>
          <p v-if="pageError" class="error-line"><AlertTriangle :size="16" /> {{ pageError }}</p>
          <p v-if="pageStatus" class="status-line"><Check :size="16" /> {{ pageStatus }}</p>

          <GuildCreateForm
            v-if="!hasGuild"
            :creating="creating"
            :safety-notice="options.safetyNotice"
            @submit="handleCreate"
          />

          <template v-else>
            <GuildProfileDisplay
              :guild-info="guildInfo"
              :guild-id="guildId"
              :is-owner="isOwner"
              @edit="startEdit"
            />

            <GuildEditForm
              v-if="editing"
              :initial-name="guildInfo?.name ?? ''"
              :initial-description="guildInfo?.description ?? ''"
              :initial-icon="guildInfo?.icon ?? ''"
              :saving-edit="savingEdit"
              :safety-notice="options.safetyNotice"
              @submit="handleSaveEdit"
              @cancel="cancelEdit"
            />

            <GuildMemberManage
              v-if="isOwner"
              :removing="removing"
              :removed-members="removedMembers"
              @remove="handleRemoveMember"
            />

            <GuildLeaveSection
              :leave-confirm="leaveConfirm"
              :is-owner="isOwner"
              :leaving="leaving"
              @request-leave="requestLeave"
              @confirm-leave="confirmLeave"
              @cancel-leave="cancelLeave"
            />
          </template>
        </template>
      </PxCard>
    </aside>
  </section>
</template>

<style scoped>
.gc-state {
  display: grid;
  gap: 6px;
  padding: 16px;
  text-align: center;
  color: var(--color-text-muted);
  border: 2px solid var(--color-border-soft);
  background: var(--color-surface-soft);
}
.gc-state--error {
  border-color: var(--color-danger);
  background: var(--color-danger);
  color: var(--color-danger-text);
}
.gc-state strong {
  font-size: 14px;
  font-weight: 900;
  color: var(--color-text);
}
.gc-state span {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}
.gc-retry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 4px auto 0;
  padding: 8px 14px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.gc-retry:hover {
  background: var(--color-border);
  color: var(--color-surface);
}
.gc-skeleton {
  height: 20px;
  border: 2px solid var(--color-border-soft);
  background: linear-gradient(90deg, var(--color-surface-soft) 25%, var(--color-disabled) 50%, var(--color-surface-soft) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.loading-line {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
}
.error-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  border: 2px solid var(--color-danger);
  background: var(--color-danger);
  color: var(--color-danger-text);
  font-size: 13px;
  font-weight: 800;
}
.status-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  border: 2px solid var(--color-success);
  background: var(--color-success);
  color: var(--color-success-text);
  font-size: 13px;
  font-weight: 800;
}
</style>
