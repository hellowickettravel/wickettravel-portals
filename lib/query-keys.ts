/** Shared TanStack Query keys so components and mutations invalidate the same caches. */

export const MY_INBOX_KEY = ["employee", "inbox"] as const;
export const MY_ORDERS_KEY = ["employee", "orders"] as const;

/** Messages for one conversation. */
export const myMessagesKey = (conversationId: string) =>
  ["employee", "messages", conversationId] as const;

// Admin inbox (shared ConversationInbox, scope="admin")
export const ADMIN_INBOX_KEY = ["admin", "inbox"] as const;
export const adminMessagesKey = (conversationId: string) =>
  ["admin", "messages", conversationId] as const;

// Admin business settings
export const ADMIN_SETTINGS_KEY = ["admin", "business-settings"] as const;

// Support tickets
export const MY_SUPPORT_TICKETS_KEY = ["employee", "support-tickets"] as const;
export const ADMIN_SUPPORT_TICKETS_KEY = ["admin", "support-tickets"] as const;

// Notification preferences (employee + admin settings)
export const NOTIFICATION_PREFS_KEY = ["notification-prefs"] as const;

// Customer portal
export const CUSTOMER_ORDERS_KEY = ["customer", "orders"] as const;
export const CUSTOMER_THREAD_KEY = ["customer", "thread"] as const;

// Admin dev/mock tools
export const ADMIN_TOOLS_EMPLOYEES_KEY = ["admin", "tools", "employees"] as const;
export const ADMIN_TOOLS_CONVERSATIONS_KEY = [
  "admin",
  "tools",
  "conversations",
] as const;
