<script setup lang="ts">
import { ref } from 'vue';
import { Crown, Edit3, Save, X } from 'lucide-vue-next';
import { PxButton, PxInput } from '@mmt817/pixel-ui';
import { useAppContext } from '../appContext';
import AvatarManager from './AvatarManager.vue';
import UserAvatar from './UserAvatar.vue';

const {
  copy,
  currentProfileTitle,
  currentUser,
  profile,
  profileForm,
  saveProfile,
  t
} = useAppContext();

const isEditing = ref(false);

const handleSaveProfile = async () => {
  const ok = await saveProfile();
  if (ok) isEditing.value = false;
};
</script>

<template>
  <section class="pp-hero">
    <div class="pp-avatar-wrap">
      <UserAvatar
        :avatar-url="profile?.user?.avatarUrl ?? currentUser?.avatarUrl"
        :avatar-seed="profile?.user?.avatarSeed ?? currentUser?.avatarSeed"
        :display-name="profile?.user?.displayName ?? currentUser?.displayName"
        :size="60"
      />
      <AvatarManager v-if="currentUser" />
    </div>
    <div class="pp-hero-text">
      <div class="pp-hero-name-row">
        <h1 class="pp-name">{{ profile?.user?.displayName ?? currentUser?.displayName ?? '-' }}</h1>
        <button class="pp-hero-edit" @click="isEditing = !isEditing">
          <component :is="isEditing ? X : Edit3" :size="13" />
        </button>
      </div>
      <p class="pp-handle">@{{ profile?.user?.username ?? currentUser?.username ?? '-' }}</p>
      <p v-if="profile?.user?.bio || profileForm.bio" class="pp-bio">
        {{ profile?.user?.bio || profileForm.bio }}
      </p>
      <div class="pp-hero-tags">
        <span class="pp-tag pp-tag--primary"><Crown :size="10" /> {{ currentProfileTitle }}</span>
        <span v-if="profile?.user?.isAdmin" class="pp-tag pp-tag--danger">Admin</span>
      </div>
    </div>
    <div class="pp-hero-score">
      <span class="pp-score-label">Fish Power</span>
      <span class="pp-score-num">{{ (profile?.totalScore ?? 0).toFixed(1) }}</span>
    </div>
  </section>

  <transition name="pp-fold">
    <div v-if="isEditing" class="pp-edit-wrap">
      <div class="pp-edit-form">
        <label class="pp-form-field">
          <span>{{ t('displayName') }}</span>
          <PxInput v-model="profileForm.displayName" clearable />
        </label>
        <label class="pp-form-field">
          <span>Bio</span>
          <textarea v-model="profileForm.bio" maxlength="120" rows="2" />
        </label>
        <div class="pp-edit-actions">
          <PxButton type="primary" size="small" @click="handleSaveProfile">
            <Save :size="14" /> {{ t('save') }}
          </PxButton>
          <PxButton type="base" size="small" @click="isEditing = false">
            {{ copy('取消', 'Cancel') }}
          </PxButton>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.pp-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  border: 3px solid var(--color-border);
  background: var(--color-surface);
}
.pp-avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.pp-hero-text {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.pp-hero-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pp-name {
  font-family: var(--font-pixel);
  font-size: 16px;
  font-weight: 900;
  margin: 0;
  color: var(--color-text);
  line-height: 1.2;
}
.pp-hero-edit {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}
.pp-hero-edit:hover {
  background: var(--color-border);
  color: var(--color-surface);
}
.pp-handle {
  font-size: 13px;
  color: var(--color-text-muted);
  font-weight: 700;
  margin: 0;
}
.pp-bio {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
  max-width: 360px;
}
.pp-hero-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.pp-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 900;
  border: 2px solid var(--color-border);
}
.pp-tag--primary {
  background: var(--color-primary);
  color: var(--color-primary-text);
}
.pp-tag--danger {
  background: var(--color-danger);
  color: var(--color-danger-text);
}
.pp-tag--warning {
  background: var(--color-warning);
  color: var(--color-text);
}
.pp-hero-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  padding-left: 20px;
  border-left: 3px solid var(--color-border);
  flex-shrink: 0;
}
.pp-score-label {
  font-size: 10px;
  color: var(--color-text-muted);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.pp-score-num {
  font-family: var(--font-pixel);
  font-size: 22px;
  color: var(--color-text);
  line-height: 1;
}

.pp-fold-enter-active,
.pp-fold-leave-active {
  transition: all 0.2s ease;
}
.pp-fold-enter-from,
.pp-fold-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.pp-edit-wrap {
  overflow: hidden;
}
.pp-edit-form {
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 3px solid var(--color-border);
  background: var(--color-surface-soft);
}
.pp-form-field {
  display: grid;
  gap: 6px;
}
.pp-form-field span {
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text-muted);
}
.pp-form-field textarea {
  padding: 10px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-readable);
  font-size: 14px;
  resize: vertical;
}
.pp-edit-actions {
  display: flex;
  gap: 10px;
}
</style>
