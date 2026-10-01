"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteBoardOption,
  getBoardOptions,
  saveBoardOption,
  setBoardOptionActive,
} from "@/lib/actions/parent-assist-options";
import {
  KIND_COPY,
  OPTION_KINDS,
  OPTION_LIMITS,
  type AirportRegion,
  type BoardOption,
  type BoardOptionInput,
  type OptionKind,
} from "@/lib/parent-assist-options";
import { ADMIN_BOARD_OPTIONS_KEY } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  Btn,
  Card,
  CardHead,
  EmptyState,
  PageHead,
  Screen,
  TableScroll,
  Table,
  Thead,
  Th,
  Td,
  Tr,
  TableSkeleton,
  Toggle,
  inputClass,
  inputInsetClass,
} from "@/components/admin/ui";
import { EditIcon, PlusIcon, SearchIcon, TrashIcon, WarningIcon } from "@/components/admin/icons";

/**
 * /admin/parents-options — the lists behind Parent Travel Assist's public
 * board: airports, airlines, languages and "help needed". Whatever is shown
 * here (and switched on) is what visitors can search and filter by on
 * wickettravel.com/parents-tickets, within five minutes of saving (the
 * public route's edge cache).
 *
 * Hiding keeps an option for later; removing deletes it. Neither touches
 * existing posts: a post keeps the airport or airline it was made with.
 */

type Draft = {
  id?: string;
  value: string;
  label: string;
  region: AirportRegion;
  sort_order: string;
};

const EMPTY_DRAFT: Draft = { value: "", label: "", region: "destination", sort_order: "100" };

function toDraft(row: BoardOption): Draft {
  return {
    id: row.id,
    value: row.value,
    label: row.label ?? "",
    region: row.region ?? "destination",
    sort_order: String(row.sort_order),
  };
}

