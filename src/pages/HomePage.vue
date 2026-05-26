<script setup lang="ts">
import { ref } from 'vue';
import { useAppContext } from '../appContext';
import BoothForm from '../components/home/BoothForm.vue';
import HomeHero from '../components/home/HomeHero.vue';
import ResultModal from '../components/home/ResultModal.vue';

const { canSubmit, handleSubmit, lastResult, resetForm } = useAppContext();

const showResultModal = ref(false);

const submitAndReveal = async () => {
  if (!canSubmit.value) return;
  const previous = lastResult.value;
  await handleSubmit();
  if (lastResult.value && lastResult.value !== previous) {
    showResultModal.value = true;
  }
};

const closeModal = () => {
  showResultModal.value = false;
};

const focusBooth = () => {
  const el = document.getElementById('booth');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const resetAndScroll = () => {
  resetForm();
  closeModal();
  focusBooth();
};
</script>

<template>
  <HomeHero @focus-booth="focusBooth" />
  <BoothForm @submit="submitAndReveal" />
  <ResultModal :open="showResultModal" @close="closeModal" @reset="resetAndScroll" />
</template>
