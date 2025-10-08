import React, { useState } from 'react';
import { Domain } from '../../types/domain';
import { Icons } from '../../constants';

interface DomainModalProps {
  domain?: Domain;
  onClose: () => void;
  onSave: (data: Partial<Domain>) => Promise<void>;
  isOpen: boolean;
}

const DomainModal: React.FC<DomainModalProps> = ({
  domain,
  onClose,
  onSave,
  isOpen
}) => {
  const [name, setName] = useState(domain?.name || '');
  const [allowedEmails, setAllowedEmails] = useState(
    domain?.settings.allowedEmails.join('\n') || ''
  );
  const [maxWorkflows, setMaxWorkflows] = useState(
    domain?.settings.maxWorkflows?.toString() || ''
  );
  const [maxApiCalls, setMaxApiCalls] = useState(
    domain?.settings.maxApiCalls?.toString() || ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const data: Partial<Domain> = {
        name,
        settings: {
          allowedEmails: allowedEmails.split('\n').filter(email => email.trim()),
          ...(maxWorkflows ? { maxWorkflows: parseInt(maxWorkflows, 10) } : {}),
          ...(maxApiCalls ? { maxApiCalls: parseInt(maxApiCalls, 10) } : {})
        }
      };

      await onSave(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save domain');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            {domain ? 'Edit Domain' : 'New Domain'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Domain Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Allowed Email Domains (one per line)
            </label>
            <textarea
              value={allowedEmails}
              onChange={e => setAllowedEmails(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white h-24"
              placeholder="example.com&#10;subdomain.example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Max Workflows
              </label>
              <input
                type="number"
                value={maxWorkflows}
                onChange={e => setMaxWorkflows(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Max API Calls
              </label>
              <input
                type="number"
                value={maxApiCalls}
                onChange={e => setMaxApiCalls(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icons.Save />
                  Save Domain
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DomainModal;