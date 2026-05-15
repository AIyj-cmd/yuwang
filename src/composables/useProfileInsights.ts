import { ref } from 'vue';
import type { ProfileInsights } from '../types';
import { fetchProfileInsights } from '../services/profileInsightsApi';

export const useProfileInsights = () => {
  const profileInsights = ref<ProfileInsights | null>(null);
  const profileInsightsLoading = ref(false);
  const profileInsightsError = ref('');

  const loadProfileInsights = async (username?: string) => {
    if (!username) {
      profileInsights.value = null;
      return;
    }
    profileInsightsLoading.value = true;
    profileInsightsError.value = '';
    try {
      profileInsights.value = (await fetchProfileInsights(username)).insights;
    } catch (error) {
      profileInsights.value = null;
      profileInsightsError.value = error instanceof Error ? error.message : '画像加载失败。';
    } finally {
      profileInsightsLoading.value = false;
    }
  };

  return {
    profileInsights,
    profileInsightsLoading,
    profileInsightsError,
    loadProfileInsights
  };
};
