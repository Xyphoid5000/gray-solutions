import { onMounted, onUnmounted, type Ref } from 'vue';

/**
 * WCAG 2.1 modal accessibility: traps Tab focus within the dialog,
 * closes on Escape, moves focus in on open and returns it on close.
 *
 * @param dialogRef - ref to the dialog element (role="dialog")
 * @param openRef - ref tracking whether the modal is open
 * @param onClose - called on Escape (and used for focus return)
 */
export function useModalA11y(
  dialogRef: Ref<HTMLElement | null>,
  openRef: Ref<boolean>,
  onClose: () => void,
) {
  let lastFocused: HTMLElement | null = null;

  const FOCUSABLE =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function getFocusable(): HTMLElement[] {
    const el = dialogRef.value;
    if (!el) return [];
    return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (n) => !n.hasAttribute('disabled') && n.offsetParent !== null,
    );
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!openRef.value) return;
    const el = dialogRef.value;
    if (!el) return;

    // Escape closes.
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    // Trap Tab within the dialog.
    if (e.key === 'Tab') {
      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Move focus into the dialog when it opens; return it on close.
  let stopWatch: (() => void) | null = null;

  onMounted(async () => {
    const { watch } = await import('vue');
    stopWatch = watch(
      openRef,
      (open) => {
        if (open) {
          lastFocused = document.activeElement as HTMLElement | null;
          // Wait for the dialog to render, then focus the first control.
          requestAnimationFrame(() => {
            const focusable = getFocusable();
            (focusable[0] ?? dialogRef.value)?.focus();
          });
        } else if (lastFocused) {
          lastFocused.focus();
          lastFocused = null;
        }
      },
      { immediate: true },
    );
    document.addEventListener('keydown', onKeyDown);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown);
    stopWatch?.();
  });
}
