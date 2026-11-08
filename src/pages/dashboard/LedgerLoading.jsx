/** Ruled-paper placeholders while the ledger loads (no shimmering grey blocks). */
export function LedgerLoading() {
  return (
    <div role="status" className="pt-6">
      <p className="sr-only">Opening your ledger…</p>
      <div aria-hidden="true">
        <div className="border-b-3 border-double border-paper-300 py-2 font-serif text-sm text-ink-500 italic">
          Item
        </div>
        {['w-2/5', 'w-1/2', 'w-1/3', 'w-2/5'].map((w, i) => (
          <div
            key={i}
            className="flex h-16 items-center gap-3.5 border-b border-paper-300"
          >
            <span className="aspect-4/3 w-16 rounded-paper border border-dashed border-paper-400" />
            <span className={`border-t border-paper-400 ${w}`} />
            <span className="ml-auto w-12 border-t border-paper-400" />
          </div>
        ))}
      </div>
    </div>
  )
}
