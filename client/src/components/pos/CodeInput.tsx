import { Search } from 'lucide-react';
import { KeyboardEvent } from 'react';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (code: string) => void;
  onSearchClick: () => void;
  placeholder?: string;
}

export default function CodeInput({
  value,
  onChange,
  onSubmit,
  onSearchClick,
  placeholder = "Tovar kodi..."
}: CodeInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl text-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
          autoComplete="off"
        />
      </div>
      <button
        onClick={onSearchClick}
        className="h-12 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl flex items-center gap-2 font-medium transition-colors"
      >
        <Search className="w-5 h-5" />
        <span className="hidden sm:inline">Qidirish</span>
      </button>
    </div>
  );
}
