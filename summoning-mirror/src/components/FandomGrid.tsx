import type { Fandom } from '../types/fandom';
import FandomCard from './FandomCard';

interface Props {
  fandoms: Fandom[];
  selectedFandom: Fandom | null;
  onSelect: (fandom: Fandom) => void;
  loading: boolean;
}

export default function FandomGrid({ fandoms, selectedFandom, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fandom-scroll overflow-y-auto h-full py-1 sm:py-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-1 gap-y-2 sm:gap-y-3 md:gap-x-2 md:gap-y-4 justify-items-center px-1">
        {fandoms.map((fandom) => (
          <FandomCard
            key={fandom.id}
            fandom={fandom}
            selected={selectedFandom?.id === fandom.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
