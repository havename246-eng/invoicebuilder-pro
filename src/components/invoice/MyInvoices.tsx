import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CircleCheck,
  Copy,
  ExternalLink,
  FilePlus2,
  FolderOpen,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  connectDrive,
  deleteInvoiceFromDrive,
  DriveNotConnectedError,
  DriveScopeMissingError,
  listInvoicesFromDrive,
  loadInvoiceFromDrive,
  pdfViewUrl,
  setInvoiceStatusInDrive,
  type InvoiceSummary,
} from "@/lib/google-drive";
import {
  DRAFT_STORAGE_KEY,
  formatMoney,
  nextInvoiceNumber,
  STATUS_STYLES,
  type Currency,
  type InvoiceData,
  type InvoiceStatus,
} from "@/lib/invoice";

type DisplayStatus = InvoiceStatus | "overdue";

const STATUS_LABELS: Record<DisplayStatus, string> = {
  draft: "Draft",
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
  void: "Void",
  overdue: "Overdue",
};

const today = () => new Date().toISOString().slice(0, 10);

/** Overdue: past the due date and not settled (paid) or cancelled (void). */
function displayStatus(row: InvoiceSummary): DisplayStatus {
  if (row.status !== "paid" && row.status !== "void" && row.dueDate && row.dueDate < today()) {
    return "overdue";
  }
  return row.status;
}

const formatDate = (iso: string) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

function money(row: InvoiceSummary) {
  try {
    return formatMoney(row.total, row.currency as Currency);
  } catch {
    return `${row.total} ${row.currency}`;
  }
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; rows: InvoiceSummary[] }
  | { kind: "connect"; reason: "disconnected" | "scope" }
  | { kind: "error"; message: string };

/**
 * The signed-in home (/dashboard): the user's invoices, read from their own
 * Google Drive. Shows a Connect button when Drive isn't connected yet.
 */
