import { calcTotals, formatMoney, type InvoiceData } from "@/lib/invoice";

export function InvoicePreview({ data }: { data: InvoiceData }) {
  const { subtotal, tax, total } = calcTotals(data.items, data.taxRate);

  return (
    <div className="rounded-2xl bg-white p-8 text-slate-900 shadow-elegant md:p-10" id="invoice-preview">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          {data.logo ? (
            <img src={data.logo} alt="Logo" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-900 text-lg font-bold text-white">
              {data.senderName.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-display text-lg font-bold">{data.senderName || "Your Company"}</p>
            {data.senderEmail && <p className="text-sm text-slate-500">{data.senderEmail}</p>}
            {data.senderAddress && <p className="text-sm text-slate-500">{data.senderAddress}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-bold tracking-tight">INVOICE</p>
          <p className="mt-1 font-mono text-sm text-slate-500">{data.invoiceNumber}</p>
        </div>
      </div>

      {/* Bill to */}
      <div className="grid grid-cols-2 gap-6 py-6 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bill to</p>
          <p className="mt-2 font-semibold">{data.clientName || "Client"}</p>
          {data.clientEmail && <p className="text-sm text-slate-500">{data.clientEmail}</p>}
          {data.clientAddress && <p className="text-sm text-slate-500">{data.clientAddress}</p>}
        </div>
        {data.issueDate && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Issued</p>
            <p className="mt-2 font-mono text-sm">{data.issueDate}</p>
          </div>
        )}
        {data.dueDate && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Due</p>
            <p className="mt-2 font-mono text-sm">{data.dueDate}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{item.description || "—"}</td>
                <td className="px-4 py-3 text-right font-mono">{item.quantity}</td>
                <td className="px-4 py-3 text-right font-mono">{formatMoney(item.price, data.currency)}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{formatMoney(item.quantity * item.price, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-mono">{formatMoney(subtotal, data.currency)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Tax ({data.taxRate}%)</span>
            <span className="font-mono">{formatMoney(tax, data.currency)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3">
            <span className="font-display text-lg font-bold">Total</span>
            <span className="font-mono text-lg font-bold">{formatMoney(total, data.currency)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      {(data.bankName || data.bankAccount || data.qrCode || data.notes) && (
        <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-2">
          <div>
            {(data.bankName || data.bankAccount) && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment</p>
                {data.bankName && <p className="mt-2 text-sm font-semibold">{data.bankName}</p>}
                {data.bankAccount && <p className="font-mono text-sm text-slate-500">{data.bankAccount}</p>}
              </>
            )}
            {data.notes && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</p>
                <p className="mt-2 text-sm text-slate-600">{data.notes}</p>
              </>
            )}
          </div>
          {data.qrCode && (
            <div className="flex justify-end">
              <img src={data.qrCode} alt="Payment QR" className="h-32 w-32 rounded-lg border border-slate-200 object-cover" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
