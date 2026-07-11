import { useState, useCallback, useEffect } from 'react';
import type { Screen, Fandom, Lang, CaptureMode } from './types/fandom';
import { useFandoms } from './hooks/useFandoms';
import WelcomeScreen from './screens/WelcomeScreen';
import CameraScreen from './screens/CameraScreen';
import ResultScreen from './screens/ResultScreen';
import AdminPanel from './admin/AdminPanel';
import AnalyticsDashboard from './admin/AnalyticsDashboard';
import PassportPage from './screens/PassportPage';
import AdminLogin from './admin/AdminLogin';
import { BRAND } from './utils/branding';
import { getAdminToken, setAdminToken, clearAdminToken, adminHeaders } from './utils/adminAuth';

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [selectedFandom, setSelectedFandom] = useState<Fandom | null>(null);
  const [wishText, setWishText] = useState('');
  const [guestName, setGuestName] = useState('');
  const [capturedSnapshot, setCapturedSnapshot] = useState<HTMLCanvasElement | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('solo');

  const { fandoms, loading: fandomsLoading, error: fandomsError, refetch } = useFandoms();

  const [adminAuthed, setAdminAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const isPassport = pathname.startsWith('/card/');
  const isAdmin = pathname === '/admin';
  const isAnalytics = pathname === '/admin/analytics';
  const needsAuth = isAdmin || isAnalytics;

  useEffect(() => {
    if (!needsAuth) {
      setAuthChecked(true);
      return;
    }
    const token = getAdminToken();
    if (!token) {
      setAuthChecked(true);
      return;
    }
    fetch('/api/admin/session', { headers: adminHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (!d.valid) {
          clearAdminToken();
        } else {
          setAdminAuthed(true);
        }
      })
      .catch(() => { clearAdminToken(); })
      .finally(() => setAuthChecked(true));
  }, [needsAuth]);

  const handleAdminLogin = useCallback((token: string) => {
    setAdminToken(token);
    setAdminAuthed(true);
  }, []);

  const handleAdminLogout = useCallback(() => {
    clearAdminToken();
    setAdminAuthed(false);
  }, []);

  const handleStart = useCallback(() => {
    setScreen('camera');
  }, []);

  const handleCapture = useCallback((snapshot: HTMLCanvasElement) => {
    setCapturedSnapshot(snapshot);
    setScreen('result');
  }, []);

  const handleNewPhoto = useCallback(() => {
    setCapturedSnapshot(null);
    setScreen('camera');
  }, []);

  const handleReset = useCallback(() => {
    setCapturedSnapshot(null);
    setSelectedFandom(null);
    setWishText('');
    setGuestName('');
    setCaptureMode('solo');
    setScreen('welcome');
  }, []);

  const showResult = screen === 'result' && capturedSnapshot && selectedFandom;

  if (needsAuth && !authChecked) {
    return (
      <div className="flex items-center justify-center h-screen w-screen"
        style={{ backgroundColor: BRAND.colors.navy }}>
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsAuth && !adminAuthed) {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  if (isAnalytics) {
    return <AnalyticsDashboard onLogout={handleAdminLogout} />;
  }

  if (isAdmin) {
    return <AdminPanel onLogout={handleAdminLogout} />;
  }

  if (isPassport) {
    return <PassportPage />;
  }

  return (
    <div className="h-full w-full overflow-hidden relative"
      style={{ fontFamily: 'Georgia, serif' }}>
      {screen === 'welcome' && (
        <WelcomeScreen
          onStart={handleStart}
          lang={lang}
          onLangChange={setLang}
        />
      )}
      {screen === 'camera' && (
        <>
          <CameraScreen
            fandoms={fandoms}
            fandomsLoading={fandomsLoading}
            selectedFandom={selectedFandom}
            onSelectFandom={setSelectedFandom}
            wishText={wishText}
            onWishChange={setWishText}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            onCapture={handleCapture}
            onBack={handleReset}
            lang={lang}
            captureMode={captureMode}
            onCaptureModeChange={setCaptureMode}
          />
          {fandomsError && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg border"
              style={{
                backgroundColor: 'rgba(139,0,0,0.9)',
                borderColor: 'rgba(255,80,80,0.4)',
              }}>
              <p className="text-xs text-white tracking-wider text-center">
                Could not load fandoms. <button onClick={refetch} className="underline cursor-pointer" style={{ color: BRAND.colors.gold }}>Retry</button>
              </p>
            </div>
          )}
        </>
      )}
      {showResult && (
        <ResultScreen
          photoSnapshot={capturedSnapshot}
          fandom={selectedFandom}
          wishText={wishText}
          guestName={guestName}
          fandoms={fandoms}
          onNewPhoto={handleNewPhoto}
          onReset={handleReset}
          lang={lang}
          captureMode={captureMode}
        />
      )}
      {screen === 'result' && !showResult && (
        <div className="flex items-center justify-center h-full w-full"
          style={{ backgroundColor: BRAND.colors.navy }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <span className="text-gold/60 text-sm tracking-wider">Preparing your card...</span>
          </div>
        </div>
      )}
    </div>
  );
}
