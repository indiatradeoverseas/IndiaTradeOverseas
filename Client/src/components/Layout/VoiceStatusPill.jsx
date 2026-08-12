import React from 'react';
import { FiMic, FiMicOff, FiAlertCircle } from 'react-icons/fi';
import { useVoiceAssistant } from '../../context/VoiceAssistantContext';

const STATUS_CONFIG = {
  listening: { icon: FiMic, label: 'Listening', color: 'var(--crm-accent)' },
  muted: { icon: FiMicOff, label: 'Muted', color: 'var(--crm-ink-faint)' },
  blocked: { icon: FiAlertCircle, label: 'Mic blocked - click to retry', color: '#ef4444' },
  off: null,
  unsupported: null
};

export default function VoiceStatusPill() {
  const { status, retryListening } = useVoiceAssistant();
  const config = STATUS_CONFIG[status];

  if (!config) return null;

  const Icon = config.icon;
  const clickable = status === 'blocked';

  return (
    <button
      type="button"
      onClick={clickable ? retryListening : undefined}
      disabled={!clickable}
      className="hidden md:flex items-center gap-1.5 text-[10px] uppercase tracking-wide px-3 py-1.5 rounded-sm border transition-all"
      style={{
        fontFamily: 'var(--crm-font-mono)',
        color: config.color,
        borderColor: 'var(--crm-line)',
        background: 'var(--crm-bg-raised)',
        cursor: clickable ? 'pointer' : 'default'
      }}
      aria-label={config.label}
      title={config.label}
    >
      <Icon size={12} />
      <span>{config.label}</span>
    </button>
  );
}
