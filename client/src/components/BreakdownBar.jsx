// Generic breakdown list with progress bars
export default function BreakdownBar({ items, total, colorFn, labelFn, valueFn, limit = 8 }) {
  const shown = items.slice(0, limit);
  return (
    <div className="space-y-2.5">
      {shown.map((item, i) => {
        const val  = valueFn(item);
        const pct  = total ? Math.round((val / total) * 100) : 0;
        const color = colorFn ? colorFn(item, i) : '#6366f1';
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-700 font-medium truncate max-w-[60%]">{labelFn(item)}</span>
              <span className="text-gray-400 shrink-0">{val} · {pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, 1)}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Нет данных</p>
      )}
    </div>
  );
}
