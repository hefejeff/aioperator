import React, { useEffect, useState } from 'react';
import type firebase from 'firebase/compat/app';
import { listAllUsers, setUserRole, getGlobalLeaderboard, getScenarios } from '../services/firebaseService';
import type { Role, Scenario, LeaderboardEntry, UserProfile } from '../types';
import { Icons } from '../constants';

interface AdminDashboardProps {
  currentUser: firebase.User;
}

const ROLE_OPTIONS: Role[] = ['SUPER_ADMIN', 'ADMIN', 'PRO_USER', 'USER'];

const RoleBadge: React.FC<{ role?: Role | null }> = ({ role }) => {
  const color = role === 'SUPER_ADMIN' ? 'bg-purple-700' : role === 'ADMIN' ? 'bg-indigo-700' : role === 'PRO_USER' ? 'bg-emerald-700' : 'bg-slate-700';
  return <span className={`text-xs ${color} text-white px-2 py-0.5 rounded`}>{role || 'USER'}</span>;
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const [u, lb, sc] = await Promise.all([
          listAllUsers(),
          getGlobalLeaderboard(10),
          getScenarios(),
        ]);
        setUsers(u);
        setLeaderboard(lb);
        setScenarios(sc);
      } catch (e) {
        setError('Failed to load admin data.');
      }
    })();
  }, []);

  const totalUsers = users.length;
  const totalScenarios = scenarios.length;

  const onChangeRole = async (uid: string, newRole: Role) => {
    setSaving(uid);
    setError(null);
    try {
      const ok = await setUserRole(currentUser.uid, uid, newRole);
      if (!ok) throw new Error('save-failed');
      setUsers(prev => prev.map(u => (u.uid === uid ? { ...u, role: newRole } : u)));
    } catch (e) {
      setError('Could not update role.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
  <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Icons.ChartBar /> Admin Dashboard</h1>
        <p className="text-slate-400">Manage roles and see top stats.</p>
        {error && <p className="text-red-400 mt-2">{error}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Users</p>
          <p className="text-3xl font-bold text-white">{totalUsers}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Scenarios</p>
          <p className="text-3xl font-bold text-white">{totalScenarios}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Top Operators (avg)</p>
          <p className="text-3xl font-bold text-white">{leaderboard.length}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Users & Roles</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-slate-300 border-b border-slate-700">
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-left py-2 pr-4">Email</th>
                <th className="text-left py-2 pr-4">Role</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.uid} className="border-b border-slate-800">
                  <td className="py-2 pr-4 text-slate-200">{u.displayName || '-'}</td>
                  <td className="py-2 pr-4 text-slate-400">{u.email || '-'}</td>
                  <td className="py-2 pr-4"><RoleBadge role={u.role || 'USER'} /></td>
                  <td className="py-2">
                    <select
                      className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1"
                      value={(u.role as Role) || 'USER'}
                      disabled={saving === u.uid}
                      onChange={(e) => onChangeRole(u.uid, e.target.value as Role)}
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Top Operators</h2>
        <ul className="space-y-2">
          {leaderboard.map(entry => (
            <li key={entry.uid} className="flex justify-between text-slate-300">
              <span>{entry.displayName} ({entry.uid.substring(0,6)}…)</span>
              <span className="text-sky-400 font-semibold">{entry.score}</span>
            </li>
          ))}
          {leaderboard.length === 0 && <li className="text-slate-500">No data</li>}
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
