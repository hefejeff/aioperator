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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-wm-neutral/30 p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-wm-blue">
            {domain ? 'Edit Domain' : 'New Domain'}
          </h2>
          <button
            onClick={onClose}
            className="text-wm-blue/60 hover:text-wm-blue transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-wm-blue/70 mb-1">
              Domain Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white border border-wm-neutral/30 rounded-lg px-3 py-2 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-wm-blue/70 mb-1">
              Allowed Email Domains (one per line)
            </label>
            <textarea
              value={allowedEmails}
              onChange={e => setAllowedEmails(e.target.value)}
              className="w-full bg-white border border-wm-neutral/30 rounded-lg px-3 py-2 text-wm-blue h-24 focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow resize-y"
              placeholder="example.com&#10;subdomain.example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-wm-blue/70 mb-1">
                Max Workflows
              </label>
              <input
                type="number"
                value={maxWorkflows}
                onChange={e => setMaxWorkflows(e.target.value)}
                className="w-full bg-white border border-wm-neutral/30 rounded-lg px-3 py-2 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-wm-blue/70 mb-1">
                Max API Calls
              </label>
              <input
                type="number"
                value={maxApiCalls}
                onChange={e => setMaxApiCalls(e.target.value)}
                className="w-full bg-white border border-wm-neutral/30 rounded-lg px-3 py-2 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none transition-shadow"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-wm-blue/70 hover:bg-wm-neutral/20 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-bold bg-wm-accent text-white rounded-lg hover:bg-wm-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
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