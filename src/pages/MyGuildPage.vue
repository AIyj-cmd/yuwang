<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Crown,
  RefreshCw,
  ShieldAlert
} from 'lucide-vue-next';
import { useAppContext } from '../appContext';
import { createGuild, fetchGuild, leaveGuild, removeGuildMember, updateGuild } from '../api';
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
const guildLoading = ref(false);
const guildLoadError = ref('');
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

const loadGuildDetail = async () => {
  const user = currentUser.value;
  if (!user || user.guildId === null) {
    guildInfo.value = null;
    guildLoading.value = false;
    guildLoadError.value = '';
    return;
  }
  if (!authToken.value) return;
  guildLoading.value = true;
  guildLoadError.value = '';
  try {
    const res = await fetchGuild(user.guildId, authToken.value);
    const g = res.guild;
    const fresh: CachedGuild = {
      id: g.id,
      name: g.name ?? '',
      description: g.description ?? '',
      icon: g.icon ?? '',
      role: g.role ?? 'member'
    };
    writeCache(fresh);
    guildInfo.value = fresh;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    guildLoadError.value = msg || copy('加载工会资料失败，请重试。', 'Failed to load guild info, please retry.');
    guildInfo.value = null;
  } finally {
    guildLoading.value = false;
  }
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
    pageError.value = copy('不能把自己移出工会，会长请使用下方"退出工会"。', 'You cannot remove yourself. Use "Leave guild" below instead.');
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
    if (accessState.value === 'ready') void loadGuildDetail();
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
      <div class="my-guild-card">
        <div class="my-guild-card__header">
          <span class="my-guild-card__title">
            <Crown :size="18" />
            {{ copy('工会管理', 'Guild Management') }}
          </span>
          <small class="my-guild-card__sub">/my-guild</small>
        </div>

        <div class="my-guild-card__body">
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
              <div v-if="guildLoading" class="gc-state gc-state--loading">
                <div class="gc-skeleton"></div>
                <div class="gc-skeleton"></div>
                <p class="loading-line">{{ copy('正在加载工会资料...', 'Loading guild info...') }}</p>
              </div>

              <div v-else-if="guildLoadError" class="gc-state gc-state--error">
                <AlertTriangle :size="22" />
                <strong>{{ copy('加载工会资料失败', 'Failed to load guild info') }}</strong>
                <span>{{ guildLoadError }}</span>
                <button type="button" class="gc-retry" @click="void loadGuildDetail()">
                  <RefreshCw :size="14" /> {{ copy('重试', 'Retry') }}
                </button>
              </div>

              <template v-else-if="guildInfo">
                <GuildProfileDisplay
                  :guild-info="guildInfo"
                  :guild-id="guildId"
                  :is-owner="isOwner"
                  @edit="startEdit"
                />

                <GuildEditForm
                  v-if="editing && isOwner"
                  :initial-name="guildInfo.name"
                  :initial-description="guildInfo.description"
                  :initial-icon="guildInfo.icon"
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
          </template>
        </div>
      </div>
    </aside>
  </section>
</template>

<style scoped>
.my-guild-card {
  background: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-flat-md);
  overflow: hidden;
}
.my-guild-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: var(--border-default);
}
.my-guild-card__title {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}
.my-guild-card__sub {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}
.my-guild-card__body {
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
}

.gc-state {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-secondary);
  border: var(--border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
.gc-state--error {
  border-color: var(--color-danger);
  background: var(--color-bg-active-danger);
  color: var(--color-text-primary);
}
.gc-state strong {
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}
.gc-state span {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-normal);
}
.gc-retry {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-1) auto 0;
  padding: var(--space-2) var(--space-4);
  border: var(--border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  font-family: inherit;
  cursor: pointer;
}
.gc-retry:hover {
  background: var(--color-bg-subtle);
}
.gc-skeleton {
  height: 20px;
  border-radius: var(--radius-sm);
  border: var(--border-default);
  background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-bg-card) 50%, var(--color-bg-subtle) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.loading-line {
  margin: var(--space-1) 0 0;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
}
.error-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-danger);
  border-radius: var(--radius-md);
  background: var(--color-bg-active-danger);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
}
.status-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-success);
  border-radius: var(--radius-md);
  background: var(--color-accent-mint-soft);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
}
</style>
