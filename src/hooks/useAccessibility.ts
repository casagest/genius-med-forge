import { useEffect, useCallback, useRef } from "react";

interface FocusTrapOptions {
  enabled?: boolean;
  initialFocus?: string;
  returnFocus?: boolean;
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  options: FocusTrapOptions = {}
) {
  const { enabled = true, initialFocus, returnFocus = true } = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
      "[contenteditable]",
    ].join(", ");

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }, [containerRef]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    },
    [enabled, getFocusableElements]
  );

  useEffect(() => {
    if (!enabled) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    if (initialFocus && containerRef.current) {
      const initialElement = containerRef.current.querySelector<HTMLElement>(initialFocus);
      if (initialElement) {
        initialElement.focus();
      }
    } else {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0]?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (returnFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [enabled, initialFocus, returnFocus, handleKeyDown, getFocusableElements, containerRef]);
}

export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!announceRef.current) {
      const element = document.createElement("div");
      element.setAttribute("role", "status");
      element.setAttribute("aria-live", "polite");
      element.setAttribute("aria-atomic", "true");
      element.className = "sr-only";
      document.body.appendChild(element);
      announceRef.current = element;
    }

    return () => {
      if (announceRef.current) {
        document.body.removeChild(announceRef.current);
        announceRef.current = null;
      }
    };
  }, []);

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (announceRef.current) {
        announceRef.current.setAttribute("aria-live", priority);
        announceRef.current.textContent = "";
        // Small delay to ensure screen readers pick up the change
        setTimeout(() => {
          if (announceRef.current) {
            announceRef.current.textContent = message;
          }
        }, 100);
      }
    },
    []
  );

  return announce;
}

export function useReducedMotion() {
  const mediaQuery =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;

  const getInitialState = () => mediaQuery?.matches ?? false;

  const subscribe = useCallback(
    (callback: () => void) => {
      mediaQuery?.addEventListener("change", callback);
      return () => mediaQuery?.removeEventListener("change", callback);
    },
    [mediaQuery]
  );

  return { prefersReducedMotion: getInitialState(), subscribe };
}

export function useKeyboardNavigation(
  items: HTMLElement[],
  options: {
    orientation?: "horizontal" | "vertical" | "both";
    loop?: boolean;
    onSelect?: (index: number) => void;
  } = {}
) {
  const { orientation = "vertical", loop = true, onSelect } = options;
  const currentIndexRef = useRef(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      let newIndex = currentIndexRef.current;
      let handled = false;

      if (orientation === "vertical" || orientation === "both") {
        if (event.key === "ArrowDown") {
          newIndex = currentIndexRef.current + 1;
          handled = true;
        } else if (event.key === "ArrowUp") {
          newIndex = currentIndexRef.current - 1;
          handled = true;
        }
      }

      if (orientation === "horizontal" || orientation === "both") {
        if (event.key === "ArrowRight") {
          newIndex = currentIndexRef.current + 1;
          handled = true;
        } else if (event.key === "ArrowLeft") {
          newIndex = currentIndexRef.current - 1;
          handled = true;
        }
      }

      if (event.key === "Home") {
        newIndex = 0;
        handled = true;
      } else if (event.key === "End") {
        newIndex = items.length - 1;
        handled = true;
      } else if (event.key === "Enter" || event.key === " ") {
        onSelect?.(currentIndexRef.current);
        handled = true;
      }

      if (handled) {
        event.preventDefault();

        if (loop) {
          newIndex = ((newIndex % items.length) + items.length) % items.length;
        } else {
          newIndex = Math.max(0, Math.min(items.length - 1, newIndex));
        }

        currentIndexRef.current = newIndex;
        items[newIndex]?.focus();
      }
    },
    [items, orientation, loop, onSelect]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    currentIndex: currentIndexRef.current,
    setCurrentIndex: (index: number) => {
      currentIndexRef.current = index;
    },
  };
}

// Skip link component for keyboard navigation
export function SkipLink({ href = "#main-content", children = "Skip to main content" }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {children}
    </a>
  );
}
