import React, { useEffect, useState } from 'react';
import { Domain } from '../../types/domain';
import {
  listDomains,
  createDomain,
  updateDomain,
  deleteDomain
} from '../../services/domainService';
import DomainModal from './DomainModal';
import { Icons } from '../../constants';

const DomainManagement: React.FC<{ currentUser: firebase.User }> = ({ currentUser }) => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listDomains();
      setDomains(data);
    } catch (err) {
      setError('Failed to load domains');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDomain = async (data: Partial<Domain>) => {
    const domain = await createDomain(currentUser.uid, data as any);
    if (domain) {
      setDomains(prev => [...prev, domain]);
    }
  };

  const handleUpdateDomain = async (data: Partial<Domain>) => {
    if (!selectedDomain) return;
    const success = await updateDomain(currentUser.uid, selectedDomain.id, data);
    if (success) {
      setDomains(prev =>
        prev.map(d =>
          d.id === selectedDomain.id ? { ...d, ...data } : d
        )
      );
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!window.confirm('Are you sure you want to delete this domain? This action cannot be undone.')) {
      return;
    }

    setDeleting(domainId);
    try {
      const success = await deleteDomain(currentUser.uid, domainId);
      if (success) {
        setDomains(prev => prev.filter(d => d.id !== domainId));
      } else {
        throw new Error('Failed to delete domain');
      }
    } catch (err) {
      setError('Failed to delete domain');
    } finally {
      setDeleting(null);
    }
  };

  const openCreateModal = () => {
    setSelectedDomain(null);
    setIsModalOpen(true);
  };

  const openEditModal = (domain: Domain) => {
    setSelectedDomain(domain);
    setIsModalOpen(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Domains</h2>
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2"
        >
          <Icons.Plus />
          Add Domain
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded p-3 text-red-400">
          {error}
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Domain
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Users
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Workflows
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Last Activity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  API Usage
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {domains.map(domain => (
                <tr key={domain.id} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {domain.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {formatNumber(domain.activeUsers)} active
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {formatNumber(domain.workflowCount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {domain.lastWorkflowCreated 
                      ? formatDate(domain.lastWorkflowCreated)
                      : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-700 rounded-full h-2 w-24">
                        <div
                          className="bg-indigo-600 rounded-full h-2"
                          style={{
                            width: `${Math.min(100, (domain.monthlyUsage.apiCalls / (domain.settings.maxApiCalls || 1000)) * 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-slate-400 text-xs">
                        {formatNumber(domain.monthlyUsage.apiCalls)}
                        {domain.settings.maxApiCalls 
                          ? `/${formatNumber(domain.settings.maxApiCalls)}`
                          : ''
                        }
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(domain)}
                        className="text-slate-400 hover:text-white"
                        title="Edit domain"
                      >
                        <Icons.Edit />
                      </button>
                      <button
                        onClick={() => handleDeleteDomain(domain.id)}
                        disabled={deleting === domain.id}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                        title="Delete domain"
                      >
                        {deleting === domain.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Icons.Trash />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {domains.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No domains found. Create your first domain to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DomainModal
        domain={selectedDomain || undefined}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={selectedDomain ? handleUpdateDomain : handleCreateDomain}
      />
    </div>
  );
};

export default DomainManagement;