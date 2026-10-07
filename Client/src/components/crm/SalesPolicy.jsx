import React, { useState } from 'react';
import { FiShield, FiClock, FiCheckCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import axios from '../../api/axiosInstance';
import { useAuth } from '../../hooks/useAuth';

export default function SalesPolicy() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    hotResponseMinutes: '',
    warmResponseMinutes: '',
    nurtureFollowupDays: '',
    reference: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const management =
    ['ADMIN', 'FOUNDER', 'CO_FOUNDER', 'SUPER_ADMIN'].includes(user?.role) ||
    ['ADMIN', 'MANAGEMENT'].includes(user?.department);

  async function load() {
    setLoading(true);
    try {
      const r = await axios.get('/sales-policy');
      if (r.data.data.policy) {
        setForm(r.data.data.policy);
        setMessage('');
      } else {
        setMessage('Management response policy is pending.');
      }
    } catch (e) {
      setMessage(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleOpen = () => {
    if (!open && !form.hotResponseMinutes) {
      load();
    }
    setOpen(!open);
  };

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.patch('/sales-policy', {
        ...form,
        clockBasis: 'ELAPSED_TIME',
        hotResponseMinutes: Number(form.hotResponseMinutes),
        warmResponseMinutes: Number(form.warmResponseMinutes),
        nurtureFollowupDays: Number(form.nurtureFollowupDays)
      });
      setMessage('Management policy recorded successfully.');
    } catch (e) {
      setMessage(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: 'hotResponseMinutes', label: 'Hot Lead Response Threshold', hint: 'Elapsed minutes for hot leads', placeholder: 'e.g. 15' },
    { key: 'warmResponseMinutes', label: 'Warm Lead Response Threshold', hint: 'Elapsed minutes for warm leads', placeholder: 'e.g. 60' },
    { key: 'nurtureFollowupDays', label: 'Nurture Follow-up Interval', hint: 'Elapsed days for nurturing', placeholder: 'e.g. 7' },
    { key: 'reference', label: 'Policy Reference / Notes', hint: 'Board or Management approval ref', placeholder: 'e.g. POL-2026-01' }
  ];

  return (
    <div className="rounded-xl border overflow-hidden transition-all shadow-sm" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}>
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full p-4 flex items-center justify-between text-left transition hover:bg-[var(--crm-bg-sunken)]/50 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg border bg-[var(--crm-bg-sunken)] text-[var(--crm-accent)]" style={{ borderColor: 'var(--crm-line)' }}>
            <FiShield size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--crm-heading)] flex items-center gap-2">
              Sales Response Policy
            </h3>
            <p className="text-xs text-[var(--crm-ink-faint)] mt-0.5">
              Thresholds use elapsed time, including non-working hours. Management must explicitly approve this basis.
            </p>
          </div>
        </div>
        <div className="text-[var(--crm-ink-faint)] shrink-0 ml-2">
          {open ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
        </div>
      </button>

      {open && (
        <div className="border-t p-4 sm:p-5 space-y-4" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}>
          {management ? (
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map(({ key, label, hint, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--crm-ink-faint)]">
                      {label}
                    </label>
                    <input
                      type={key === 'reference' ? 'text' : 'number'}
                      required
                      placeholder={placeholder}
                      value={form[key] ?? ''}
                      onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))}
                      className="w-full bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] text-[var(--crm-heading)] px-3 py-2.5 rounded-lg text-xs outline-none focus:border-[var(--crm-accent)] transition font-mono"
                    />
                    <p className="text-[10px] text-[var(--crm-ink-faint)]">{hint}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--crm-line)' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ background: 'var(--crm-accent)' }}
                >
                  <FiCheckCircle size={14} />
                  {saving ? 'Recording Policy...' : 'Approve & Record Policy'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-xs text-[var(--crm-ink-faint)] italic">
              Management access required to edit policy thresholds.
            </div>
          )}

          {message && (
            <div className="flex items-center gap-2 p-3 rounded-lg border text-xs font-mono" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)', color: 'var(--crm-heading)' }} role="status">
              <FiClock className="text-[var(--crm-accent)] shrink-0" size={14} />
              <span>{message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

