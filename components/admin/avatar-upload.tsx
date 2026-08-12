"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyAvatar, updateMyAvatar } from "@/lib/actions/account";
import { uploadProfileAvatar } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Btn } from "@/components/admin/ui";
import { UploadIcon, UserIcon } from "@/components/admin/icons";

/**
 * "Your profile picture" — the whole feature, in one component, for every
 * portal.
 *
 * ## Why this is shared rather than written four times
 *
 * The server side (`uploadProfileAvatar` + `updateMyAvatar`) has always been
 * role-agnostic: it derives the uid from the live session and writes
 * `profiles.avatar_url`, so it works identically for an admin, an employee, a
 * customer or a helper. Only the UI existed, and only in the admin's Settings
 * screen. Copying that block into three more settings screens would mean the
 * next change to the copy or the error handling landing in one portal and not
 * the others.
 *
 * ## This is NOT the sidebar logo, and the wording says so
 *
 * `profiles.avatar_url` is ONE PERSON. It appears on the account button, beside
 * their name in the inbox and on the messages they send. `business_settings
 * .logo_url` is the COMPANY and appears in the sidebar. Conflating the two was
 * the actual complaint that started this work, so the description below states
 * the boundary out loud rather than leaving the user to discover it.
 */

export const AVATAR_KEY = ["my-avatar"] as const;

export function AvatarUpload({
  className,
  /**
   * Rendered under the description. The customer and helper portals use it to
   * name the places their own picture shows up, which differ from staff.
   */
  note,
}: {
  className?: string;
  note?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const { data: avatar } = useQuery({
    queryKey: AVATAR_KEY,
    queryFn: getMyAvatar,
  });
  const avatarUrl = avatar ?? null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset before the awaits: picking the SAME file twice in a row fires no
    // change event otherwise, so a failed upload could not be retried.
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    const uploaded = await uploadProfileAvatar(file);
    if (!uploaded.ok) {
      setUploading(false);
      setError(uploaded.error);
      toast.error("Upload failed", { description: uploaded.error });
      return;
    }
    const saved = await updateMyAvatar(uploaded.url);
    setUploading(false);
    if (!saved.ok) {
      setError(saved.error);
      toast.error("Couldn't save your picture", { description: saved.error });
      return;
    }
    toast.success("Profile picture updated", {
      description: "It shows on your account button and your messages.",
    });
    queryClient.invalidateQueries({ queryKey: AVATAR_KEY });
    // The top bar renders the avatar from the SERVER session profile, not from
    // this query, so the cache invalidation above cannot reach it.
    router.refresh();
  }

  async function remove() {
    setError("");
    const saved = await updateMyAvatar(null);
    if (!saved.ok) {
      setError(saved.error);
      toast.error("Couldn't remove it", { description: saved.error });
      return;
    }
    toast.success("Profile picture removed");
    queryClient.invalidateQueries({ queryKey: AVATAR_KEY });
    router.refresh();
  }

  return (
    <div
      className={cn(
        "border-line-soft flex flex-wrap items-center gap-5 border-b p-5",
        className
      )}
    >
      <span className="border-line-field bg-marine-500 relative flex size-[76px] flex-none items-center justify-center overflow-hidden rounded-full border text-[22px] font-medium text-white">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Your profile picture"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <UserIcon size={30} />
        )}
      </span>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
        <span className="text-ink-800 text-[13px] font-medium">
          Your profile picture
        </span>
        <span className="text-ink-500 text-[12.5px] leading-[1.5] font-normal text-pretty">
          {note ??
            "PNG, JPG or WebP, up to 4MB. This is you — it shows on your account button, beside your name in the inbox and on the messages you send. It is not the sidebar logo."}
        </span>
        {error ? (
          <span className="text-danger-ink text-[12px] font-medium">
            {error}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={handleFile}
        />
        <Btn
          pending={uploading}
          pendingLabel="Uploading…"
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon size={15} />
          {avatarUrl ? "Replace picture" : "Upload picture"}
        </Btn>
        {avatarUrl ? (
          <Btn disabled={uploading} onClick={remove}>
            Remove
          </Btn>
        ) : null}
      </div>
    </div>
  );
}
