import type { Router } from 'vue-router';
import { CREATIVITY_LEVELS, DISGUISES, DURATIONS, RISKS } from '../../shared/scoring';
import {
  fetchAdminQueue,
  commentRecord,
  createGroup,
  fetchCircle,
  fetchCircleFeed,
  fetchCircles,
  fetchCommunityFeed,
  fetchAnnouncements,
  fetchCheckin,
  fetchLeaderboard,
  fetchGroup,
  fetchGroupFeed,
  fetchGroups,
  fetchGuild,
  fetchGuilds,
  fetchMe,
  fetchOptions,
  fetchPopularTopics,
  fetchProfile,
  fetchSocial,
  fetchStats,
  fetchWallet,
  fetchWalletTransactions,
  joinCircle,
  joinGroupByCode,
  joinGuild,
  likeRecord,
  loginUser,
  nominateLegend,
  postComment,
  reportRecord,
  registerUser,
  reviewComment,
  reviewRecord,
  shareRecord,
  startGroupChallenge,
  submitCheckin,
  submitSuggestion,
  submitRecord,
  toggleInteraction,
  updateMe
} from '../api';
import { fetchNotificationUnreadCount } from '../services/notificationApi';
import type { FeedRecord } from '../types';
import type { UseLocaleReturn } from '../i18n/useLocale';
import type { AppState } from './useAppState';

type UseAppActionsOptions = {
  state: AppState;
  localeContext: UseLocaleReturn;
  router: Router;
  jumpToSection: (id: string) => void;
};

export const useAppActions = ({ state, localeContext, router, jumpToSection }: UseAppActionsOptions) => {
const { copy, locale, setLocale, t } = localeContext;
const {
  activeBoard,
  adminQueue,
  announcements,
  authForm,
  authMode,
  authPanelOpen,
  badges,
  canSubmit,
  canQuickSubmit,
  checkin,
  checkinNote,
  circleFeed,
  circlesData,
  commentText,
  communityFilter,
  communityLoading,
  communityRecords,
  currentUser,
  defaultOptions,
  errorMessage,
  feedCommentDrafts,
  feedbackForm,
  feedbackLoading,
  feedbackSubmitted,
  filterKeyword,
  form,
  groupFeed,
  groupForm,
  groupsData,
  guildsData,
  inviteCode,
  lastResult,
  leaderboardLoading,
  leaderboardRows,
  loading,
  notificationUnreadCount,
  options,
  popularTopics,
  profile,
  profileForm,
  selectedCircle,
  selectedGroup,
  selectedGuild,
  selectedRecord,
  selectedRecordId,
  setError,
  setStatus,
  shareCard,
  social,
  stats,
  token,
  topicDraft,
  topicError,
  walletData,
  walletTransactions
} = state;

const loadOptions = async () => {
  try {
    options.value = await fetchOptions();
  } catch {
    options.value = defaultOptions;
  }
};

const loadLeaderboard = async () => {
  leaderboardLoading.value = true;
  try {
    const response = await fetchLeaderboard(activeBoard.value, filterKeyword.value);
    leaderboardRows.value = response.rows;
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('排行榜加载失败', 'Failed to load leaderboards'));
  } finally {
    leaderboardLoading.value = false;
  }
};

const clearLeaderboardFilter = () => {
  filterKeyword.value = '';
  void loadLeaderboard();
};

const upsertFeedRecord = (record: FeedRecord) => {
  const replace = (rows: FeedRecord[]) => rows.map((item) => (item.id === record.id ? record : item));
  communityRecords.value = replace(communityRecords.value);
  circleFeed.value = replace(circleFeed.value);
  groupFeed.value = replace(groupFeed.value);
};

const loadCommunity = async () => {
  communityLoading.value = true;
  try {
    const response = await fetchCommunityFeed(communityFilter.value, token.value);
    communityRecords.value = response.records;
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('社区广场加载失败', 'Failed to load community feed'));
  } finally {
    communityLoading.value = false;
  }
};

