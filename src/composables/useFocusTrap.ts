import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

export const useFocusTrap = (containerRef: Ref<HTMLElement | null>, active: Ref<boolean>) => {
  const previousFocus = ref<Element | null>(null);

  const getFocusableElements = (): HTMLElement[] => {
    if (!containerRef.value) return [];
    return Array.from(
      containerRef.value.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled')) as HTMLElement[];
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!active.value || event.key !== 'Tab') return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  watch(active, (isActive) => {
    if (isActive) {
      previousFocus.value = document.activeElement;
      requestAnimationFrame(() => {
        const focusable = getFocusableElements();
        if (focusable.length) {
          focusable[0].focus();
        }
      });
    } else {
      if (previousFocus.value instanceof HTMLElement) {
        previousFocus.value.focus();
      }
    }
  }, { immediate: true });

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
};
