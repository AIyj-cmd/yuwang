<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue';
import { AlertTriangle, Check, Crown, LogIn, Pencil, UserMinus, Users } from 'lucide-vue-next';
import { PxButton } from '@mmt817/pixel-ui';
import { useAppContext } from '../../appContext';
import { createGuild, fetchGuildMembers, leaveGuild, removeGuildMember, updateGuild } from '../../api';
import type { Guild, GuildMember, GuildsResponse, OptionsResponse, User } from '../../types';
import GuildCreateForm from './GuildCreateForm.vue';
import GuildEditForm from './GuildEditForm.vue';
import GuildLeaveSection from './GuildLeaveSection.vue';

// 工会大厅内的「工会管理」面板：未加入时创建工会，已加入时退出工会，
// 会长可编辑资料并移除普通成员。仅调用后端真实接口，不伪造任何数据。
// appContext 类型为 Record<string, any>，此处显式收窄，不使用 any 兜底。
const ctx = useAppContext();
const currentUser = ctx.currentUser as Ref<User | null>;
const authToken = ctx.authToken as Ref<string | null>;
const guildsData = ctx.guildsData as Ref<GuildsResponse | null>;
const options = ctx.options as Ref<OptionsResponse>;
const copy = ctx.copy as (zh: string, en: string) => string;
const loadGuilds = ctx.loadGuilds as () => Promise<void>;
const loadMe = ctx.loadMe as () => Promise<void>;

type GuildFormPayload = { name: string; description: string; icon: string };

const myGuild = computed<Guild | null>(() => guildsData.value?.myGuild ?? null);
const isLoggedIn = computed(() => Boolean(currentUser.value) && Boolean(authToken.value));
const isOwner = computed(() => myGuild.value?.role === 'owner');

// ---- 交互状态 ----
const creating = ref(false);
const savingEdit = ref(false);
const leaving = ref(false);
const editing = ref(false);
const leaveConfirm = ref(false);
const panelError = ref('');
const panelStatus = ref('');

// ---- 成员名册（会长移除成员用） ----
const members = ref<GuildMember[]>([]);
const membersLoading = ref(false);
const membersError = ref('');
const removingId = ref<number | null>(null);
const confirmRemoveId = ref<number | null>(null);

const errMessage = (error: unknown, fallbackZh: string, fallbackEn: string): string =>
  error instanceof Error && error.message ? error.message : copy(fallbackZh, fallbackEn);

const resetFeedback = () => {
  panelError.value = '';
  panelStatus.value = '';
};

// 变更成功后刷新工会列表与当前用户信息（loadMe 内部也会刷新钱包）。
const refreshAfterMutation = async () => {
  await Promise.all([loadGuilds(), loadMe()]);
};

// ---- 成员名册加载 ----
const loadMembers = async () => {
  const guild = myGuild.value;
  if (!guild || !isOwner.value) {
    members.value = [];
    return;
  }
  membersLoading.value = true;
  membersError.value = '';
  try {
    const res = await fetchGuildMembers(guild.id, authToken.value);
    members.value = res.members;
  } catch (error) {
    membersError.value = errMessage(error, '成员名册加载失败', 'Failed to load the roster');
    members.value = [];
  } finally {
    membersLoading.value = false;
  }
};

// ---- 创建工会 ----
const handleCreate = async (payload: GuildFormPayload) => {
  resetFeedback();
  const token = authToken.value;
  if (!token) {
    panelError.value = copy('需要登录后再创建工会。', 'Sign in before creating a guild.');
    return;
  }
  if (!payload.name.trim() || !payload.description.trim() || !payload.icon.trim()) {
    panelError.value = copy('工会名称、简介、图标都需要填写。', 'Name, description and icon are all required.');
    return;
  }
  creating.value = true;
  try {
    const res = await createGuild(payload, token);
    await refreshAfterMutation();
    editing.value = false;
    leaveConfirm.value = false;
    panelStatus.value = res.message || copy('工会创建成功，会长已上任。', 'Guild created. You are now the owner.');
  } catch (error) {
    // 后端 400 / 401 / 403 等错误的 message 原样展示，不伪造成功
    panelError.value = errMessage(error, '创建工会失败', 'Failed to create the guild');
  } finally {
    creating.value = false;
  }
};

// ---- 编辑工会（会长） ----
const startEdit = () => {
  resetFeedback();
  editing.value = true;
};
const cancelEdit = () => {
  editing.value = false;
};