export default function BoardOptionsPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<OptionKind>("airport");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ADMIN_BOARD_OPTIONS_KEY,
    queryFn: () => getBoardOptions(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ADMIN_BOARD_OPTIONS_KEY });

  const save = useMutation({
    mutationFn: (input: BoardOptionInput) => saveBoardOption(input),
    onSuccess: (res, input) => {
      if (!res.ok) {
        toast.error("Couldn't save", { description: res.error });
        return;
      }
      toast.success(input.id ? "Saved" : `Added to ${KIND_COPY[input.kind].tab.toLowerCase()}`);
      setAdding(null);
      setEditing(null);
      refresh();
    },
    onError: () => toast.error("Couldn't save", { description: "Please try again." }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => setBoardOptionActive(id, on),
    onSuccess: (res, { on }) => {
      if (!res.ok) return toast.error("Couldn't update", { description: res.error });
      toast.success(on ? "Shown on the website" : "Hidden from the website");
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBoardOption(id),
    onSuccess: (res) => {
      if (!res.ok) return toast.error("Couldn't remove", { description: res.error });
      toast.success("Removed");
      refresh();
    },
  });

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(OPTION_KINDS.map((k) => [k, 0])) as Record<OptionKind, number>;
    for (const r of rows) c[r.kind] += 1;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => r.kind === kind)
      .filter((r) => !q || r.value.toLowerCase().includes(q) || (r.label ?? "").toLowerCase().includes(q));
  }, [rows, kind, query]);

  const copy = KIND_COPY[kind];
  const hasLabel = kind === "airport" || kind === "support";

  const submit = (d: Draft) =>
    save.mutate({
      id: d.id,
      kind,
      value: d.value,
      label: hasLabel ? d.label : null,
      region: kind === "airport" ? d.region : null,
      sort_order: Number(d.sort_order),
    });

  const editorRow = (d: Draft, setD: (d: Draft) => void, onCancel: () => void) => (
    <Tr>
      <Td>
        <input
          autoFocus
          aria-label={copy.valueLabel}
          placeholder={copy.valueHint}
          value={d.value}
          maxLength={kind === "airport" ? 3 : OPTION_LIMITS.value}
          onChange={(e) => setD({ ...d, value: kind === "airport" ? e.target.value.toUpperCase() : e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && submit(d)}
          className={cn(inputClass, kind === "airport" && "w-24 uppercase")}
        />
      </Td>
      {hasLabel && (
        <Td>
          <input
            aria-label={copy.labelLabel}
            placeholder={copy.labelHint}
            value={d.label}
            maxLength={OPTION_LIMITS.label}
            onChange={(e) => setD({ ...d, label: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && submit(d)}
            className={inputClass}
          />
        </Td>
      )}
      {kind === "airport" && (
        <Td>
          <select
            aria-label="Usually"
            value={d.region}
            onChange={(e) => setD({ ...d, region: e.target.value as AirportRegion })}
            className={inputClass}
          >
            <option value="uk">UK departure</option>
            <option value="destination">Destination</option>
          </select>
        </Td>
      )}
      <Td>
        <input
          aria-label="Order"
          type="number"
          min={OPTION_LIMITS.sortMin}
          max={OPTION_LIMITS.sortMax}
          value={d.sort_order}
          onChange={(e) => setD({ ...d, sort_order: e.target.value })}
          className={cn(inputClass, "w-24")}
        />
      </Td>
      <Td>—</Td>
      <Td align="right">
        <div className="flex justify-end gap-2">
          <Btn size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Btn>
          <Btn size="sm" variant="ember" pending={save.isPending} pendingLabel="Saving" onClick={() => submit(d)}>
            Save
          </Btn>
        </div>
      </Td>
    </Tr>
  );

  return (
    <Screen width={1100}>
      <PageHead
        title="Board options"
        intro="The airports, airlines, languages and help options visitors can search and filter by on the Parent Travel Assist board at wickettravel.com. Changes reach the website within five minutes. Hiding or removing an option never changes existing posts."
      />

      {data?.needsSetup && (
        <Card className="border-warn-ink/30 bg-warn-wash">
          <div className="flex items-start gap-3 px-5 py-4 text-[13px]">
            <span className="text-warn-ink mt-0.5 flex flex-none">
              <WarningIcon size={18} />
            </span>
            <p className="text-ink-700 m-0">
              <strong className="font-semibold">One setup step first.</strong> Run{" "}
              <code className="bg-surface-1 rounded px-1.5 py-0.5">supabase/migrations/0027_parent_assist_options.sql</code>{" "}
              in Supabase. It creates this list already filled with the website&rsquo;s current
              options. Until then, the website keeps using its built-in lists.
            </p>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lists">
        {OPTION_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => {
              setKind(k);
              setAdding(null);
              setEditing(null);
              setQuery("");
            }}
            className={cn(
              "h-10 rounded-full border px-5 text-[13px] font-medium whitespace-nowrap outline-none",
              kind === k
                ? "border-ink-800 bg-ink-800 text-white"
                : "border-line-field text-ink-700 hover:bg-surface-1 bg-white"
            )}
          >
            {KIND_COPY[k].tab}
            <span className={cn("ml-2 text-[12px]", kind === k ? "text-white/70" : "text-ink-450")}>
              {counts[k]}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <CardHead
          title={copy.tab}
          hint={
            kind === "airport"
              ? "UK departures are listed first under “Flying from”, destinations first under “Flying to”. Visitors can search either way round."
              : kind === "support"
                ? "The full wording appears on the post form; the short label appears on board cards and filters."
                : "Shown as filter options on the board, in this order."
          }
          action={
            <Btn
              size="sm"
              variant="marine"
              disabled={!!data?.needsSetup || !!adding}
              onClick={() => {
                setEditing(null);
                setAdding({ ...EMPTY_DRAFT, region: "destination" });
              }}
            >
              <PlusIcon size={14} />
              Add {copy.singular}
            </Btn>
          }
        />

        <div className="border-line-soft border-b px-5 py-3">
          <label className="relative block max-w-sm">
            <span className="text-ink-450 pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
              <SearchIcon size={15} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${copy.tab.toLowerCase()}`}
              aria-label={`Search ${copy.tab.toLowerCase()}`}
              className={cn(inputInsetClass, "pl-10")}
            />
          </label>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : isError ? (
          <EmptyState title="Couldn't load the lists" body="Refresh the page to try again." />
        ) : (
          <TableScroll>
            <Table>
              <Thead>
                <Th>{copy.valueLabel}</Th>
                {hasLabel && <Th>{copy.labelLabel}</Th>}
                {kind === "airport" && <Th>Usually</Th>}
                <Th>Order</Th>
                <Th>Shown on website</Th>
                <Th align="right">Actions</Th>
              </Thead>
              <tbody>
                {adding && editorRow(adding, setAdding, () => setAdding(null))}
                {visible.map((r) =>
                  editing?.id === r.id ? (
                    <Editor key={r.id} render={() => editorRow(editing, setEditing, () => setEditing(null))} />
                  ) : (
                    <Tr key={r.id}>
                      <Td>
                        <span className={cn("text-ink-800 font-medium", kind === "airport" && "font-mono tracking-wide")}>
                          {r.value}
                        </span>
                      </Td>
                      {hasLabel && <Td>{r.label}</Td>}
                      {kind === "airport" && <Td>{r.region === "uk" ? "UK departure" : "Destination"}</Td>}
                      <Td>{r.sort_order}</Td>
                      <Td>
                        <Toggle
                          checked={r.is_active}
                          label={`Show ${r.value} on the website`}
                          disabled={toggle.isPending}
                          onChange={(on) => toggle.mutate({ id: r.id, on })}
                        />
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-2">
                          <Btn
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAdding(null);
                              setEditing(toDraft(r));
                            }}
                          >
                            <EditIcon size={14} />
                            Edit
                          </Btn>
                          <Btn
                            size="sm"
                            variant="danger"
                            pending={remove.isPending && remove.variables === r.id}
                            onClick={() => {
                              if (window.confirm(`Remove “${r.value}” from ${copy.tab.toLowerCase()}? To keep it for later, switch it off instead.`)) {
                                remove.mutate(r.id);
                              }
                            }}
                          >
                            <TrashIcon size={14} />
                            Remove
                          </Btn>
                        </div>
                      </Td>
                    </Tr>
                  )
                )}
              </tbody>
            </Table>
            {!adding && visible.length === 0 && (
              <EmptyState
                title={query ? "Nothing matches" : `No ${copy.tab.toLowerCase()} yet`}
                body={
                  query
                    ? "Try a different search, or add it as a new option."
                    : data?.needsSetup
                      ? "Run the setup step above and this list fills itself with the website's current options."
                      : `Add the first ${copy.singular} and it appears on the board within five minutes.`
                }
              />
            )}
          </TableScroll>
        )}
      </Card>
    </Screen>
  );
}

/** Keeps the inline editor's row identity stable inside the map. */
function Editor({ render }: { render: () => React.ReactNode }) {
  return <>{render()}</>;
}
