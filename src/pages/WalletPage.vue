<script setup lang="ts">
import WalletCheckin from '../components/wallet/WalletCheckin.vue';
import WalletHero from '../components/wallet/WalletHero.vue';
import WalletStats from '../components/wallet/WalletStats.vue';
import WalletTxList from '../components/wallet/WalletTxList.vue';
import { useAppContext } from '../appContext';

const { currentUser, walletData } = useAppContext();
</script>

<template>
  <section class="wallet-page">
    <WalletHero />
    <WalletStats v-if="currentUser && walletData" />
    <WalletTxList />
    <WalletCheckin />
  </section>
</template>

<style scoped>
.wallet-page {
  display: grid;
  gap: 20px;
  width: 100%;
  min-width: 0;
}
</style>
