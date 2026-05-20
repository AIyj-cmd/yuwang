import { computed, ref } from 'vue';
import type { SearchResponse } from '../types';
import { searchContent } from '../services/discoveryApi';

const emptyResults = (query = ''): SearchResponse => ({
  query,
  records: [],
  topics: [],
  users: [],
  guilds: [],
  circles: [],
  groups: []
});

export const useSearch = (getToken?: () => string | null | undefined) => {
  const searchQuery = ref('');
  const searchResults = ref<SearchResponse>(emptyResults());
  const searchLoading = ref(false);
  const searchError = ref('');
  const hasSearched = ref(false);
  const resultCount = computed(
    () =>
      searchResults.value.records.length +
      searchResults.value.topics.length +
      searchResults.value.users.length +
      searchResults.value.guilds.length +
      searchResults.value.circles.length +
      searchResults.value.groups.length
  );

  const runSearch = async (query = searchQuery.value) => {
    const trimmed = query.trim();
    searchQuery.value = query;
    hasSearched.value = true;
    searchError.value = '';
    if (!trimmed) {
      searchResults.value = emptyResults('');
      return;
    }
    searchLoading.value = true;
    try {
      searchResults.value = await searchContent(trimmed, getToken?.());
    } catch (error) {
      searchResults.value = emptyResults(trimmed);
      searchError.value = error instanceof Error ? error.message : '搜索失败。';
    } finally {
      searchLoading.value = false;
    }
  };

  const clearSearch = () => {
    searchQuery.value = '';
    searchResults.value = emptyResults('');
    hasSearched.value = false;
    searchError.value = '';
  };

  return {
    searchQuery,
    searchResults,
    searchLoading,
    searchError,
    hasSearched,
    resultCount,
    runSearch,
    clearSearch
  };
};
