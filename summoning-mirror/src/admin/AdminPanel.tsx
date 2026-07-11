import { useState, useCallback, useRef } from 'react';
import { Plus, Trash2, Edit3, Save, X, Eye, EyeOff, ArrowUp, ArrowDown, Upload, LogOut } from 'lucide-react';
import { useAllFandoms } from '../hooks/useFandoms';
import type { Fandom } from '../types/fandom';
import { BRAND } from '../utils/branding';
import { adminHeaders, adminJsonHeaders, clearAdminToken } from '../utils/adminAuth';

const LOCKED_POSITIONS: Record<number, string> = {
  1: 'marvel',
  2: 'star-wars',
};

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const { fandoms, loading, refetch } = useAllFandoms();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Fandom>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }, []);

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
      await fetch(`/api/admin/fandoms/${fandom.id}`, {
        method: 'PUT',
        headers: adminJsonHeaders(),
        body: JSON.stringify({ enabled: !fandom.enabled }),
      });
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
      await fetch(`/api/admin/fandoms/${fandom.id}`, {
        method: 'PUT',
        headers: adminJsonHeaders(),
        body: JSON.stringify({ sortOrder: newOrder }),
      });
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
              <div className="w-20 h-14 md:w-28 md:h-16 rounded overflow-hidden flex-shrink-0 relative group">
                <img
                  src={`/fandoms/${fandom.stripImage}`}
                  alt={fandom.displayName}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    setUploadingId(fandom.id);
                    fileRef.current?.click();
                  }}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Upload size={16} style={{ color: BRAND.colors.gold }} />
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

        {/* Navigation */}
        <div className="mt-8 pt-6 flex gap-6 justify-center"
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
