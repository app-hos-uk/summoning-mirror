import { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Users, User } from 'lucide-react';
import type { Fandom, Lang, CaptureMode } from '../types/fandom';
import { BRAND } from '../utils/branding';
import { t } from '../utils/i18n';
import { playFandomSound, playShutterSound } from '../utils/sounds';
import FandomGrid from '../components/FandomGrid';
import CaptureButton from '../components/CaptureButton';
import CountdownOverlay from '../components/CountdownOverlay';

interface Props {
  fandoms: Fandom[];
  fandomsLoading: boolean;
  selectedFandom: Fandom | null;
  onSelectFandom: (f: Fandom) => void;
  guestName: string;
  onGuestNameChange: (text: string) => void;
  wishText: string;
  onWishChange: (text: string) => void;
  onCapture: (snapshot: HTMLCanvasElement) => void;
  onBack: () => void;
  lang: Lang;
  captureMode: CaptureMode;
  onCaptureModeChange: (mode: CaptureMode) => void;
}

export default function CameraScreen({
  fandoms,
  fandomsLoading,
  selectedFandom,
  onSelectFandom,
  guestName,
  onGuestNameChange,
  wishText,
  onWishChange,
  onCapture,
  onBack,
  lang,
  captureMode,
  onCaptureModeChange,
}: Props) {
  const webcamRef = useRef<Webcam>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [videoDimensionsReady, setVideoDimensionsReady] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const mountedRef = useRef(true);
  const i = t(lang);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const rafRef = useRef<number>(0);

  const handleUserMedia = useCallback(() => {
    setCameraReady(true);
    const checkDimensions = () => {
      if (!mountedRef.current) return;
      const video = webcamRef.current?.video;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoDimensionsReady(true);
      } else {
        rafRef.current = requestAnimationFrame(checkDimensions);
      }
    };
    checkDimensions();
  }, []);

  const handleFandomSelect = useCallback((f: Fandom) => {
    onSelectFandom(f);
    playFandomSound(f.id);
  }, [onSelectFandom]);

  const canCapture = cameraReady && videoDimensionsReady && !!selectedFandom;
  const capturingRef = useRef(false);

  const doCapture = useCallback(() => {
    if (capturingRef.current) return;
    const video = webcamRef.current?.video;
    if (!video || !selectedFandom || video.videoWidth === 0) return;

    capturingRef.current = true;

    const snap = document.createElement('canvas');
    snap.width = video.videoWidth;
    snap.height = video.videoHeight;
    const ctx = snap.getContext('2d')!;
    ctx.drawImage(video, 0, 0, snap.width, snap.height);

    playShutterSound();

    setFlashActive(true);
    setTimeout(() => {
      if (mountedRef.current) setFlashActive(false);
    }, 300);

    setTimeout(() => {
      if (mountedRef.current && selectedFandom) {
        onCapture(snap);
      }
    }, 100);
  }, [selectedFandom, onCapture]);

  const handleCapture = useCallback(() => {
    if (capturingRef.current) return;
    if (captureMode === 'group') {
      setCountdown(5);
    } else {
      doCapture();
    }
  }, [captureMode, doCapture]);

  return (
    <div className="screen-enter flex flex-col md:flex-row h-full w-full relative"
      style={{ backgroundColor: BRAND.colors.navy }}>

      {flashActive && (
        <div className="capture-flash absolute inset-0 z-50 bg-white pointer-events-none" />
      )}

      {countdown !== null && (
        <CountdownOverlay
          seconds={countdown}
          onComplete={() => {
            setCountdown(null);
            doCapture();
          }}
          onCancel={() => setCountdown(null)}
          lang={lang}
        />
      )}

      <div className="relative w-full md:w-[55%] h-[35dvh] sm:h-[40dvh] md:h-full flex-shrink-0">
        <Webcam
          ref={webcamRef}
          audio={false}
          mirrored
          videoConstraints={{
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }}
          onUserMedia={handleUserMedia}
          onUserMediaError={() => setCameraError(true)}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 pointer-events-none border-2"
          style={{ borderColor: 'rgba(197,165,90,0.3)' }} />

        {/* Face-safe framing guide */}
        <div className="face-guide-overlay absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="face-guide-oval" />
        </div>
        <p className="face-guide-label absolute bottom-14 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] tracking-wider pointer-events-none"
          style={{ color: 'rgba(197,165,90,0.4)' }}>
          {i.faceGuide}
        </p>

        <img
          src={BRAND.assets.emblem}
          alt=""
          className="absolute top-3 left-3 w-10 h-10 md:w-12 md:h-12 opacity-60"
        />

        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: BRAND.colors.navy }}>
            {cameraError ? (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <span className="text-red-400 text-sm tracking-wider">Camera access denied or unavailable</span>
                <span className="text-gold/40 text-xs tracking-wider">Please allow camera permissions and reload</span>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-4 py-2 text-xs tracking-wider rounded border cursor-pointer"
                  style={{ borderColor: 'rgba(197,165,90,0.4)', color: BRAND.colors.gold }}>
                  Retry
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                <span className="text-gold/60 text-sm tracking-wider">{i.initCamera}</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onBack}
          className="absolute top-3 right-3 px-3 py-1.5 text-xs tracking-wider rounded border cursor-pointer transition-opacity hover:opacity-100 opacity-60"
          style={{
            borderColor: 'rgba(197,165,90,0.4)',
            color: BRAND.colors.gold,
            backgroundColor: 'rgba(12,20,40,0.7)',
          }}>
          {i.exit}
        </button>

        {/* Solo/Group mode toggle */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full"
          style={{ backgroundColor: 'rgba(12,20,40,0.8)', border: '1px solid rgba(197,165,90,0.2)' }}>
          <button
            onClick={() => onCaptureModeChange('solo')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs tracking-wider cursor-pointer transition-all"
            style={{
              backgroundColor: captureMode === 'solo' ? 'rgba(197,165,90,0.2)' : 'transparent',
              color: captureMode === 'solo' ? '#C5A55A' : 'rgba(197,165,90,0.4)',
            }}>
            <User size={12} />
            {i.soloMode}
          </button>
          <button
            onClick={() => onCaptureModeChange('group')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs tracking-wider cursor-pointer transition-all"
            style={{
              backgroundColor: captureMode === 'group' ? 'rgba(197,165,90,0.2)' : 'transparent',
              color: captureMode === 'group' ? '#C5A55A' : 'rgba(197,165,90,0.4)',
            }}>
            <Users size={12} />
            {i.groupMode}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-3 sm:p-4 md:p-6 overflow-hidden min-h-0"
        style={{ backgroundColor: BRAND.colors.navy }}>

        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4 flex-shrink-0">
          <img src={BRAND.assets.emblem} alt="" className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 opacity-70" />
          <span className="text-[11px] sm:text-xs md:text-sm tracking-[0.15em]"
            style={{ color: 'rgba(197,165,90,0.5)' }}>
            {i.selectFandom}
          </span>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          <FandomGrid
            fandoms={fandoms}
            selectedFandom={selectedFandom}
            onSelect={handleFandomSelect}
            loading={fandomsLoading}
          />
        </div>

        <div className="mt-2 sm:mt-3 md:mt-4 flex flex-col gap-2 flex-shrink-0">
          <input
            type="text"
            value={guestName}
            onChange={(e) => onGuestNameChange(e.target.value.slice(0, 30))}
            placeholder={i.namePlaceholder}
            maxLength={30}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded border outline-none transition-colors"
            style={{
              backgroundColor: 'rgba(197,165,90,0.05)',
              borderColor: 'rgba(197,165,90,0.2)',
              color: 'white',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(197,165,90,0.5)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(197,165,90,0.2)'; }}
          />
          <div className="flex items-center gap-2 sm:gap-3">
            <input
              type="text"
              value={wishText}
              onChange={(e) => onWishChange(e.target.value.slice(0, 60))}
              placeholder={i.wishPlaceholder}
              maxLength={60}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base rounded border outline-none transition-colors min-w-0"
              style={{
                backgroundColor: 'rgba(197,165,90,0.05)',
                borderColor: 'rgba(197,165,90,0.2)',
                color: 'white',
                fontStyle: 'italic',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(197,165,90,0.5)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(197,165,90,0.2)'; }}
            />
            <CaptureButton
              onClick={handleCapture}
              disabled={!canCapture}
            />
          </div>
        </div>

        {!selectedFandom && (
          <p className="text-center text-[10px] sm:text-xs mt-1.5 sm:mt-2 tracking-wider flex-shrink-0"
            style={{ color: 'rgba(197,165,90,0.35)' }}>
            {i.chooseFandom}
          </p>
        )}
      </div>
    </div>
  );
}
