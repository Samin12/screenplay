import React from 'react';
import type { UiState } from '../../app/replica';
import { isHover, isPressed } from '../../app/replica';
import { FONT_UI, Ico } from '../_shared/kit';
import { fittingMenus, rightCluster, STRIP, stripLayout } from './geometry';
import { AppleLogo, Battery, ControlCenter, ProviderIcon } from './Glyphs';
import { C, L, px } from './tokens';
import type { OUData, OUState } from './types';

// macOS menu bar across the top of the plate: Apple menu, the active app's menus, then the status
// area: OpenUsage's strip (provider mark + % left, two of one provider stack), Wi-Fi, battery,
// Control Center, clock. The strip gets the pressed-item pill while the panel is open.

export const MenuBar: React.FC<{ data: OUData; state: OUState; ui: UiState; W: number }> = ({ data, state, ui, W }) => {
  const s = stripLayout(data, state, W);
  const rc = rightCluster(data);
  const hot = isHover(ui, 'menubar-icon') || isPressed(ui, 'menubar-icon') || state.open || state.menu === 'status';
  const txt: React.CSSProperties = { font: `500 ${L.fMenu}px ${FONT_UI}`, color: C.menuText, letterSpacing: '-0.01em', whiteSpace: 'nowrap' };
  let rx = W - rc.right; // running right edge for the right cluster
  const place = (w: number) => {
    const x = rx - w;
    rx = x - rc.gap;
    return x;
  };
  const clockX = place(rc.clockW);
  const ccX = place(rc.cc);
  const batX = place(rc.battery);
  const wifiX = place(rc.wifi);
  const midY = L.menuH / 2;
  return (
    <div data-target="menubar" style={{ position: 'absolute', left: 0, top: 0, width: W, height: L.menuH, background: C.menubar, backdropFilter: 'blur(20px)' }}>
      {/* left: Apple + app menus */}
      <div style={{ position: 'absolute', left: px(26), top: 0, height: L.menuH, display: 'flex', alignItems: 'center', gap: px(34) }}>
        <div data-target="apple-menu" style={{ marginTop: -3 }}>
          <AppleLogo size={px(27)} />
        </div>
        <span data-target="active-app" style={{ ...txt, fontWeight: 700 }}>
          {data.activeApp}
        </span>
        {fittingMenus(data, s.x).map((m) => (
          <span key={m} style={txt}>
            {m}
          </span>
        ))}
      </div>
      {/* OpenUsage strip */}
      <div
        data-target="menubar-icon"
        style={{ position: 'absolute', left: s.x, top: px(5), width: s.w, height: L.menuH - px(10), borderRadius: px(9), background: hot ? C.stripPill : 'transparent' }}
      />
      {s.items.map((it, i) => {
        const stacked = it.values.length > 1;
        return (
          <div
            key={i}
            data-target={`strip-${i + 1}`}
            style={{ position: 'absolute', left: s.xs[i], top: 0, width: s.widths[i], height: L.menuH, display: 'flex', alignItems: 'center', gap: STRIP.iconGap }}
          >
            <ProviderIcon id={it.provider} size={STRIP.icon} color="#fff" />
            {!it.values.length ? null : stacked ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
                {it.values.slice(0, 2).map((v, k) => (
                  <span key={k} style={{ font: `700 ${STRIP.stacked}px/${STRIP.stacked + 1}px ${FONT_UI}`, color: '#fff', letterSpacing: '-0.005em', fontVariantNumeric: 'tabular-nums' }}>
                    {v}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ font: `700 ${STRIP.single}px ${FONT_UI}`, color: '#fff', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{it.values[0]}</span>
            )}
          </div>
        );
      })}
      {/* right cluster */}
      <div data-target="wifi" style={{ position: 'absolute', left: wifiX, top: midY - px(13) }}>
        <Ico name="wifi" size={px(26)} color="#fff" stroke={2.4} />
      </div>
      <div data-target="battery" style={{ position: 'absolute', left: batX, top: midY - px(11) }}>
        <Battery w={rc.battery} />
      </div>
      <div data-target="control-center" style={{ position: 'absolute', left: ccX, top: midY - px(14) }}>
        <ControlCenter size={px(28)} />
      </div>
      <div data-target="clock" style={{ position: 'absolute', left: clockX, width: rc.clockW, top: 0, height: L.menuH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span style={{ ...txt, whiteSpace: 'pre' }}>{data.clock}</span>
      </div>
    </div>
  );
};
