import { DetailSkeleton } from "@/components/admin/skeletons";

// Two cards — the contact panel and the guidance beneath it. `cards` is set to
// what this screen actually renders, so nothing shifts when the real page lands.
export default function Loading() {
  return <DetailSkeleton cards={2} />;
}
