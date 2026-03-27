import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ text, className = '', label = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title="Копировать"
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
        copied
          ? 'bg-green-50 text-green-600 border border-green-200'
          : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-700'
      } ${className}`}
    >
      {copied
        ? <><Check className="w-3 h-3" />{label ? 'Скопировано' : ''}</>
        : <><Copy className="w-3 h-3" />{label ? 'Копировать' : ''}</>
      }
    </button>
  );
}
