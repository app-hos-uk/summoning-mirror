import { forwardRef } from 'react';

export type CardVariant = 'midnight-foil' | 'holo-passport';

export interface SelfieCardProps {
  variant: CardVariant;
  fandomName: string;
  selfieUrl: string;
  fandomArtUrl: string;
  serial: string;
  chapter?: string;
  stampedAt: Date;
  tier?: string;
  memberLabel?: string;
}

function formatSerial(s: string): string {
  return s.replace(/^HOS-NYC-/, '').padStart(5, '0');
}

function formatDate1A(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate1D(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}·${dd}·${yy}`;
}

function formatDateMRZ(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${dd}`;
}

function buildMRZ(fandomName: string, chapter: string, d: Date, serial: string): string {
  const fn = fandomName.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const ch = chapter.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const line1 = `HOS<<${fn}<<FAN<<${ch}<<${d.getFullYear()}<<<<<<<<`;
  const line2 = `${formatSerial(serial)}<LAUNCH<${formatDateMRZ(d)}<M<CURATEYOURUNIVERSE`;
  return `${line1}\n${line2}`;
}

const cornerMark = (pos: 'tl' | 'tr' | 'bl' | 'br', color: string) => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 20,
    height: 20,
    pointerEvents: 'none',
  };
  const borderStyle = `1px solid ${color}`;
  switch (pos) {
    case 'tl': return { ...base, top: 8, left: 8, borderTop: borderStyle, borderLeft: borderStyle };
    case 'tr': return { ...base, top: 8, right: 8, borderTop: borderStyle, borderRight: borderStyle };
    case 'bl': return { ...base, bottom: 8, left: 8, borderBottom: borderStyle, borderLeft: borderStyle };
    case 'br': return { ...base, bottom: 8, right: 8, borderBottom: borderStyle, borderRight: borderStyle };
  }
};

function MidnightFoil({ selfieUrl, fandomArtUrl, fandomName, serial, stampedAt, memberLabel }: SelfieCardProps) {
  const serialFmt = formatSerial(serial);
  const member = memberLabel || `MEMBER · ${serialFmt}`;
  const goldBorder = 'rgba(212,169,74,0.7)';

  return (
    <div style={{
      width: 560, height: 760, borderRadius: 6, padding: 16,
      background: 'radial-gradient(120% 90% at 50% 0%, #17223a 0%, #0a0f1c 55%, #060912 100%)',
      boxShadow: '0 40px 80px -30px rgba(0,0,0,0.9), inset 0 0 0 1px #d4a94a, inset 0 0 0 2px #0a0f1c, inset 0 0 0 3px rgba(212,169,74,0.35)',
      fontFamily: "'Inter', sans-serif",
      color: '#eae6dc',
    }}>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header — Logo + Wordogram horizontal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/branding/emblem.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <img src="/branding/wordogram.png" alt="House of Spells" style={{ height: 18, objectFit: 'contain' }} />
          </div>
          <div style={{ font: "600 10px/1 'JetBrains Mono', monospace", letterSpacing: '0.2em', color: '#8a8578' }}>
            NYC · MMXXVI
          </div>
        </div>

        {/* Diptych */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 10 }}>
          {/* Selfie */}
          <div style={{
            position: 'relative', aspectRatio: '4/5', borderRadius: 3, overflow: 'hidden',
            boxShadow: 'inset 0 0 0 1px rgba(212,169,74,0.4)',
          }}>
            <img src={selfieUrl} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={cornerMark('tl', goldBorder)} />
            <div style={cornerMark('tr', goldBorder)} />
            <div style={cornerMark('bl', goldBorder)} />
            <div style={cornerMark('br', goldBorder)} />
            <div style={{
              position: 'absolute', bottom: 12, left: 12,
              font: "500 8px/1 'JetBrains Mono', monospace", letterSpacing: '0.2em', color: '#eae6dc',
            }}>{member}</div>
          </div>
          {/* Fandom art */}
          <div style={{
            position: 'relative', aspectRatio: '4/5', borderRadius: 3, overflow: 'hidden',
            boxShadow: 'inset 0 0 0 1px rgba(212,169,74,0.4)',
          }}>
            <img src={fandomArtUrl} alt="Fandom" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={cornerMark('tl', goldBorder)} />
            <div style={cornerMark('tr', goldBorder)} />
            <div style={cornerMark('bl', goldBorder)} />
            <div style={cornerMark('br', goldBorder)} />
            <div style={{
              position: 'absolute', top: 10, right: 10,
              font: "600 8px/1 'JetBrains Mono', monospace", letterSpacing: '0.2em',
              color: '#0b0d12', background: '#d4a94a', padding: '4px 6px', borderRadius: 2,
            }}>FANDOM</div>
          </div>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center', padding: '14px 12px 4px',
        }}>
          <div style={{
            font: "500 9px/1 'JetBrains Mono', monospace", letterSpacing: '0.32em', color: '#8a8578', marginBottom: 10,
          }}>— CERTIFIED FAN OF —</div>
          <div style={{
            font: "700 42px/1 'Cinzel', serif", letterSpacing: '0.04em', color: '#d4a94a',
            textShadow: '0 0 30px rgba(212,169,74,0.25)',
          }}>{fandomName.toUpperCase()}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, color: '#d4a94a', opacity: 0.7 }}>
            <div style={{ width: 60, height: 1, background: '#d4a94a' }} />
            <div style={{ width: 6, height: 6, transform: 'rotate(45deg)', background: '#d4a94a' }} />
            <div style={{ width: 60, height: 1, background: '#d4a94a' }} />
          </div>
          <div style={{
            marginTop: 10,
            font: "400 11px/1.5 'Cormorant Garamond', serif", fontStyle: 'italic',
            color: '#b8b09a', maxWidth: 360,
          }}>
            Curated at Times Square during Fan Curation Days, opening week of the New York flagship.
          </div>
          {/* Wordogram in body */}
          <img src="/branding/wordogram.png" alt="" style={{
            marginTop: 14, width: 200, objectFit: 'contain', opacity: 0.7,
          }} />
        </div>

        {/* Footer — Logo + location + serial */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          borderTop: '1px solid rgba(212,169,74,0.2)', paddingTop: 10, marginTop: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/branding/emblem-circle.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <div>
              <div style={{
                font: "500 8px/1 'JetBrains Mono', monospace", letterSpacing: '0.2em', color: '#8a8578',
              }}>CURATE YOUR UNIVERSE</div>
              <div style={{
                font: "400 8px/1 'JetBrains Mono', monospace", letterSpacing: '0.12em', color: '#6c6858', marginTop: 4,
              }}>Times Square, New York</div>
            </div>
          </div>
          <div style={{
            textAlign: 'right', font: "400 9px/1.5 'JetBrains Mono', monospace", color: '#6c6858',
          }}>
            Nº {serialFmt}<br />
            {formatDate1A(stampedAt)}<br />
            Launch Series
          </div>
        </div>
      </div>
    </div>
  );
}

