"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BIRTHDAY_PLACEHOLDERS,
  DEFAULT_BIRTHDAY_MESSAGE,
  DEFAULT_BIRTHDAY_SUBJECT,
  MESSAGE_MAX,
  SUBJECT_MAX,
  renderBirthdayEmail,
  type BirthdayBrand,
} from "@/lib/birthdays";
import { saveBirthdayTemplate, sendBirthdayTest, type BirthdayTemplate } from "@/lib/actions/birthdays";
import {
  Btn,
  Card,
  CardHead,
  FieldLabel,
  focusRing,
  inputClass,
  textareaClass,
} from "@/components/admin/ui";
import { CheckIcon, MailIcon, SendIcon } from "@/components/admin/icons";

/**
 * The birthday message, edited beside a live preview. The preview is rendered
 * by the same function the server sends with, so it is exactly the email.
 */
export function BirthdayEditor({
  saved,
  draft,
  onDraft,
  onSaved,
  brand,
  sampleName,
}: {
  saved: BirthdayTemplate;
  draft: BirthdayTemplate;
  onDraft: (t: BirthdayTemplate) => void;
  onSaved: (t: BirthdayTemplate) => void;
  brand: BirthdayBrand;
  sampleName: string;
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const dirty = draft.subject !== saved.subject || draft.message !== saved.message;
  const isDefault =
    draft.subject === DEFAULT_BIRTHDAY_SUBJECT && draft.message === DEFAULT_BIRTHDAY_MESSAGE;

  const preview = useMemo(
    () =>
      renderBirthdayEmail({
        subject: draft.subject,
        message: draft.message,
        recipient: { fullName: sampleName },
        brand,
      }),
    [draft, brand, sampleName]
  );

  function insert(token: string) {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? draft.message.length;
    const end = el.selectionEnd ?? start;
    const message = draft.message.slice(0, start) + token + draft.message.slice(end);
    onDraft({ ...draft, message });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function save() {
    setSaving(true);
    const res = await saveBirthdayTemplate(draft);
    setSaving(false);
    if (!res.ok) {
      toast.error("Couldn't save the message", { description: res.error });
      return;
    }
    onSaved({ subject: draft.subject.trim(), message: draft.message.trim() });
    toast.success("Birthday message saved");
  }

  async function test() {
    setTesting(true);
    const res = await sendBirthdayTest(draft);
    setTesting(false);
    if (!res.ok) {
      toast.error("Couldn't send the test", { description: res.error });
      return;
    }
    toast.success(`Test sent to ${res.to}`, {
      description: res.previewUrl ? "Test mode: open the preview to see it." : "Check your inbox.",
      action: res.previewUrl
        ? { label: "Open", onClick: () => window.open(res.previewUrl!, "_blank", "noopener") }
        : undefined,
      duration: 12000,
    });
  }

  return (
    <Card>
      <CardHead
        title="Birthday message"
        icon={<MailIcon size={16} />}
        hint="What every customer receives. Placeholders are filled in for each person."
        action={
          dirty ? (
            <span className="bg-warn-bg text-warn-ink rounded-full px-3 py-1 text-[11px] font-medium">
              Unsaved changes
            </span>
          ) : null
        }
      />
      <div className="grid grid-cols-1 gap-6 p-5 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <label className="flex flex-col gap-2">
            <FieldLabel htmlFor="bday-subject">Subject</FieldLabel>
            <input
              id="bday-subject"
              value={draft.subject}
              maxLength={SUBJECT_MAX}
              onChange={(e) => onDraft({ ...draft, subject: e.target.value })}
              className={cn(inputClass, focusRing)}
            />
          </label>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="bday-message">Message</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {BIRTHDAY_PLACEHOLDERS.map((p) => (
                <button
                  key={p.token}
                  type="button"
                  onClick={() => insert(p.token)}
                  title={`Insert ${p.label}`}
                  className="border-line-field text-marine-600 hover:bg-surface-1 h-[28px] rounded-full border bg-white px-3 font-mono text-[11.5px]"
                >
                  {p.token}
                </button>
              ))}
            </div>
            <textarea
              id="bday-message"
              ref={bodyRef}
              rows={13}
              maxLength={MESSAGE_MAX}
              value={draft.message}
              onChange={(e) => onDraft({ ...draft, message: e.target.value })}
              className={cn(textareaClass, focusRing)}
            />
            <span className="text-ink-500 text-[11.5px]">
              Leave a blank line between paragraphs. {draft.message.length}/{MESSAGE_MAX}
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Btn variant="marine" onClick={save} pending={saving} disabled={!dirty}>
              <CheckIcon size={15} />
              Save message
            </Btn>
            <Btn onClick={test} pending={testing} pendingLabel="Sending…">
              <SendIcon size={15} />
              Send test to me
            </Btn>
            {!isDefault ? (
              <Btn
                onClick={() =>
                  onDraft({ subject: DEFAULT_BIRTHDAY_SUBJECT, message: DEFAULT_BIRTHDAY_MESSAGE })
                }
              >
                Reset to default
              </Btn>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-ink-700 text-[11.5px] font-medium">
            Preview for {sampleName}
          </span>
          <div className="border-line-base bg-surface-1 overflow-hidden rounded-[12px] border">
            <div className="border-line-soft border-b bg-white px-4 py-3">
              <div className="text-ink-500 text-[11px]">Subject</div>
              <div className="text-ink-800 truncate text-[13px] font-medium">
                {preview.subject || "—"}
              </div>
            </div>
            <iframe
              title="Birthday email preview"
              sandbox=""
              srcDoc={preview.html}
              className="block h-[560px] w-full border-0 bg-white"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