const loadPopularTopics = async () => {
  try {
    popularTopics.value = (await fetchPopularTopics()).topics;
  } catch {
    popularTopics.value = [];
  }
};


const openTopic = async (slug: string) => {
  await router.push(`/topics/${slug}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const loadGuilds = async () => {
  try {
    guildsData.value = await fetchGuilds(token.value);
    if (guildsData.value.myGuild) {
      selectedGuild.value = await fetchGuild(guildsData.value.myGuild.id, token.value);
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('工会大厅加载失败', 'Failed to load guild hall'));
  }
};

const handleJoinGuild = async (guildId: number) => {
  if (!token.value) return setError(t('needLogin'));
  try {
    await joinGuild(guildId, token.value);
    await Promise.all([loadMe(), loadGuilds()]);
    setStatus(copy('已切换工会，为新的组织贡献摸鱼能量。', 'Guild switched. Future records will contribute to the new guild.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('加入工会失败', 'Failed to join guild'));
  }
};

const loadCircles = async () => {
  try {
    circlesData.value = await fetchCircles(token.value);
    const first = selectedCircle.value?.circle ?? circlesData.value.joined[0] ?? circlesData.value.hot[0] ?? circlesData.value.circles[0];
    if (first) await selectCircle(first.id);
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('圈子广场加载失败', 'Failed to load circles'));
  }
};

const selectCircle = async (circleId: number) => {
  try {
    const [detail, feed] = await Promise.all([fetchCircle(circleId, token.value), fetchCircleFeed(circleId, token.value)]);
    selectedCircle.value = detail;
    circleFeed.value = feed.records;
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('圈子详情加载失败', 'Failed to load circle details'));
  }
};

const handleJoinCircle = async (circleId: number) => {
  if (!token.value) return setError(t('needLogin'));
  try {
    await joinCircle(circleId, token.value);
    await loadCircles();
    setStatus(copy('已加入圈子，这条鱼找到了同温层。', 'Joined the circle.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('加入圈子失败', 'Failed to join circle'));
  }
};

const loadGroups = async () => {
  if (!token.value) {
    groupsData.value = null;
    selectedGroup.value = null;
    groupFeed.value = [];
    form.groupIds = [];
    return;
  }
  try {
    groupsData.value = await fetchGroups(token.value);
    const allowedIds = new Set(groupsData.value.groups.map((group) => group.id));
    form.groupIds = form.groupIds.filter((id) => allowedIds.has(id));
    const first = selectedGroup.value?.group ?? groupsData.value.groups[0];
    if (first) await selectGroup(first.id);
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('我的小组加载失败', 'Failed to load groups'));
  }
};

const selectGroup = async (groupId: number) => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const [detail, feed] = await Promise.all([fetchGroup(groupId, token.value), fetchGroupFeed(groupId, token.value)]);
    selectedGroup.value = detail;
    groupFeed.value = feed.records;
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('小组详情加载失败', 'Failed to load group details'));
  }
};

const handleCreateGroup = async () => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const response = await createGroup({ ...groupForm }, token.value);
    groupForm.name = '';
    groupForm.description = '';
    groupForm.visibility = 'public';
    await loadGroups();
    await selectGroup(response.group.id);
    await loadWallet();
    setStatus(copy('小组已创建，已消耗 50 鱼鳞。请不要把真实公司名写进地下茶水间。', 'Group created. 50 Fish Scale spent. Do not use real company names.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('创建小组失败', 'Failed to create group'));
  }
};

const handleGroupChallenge = async (challengeName: string) => {
  if (!token.value) return setError(t('needLogin'));
  if (!selectedGroup.value) return setError(copy('请先选择一个小组。', 'Select a group first.'));
  try {
    const response = await startGroupChallenge(selectedGroup.value.group.id, challengeName, token.value);
    await loadWallet();
    setStatus(response.message || copy('小组挑战已发起，消耗 30 鱼鳞。', 'Group challenge started. 30 Fish Scale spent.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('发起小组挑战失败', 'Failed to start group challenge'));
  }
};

const handleJoinGroup = async () => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const response = await joinGroupByCode(inviteCode.value, token.value);
    inviteCode.value = '';
    await loadGroups();
    await selectGroup(response.group.id);
    setStatus(copy('已通过邀请码加入小组。', 'Joined the group by invite code.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('加入小组失败', 'Failed to join group'));
  }
};

const handleFeedLike = async (recordId: number) => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const response = await likeRecord(recordId, token.value);
    upsertFeedRecord(response.record);
    await Promise.all([loadLeaderboard(), loadGuilds().catch(() => undefined), loadWallet().catch(() => undefined)]);
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('点赞失败', 'Failed to like record'));
  }
};

const handleFeedNominate = async (recordId: number) => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const response = await nominateLegend(recordId, token.value);
    upsertFeedRecord(response.record);
    await Promise.all([loadLeaderboard(), loadGuilds().catch(() => undefined), loadCircles().catch(() => undefined), loadWallet().catch(() => undefined)]);
    setStatus(copy('传奇提名已更新，若为新提名将消耗 10 鱼鳞。', 'Legend nomination updated. New nominations cost 10 Fish Scale.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('传奇提名失败', 'Failed to nominate legend'));
  }
};

const handleFeedComment = async (recordId: number) => {
  if (!token.value) return setError(t('needLogin'));
  const content = (feedCommentDrafts[recordId] ?? '').trim();
  if (content.length < 2 || content.length > 120) {
    return setError(copy('评论需要 2-120 字，并且不要写真实公司、客户或聊天记录。', 'Comments must be 2-120 characters and contain no real company, client, or chat-record information.'));
  }
  try {
    const response = await commentRecord(recordId, content, token.value);
    feedCommentDrafts[recordId] = '';
    upsertFeedRecord(response.record);
    await loadSocial(recordId);
    await loadWallet();
    setStatus(copy('评论已发布。', 'Comment posted.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('评论失败', 'Failed to post comment'));
  }
};

const handleFeedReport = async (recordId: number) => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const response = await reportRecord(recordId, copy('疑似包含未匿名化信息', 'Possibly contains non-anonymized information'), token.value);
    upsertFeedRecord(response.record);
    setStatus(copy('已提交举报，管理员会在审核队列里处理。', 'Report submitted for review.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('举报失败', 'Failed to report record'));
  }
};

const refreshStats = async () => {
  try {
    stats.value = await fetchStats();
  } catch {
    stats.value = null;
  }
};

const loadAnnouncements = async () => {
  try {
    const response = await fetchAnnouncements();
    announcements.value = response.announcements;
  } catch {
    announcements.value = [];
  }
};

const loadCheckin = async () => {
  if (!token.value) {
    checkin.value = null;
    return;
  }
  try {
    checkin.value = await fetchCheckin(token.value);
  } catch {
    checkin.value = null;
  }
};

const loadWallet = async () => {
  if (!token.value) {
    walletData.value = null;
    walletTransactions.value = null;
    return;
  }
  try {
    walletData.value = await fetchWallet(token.value);
    walletTransactions.value = await fetchWalletTransactions(token.value);
  } catch {
    walletData.value = null;
    walletTransactions.value = null;
  }
};

const refreshNotificationUnreadCount = async () => {
  if (!token.value) {
    notificationUnreadCount.value = 0;
    return;
  }
  try {
    notificationUnreadCount.value = (await fetchNotificationUnreadCount(token.value)).count;
  } catch {
    notificationUnreadCount.value = 0;
  }
};

const handleCheckin = async () => {
  if (!token.value) return setError(t('needLogin'));
  try {
    checkin.value = await submitCheckin(checkinNote.value, token.value);
    checkinNote.value = '';
    setStatus(
      checkin.value.alreadyChecked
        ? copy('今天已经签到过了。', 'You have already checked in today.')
        : copy('签到成功，今天也把精神状态存档了。', 'Check-in complete. Today’s office mood is archived.')
    );
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('签到失败', 'Check-in failed'));
  }
};

const handleFeedbackSubmit = async () => {
  if (feedbackForm.content.trim().length < 5) {
    return setError(copy('建议至少需要 5 个字，尽量具体但不要写真实公司或客户信息。', 'Feedback needs at least 5 characters. Be specific, but do not include real company or client information.'));
  }
  feedbackLoading.value = true;
  try {
    const response = await submitSuggestion(
      {
        ...feedbackForm,
        nickname: currentUser.value?.displayName ?? form.nickname
      },
      token.value
    );
    feedbackForm.category = 'feature';
    feedbackForm.content = '';
    feedbackForm.contact = '';
    feedbackSubmitted.value = true;
    setStatus(response.status === 'pending' ? copy('建议已提交，因包含敏感提示会先进入审核。', 'Feedback submitted and queued for review.') : copy('建议已提交。', 'Feedback submitted.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('提交建议失败', 'Failed to submit feedback'));
  } finally {
    feedbackLoading.value = false;
  }
};

const loadMe = async () => {
  if (!token.value) return;
  try {
    const response = await fetchMe(token.value);
    currentUser.value = response.user;
    badges.value = response.badges;
    if (response.user) {
      profileForm.displayName = response.user.displayName;
      profileForm.bio = response.user.bio;
      form.nickname = response.user.displayName;
      setLocale(response.user.locale === 'en-US' ? 'en-US' : 'zh-CN');
      await loadProfile(response.user.username);
      await loadGroups();
      await loadCheckin();
      await loadWallet();
      await refreshNotificationUnreadCount();
      if (response.user.isAdmin) await loadAdminQueue();
    }
  } catch {
    localStorage.removeItem('gongwei-yuwang-token');
    token.value = null;
    currentUser.value = null;
    notificationUnreadCount.value = 0;
  }
};

const loadProfile = async (username = currentUser.value?.username) => {
  if (!username) return;
  try {
    profile.value = await fetchProfile(username);
  } catch {
    profile.value = null;
  }
};

const handleAuth = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const payload = {
      username: authForm.username,
      password: authForm.password,
      displayName: authForm.displayName || authForm.username,
      locale: locale.value
    };
    const response = authMode.value === 'register' ? await registerUser(payload) : await loginUser(payload);
    token.value = response.token;
    currentUser.value = response.user;
    localStorage.setItem('gongwei-yuwang-token', response.token);
    form.nickname = response.user.displayName;
    profileForm.displayName = response.user.displayName;
    profileForm.bio = response.user.bio;
    authForm.password = '';
    await loadMe();
    setStatus(copy(`${response.user.displayName} 已登录`, `${response.user.displayName} signed in`));
    return { success: true, message: '' };
  } catch (error) {
    // 不写入全局 errorMessage，避免登录/注册失败信息泄漏到其他页面；
    // 由调用方（顶部账户面板）以本地状态在表单内展示这次操作的错误。
    return {
      success: false,
      message: error instanceof Error ? error.message : copy('账号操作失败', 'Account action failed')
    };
  }
};

const openAuthPanel = (mode: 'login' | 'register' = 'login') => {
  authMode.value = mode;
  // 置为 true 作为一次性打开信号；顶部账户面板监听后会复位为 false，
  // 使后续再次调用仍能触发 false→true 的变化。
  authPanelOpen.value = true;
};

const logout = () => {
  localStorage.removeItem('gongwei-yuwang-token');
  token.value = null;
  currentUser.value = null;
  profile.value = null;
  walletData.value = null;
  walletTransactions.value = null;
  notificationUnreadCount.value = 0;
  badges.value = [];
  adminQueue.value = null;
  groupsData.value = null;
  selectedGroup.value = null;
  groupFeed.value = [];
  checkin.value = null;
  checkinNote.value = '';
  form.groupIds = [];
  setStatus(copy('已退出登录', 'Signed out'));
};

const saveProfile = async () => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const response = await updateMe({ displayName: profileForm.displayName, bio: profileForm.bio, locale: locale.value }, token.value);
    currentUser.value = response.user;
    badges.value = response.badges;
    if (response.user) {
      form.nickname = response.user.displayName;
      await loadProfile(response.user.username);
    }
    setStatus(copy('个人资料已保存', 'Profile saved'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('保存失败', 'Save failed'));
  }
};

const changeLocale = async () => {
  setLocale(locale.value);
  if (!currentUser.value && (form.nickname === '匿名鱼' || form.nickname === 'Anonymous Fish')) {
    form.nickname = locale.value === 'en-US' ? 'Anonymous Fish' : '匿名鱼';
  }
  if (token.value && currentUser.value) {
    await updateMe({ locale: locale.value }, token.value).catch(() => undefined);
  }
};

const loadSocial = async (recordId: number) => {
  selectedRecordId.value = recordId;
  try {
    social.value = await fetchSocial(recordId, token.value);
    shareCard.value = social.value.shareCard;
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('互动信息加载失败', 'Failed to load interactions'));
  }
};

const openProfileRecord = async (recordId: number) => {
  await loadSocial(recordId);
  jumpToSection('social');
};

const handleSubmit = async (opts?: { quick?: boolean }) => {
  const isQuick = opts?.quick ?? false;
  if (isQuick ? !canQuickSubmit.value : !canSubmit.value) return;
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await submitRecord(
      {
        nickname: form.nickname,
        activity_text: form.activityText,
        duration: form.duration,
        story_text: isQuick ? form.activityText : form.description,
        topics: form.topics,
        anonymized: form.anonymized,
        anonymous_confirm: form.anonymized,
        publish_scope: form.privateOnly ? 'private' : form.publishToCommunity ? 'community' : 'groups',
        publishToCommunity: form.publishToCommunity,
        privateOnly: form.privateOnly,
        groupIds: form.privateOnly ? [] : form.groupIds
      },
      token.value
    );

    lastResult.value = response;
    form.activityText = '';
    form.description = '';
    form.topics = [];
    topicDraft.value = '';
    topicError.value = '';
    form.creativity = CREATIVITY_LEVELS[0].key;
    leaderboardRows.value = response.leaderboards[activeBoard.value] ?? response.leaderboards.today;
    await Promise.all([refreshStats(), response.record.status === 'approved' ? loadSocial(response.record.id) : Promise.resolve()]);
    await Promise.all([
      loadCommunity().catch(() => undefined),
      loadPopularTopics().catch(() => undefined),
      loadGuilds().catch(() => undefined),
      loadCircles().catch(() => undefined),
      loadGroups().catch(() => undefined)
    ]);
    if (currentUser.value) {
      await Promise.all([loadMe(), loadWallet(), currentUser.value.isAdmin ? loadAdminQueue() : Promise.resolve()]);
    }
    setStatus(
      response.fishScaleReward?.awardedAmount
        ? response.fishScaleReward.message
        : response.record.status === 'pending'
          ? copy('记录已提交，等待审核。', 'Record submitted for review.')
          : copy('记录已上榜。', 'Record submitted and ranked.')
    );
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('提交失败', 'Submit failed'));
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  form.activityText = '';
  form.duration = DURATIONS[1].key;
  form.risk = RISKS[1].key;
  form.disguise = DISGUISES[0].key;
  form.creativity = CREATIVITY_LEVELS[0].key;
  form.description = '';
  form.topics = [];
  topicDraft.value = '';
  topicError.value = '';
  form.anonymized = false;
  form.publishToCommunity = true;
  form.privateOnly = false;
  form.groupIds = [];
  errorMessage.value = '';
};

const startNewRecord = () => {
  resetForm();
  jumpToSection('submit');
};

const handlePrivateOnlyChange = () => {
  if (form.privateOnly) {
    form.publishToCommunity = false;
    form.groupIds = [];
  }
};

const handleCommunityScopeChange = () => {
  if (form.publishToCommunity) {
    form.privateOnly = false;
  }
};

const handleInteraction = async (action: 'like' | 'favorite' | 'vote') => {
  if (!token.value) return setError(t('needLogin'));
  const record = selectedRecord.value;
  if (!record) return setError(t('noRecord'));
  const current = action === 'like' ? social.value?.viewer.liked : action === 'favorite' ? social.value?.viewer.favorited : social.value?.viewer.voted;
  try {
    social.value = await toggleInteraction(record.id, { action, active: !current }, token.value);
    shareCard.value = social.value.shareCard;
    await Promise.all([loadLeaderboard(), loadMe(), loadWallet()]);
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('互动失败', 'Interaction failed'));
  }
};

const handleComment = async () => {
  if (!token.value) return setError(t('needLogin'));
  const record = selectedRecord.value;
  if (!record) return setError(t('noRecord'));
  try {
    social.value = await postComment(record.id, commentText.value, token.value);
    commentText.value = '';
    await Promise.all([loadLeaderboard(), loadMe(), loadWallet()]);
    setStatus(copy('评论已发布', 'Comment posted'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('评论失败', 'Failed to post comment'));
  }
};

const handleShare = async () => {
  const record = selectedRecord.value;
  if (!record) return setError(t('noRecord'));
  try {
    shareCard.value = await shareRecord(record.id);
    await loadSocial(record.id);
    setStatus(copy('分享卡已生成', 'Share card generated'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('分享失败', 'Share failed'));
  }
};

const loadAdminQueue = async () => {
  if (!token.value || !currentUser.value?.isAdmin) return;
  try {
    adminQueue.value = await fetchAdminQueue(token.value);
  } catch {
    adminQueue.value = null;
  }
};

const handleReviewRecord = async (recordId: number, status: 'approved' | 'rejected') => {
  if (!token.value) return;
  await reviewRecord(recordId, status, status === 'approved' ? copy('页面审核通过', 'Approved from page') : copy('页面审核拒绝', 'Rejected from page'), token.value);
  await Promise.all([loadAdminQueue(), loadLeaderboard(), refreshStats()]);
};

const handleReviewComment = async (commentId: number, status: 'approved' | 'rejected') => {
  if (!token.value) return;
  await reviewComment(commentId, status, status === 'approved' ? copy('页面审核通过', 'Approved from page') : copy('页面审核拒绝', 'Rejected from page'), token.value);
  await Promise.all([loadAdminQueue(), selectedRecordId.value ? loadSocial(selectedRecordId.value) : Promise.resolve()]);
};

return {
  loadOptions,
  loadLeaderboard,
  clearLeaderboardFilter,
  loadCommunity,
  loadPopularTopics,
  openTopic,
  loadGuilds,
  handleJoinGuild,
  loadCircles,
  selectCircle,
  handleJoinCircle,
  loadGroups,
  selectGroup,
  handleCreateGroup,
  handleGroupChallenge,
  handleJoinGroup,
  handleFeedLike,
  handleFeedNominate,
  handleFeedComment,
  handleFeedReport,
  refreshStats,
  loadAnnouncements,
  loadCheckin,
  loadWallet,
  refreshNotificationUnreadCount,
  handleCheckin,
  handleFeedbackSubmit,
  loadMe,
  loadProfile,
  handleAuth,
  openAuthPanel,
  logout,
  saveProfile,
  changeLocale,
  loadSocial,
  openProfileRecord,
  handleSubmit,
  resetForm,
  startNewRecord,
  handlePrivateOnlyChange,
  handleCommunityScopeChange,
  handleInteraction,
  handleComment,
  handleShare,
  loadAdminQueue,
  handleReviewRecord,
  handleReviewComment
};
};

export type UseAppActionsReturn = ReturnType<typeof useAppActions>;