function HoloPassport({ selfieUrl, fandomArtUrl, fandomName, serial, chapter = 'NYC · 01', stampedAt, tier = '◆ FOUNDER' }: SelfieCardProps) {
  const serialFmt = formatSerial(serial);

  return (
    <div style={{
      width: 560, height: 760, borderRadius: 22, padding: 2,
      background: 'conic-gradient(from 210deg at 50% 50%, #d4a94a, #7a5cff 20%, #2ecfd6 40%, #d4a94a 60%, #ff6ab0 80%, #d4a94a 100%)',
      boxShadow: '0 40px 80px -30px rgba(0,0,0,0.9)',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 20, background: '#0b0d12', padding: 18,
        display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', overflow: 'hidden',
        fontFamily: "'Inter', sans-serif", color: '#eae6dc',
      }}>
        {/* Holo glow overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(140% 60% at 100% 0%, rgba(46,207,214,0.12), transparent 45%), radial-gradient(120% 60% at 0% 100%, rgba(122,92,255,0.14), transparent 45%)',
        }} />

        {/* Header — Logo + Wordogram horizontal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/branding/emblem.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <div>
              <img src="/branding/wordogram.png" alt="House of Spells" style={{ height: 16, objectFit: 'contain', display: 'block' }} />
              <div style={{
                font: "500 7px/1 'JetBrains Mono', monospace", letterSpacing: '0.22em', color: '#7a8095', marginTop: 4,
              }}>FAN PASSPORT · 2026</div>
            </div>
          </div>
          <div style={{
            font: "700 9px/1 'JetBrains Mono', monospace", letterSpacing: '0.16em', color: '#2ecfd6',
            border: '1px solid rgba(46,207,214,0.5)', padding: '5px 7px', borderRadius: 4,
          }}>◆ VERIFIED</div>
        </div>

        {/* Diptych */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, position: 'relative' }}>
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', aspectRatio: '4/5' }}>
            <img src={selfieUrl} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{
              position: 'absolute', top: 10, left: 10,
              font: "700 8px/1 'JetBrains Mono', monospace", letterSpacing: '0.16em',
              color: '#0b0d12', background: '#2ecfd6', padding: '5px 7px', borderRadius: 3,
            }}>LVL · {serialFmt.slice(-2)}</div>
            <div style={{
              position: 'absolute', bottom: 10, left: 10,
              font: "500 8px/1 'JetBrains Mono', monospace", letterSpacing: '0.2em', color: '#eae6dc',
            }}>HOLDER</div>
          </div>
          <div style={{
            position: 'relative', borderRadius: 14, overflow: 'hidden', aspectRatio: '4/5',
            boxShadow: 'inset 0 0 0 1px rgba(122,92,255,0.4)',
          }}>
            <img src={fandomArtUrl} alt="Fandom" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{
              position: 'absolute', top: 10, right: 10,
              font: "700 8px/1 'JetBrains Mono', monospace", letterSpacing: '0.16em',
              color: '#0b0d12', background: 'linear-gradient(90deg, #d4a94a, #ff6ab0)', padding: '5px 7px', borderRadius: 3,
            }}>FANDOM</div>
            <div style={{
              position: 'absolute', bottom: 10, left: 10,
              font: "500 8px/1 'JetBrains Mono', monospace", letterSpacing: '0.2em', color: '#eae6dc',
            }}>UNIVERSE</div>
          </div>
        </div>

        {/* Fandom block */}
        <div style={{ position: 'relative', padding: '4px 4px 0', textAlign: 'center' }}>
          <div style={{
            font: "500 8px/1 'JetBrains Mono', monospace", letterSpacing: '0.32em', color: '#7a8095',
          }}>— FANDOM —</div>
          <div style={{
            font: "800 36px/1 'Space Grotesk', sans-serif", letterSpacing: '-0.02em', marginTop: 8,
            background: 'linear-gradient(90deg, #d4a94a, #2ecfd6, #7a5cff, #d4a94a)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>{fandomName.toUpperCase()}</div>
        </div>

        {/* Branding — Wordogram on top, logo below */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', position: 'relative', padding: '4px 0',
          minHeight: 80,
        }}>
          <img src="/branding/wordogram.png" alt="" style={{
            width: 220, objectFit: 'contain', opacity: 0.55,
          }} />
          <img src="/branding/emblem-circle.png" alt="" style={{
            width: 50, height: 50, objectFit: 'contain', opacity: 0.55, marginTop: 8,
          }} />
        </div>

        {/* Data grid */}
        <div style={{
          position: 'relative', marginTop: 'auto',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1,
          background: 'rgba(122,92,255,0.25)', border: '1px solid rgba(122,92,255,0.25)', borderRadius: 10, overflow: 'hidden',
        }}>
          <div style={{ background: '#0b0d12', padding: '10px 12px' }}>
            <div style={{ font: "500 7px/1 'JetBrains Mono', monospace", letterSpacing: '0.2em', color: '#7a8095' }}>SERIAL</div>
            <div style={{ font: "600 11px/1 'Space Grotesk', sans-serif", color: '#eae6dc', marginTop: 5 }}>Nº {serialFmt}</div>
          </div>
          <div style={{ background: '#0b0d12', padding: '10px 12px' }}>
            <div style={{ font: "500 7px/1 'JetBrains Mono', monospace", letterSpacing: '0.2em', color: '#7a8095' }}>CHAPTER</div>
            <div style={{ font: "600 11px/1 'Space Grotesk', sans-serif", color: '#eae6dc', marginTop: 5 }}>{chapter}</div>
          </div>
          <div style={{ background: '#0b0d12', padding: '10px 12px' }}>
            <div style={{ font: "500 7px/1 'JetBrains Mono', monospace", letterSpacing: '0.2em', color: '#7a8095' }}>STAMPED</div>
            <div style={{ font: "600 11px/1 'Space Grotesk', sans-serif", color: '#eae6dc', marginTop: 5 }}>{formatDate1D(stampedAt)}</div>
          </div>
          <div style={{ background: '#0b0d12', padding: '10px 12px' }}>
            <div style={{ font: "500 7px/1 'JetBrains Mono', monospace", letterSpacing: '0.2em', color: '#7a8095' }}>TIER</div>
            <div style={{ font: "600 11px/1 'Space Grotesk', sans-serif", color: '#2ecfd6', marginTop: 5 }}>{tier}</div>
          </div>
        </div>

        {/* MRZ */}
        <div style={{
          position: 'relative',
          font: "500 10px/1.4 'JetBrains Mono', monospace", letterSpacing: '0.14em', color: '#7a8095',
          wordBreak: 'break-all', whiteSpace: 'pre-wrap',
        }}>{buildMRZ(fandomName, chapter, stampedAt, serial)}</div>
      </div>
    </div>
  );
}

const SelfieCard = forwardRef<HTMLDivElement, SelfieCardProps>(function SelfieCard(props, ref) {
  return (
    <div ref={ref} style={{ width: 560, height: 760, flexShrink: 0 }}>
      {props.variant === 'midnight-foil' ? <MidnightFoil {...props} /> : <HoloPassport {...props} />}
    </div>
  );
});

export default SelfieCard;
