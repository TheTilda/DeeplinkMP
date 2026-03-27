const CONFIG = {
  wb:   { label: 'Wildberries', cls: 'badge-wb' },
  ozon: { label: 'Ozon',        cls: 'badge-ozon' },
  ym:   { label: 'Я.Маркет',    cls: 'badge-ym' },
};

const DOT = {
  wb:   'bg-wb',
  ozon: 'bg-ozon',
  ym:   'bg-ym',
};

export default function MarketplaceBadge({ marketplace }) {
  const cfg = CONFIG[marketplace] || { label: marketplace, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`badge ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[marketplace] || 'bg-gray-400'}`} />
      {cfg.label}
    </span>
  );
}
