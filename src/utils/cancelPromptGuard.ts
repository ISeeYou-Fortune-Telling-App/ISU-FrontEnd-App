const LAST_SEEN: Record<string, number> = {};

/**
 * Simple, in-memory guard so the same cancel prompt is not shown multiple times
 * when multiple socket connections (e.g., list + detail screens) receive the
 * same event. Returns true when the caller should proceed to show a prompt.
 */
export const shouldShowCancelPrompt = (conversationId?: string | null): boolean => {
  const key = conversationId ? String(conversationId) : "__unknown__";
  const now = Date.now();
  const last = LAST_SEEN[key] ?? 0;

  // Ignore duplicates received within a short window (1.5s).
  if (now - last < 1500) {
    return false;
  }

  LAST_SEEN[key] = now;
  return true;
};
