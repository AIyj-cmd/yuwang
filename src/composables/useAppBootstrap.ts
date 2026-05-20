import { onMounted, watch, type ComputedRef } from 'vue';
import type { UseAppActionsReturn } from './useAppActions';
import type { AppState } from './useAppState';

type UseAppBootstrapOptions = {
  activeSection: ComputedRef<string>;
  actions: UseAppActionsReturn;
  state: AppState;
};

export const useAppBootstrap = ({ activeSection, actions, state }: UseAppBootstrapOptions) => {
  watch([state.activeBoard, state.filterKeyword], () => {
    void actions.loadLeaderboard();
  });

  watch(state.communityFilter, () => {
    void actions.loadCommunity();
  });

  watch(activeSection, (section) => {
    if (state.token.value) void actions.refreshNotificationUnreadCount();
    if (section === 'community') void actions.loadCommunity();
    if (section === 'guilds') void actions.loadGuilds();
    if (section === 'circles') void actions.loadCircles();
    if (section === 'groups') void actions.loadGroups();
    if (section === 'announcements') void actions.loadAnnouncements();
    if (section === 'checkin') void actions.loadCheckin();
    if (section === 'wallet') void actions.loadWallet();
  });

  onMounted(async () => {
    await actions.loadOptions();
    await Promise.all([
      actions.loadMe(),
      actions.loadLeaderboard(),
      actions.refreshStats(),
      actions.loadCommunity(),
      actions.loadPopularTopics(),
      actions.loadGuilds(),
      actions.loadCircles(),
      actions.loadAnnouncements()
    ]);
  });
};
