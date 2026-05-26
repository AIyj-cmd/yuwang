<script setup lang="ts">
import { Coins, RefreshCw, Wallet } from 'lucide-vue-next';
import { PxButton, PxTag } from '@mmt817/pixel-ui';
import { useAppContext } from '../../appContext';

const { copy, currentUser, loadWallet, t, walletData } = useAppContext();
</script>

<template>
  <div class="wallet-hero">
    <div class="wallet-hero-card">
      <div class="wallet-hero-header">
        <div class="wallet-hero-title">
          <Wallet :size="22" />
          <span>{{ t('wallet') }}</span>
        </div>
        <div class="wallet-hero-actions">
          <PxTag v-if="walletData" type="info" effect="dark" class="level-tag">
            {{ walletData.wallet.level }}
          </PxTag>
          <PxButton
            v-if="currentUser"
            type="base"
            size="small"
            :title="copy('刷新钱包', 'Refresh Wallet')"
            @click="loadWallet"
          >
            <RefreshCw :size="14" />
            {{ copy('刷新', 'Refresh') }}
          </PxButton>
        </div>
      </div>

      <div v-if="!currentUser" class="wallet-empty-state">
        <Coins :size="48" />
        <strong>{{ t('needLogin') }}</strong>
        <span>{{ copy('登录后查看你的鱼鳞余额和交易记录。', 'Sign in to view your Fish Scale balance and transactions.') }}</span>
      </div>

      <div v-else-if="!walletData" class="wallet-loading-state">
        <span v-for="n in 4" :key="`wsk-${n}`" class="wallet-skeleton" />
      </div>

      <div v-else class="wallet-balance-body">
        <div class="wallet-balance-main">
          <div class="balance-icon-wrap">
            <Coins :size="32" />
          </div>
          <div class="balance-text">
            <span class="balance-number">{{ walletData.wallet.fishScaleBalance }}</span>
            <span class="balance-label">{{ copy('鱼鳞 Fish Scale', 'Fish Scale') }}</span>
          </div>
        </div>
        <p v-if="walletData.notice" class="wallet-notice">{{ walletData.notice }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wallet-hero-card {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: var(--border-strong);
  background: var(--color-surface);
  box-shadow: var(--shadow-pixel);
}
.wallet-hero-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.wallet-hero-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 950;
  letter-spacing: 0.02em;
}
.wallet-hero-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.level-tag {
  font-weight: 800;
}
.wallet-balance-body {
  display: grid;
  gap: 10px;
}
.wallet-balance-main {
  display: flex;
  align-items: center;
  gap: 14px;
}
.balance-icon-wrap {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border: var(--border-normal);
  background: var(--color-primary);
  color: var(--color-primary-text);
  box-shadow: var(--shadow-small);
  flex-shrink: 0;
}
.balance-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.balance-number {
  font-size: 36px;
  font-weight: 950;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--color-text);
}
.balance-label {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-text-muted);
}
.wallet-notice {
  margin: 0;
  padding: 8px 10px;
  border: 2px solid var(--color-border-soft);
  background: var(--color-surface-soft);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  line-height: 1.5;
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
.wallet-loading-state {
  display: grid;
  gap: 10px;
  padding: 8px 0;
}
.wallet-skeleton {
  display: block;
  height: 52px;
  border: 2px solid var(--color-border-soft);
  background: linear-gradient(90deg, var(--color-surface-soft) 25%, var(--color-disabled) 50%, var(--color-surface-soft) 75%);
  background-size: 200% 100%;
  animation: wallet-skeleton-shimmer 1.2s infinite;
}
@keyframes wallet-skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (max-width: 720px) {
  .balance-number {
    font-size: 28px;
  }
}
</style>