const handleSaveEdit = async (payload: GuildFormPayload) => {
  resetFeedback();
  const guild = myGuild.value;
  const token = authToken.value;
  if (!guild) {
    panelError.value = copy('找不到当前工会。', 'Current guild not found.');
    return;
  }
  if (!token) {
    panelError.value = copy('需要登录后操作。', 'Sign in to continue.');
    return;
  }
  if (!payload.name.trim() || !payload.icon.trim()) {
    panelError.value = copy('工会名称和图标不能为空。', 'Guild name and icon cannot be empty.');
    return;
  }
  savingEdit.value = true;
  try {
    const res = await updateGuild(guild.id, payload, token);
    await refreshAfterMutation();
    editing.value = false;
    panelStatus.value = res.message || copy('工会资料已更新。', 'Guild profile updated.');
  } catch (error) {
    panelError.value = errMessage(error, '更新工会资料失败', 'Failed to update the guild');
  } finally {
    savingEdit.value = false;
  }
};

// ---- 退出工会 ----
const requestLeave = () => {
  resetFeedback();
  leaveConfirm.value = true;
};
const cancelLeave = () => {
  leaveConfirm.value = false;
};

const confirmLeave = async () => {
  resetFeedback();
  const guild = myGuild.value;
  const token = authToken.value;
  if (!guild) {
    panelError.value = copy('找不到当前工会。', 'Current guild not found.');
    return;
  }
  if (!token) {
    panelError.value = copy('需要登录后操作。', 'Sign in to continue.');
    return;
  }
  leaving.value = true;
  try {
    const res = await leaveGuild(guild.id, token);
    await refreshAfterMutation();
    leaveConfirm.value = false;
    editing.value = false;
    panelStatus.value = res.message || copy('已退出工会。', 'You have left the guild.');
  } catch (error) {
    // 会长直接退出会被后端拦截，错误 message 原样展示
    leaveConfirm.value = false;
    panelError.value = errMessage(error, '退出工会失败', 'Failed to leave the guild');
  } finally {
    leaving.value = false;
  }
};

// ---- 移除成员（会长） ----
const requestRemove = (userId: number) => {
  resetFeedback();
  confirmRemoveId.value = userId;
};
const cancelRemove = () => {
  confirmRemoveId.value = null;
};

const confirmRemove = async (userId: number) => {
  resetFeedback();
  const guild = myGuild.value;
  const token = authToken.value;
  if (!guild) {
    panelError.value = copy('找不到当前工会。', 'Current guild not found.');
    return;
  }
  if (!token) {
    panelError.value = copy('需要登录后操作。', 'Sign in to continue.');
    return;
  }
  if (currentUser.value && userId === currentUser.value.id) {
    panelError.value = copy('会长不能移除自己。', 'Owners cannot remove themselves.');
    confirmRemoveId.value = null;
    return;
  }
  removingId.value = userId;
  try {
    const res = await removeGuildMember(guild.id, userId, token);
    confirmRemoveId.value = null;
    await Promise.all([loadMembers(), refreshAfterMutation()]);
    panelStatus.value = res.message || copy('成员已移出工会。', 'Member removed from the guild.');
  } catch (error) {
    confirmRemoveId.value = null;
    panelError.value = errMessage(error, '移除成员失败', 'Failed to remove the member');
  } finally {
    removingId.value = null;
  }
};

// 工会归属变化时重新加载名册并复位临时交互状态。
watch(
  () => (isOwner.value ? myGuild.value?.id ?? null : null),
  () => {
    editing.value = false;
    leaveConfirm.value = false;
    confirmRemoveId.value = null;
    void loadMembers();
  },
  { immediate: true }
);
</script>

