<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import { PxButton, PxCard, PxInput } from '@mmt817/pixel-ui';
import { useAppContext } from '../../appContext';

const {
  checkin,
  checkinNote,
  copy,
  currentUser,
  handleCheckin,
  t
} = useAppContext();
</script>

<template>
  <PxCard class="wallet-checkin-card">
    <template #header>
      <div class="panel-title">
        <Check :size="18" />
        <span>{{ copy('每日打卡站', 'Daily Check-in') }}</span>
      </div>
    </template>

    <div v-if="!currentUser" class="wallet-empty-state compact">
      <strong>{{ t('needLogin') }}</strong>
      <span>{{ copy('登录后参与每日签到。', 'Sign in to check in daily.') }}</span>
    </div>

    <div v-else class="wallet-checkin-body">
      <div class="wallet-checkin-status">
        <strong :class="checkin?.checkedToday ? 'checked' : 'unchecked'">
          {{ checkin?.checkedToday ? copy('今天已经签到', 'Checked in today') : copy('今天还没签到', 'Not checked in today') }}
        </strong>
        <span>{{ copy('签到只记录连续天数，不要求你透露真实公司、部门、地理位置或任何身份信息。', 'Check-in only tracks streaks. It does not ask for real company, department, location, or identity information.') }}</span>
      </div>

      <div class="wallet-stats-grid checkin-stats">
        <div class="wallet-stat-card">
          <div class="stat-card-body center">
            <strong>{{ checkin?.streak ?? 0 }}</strong>
            <span>{{ copy('连续签到', 'Streak') }}</span>
          </div>
        </div>
        <div class="wallet-stat-card">
          <div class="stat-card-body center">
            <strong>{{ checkin?.total ?? 0 }}</strong>
            <span>{{ copy('累计签到', 'Total') }}</span>
          </div>
        </div>
        <div class="wallet-stat-card">
          <div class="stat-card-body center">
            <strong>{{ checkin?.today ?? '-' }}</strong>
            <span>{{ copy('今日日期', 'Today') }}</span>
          </div>
        </div>
      </div>

      <label class="checkin-field">
        <span>{{ copy('今日精神状态备注（可选）', 'Today\'s mood note (optional)') }}</span>
        <PxInput
          v-model="checkinNote"
          :placeholder="copy('例如：稳定发疯，但已匿名化', 'Example: stable chaos, anonymized')"
          clearable
        />
      </label>

      <PxButton
        type="primary"
        size="small"
        :disabled="checkin?.checkedToday"
        @click="handleCheckin"
      >
        <Check :size="14" />
        {{ checkin?.checkedToday ? copy('今日已签到', 'Checked In') : copy('立即签到', 'Check In Now') }}
      </PxButton>
    </div>
  </PxCard>
</template>

<style scoped>
.wallet-checkin-card {
  --px-card-header-padding: 12px 14px;
  --px-card-body-padding: 14px;
}
.wallet-checkin-body {
  display: grid;
  gap: 14px;
}
.wallet-checkin-status {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 2px solid var(--color-border-soft);
  background: var(--color-surface-soft);
}
.wallet-checkin-status strong {
  font-size: 14px;
  font-weight: 900;
}
.wallet-checkin-status strong.checked {
  color: var(--color-success-text);
}
.wallet-checkin-status strong.unchecked {
  color: var(--color-text);
}
.wallet-checkin-status span {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  line-height: 1.5;
}
.wallet-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.wallet-stat-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  border: var(--border-normal);
  background: var(--color-surface);
  box-shadow: var(--shadow-small);
}
.stat-card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.stat-card-body.center {
  align-items: center;
  text-align: center;
}
.stat-card-body strong {
  font-size: 20px;
  font-weight: 950;
  line-height: 1.1;
  color: var(--color-text);
}
.stat-card-body span {
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text-muted);
}
.checkin-field {
  display: grid;
  gap: 6px;
}
.checkin-field span {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-text-muted);
}
.wallet-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 36px 20px;
  text-align: center;
  color: var(--color-text-muted);
}
.wallet-empty-state strong {
  font-size: 15px;
  font-weight: 900;
  color: var(--color-text);
}
.wallet-empty-state span {
  font-size: 13px;
  font-weight: 700;
  max-width: 320px;
}
.wallet-empty-state.compact {
  padding: 24px 20px;
}

@media (max-width: 720px) {
  .wallet-stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