export function MyInvoices({ greetingName }: { greetingName: string }) {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DisplayStatus>("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<InvoiceSummary | null>(null);

  async function load() {
    setState({ kind: "loading" });
    try {
      setState({ kind: "ready", rows: await listInvoicesFromDrive() });
    } catch (e) {
      if (e instanceof DriveNotConnectedError)
        setState({ kind: "connect", reason: "disconnected" });
      else if (e instanceof DriveScopeMissingError) setState({ kind: "connect", reason: "scope" });
      else
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Couldn't load your invoices.",
        });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function reconnect() {
    try {
      await connectDrive();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't connect to Google Drive.");
    }
  }

  const rows = useMemo(() => (state.kind === "ready" ? state.rows : []), [state]);
  const years = useMemo(
    () => [...new Set(rows.map((r) => r.issueDate.slice(0, 4)).filter(Boolean))].sort().reverse(),
    [rows],
  );
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!needle ||
          r.clientName.toLowerCase().includes(needle) ||
          r.invoiceNumber.toLowerCase().includes(needle)) &&
        (statusFilter === "all" || displayStatus(r) === statusFilter) &&
        (yearFilter === "all" || r.issueDate.startsWith(yearFilter)),
    );
  }, [rows, search, statusFilter, yearFilter]);

  /** Puts an invoice into the builder's draft slot and opens the builder. */
  function openInBuilder(invoice: InvoiceData) {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(invoice));
    } catch {
      toast.error("Couldn't open it: this browser's storage is full or blocked.");
      return;
    }
    navigate({ to: "/builder" });
  }

  async function withBusy(row: InvoiceSummary, work: () => Promise<void>) {
    setBusyId(row.fileId);
    try {
      await work();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong with Google Drive.");
    } finally {
      setBusyId(null);
    }
  }

  const open = (row: InvoiceSummary) =>
    withBusy(row, async () => openInBuilder(await loadInvoiceFromDrive(row.fileId)));

  const duplicate = (row: InvoiceSummary) =>
    withBusy(row, async () => {
      const invoice = await loadInvoiceFromDrive(row.fileId);
      openInBuilder({
        ...invoice,
        invoiceId: crypto.randomUUID(),
        invoiceNumber: nextInvoiceNumber(
          invoice.invoiceNumber,
          rows.map((r) => r.invoiceNumber),
        ),
        issueDate: today(),
        dueDate: "",
        status: "draft",
      });
    });

  const markPaid = (row: InvoiceSummary) =>
    withBusy(row, async () => {
      await setInvoiceStatusInDrive(row, "paid");
      setState((s) =>
        s.kind === "ready"
          ? {
              ...s,
              rows: s.rows.map((r) => (r.fileId === row.fileId ? { ...r, status: "paid" } : r)),
            }
          : s,
      );
      toast.success(`${row.invoiceNumber || "Invoice"} marked as paid`, {
        description: "Export it again to update the PDF itself.",
      });
    });

  async function confirmDelete() {
    const row = toDelete;
    setToDelete(null);
    if (!row) return;
    await withBusy(row, async () => {
      await deleteInvoiceFromDrive(row);
      setState((s) =>
        s.kind === "ready" ? { ...s, rows: s.rows.filter((r) => r.fileId !== row.fileId) } : s,
      );
      toast.success(`${row.invoiceNumber || "Invoice"} deleted`);
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="light" />

      <main className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Welcome, {greetingName}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              My invoices
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every invoice you export, kept in your own Drive under InvoiceCraft / Invoices.
            </p>
          </div>
          <Button asChild variant="secondary" className="gap-1.5 rounded-full shadow-none">
            <Link to="/builder">
              <FilePlus2 className="h-4 w-4" />
              Open builder
            </Link>
          </Button>
        </div>

        {state.kind === "ready" && rows.length > 0 && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client or invoice number"
                className="pl-9"
                aria-label="Search invoices"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="sm:w-40" aria-label="Filter by status">
                <SelectValue>
                  {statusFilter === "all" ? "All statuses" : STATUS_LABELS[statusFilter]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(STATUS_LABELS) as DisplayStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="sm:w-32" aria-label="Filter by year">
                <SelectValue>{yearFilter === "all" ? "All years" : yearFilter}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="mt-6">
          {state.kind === "loading" && (
            <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading invoices">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          )}

          {state.kind === "connect" && (
            <EmptyCard
              title={state.reason === "scope" ? "Allow saving invoices" : "Reconnect Google Drive"}
              body={
                state.reason === "scope"
                  ? "InvoiceCraft needs one more permission to keep invoice PDFs in your Drive. It can only see files it creates."
                  : "Google Drive isn't connected on this device. Reconnect to see your invoices."
              }
              action={
                <Button onClick={reconnect} className="rounded-full">
                  Reconnect Google Drive
                </Button>
              }
            />
          )}

          {state.kind === "error" && (
            <EmptyCard
              title="Couldn't reach Google Drive"
              body={state.message}
              action={
                <Button variant="outline" onClick={() => void load()} className="rounded-full">
                  Try again
                </Button>
              }
            />
          )}

          {state.kind === "ready" && rows.length === 0 && (
            <EmptyCard
              title="No invoices yet"
              body="Invoices you export will appear here and in your Google Drive."
              action={
                <Button asChild className="rounded-full">
                  <Link to="/builder">Create an invoice</Link>
                </Button>
              }
            />
          )}

          {state.kind === "ready" && rows.length > 0 && visible.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No invoices match these filters.
            </p>
          )}

          {visible.length > 0 && (
            <ul className="flex flex-col gap-3">
              {visible.map((row) => {
                const status = displayStatus(row);
                const busy = busyId === row.fileId;
                return (
                  <li
                    key={row.fileId}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {row.invoiceNumber || "Untitled"}
                        </span>
                        <StatusBadge status={status} />
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {row.clientName || "No client"} · {formatDate(row.issueDate)}
                        {row.dueDate ? ` · due ${formatDate(row.dueDate)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className="mr-2 font-mono text-sm font-semibold text-foreground">
                        {money(row)}
                      </span>
                      <Button size="sm" onClick={() => void open(row)} disabled={busy}>
                        {busy ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <FolderOpen className="mr-1.5 h-4 w-4" />
                        )}
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void duplicate(row)}
                        disabled={busy}
                      >
                        <Copy className="mr-1.5 h-4 w-4" />
                        Duplicate
                      </Button>
                      {row.pdfFileId && (
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={pdfViewUrl(row.pdfFileId)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-1.5 h-4 w-4" />
                            PDF
                          </a>
                        </Button>
                      )}
                      {row.status !== "paid" && row.status !== "void" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void markPaid(row)}
                          disabled={busy}
                        >
                          <CircleCheck className="mr-1.5 h-4 w-4" />
                          Mark paid
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => setToDelete(row)}
                        disabled={busy}
                        aria-label={`Delete ${row.invoiceNumber || "invoice"}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.invoiceNumber || "this invoice"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the invoice from My invoices and deletes its PDF from your Google Drive.
              It can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: DisplayStatus }) {
  const style =
    status === "overdue"
      ? { bg: "#fee2e2", text: "#b91c1c", ring: "#fca5a5" }
      : STATUS_STYLES[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{
        background: style.bg,
        color: style.text,
        boxShadow: `inset 0 0 0 1px ${style.ring}`,
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function EmptyCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}