<template>
  <div class="gm-panel">
    <p v-if="panelError" class="error-line"><AlertTriangle :size="15" /> {{ panelError }}</p>
    <p v-if="panelStatus" class="status-line"><Check :size="15" /> {{ panelStatus }}</p>

    <!-- 未登录：提示登录，不允许提交创建请求 -->
    <div v-if="!isLoggedIn" class="gm-login">
      <LogIn :size="20" />
      <strong>{{ copy('登录后即可创建和管理工会', 'Sign in to create and manage a guild') }}</strong>
      <span>{{ copy('请用右上角的账号菜单登录，未登录时无法创建或管理工会。', 'Use the account menu at the top right. Guild actions are unavailable while signed out.') }}</span>
    </div>

    <!-- 已登录且未加入工会：创建工会入口 -->
    <GuildCreateForm
      v-else-if="!myGuild"
      :creating="creating"
      :safety-notice="options.safetyNotice"
      @submit="handleCreate"
    />

    <!-- 已加入工会：会长管理 + 退出工会 -->
    <template v-else>
      <section v-if="isOwner" class="gm-owner">
        <GuildEditForm
          v-if="editing"
          :initial-name="myGuild?.name ?? ''"
          :initial-description="myGuild?.description ?? ''"
          :initial-icon="myGuild?.icon ?? ''"
          :saving-edit="savingEdit"
          :safety-notice="options.safetyNotice"
          @submit="handleSaveEdit"
          @cancel="cancelEdit"
        />
        <div v-else class="gm-owner-head">
          <div class="gm-owner-title">
            <strong><Crown :size="14" /> {{ copy('会长管理', 'Owner tools') }}</strong>
            <small>{{ copy('编辑工会资料、管理成员', 'Edit the profile, manage members') }}</small>
          </div>
          <PxButton type="primary" size="small" @click="startEdit">
            <Pencil :size="13" /> {{ copy('编辑工会', 'Edit guild') }}
          </PxButton>
        </div>

        <div class="gm-members">
          <div class="gm-members-head">
            <strong><Users :size="14" /> {{ copy('成员管理', 'Member management') }}</strong>
            <small>{{ members.length }} {{ copy('名成员', 'members') }}</small>
          </div>
          <p class="gm-hint">{{ copy('会长可移出普通成员；会长本人不会出现移出按钮。', 'Owners can remove ordinary members; no remove button is shown for the owner.') }}</p>

          <div v-if="membersLoading" class="loading-line">{{ copy('成员名册加载中...', 'Loading the roster...') }}</div>
          <p v-else-if="membersError" class="error-line"><AlertTriangle :size="14" /> {{ membersError }}</p>
          <ul v-else-if="members.length" class="gm-roster">
            <li v-for="member in members" :key="member.id">
              <span class="gm-roster__name">{{ member.display_name }}</span>
              <span class="gm-roster__role" :class="{ 'is-owner': member.role === 'owner' }">
                {{ member.role === 'owner' ? copy('会长', 'Owner') : copy('成员', 'Member') }}
              </span>
              <template v-if="member.role !== 'owner'">
                <template v-if="confirmRemoveId === member.id">
                  <span class="gm-roster__confirm">{{ copy('确认移出？', 'Remove?') }}</span>
                  <PxButton
                    type="danger"
                    size="small"
                    :loading="removingId === member.id"
                    @click="confirmRemove(member.id)"
                  >
                    {{ copy('确认', 'Yes') }}
                  </PxButton>
                  <PxButton type="base" size="small" :disabled="removingId === member.id" @click="cancelRemove">
                    {{ copy('取消', 'No') }}
                  </PxButton>
                </template>
                <PxButton v-else type="base" size="small" @click="requestRemove(member.id)">
                  <UserMinus :size="12" /> {{ copy('移出工会', 'Remove') }}
                </PxButton>
              </template>
              <span v-else class="gm-roster__self">{{ copy('不可移除', 'Protected') }}</span>
            </li>
          </ul>
          <div v-else class="gm-empty">{{ copy('暂时没有可显示的成员。', 'No members to show yet.') }}</div>
        </div>
      </section>

      <GuildLeaveSection
        :leave-confirm="leaveConfirm"
        :is-owner="isOwner"
        :leaving="leaving"
        @request-leave="requestLeave"
        @confirm-leave="confirmLeave"
        @cancel-leave="cancelLeave"
      />
    </template>
  </div>
</template>

<style scoped>
.gm-panel {
  display: grid;
  gap: 14px;
}

.gm-login {
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 18px 14px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-soft);
  text-align: center;
}

.gm-login strong {
  font-size: 14px;
  font-weight: 900;
  color: var(--color-text);
}

.gm-login span {
  max-width: 420px;
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.6;
  color: var(--color-text-muted);
}

.gm-owner {
  display: grid;
  gap: 12px;
}

.gm-owner-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-soft);
}

.gm-owner-title {
  display: grid;
  gap: 3px;
}

.gm-owner-title strong {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 900;
  color: var(--color-text);
}

.gm-owner-title small {
  font-size: 11px;
  font-weight: 800;
  color: var(--color-text-muted);
}

.gm-members {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-soft);
}

.gm-members-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.gm-members-head strong {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 900;
  color: var(--color-text);
}

.gm-members-head small {
  font-size: 11px;
  font-weight: 800;
  color: var(--color-text-muted);
}

.gm-hint {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.gm-roster {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.gm-roster li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
}

.gm-roster__name {
  flex: 1 1 120px;
  min-width: 0;
  font-size: 13px;
  font-weight: 900;
  color: var(--color-text);
  word-break: break-word;
}

.gm-roster__role {
  padding: 2px 7px;
  border: 2px solid var(--color-border);
  background: var(--color-surface-soft);
  font-size: 11px;
  font-weight: 900;
  color: var(--color-text-muted);
}

.gm-roster__role.is-owner {
  background: var(--color-accent);
  color: var(--color-text);
}

.gm-roster__confirm {
  font-size: 12px;
  font-weight: 900;
  color: var(--color-danger-text);
}

.gm-roster__self {
  font-size: 11px;
  font-weight: 800;
  color: var(--color-text-muted);
}

.gm-empty {
  padding: 12px;
  border: 2px solid var(--color-border-soft);
  background: var(--color-surface);
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text-muted);
  text-align: center;
}

.error-line,
.status-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12.5px;
  font-weight: 900;
  line-height: 1.5;
}

.error-line {
  color: var(--color-danger-text);
}

.status-line {
  color: var(--color-success-text);
}

.loading-line {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text-muted);
}
</style>
