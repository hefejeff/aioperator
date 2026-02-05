import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { listAllUsers, setUserRole, deleteUser, getScenarios, createNewUser } from '../services/firebaseService';
import type { Role, Scenario, UserProfile } from '../types';
import { Icons } from '../constants';
import BusinessDomainManagement from './BusinessDomainManagement';

interface AdminDashboardProps {
  currentUser: User;
}

const ROLE_OPTIONS: Role[] = ['SUPER_ADMIN', 'ADMIN', 'PRO_USER', 'USER'];

const RoleBadge: React.FC<{ role?: Role | null }> = ({ role }) => {
  const color = role === 'SUPER_ADMIN' ? 'bg-wm-pink' : role === 'ADMIN' ? 'bg-wm-accent' : role === 'PRO_USER' ? 'bg-green-600' : 'bg-wm-neutral';
  return <span className={`text-xs ${color} text-white px-2 py-0.5 rounded font-bold`}>{role || 'USER'}</span>;
};

const UsersTab: React.FC<{
  users: UserProfile[];
  totalUsers: number;
  totalScenarios: number;
  canDeleteUsers: boolean;
  currentUser: User;
  saving: string | null;
  deleting: string | null;
  onChangeRole: (uid: string, newRole: Role) => void;
  onDeleteUser: (uid: string, userEmail: string) => void;
  onCreateUser: () => void;
}> = ({
  users,
  totalUsers,
  totalScenarios,
  canDeleteUsers,
  currentUser,
  saving,
  deleting,
  onChangeRole,
  onDeleteUser,
  onCreateUser,
}) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white border border-wm-neutral/30 rounded-xl p-4 shadow-sm">
        <p className="text-wm-blue/60 text-sm font-bold">Users</p>
        <p className="text-3xl font-bold text-wm-blue">{totalUsers}</p>
      </div>
      <div className="bg-white border border-wm-neutral/30 rounded-xl p-4 shadow-sm">
        <p className="text-wm-blue/60 text-sm font-bold">Scenarios</p>
        <p className="text-3xl font-bold text-wm-blue">{totalScenarios}</p>
      </div>
    </div>

    <div className="bg-white border border-wm-neutral/30 rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-wm-blue">Users & Roles</h2>
        <button
          onClick={onCreateUser}
          className="bg-wm-accent hover:bg-wm-accent/90 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New User
        </button>
      </div>
      {canDeleteUsers && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <Icons.Star />
            <span className="font-medium">Admin Warning:</span>
          </div>
          <p className="text-red-600 text-sm mt-1">
            Deleting a user will permanently remove all their data including scenarios, workflows, and evaluations. This action cannot be undone.
          </p>
        </div>
      )}
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-wm-blue/70 border-b border-wm-neutral/30">
              <th className="text-left py-2 pr-4 font-bold">Name</th>
              <th className="text-left py-2 pr-4 font-bold">Email</th>
              <th className="text-left py-2 pr-4 font-bold">Role</th>
              <th className="text-left py-2 pr-4 font-bold">Role Actions</th>
              {canDeleteUsers && <th className="text-left py-2 font-bold">Delete</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.uid} className="border-b border-wm-neutral/20">
                <td className="py-2 pr-4 text-wm-blue">{u.displayName || '-'}</td>
                <td className="py-2 pr-4 text-wm-blue/60">{u.email || '-'}</td>
                <td className="py-2 pr-4"><RoleBadge role={u.role || 'USER'} /></td>
                <td className="py-2 pr-4">
                  <select
                    className="bg-white border border-wm-neutral/30 text-wm-blue rounded px-2 py-1 focus:ring-2 focus:ring-wm-accent focus:outline-none"
                    value={(u.role as Role) || 'USER'}
                    disabled={saving === u.uid}
                    onChange={(e) => onChangeRole(u.uid, e.target.value as Role)}
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                {canDeleteUsers && (
                  <td className="py-2">
                    <button
                      onClick={() => onDeleteUser(u.uid, u.email || u.displayName || 'Unknown User')}
                      disabled={deleting === u.uid || u.uid === currentUser.uid}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                      title={u.uid === currentUser.uid ? "Cannot delete your own account" : "Delete user and all their data"}
                    >
                      {deleting === u.uid ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Icons.Trash />
                          Delete
                        </>
                      )}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'domains'>('users');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'USER' as Role
  });

  const generateRandomPassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const openCreateUserModal = () => {
    setNewUserForm({
      email: '',
      password: generateRandomPassword(),
      displayName: '',
      role: 'USER'
    });
    setShowCreateUserModal(true);
  };

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const [u, sc] = await Promise.all([
          listAllUsers(),
          getScenarios(currentUser.uid),
        ]);
        setUsers(u);
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

  const onDeleteUser = async (uid: string, userEmail: string) => {
    // Confirm deletion
    const confirmMessage = `Are you sure you want to delete user "${userEmail}"? This will permanently delete all their data including scenarios, workflows, and evaluations. This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Prevent self-deletion
    if (uid === currentUser.uid) {
      setError('You cannot delete your own account.');
      return;
    }

    setDeleting(uid);
    setError(null);
    try {
      const ok = await deleteUser(currentUser.uid, uid);
      if (!ok) throw new Error('delete-failed');
      setUsers(prev => prev.filter(u => u.uid !== uid));
    } catch (e) {
      setError('Could not delete user.');
    } finally {
      setDeleting(null);
    }
  };

  const onCreateUser = async () => {
    if (!newUserForm.email.trim() || !newUserForm.password.trim() || !newUserForm.displayName.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (newUserForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setCreatingUser(true);
    setError(null);
    try {
      const result = await createNewUser(
        currentUser.uid,
        newUserForm.email.trim(),
        newUserForm.password,
        newUserForm.displayName.trim(),
        newUserForm.role
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      // Refresh users list
      const updatedUsers = await listAllUsers();
      setUsers(updatedUsers);

      // Reset form and close modal
      setNewUserForm({ email: '', password: '', displayName: '', role: 'USER' });
      setShowCreateUserModal(false);
      alert('User created successfully! A password reset email has been sent to the user.');
    } catch (e: any) {
      setError(e.message || 'Could not create user.');
    } finally {
      setCreatingUser(false);
    }
  };

  // Get current user's role to determine permissions
  const currentUserProfile = users.find(u => u.uid === currentUser.uid);
  const currentUserRole = currentUserProfile?.role || 'USER';
  const canDeleteUsers = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'ADMIN';

  return (
    <div className="space-y-8">
      <div className="bg-white border border-wm-neutral/30 rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-wm-blue mb-2 flex items-center gap-2">
          <Icons.ChartBar /> Admin Dashboard
        </h1>
        <p className="text-wm-blue/60">Manage users, roles, and domains.</p>
        {error && <p className="text-red-600 mt-2 font-bold">{error}</p>}
        
        <div className="mt-4 border-b border-wm-neutral/30">
          <nav className="-mb-px flex gap-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 px-1 inline-flex items-center gap-2 text-sm font-bold ${
                activeTab === 'users'
                  ? 'border-b-2 border-wm-accent text-wm-accent'
                  : 'text-wm-blue/60 hover:text-wm-blue'
              }`}
            >
              <Icons.Users />
              Users & Roles
            </button>
            <button
              onClick={() => setActiveTab('domains')}
              className={`pb-3 px-1 inline-flex items-center gap-2 text-sm font-bold ${
                activeTab === 'domains'
                  ? 'border-b-2 border-wm-accent text-wm-accent'
                  : 'text-wm-blue/60 hover:text-wm-blue'
              }`}
            >
              <Icons.Building />
              Domains
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'users' ? (
        <UsersTab
          users={users}
          totalUsers={totalUsers}
          totalScenarios={totalScenarios}
          canDeleteUsers={canDeleteUsers}
          currentUser={currentUser}
          saving={saving}
          deleting={deleting}
          onChangeRole={onChangeRole}
          onDeleteUser={onDeleteUser}
          onCreateUser={openCreateUserModal}
        />
      ) : (
        <BusinessDomainManagement currentUser={currentUser} />
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-wm-blue mb-4">Create New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-wm-blue/70 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newUserForm.displayName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:border-wm-accent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-wm-blue/70 mb-1">Email</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:border-wm-accent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-wm-blue/70 mb-1">Temporary Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="flex-1 px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:border-wm-accent font-mono text-sm"
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setNewUserForm({ ...newUserForm, password: generateRandomPassword() })}
                    className="px-3 py-2 border border-wm-neutral/30 rounded-lg hover:bg-wm-neutral/10 transition-colors"
                    title="Generate new password"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-wm-blue/50 mt-1">Auto-generated. User will receive a password reset email.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-wm-blue/70 mb-1">Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as Role })}
                  className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:border-wm-accent"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setNewUserForm({ email: '', password: '', displayName: '', role: 'USER' });
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-wm-neutral/30 rounded-lg font-bold text-wm-blue hover:bg-wm-neutral/10 transition-colors"
                  disabled={creatingUser}
                >
                  Cancel
                </button>
                <button
                  onClick={onCreateUser}
                  disabled={creatingUser}
                  className="flex-1 px-4 py-2 bg-wm-accent hover:bg-wm-accent/90 disabled:bg-wm-accent/50 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {creatingUser ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;