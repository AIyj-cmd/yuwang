<script setup lang="ts">
import { ref, watch } from 'vue';
import { Camera, Trash2, Upload, X } from 'lucide-vue-next';
import { PxButton } from '@mmt817/pixel-ui';
import { deleteAvatar, fetchAvatarPolicy, uploadAvatar } from '../api';
import { useAppContext } from '../appContext';
import UserAvatar from './UserAvatar.vue';

const { authToken, copy, currentUser, loadMe, t } = useAppContext();

const fileInputRef = ref<HTMLInputElement | null>(null);
const policy = ref<{
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxUploadsPerDay: number;
} | null>(null);
const policyLoading = ref(false);
const uploading = ref(false);
const deleting = ref(false);
const error = ref('');
const status = ref('');
const showPanel = ref(false);

const allowedExtensions = '.jpg,.jpeg,.png,.webp';

const loadPolicy = async () => {
  if (!authToken.value) return;
  policyLoading.value = true;
  try {
    policy.value = await fetchAvatarPolicy(authToken.value);
  } catch {
    // ignore
  } finally {
    policyLoading.value = false;
  }
};

watch(showPanel, (open) => {
  if (open) void loadPolicy();
});

const openFilePicker = () => {
  fileInputRef.value?.click();
};

const validateFile = (file: File): string => {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  if (!allowedExts.includes(ext)) {
    return copy('仅支持 jpg/jpeg/png/webp 格式。', 'Only jpg/jpeg/png/webp formats are supported.');
  }
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return copy('文件类型不支持。', 'Unsupported file type.');
  }
  const maxSize = policy.value?.maxSizeBytes ?? 1048576;
  if (file.size > maxSize) {
    return copy(
      `文件过大，最大允许 ${(maxSize / 1024 / 1024).toFixed(1)} MB。`,
      `File too large. Max ${(maxSize / 1024 / 1024).toFixed(1)} MB.`
    );
  }
  return '';
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  if (!authToken.value) {
    error.value = copy('需要登录后操作。', 'Please sign in first.');
    return;
  }

  error.value = '';
  status.value = '';

  const invalid = validateFile(file);
  if (invalid) {
    error.value = invalid;
    target.value = '';
    return;
  }

  uploading.value = true;
  try {
    await uploadAvatar(file, authToken.value);
    status.value = copy('头像上传成功。', 'Avatar uploaded successfully.');
    await loadMe();
    target.value = '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : copy('上传失败，请重试。', 'Upload failed. Please try again.');
    target.value = '';
  } finally {
    uploading.value = false;
  }
};

const handleDelete = async () => {
  if (!authToken.value) {
    error.value = copy('需要登录后操作。', 'Please sign in first.');
    return;
  }
  const confirmed = window.confirm(copy('确定要删除当前头像并恢复默认头像吗？', 'Are you sure you want to delete your avatar and revert to the default?'));
  if (!confirmed) return;

  error.value = '';
  status.value = '';
  deleting.value = true;
  try {
    await deleteAvatar(authToken.value);
    status.value = copy('头像已删除。', 'Avatar deleted.');
    await loadMe();
  } catch (err) {
    error.value = err instanceof Error ? err.message : copy('删除失败，请重试。', 'Delete failed. Please try again.');
  } finally {
    deleting.value = false;
  }
};
</script>

<template>
  <div class="avatar-manager">
    <button type="button" class="avatar-manager-trigger" @click="showPanel = !showPanel">
      <Camera :size="14" />
      <span>{{ copy('头像管理', 'Avatar') }}</span>
    </button>

    <transition name="am-fade">
      <div v-if="showPanel" class="avatar-manager-panel">
        <div class="am-preview">
          <UserAvatar
            :avatar-url="currentUser?.avatarUrl"
            :avatar-seed="currentUser?.avatarSeed"
            :display-name="currentUser?.displayName"
            :size="80"
          />
          <div class="am-meta">
            <strong>{{ currentUser?.displayName ?? '-' }}</strong>
            <small>@{{ currentUser?.username ?? '-' }}</small>
          </div>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="am-file-input"
          @change="handleFileChange"
        />

        <div class="am-actions">
          <PxButton
            type="primary"
            size="small"
            :loading="uploading"
            :disabled="uploading || deleting"
            @click="openFilePicker"
          >
            <Upload :size="14" />
            {{ currentUser?.avatarUrl ? copy('更换头像', 'Change') : copy('上传头像', 'Upload') }}
          </PxButton>

          <PxButton
            v-if="currentUser?.avatarUrl"
            type="danger"
            size="small"
            :loading="deleting"
            :disabled="uploading || deleting"
            @click="handleDelete"
          >
            <Trash2 :size="14" />
            {{ copy('删除头像', 'Delete') }}
          </PxButton>
        </div>

        <p v-if="policy" class="am-policy">
          {{ copy(`支持 ${policy.allowedExtensions.join('/')}，最大 ${(policy.maxSizeBytes / 1024 / 1024).toFixed(1)} MB`, `Supported: ${policy.allowedExtensions.join('/')}, max ${(policy.maxSizeBytes / 1024 / 1024).toFixed(1)} MB`) }}
        </p>

        <p v-if="error" class="am-error">
          <X :size="14" /> {{ error }}
        </p>
        <p v-if="status" class="am-status">
          <Upload :size="14" /> {{ status }}
        </p>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.avatar-manager {
  display: grid;
  gap: 10px;
}
.avatar-manager-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.avatar-manager-trigger:hover {
  background: var(--color-border);
  color: var(--color-surface);
}
.am-fade-enter-active,
.am-fade-leave-active {
  transition: all 0.2s ease;
}
.am-fade-enter-from,
.am-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.avatar-manager-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 3px solid var(--color-border);
  background: var(--color-surface-soft);
}
.am-preview {
  display: flex;
  align-items: center;
  gap: 14px;
}
.am-meta {
  display: grid;
  gap: 2px;
}
.am-meta strong {
  font-size: 14px;
  font-weight: 900;
  color: var(--color-text);
}
.am-meta small {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 700;
}
.am-file-input {
  display: none;
}
.am-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.am-policy {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 700;
  line-height: 1.4;
}
.am-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 8px 10px;
  border: 2px solid var(--color-danger);
  background: var(--color-danger);
  color: var(--color-danger-text);
  font-size: 12px;
  font-weight: 800;
}
.am-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 8px 10px;
  border: 2px solid var(--color-success);
  background: var(--color-success);
  color: var(--color-success-text);
  font-size: 12px;
  font-weight: 800;
}
</style>
