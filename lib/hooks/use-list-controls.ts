"use client";

import { useState } from "react";

/**
 * Shared client-side search + "load more" pagination for admin tables. Keeps the
 * tables fast and tidy as data grows without needing server pagination yet.
 */
export function useListControls<T>(
  items: T[],
  pageSize: number,
  filterFn: (item: T, query: string) => boolean
) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(pageSize);

  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((item) => filterFn(item, q)) : items;
  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;

  function setQueryReset(value: string) {
    setQuery(value);
    setLimit(pageSize); // reset paging when the search changes
  }

  return {
    query,
    setQuery: setQueryReset,
    visible,
    filtered,
    total: filtered.length,
    hasMore,
    loadMore: () => setLimit((l) => l + pageSize),
  };
}
