// Activity heatmap: weekday × hour
// byHour: [{hour, count}]   byWeekday: [{weekday, count}]
// We render a 7×24 grid where each cell = weekday+hour intensity (approximated from marginals)

const HOURS    = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function lerp(a, b, t) { return a + (b - a) * t; }

function toRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function cellColor(intensity, lo = '#eef0ff', hi = '#3b3bf7') {
  const [r0, g0, b0] = toRgb(lo);
  const [r1, g1, b1] = toRgb(hi);
  const r = Math.round(lerp(r0, r1, intensity));
  const g = Math.round(lerp(g0, g1, intensity));
  const b = Math.round(lerp(b0, b1, intensity));
  return `rgb(${r},${g},${b})`;
}

export default function Heatmap({ byHour = [], byWeekday = [] }) {
  if (!byHour.length && !byWeekday.length) {
    return <p className="text-sm text-gray-400 text-center py-6">Нет данных</p>;
  }

  const hourMap    = Object.fromEntries(byHour.map((h) => [h.hour, h.count]));
  const weekMap    = Object.fromEntries(byWeekday.map((d) => [d.weekday, d.count]));

  const maxHour    = Math.max(...Object.values(hourMap), 1);
  const maxWeekday = Math.max(...Object.values(weekMap), 1);

  // Approximate intensity: product of relative hour + relative weekday weights
  function intensity(wd, h) {
    const hw = (hourMap[h]    || 0) / maxHour;
    const ww = (weekMap[wd]   || 0) / maxWeekday;
    return Math.sqrt(hw * ww); // geometric mean looks better
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        {/* Hour labels */}
        <div className="flex ml-8 mb-1">
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-gray-400 font-mono">
              {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
            </div>
          ))}
        </div>

        {/* Grid */}
        {WEEKDAYS.map((wd, wdIdx) => (
          <div key={wdIdx} className="flex items-center gap-0.5 mb-0.5">
            <div className="w-7 shrink-0 text-[10px] text-gray-400 text-right pr-1.5">{wd}</div>
            {HOURS.map((h) => {
              const v = intensity(wdIdx, h);
              return (
                <div
                  key={h}
                  className="flex-1 aspect-square rounded-[2px] cursor-default transition-opacity hover:opacity-80"
                  style={{ background: cellColor(v) }}
                  title={`${wd} ${String(h).padStart(2,'0')}:00`}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-[10px] text-gray-400">Меньше</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <div key={v} className="w-3 h-3 rounded-sm" style={{ background: cellColor(v) }} />
          ))}
          <span className="text-[10px] text-gray-400">Больше</span>
        </div>
      </div>
    </div>
  );
}
