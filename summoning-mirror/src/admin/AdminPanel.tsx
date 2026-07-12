import { useState, useCallback, useRef } from 'react';
import { Plus, Trash2, Edit3, Save, X, Eye, EyeOff, ArrowUp, ArrowDown, Upload, LogOut, Lock, Info, ChevronDown, ChevronUp as ChevUp } from 'lucide-react';
import { useAllFandoms } from '../hooks/useFandoms';
import type { Fandom } from '../types/fandom';
import { BRAND } from '../utils/branding';
import { adminHeaders, adminJsonHeaders, clearAdminToken, isUnauthorizedResponse } from '../utils/adminAuth';

const LOCKED_POSITIONS: Record<number, string> = {
  1: 'marvel',
  2: 'star-wars',
};

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const handleUnauthorized = useCallback(() => {
    clearAdminToken();
    onLogout();
  }, [onLogout]);

  const { fandoms, loading, refetch } = useAllFandoms(handleUnauthorized);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Fandom>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showImageGuide, setShowImageGuide] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }, []);

  const guardAdminResponse = useCallback((res: Response): boolean => {
    if (isUnauthorizedResponse(res.status)) {
      handleUnauthorized();
      return false;
    }
    return true;
  }, [handleUnauthorized]);

  const handleCreate = async () => {
    if (!form.displayName || !form.accentColor) {
      showMessage('Name and accent color are required');
      return;
    }
    try {
      const res = await fetch('/api/admin/fandoms', {
        method: 'POST',
        headers: adminJsonHeaders(),
        body: JSON.stringify(form),
      });
      if (!guardAdminResponse(res)) return;
      if (!res.ok) {
        const err = await res.json();
        showMessage(err.error || 'Failed to create');
        return;
      }
      setCreating(false);
      setForm({});
      refetch();
      showMessage('Fandom created!');
    } catch {
      showMessage('Network error');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/fandoms/${id}`, {
        method: 'PUT',
        headers: adminJsonHeaders(),
        body: JSON.stringify(form),
      });
      if (!guardAdminResponse(res)) return;
      if (!res.ok) {
        const err = await res.json();
        showMessage(err.error || 'Failed to update');
        return;
      }
      setEditing(null);
      setForm({});
      refetch();
      showMessage('Fandom updated!');
    } catch {
      showMessage('Network error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fandom permanently?')) return;
    try {
      const res = await fetch(`/api/admin/fandoms/${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (!guardAdminResponse(res)) return;
      if (!res.ok) {
        const err = await res.json();
        showMessage(err.error || 'Failed to delete');
        return;
      }
      refetch();
      showMessage('Fandom deleted');
    } catch {
      showMessage('Network error');
    }
  };

  const handleToggle = async (fandom: Fandom) => {
    try {
      const res = await fetch(`/api/admin/fandoms/${fandom.id}`, {
        method: 'PUT',
        headers: adminJsonHeaders(),
        body: JSON.stringify({ enabled: !fandom.enabled }),
      });
      if (!guardAdminResponse(res)) return;
      refetch();
    } catch {
      showMessage('Network error');
    }
  };

  const handleReorder = async (fandom: Fandom, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? fandom.sortOrder - 1 : fandom.sortOrder + 1;
    if (newOrder < 1) return;

    if (LOCKED_POSITIONS[newOrder] && LOCKED_POSITIONS[newOrder] !== fandom.id) {
      showMessage(`Position ${newOrder} is reserved for brand hierarchy`);
      return;
    }

    try {
      const res = await fetch(`/api/admin/fandoms/${fandom.id}`, {
        method: 'PUT',
        headers: adminJsonHeaders(),
        body: JSON.stringify({ sortOrder: newOrder }),
      });
      if (!guardAdminResponse(res)) return;
      refetch();
    } catch {
      showMessage('Network error');
    }
  };

  const handleImageUpload = async (id: string, file: File) => {
    setUploadingId(id);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch(`/api/admin/fandoms/${id}/image`, {
        method: 'POST',
        headers: adminHeaders(),
        body: formData,
      });
      if (!guardAdminResponse(res)) return;
      if (!res.ok) {
        showMessage('Failed to upload image');
        return;
      }
      refetch();
      showMessage('Image uploaded!');
    } catch {
      showMessage('Network error');
    } finally {
      setUploadingId(null);
    }
  };

  const isLocked = (fandom: Fandom) => {
    return Object.values(LOCKED_POSITIONS).includes(fandom.id);
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      showMessage('All password fields are required');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      showMessage('New password must be at least 8 characters');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showMessage('New passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: adminJsonHeaders(),
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      if (!guardAdminResponse(res)) return;
      if (!res.ok) {
        const err = await res.json();
        showMessage(err.error || 'Failed to change password');
        return;
      }
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordChange(false);
      showMessage('Password changed successfully!');
    } catch {
      showMessage('Network error');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full"
        style={{ backgroundColor: BRAND.colors.navy }}>
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-y-auto p-4 md:p-8 z-50"
      style={{ backgroundColor: BRAND.colors.navy }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-wider"
              style={{ color: BRAND.colors.gold }}>
              FANDOM MANAGEMENT
            </h1>
            <p className="text-xs md:text-sm mt-1 tracking-wider"
              style={{ color: 'rgba(197,165,90,0.4)' }}>
              The Summoning Mirror — Admin Panel
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setCreating(true); setForm({ enabled: true }); }}
              className="flex items-center gap-2 px-4 py-2 rounded border cursor-pointer transition-all hover:scale-105"
              style={{
                borderColor: BRAND.colors.gold,
                color: BRAND.colors.gold,
                backgroundColor: 'rgba(197,165,90,0.1)',
              }}>
              <Plus size={18} />
              <span className="text-sm tracking-wider">ADD FANDOM</span>
            </button>
            <button
              onClick={() => {
                clearAdminToken();
                onLogout();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-all hover:scale-105"
              style={{
                borderColor: 'rgba(255,80,80,0.3)',
                color: 'rgba(255,120,120,0.7)',
              }}>
              <LogOut size={16} />
              <span className="text-xs tracking-wider">LOGOUT</span>
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-4 p-3 rounded text-sm tracking-wider text-center"
            style={{
              backgroundColor: 'rgba(197,165,90,0.1)',
              color: BRAND.colors.gold,
              border: '1px solid rgba(197,165,90,0.3)',
            }}>
            {message}
          </div>
        )}

        {/* Image Upload Guide */}
        <div className="mb-4">
          <button
            onClick={() => setShowImageGuide(!showImageGuide)}
            className="flex items-center gap-2 text-xs tracking-wider cursor-pointer transition-opacity hover:opacity-100 opacity-60"
            style={{ color: BRAND.colors.gold }}>
            <Info size={14} />
            IMAGE UPLOAD GUIDE
            {showImageGuide ? <ChevUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showImageGuide && (
            <div className="mt-3 p-4 md:p-5 rounded-lg border"
              style={{ borderColor: 'rgba(197,165,90,0.2)', backgroundColor: 'rgba(197,165,90,0.03)' }}>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
                {/* Specs */}
                <div>
                  <h4 className="text-xs font-bold tracking-wider mb-3" style={{ color: BRAND.colors.gold }}>
                    RECOMMENDED IMAGE SPECS
                  </h4>
                  <div className="space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <div className="flex gap-3">
                      <span className="tracking-wider font-bold min-w-[80px]" style={{ color: 'rgba(197,165,90,0.6)' }}>FORMAT</span>
                      <span>PNG with transparent background <span style={{ color: 'rgba(197,165,90,0.5)' }}>(preferred)</span> or JPG</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="tracking-wider font-bold min-w-[80px]" style={{ color: 'rgba(197,165,90,0.6)' }}>SIZE</span>
                      <span>500 × 500px minimum (square ratio works best)</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="tracking-wider font-bold min-w-[80px]" style={{ color: 'rgba(197,165,90,0.6)' }}>MAX FILE</span>
                      <span>10 MB</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="tracking-wider font-bold min-w-[80px]" style={{ color: 'rgba(197,165,90,0.6)' }}>CONTENT</span>
                      <span>Official fandom logo or emblem — centred, no extra padding</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded" style={{ backgroundColor: 'rgba(197,165,90,0.06)', border: '1px solid rgba(197,165,90,0.1)' }}>
                    <p className="text-[10px] tracking-wider leading-relaxed" style={{ color: 'rgba(197,165,90,0.5)' }}>
                      <strong style={{ color: 'rgba(197,165,90,0.7)' }}>TIPS:</strong> Use PNG with transparent background for best results in the circular selector. 
                      The image is displayed in two places: a <strong>circular icon</strong> on the fandom picker (≈80px) and a 
                      <strong> card panel</strong> on the selfie card (≈200×250px). Both use <em>contain</em> fit, so the full logo 
                      is always visible — no cropping. Square or circular logos work best.
                    </p>
                  </div>
                </div>

                {/* Visual reference — shows how the image renders */}
                <div className="flex flex-col items-center gap-4">
                  <h4 className="text-xs font-bold tracking-wider" style={{ color: BRAND.colors.gold }}>
                    PREVIEW CONTEXTS
                  </h4>
                  {/* Circle preview */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%', padding: 3,
                      background: 'linear-gradient(135deg, rgba(197,165,90,0.3), rgba(197,165,90,0.1))',
                    }}>
                      <div style={{
                        width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                        backgroundColor: '#0C1428', padding: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <img src="/fandoms/marvel.png" alt="Example"
                          style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
                          onError={(e) => { (e.target as HTMLImageElement).src = '/fandoms/marvel.jpg'; }}
                        />
                      </div>
                    </div>
                    <span className="text-[9px] tracking-wider" style={{ color: 'rgba(197,165,90,0.4)' }}>FANDOM PICKER</span>
                  </div>
                  {/* Card panel preview */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div style={{
                      width: 90, height: 112, borderRadius: 4, overflow: 'hidden',
                      backgroundColor: '#0a0f1c', boxShadow: 'inset 0 0 0 1px rgba(212,169,74,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6,
                    }}>
                      <img src="/fandoms/marvel.png" alt="Example"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/fandoms/marvel.jpg'; }}
                      />
                    </div>
                    <span className="text-[9px] tracking-wider" style={{ color: 'rgba(197,165,90,0.4)' }}>SELFIE CARD</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create form */}
        {creating && (
          <div className="mb-6 p-4 md:p-6 rounded-lg border"
            style={{
              borderColor: 'rgba(197,165,90,0.3)',
              backgroundColor: 'rgba(197,165,90,0.03)',
            }}>
            <h3 className="text-sm font-bold tracking-wider mb-4"
              style={{ color: BRAND.colors.gold }}>
              NEW FANDOM
            </h3>
            <FandomForm form={form} onChange={setForm} />
            <div className="flex gap-3 mt-4">
              <button onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 rounded border cursor-pointer text-sm tracking-wider"
                style={{ borderColor: BRAND.colors.gold, color: BRAND.colors.gold }}>
                <Save size={16} /> CREATE
              </button>
              <button onClick={() => { setCreating(false); setForm({}); }}
                className="flex items-center gap-2 px-4 py-2 rounded border cursor-pointer text-sm tracking-wider"
                style={{ borderColor: 'rgba(197,165,90,0.3)', color: 'rgba(197,165,90,0.5)' }}>
                <X size={16} /> CANCEL
              </button>
            </div>
          </div>
        )}

        {/* Fandom list */}
        <div className="space-y-3">
          {fandoms.map((fandom) => (
            <div
              key={fandom.id}
              className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg border transition-all"
              style={{
                borderColor: editing === fandom.id ? fandom.accentColor : 'rgba(197,165,90,0.15)',
                backgroundColor: 'rgba(197,165,90,0.02)',
                opacity: fandom.enabled ? 1 : 0.5,
              }}>
              {/* Sort order */}
              <div className="flex flex-col items-center gap-1 min-w-[40px]">
                <button onClick={() => handleReorder(fandom, 'up')}
                  disabled={isLocked(fandom)}
                  className="cursor-pointer disabled:opacity-20 hover:opacity-100 opacity-50 transition-opacity"
                  style={{ color: BRAND.colors.gold }}>
                  <ArrowUp size={14} />
                </button>
                <span className="text-xs font-bold" style={{ color: 'rgba(197,165,90,0.5)' }}>
                  #{fandom.sortOrder}
                </span>
                <button onClick={() => handleReorder(fandom, 'down')}
                  disabled={isLocked(fandom)}
                  className="cursor-pointer disabled:opacity-20 hover:opacity-100 opacity-50 transition-opacity"
                  style={{ color: BRAND.colors.gold }}>
                  <ArrowDown size={14} />
                </button>
              </div>

              {/* Strip image preview */}
              <div className="w-20 h-14 md:w-28 md:h-16 rounded overflow-hidden flex-shrink-0 relative group"
                style={{ backgroundColor: '#0C1428', border: '1px solid rgba(197,165,90,0.1)' }}>
                <img
                  src={`/fandoms/${fandom.stripImage}`}
                  alt={fandom.displayName}
                  className="w-full h-full"
                  style={{ objectFit: 'contain', padding: 2 }}
                />
                <button
                  onClick={() => {
                    setUploadingId(fandom.id);
                    fileRef.current?.click();
                  }}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer">
                  <Upload size={14} style={{ color: BRAND.colors.gold }} />
                  <span className="text-[8px] tracking-wider" style={{ color: BRAND.colors.gold }}>CHANGE</span>
                </button>
              </div>

              {/* Fandom info */}
              {editing === fandom.id ? (
                <div className="flex-1">
                  <FandomForm form={form} onChange={setForm} />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleUpdate(fandom.id)}
                      className="px-3 py-1 rounded border text-xs cursor-pointer"
                      style={{ borderColor: BRAND.colors.gold, color: BRAND.colors.gold }}>
                      SAVE
                    </button>
                    <button onClick={() => { setEditing(null); setForm({}); }}
                      className="px-3 py-1 rounded border text-xs cursor-pointer"
                      style={{ borderColor: 'rgba(197,165,90,0.3)', color: 'rgba(197,165,90,0.5)' }}>
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm md:text-base tracking-wider"
                      style={{ color: fandom.accentColor }}>
                      {fandom.displayName}
                    </span>
                    <div className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: fandom.accentColor, borderColor: 'rgba(255,255,255,0.2)' }} />
                    {isLocked(fandom) && (
                      <span className="text-[10px] px-2 py-0.5 rounded tracking-wider"
                        style={{ backgroundColor: 'rgba(197,165,90,0.15)', color: 'rgba(197,165,90,0.6)' }}>
                        LOCKED
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {fandom.id} · {fandom.stripImage}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(fandom)}
                  className="p-2 rounded cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ color: 'rgba(197,165,90,0.5)' }}>
                  {fandom.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                {editing !== fandom.id && (
                  <button onClick={() => {
                    setEditing(fandom.id);
                    setForm({
                      displayName: fandom.displayName,
                      accentColor: fandom.accentColor,
                      sortOrder: fandom.sortOrder,
                    });
                  }}
                    className="p-2 rounded cursor-pointer hover:bg-white/5 transition-colors"
                    style={{ color: 'rgba(197,165,90,0.5)' }}>
                    <Edit3 size={16} />
                  </button>
                )}
                {!isLocked(fandom) && (
                  <button onClick={() => handleDelete(fandom.id)}
                    className="p-2 rounded cursor-pointer hover:bg-red-900/20 transition-colors"
                    style={{ color: 'rgba(255,80,80,0.5)' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && uploadingId) {
              handleImageUpload(uploadingId, file);
            }
            e.target.value = '';
          }}
        />

        {/* Change Password */}
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(197,165,90,0.1)' }}>
          {!showPasswordChange ? (
            <button
              onClick={() => setShowPasswordChange(true)}
              className="flex items-center gap-2 px-4 py-2 rounded border cursor-pointer transition-all hover:scale-105 text-sm tracking-wider"
              style={{
                borderColor: 'rgba(197,165,90,0.3)',
                color: 'rgba(197,165,90,0.6)',
              }}>
              <Lock size={16} />
              CHANGE PASSWORD
            </button>
          ) : (
            <div className="p-4 md:p-6 rounded-lg border"
              style={{
                borderColor: 'rgba(197,165,90,0.3)',
                backgroundColor: 'rgba(197,165,90,0.03)',
              }}>
              <h3 className="text-sm font-bold tracking-wider mb-4"
                style={{ color: BRAND.colors.gold }}>
                CHANGE PASSWORD
              </h3>
              <div className="space-y-3 max-w-sm">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  autoComplete="current-password"
                  className="w-full px-3 py-2 rounded border text-sm outline-none"
                  style={{
                    backgroundColor: 'rgba(197,165,90,0.05)',
                    borderColor: 'rgba(197,165,90,0.2)',
                    color: 'white',
                  }}
                />
                <input
                  type="password"
                  placeholder="New Password (min 8 characters)"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 rounded border text-sm outline-none"
                  style={{
                    backgroundColor: 'rgba(197,165,90,0.05)',
                    borderColor: 'rgba(197,165,90,0.2)',
                    color: 'white',
                  }}
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 rounded border text-sm outline-none"
                  style={{
                    backgroundColor: 'rgba(197,165,90,0.05)',
                    borderColor: 'rgba(197,165,90,0.2)',
                    color: 'white',
                  }}
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleChangePassword}
                  disabled={pwLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded border cursor-pointer text-sm tracking-wider disabled:opacity-50"
                  style={{ borderColor: BRAND.colors.gold, color: BRAND.colors.gold }}>
                  {pwLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  UPDATE PASSWORD
                </button>
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded border cursor-pointer text-sm tracking-wider"
                  style={{ borderColor: 'rgba(197,165,90,0.3)', color: 'rgba(197,165,90,0.5)' }}>
                  <X size={16} /> CANCEL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 pt-6 flex gap-6 justify-center"
          style={{ borderTop: '1px solid rgba(197,165,90,0.1)' }}>
          <a href="/admin/analytics"
            className="text-sm tracking-wider transition-opacity hover:opacity-100 opacity-60"
            style={{ color: BRAND.colors.gold }}>
            ANALYTICS DASHBOARD →
          </a>
          <a href="/"
            className="text-sm tracking-wider transition-opacity hover:opacity-100 opacity-60"
            style={{ color: BRAND.colors.gold }}>
            ← BACK TO SUMMONING MIRROR
          </a>
        </div>
      </div>
    </div>
  );
}

function FandomForm({
  form,
  onChange,
}: {
  form: Partial<Fandom>;
  onChange: (f: Partial<Fandom>) => void;
}) {
  const inputStyle = {
    backgroundColor: 'rgba(197,165,90,0.05)',
    borderColor: 'rgba(197,165,90,0.2)',
    color: 'white',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <input
        type="text"
        placeholder="Display Name"
        value={form.displayName || ''}
        onChange={(e) => onChange({ ...form, displayName: e.target.value })}
        className="px-3 py-2 rounded border text-sm outline-none"
        style={inputStyle}
      />
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={form.accentColor || '#C5A55A'}
          onChange={(e) => onChange({ ...form, accentColor: e.target.value })}
          className="w-10 h-10 rounded cursor-pointer border-0"
        />
        <input
          type="text"
          placeholder="Accent Color (#hex)"
          value={form.accentColor || ''}
          onChange={(e) => onChange({ ...form, accentColor: e.target.value })}
          className="flex-1 px-3 py-2 rounded border text-sm outline-none"
          style={inputStyle}
        />
      </div>
      <input
        type="number"
        placeholder="Sort Order"
        value={form.sortOrder || ''}
        onChange={(e) => onChange({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
        className="px-3 py-2 rounded border text-sm outline-none"
        style={inputStyle}
      />
    </div>
  );
}
