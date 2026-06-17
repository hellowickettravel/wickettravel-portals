/** Shared TanStack Query keys so components and mutations invalidate the same caches. */

export const MY_INBOX_KEY = ["employee", "inbox"] as const;
export const MY_ORDERS_KEY = ["employee", "orders"] as const;

/** Messages for one conversation. */
export const myMessagesKey = (conversationId: string) =>
  ["employee", "messages", conversationId] as const;

// Admin dev/mock tools
export const ADMIN_TOOLS_EMPLOYEES_KEY = ["admin", "tools", "employees"] as const;
export const ADMIN_TOOLS_CONVERSATIONS_KEY = [
  "admin",
  "tools",
  "conversations",
] as const;
