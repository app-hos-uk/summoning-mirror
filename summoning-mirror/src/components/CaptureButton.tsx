import { Camera } from 'lucide-react';

interface Props {
  onClick: () => void;
  disabled: boolean;
}

export default function CaptureButton({ onClick, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`pulse-glow w-14 h-14 sm:w-16 sm:h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center border-3 transition-all duration-200 cursor-pointer flex-shrink-0 ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:scale-110 active:scale-95'
      }`}
      style={{
        backgroundColor: disabled ? 'rgba(197,165,90,0.1)' : 'rgba(197,165,90,0.15)',
        borderColor: disabled ? 'rgba(197,165,90,0.3)' : '#C5A55A',
      }}
      aria-label="Capture photo">
      <Camera
        size={28}
        className="sm:hidden"
        style={{ color: disabled ? 'rgba(197,165,90,0.4)' : '#C5A55A' }}
      />
      <Camera
        size={32}
        className="hidden sm:block md:hidden"
        style={{ color: disabled ? 'rgba(197,165,90,0.4)' : '#C5A55A' }}
      />
      <Camera
        size={48}
        className="hidden md:block"
        style={{ color: disabled ? 'rgba(197,165,90,0.4)' : '#C5A55A' }}
      />
    </button>
  );
}
