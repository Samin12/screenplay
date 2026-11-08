import { pt } from './tokens';
import type { OUState } from './types';

// Settings content, from OpenUsage's SettingsScreen.swift (General / Display / Alerts / Advanced).
export const SETTINGS_TABS: { id: OUState['settingsTab']; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'display', label: 'Display', icon: 'app-window' },
  { id: 'alerts', label: 'Alerts', icon: 'bell' },
  { id: 'advanced', label: 'Advanced', icon: 'terminal' },
];

export type SettingsRow = { label: string; sub?: string; kind: 'toggle' | 'picker' | 'button' | 'shortcut' | 'action'; value?: string };
export type SettingsSection = { header?: string; rows: SettingsRow[]; footer?: string; preview?: boolean };

export const SETTINGS: Record<OUState['settingsTab'], SettingsSection[]> = {
  general: [
    {
      rows: [
        { label: 'Launch at Login', kind: 'toggle' },
        { label: 'Default Tab', kind: 'picker', value: 'Priority' },
        { label: 'Global Shortcut', kind: 'shortcut', value: 'Record Shortcut' },
      ],
    },
    {
      header: 'Updates',
      rows: [
        { label: 'Check Automatically', kind: 'toggle' },
        { label: 'Beta Updates', kind: 'toggle' },
        { label: 'Check for Updates…', kind: 'action' },
      ],
    },
  ],
  display: [
    {
      header: 'Priority Icons',
      preview: true,
      rows: [{ label: 'Show In Menu Bar', kind: 'picker', value: 'Up to 3' }],
      footer: 'OpenUsage intelligently displays the usage icons at risk of running out and that require your attention.',
    },
    {
      header: 'Appearance',
      rows: [
        { label: 'Theme', kind: 'picker', value: 'System' },
        { label: 'Time Format', kind: 'picker', value: 'Auto' },
      ],
    },
    {
      header: 'Usage',
      rows: [
        { label: 'Show Usage As', kind: 'picker', value: '52% left' },
        { label: 'Reset Times', kind: 'picker', value: 'Resets 3h 25m' },
      ],
    },
  ],
  alerts: [
    {
      header: 'Notifications',
      rows: [
        { label: 'Almost Out', sub: 'A limit drops under 10%.', kind: 'toggle' },
        { label: 'Cutting It Close', sub: 'A limit drops under 30%.', kind: 'toggle' },
        { label: 'Will Run Out', sub: 'A limit may run out before its reset.', kind: 'toggle' },
      ],
    },
  ],
  advanced: [
    {
      header: 'Privacy',
      rows: [
        { label: 'Hide From Screen Share', kind: 'toggle' },
        { label: 'Help Make OpenUsage Better', kind: 'toggle' },
      ],
      footer: 'While your screen is shared or recorded, the menu bar shows the app icon instead of your usage.',
    },
    { header: 'Command Line', rows: [{ label: 'Terminal Helper', kind: 'button', value: 'Install…' }], footer: 'Adds a global `openusage` command that prints the usage the app last fetched.' },
    { header: 'Debug', rows: [{ label: 'Log Level', kind: 'picker', value: 'Info' }] },
  ],
};


// Panel height (px) for a Settings tab, from the same numbers SettingsScreen lays out with.
export const settingsHeight = (tab: OUState['settingsTab']) => {
  let h = 14 + 28 + 10 + 44 + 12; // top pad, title row, gap, tab bar, gap
  for (const sec of SETTINGS[tab] ?? []) {
    if (sec.header) h += 19;
    if (sec.preview) h += 44;
    for (const r of sec.rows) h += r.sub ? 46 : 36;
    if (sec.footer) h += 6 + Math.ceil(sec.footer.length / 52) * 15;
    h += 14;
  }
  return pt(h + 4);
};
