import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { getUserProfile, setUserPreferences } from '../services/firebaseService';
import { LoadingSpinner } from './OperatorConsole';
import { useTranslation } from '../i18n';

interface Props {
  user: User;
  onClose: () => void;
  onSaved?: () => void;
}

const ProfileModal: React.FC<Props> = ({ user, onClose, onSaved }) => {
  const [displayName, setDisplayName] = useState<string>(user.displayName || '');
  const [photoURL, setPhotoURL] = useState<string>(user.photoURL || '');
  const [preferredLanguage, setPreferredLanguage] = useState<'English' | 'Spanish'>('English');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { t } = useTranslation();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      const profile = await getUserProfile(user.uid);
      if (!mounted) return;
      if (profile) {
        setDisplayName(profile.displayName || '');
        setPhotoURL(profile.photoURL || '');
        setPreferredLanguage((profile.preferredLanguage as any) || 'English');
      }
      setIsLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [user.uid]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await setUserPreferences(user.uid, { displayName: displayName || null, photoURL: photoURL || null, preferredLanguage });
    setIsSaving(false);
    if (success) {
      try {
        // Update the Firebase auth user profile so UI tied to auth updates immediately
        await updateProfile(user, { 
          displayName: displayName || null,
          photoURL: photoURL || null
        });
        // Update localStorage with new language preference
        localStorage.setItem('preferredLanguage', preferredLanguage);
      } catch (err) {
        // Non-fatal: we still proceed to close and notify
        console.warn('Could not update auth profile:', err);
      }

      // Dispatch a profile-updated event so other parts of the app (I18nProvider / App) can react
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          // Debug: log the outgoing event to aid troubleshooting
          // eslint-disable-next-line no-console
          console.debug('[ProfileModal] dispatching profile-updated', { preferredLanguage });
          window.dispatchEvent(new CustomEvent('profile-updated', { detail: { preferredLanguage } }));
        }
      } catch (e) {
        // ignore in non-DOM envs
      }

      if (onSaved) onSaved();
      onClose();
    } else {
      alert(t('profile.save') + ' failed. Check console for details.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" role="dialog" aria-modal="true">
  <h2 className="text-xl font-bold text-white mb-4">{t('profile.title')}</h2>
        {isLoading ? (
          <div className="p-6 text-center"><LoadingSpinner /></div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">{t('profile.displayName')}</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-slate-200" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">{t('profile.avatar')}</label>
              <input value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-slate-200" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">{t('profile.language')}</label>
              <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value as 'English' | 'Spanish')} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-slate-200">
                <option>English</option>
                <option>Spanish</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button onClick={onClose} className="px-4 py-2 rounded-md text-slate-300 hover:bg-slate-700">{t('profile.cancel')}</button>
              <button onClick={handleSave} className="px-4 py-2 bg-sky-600 text-white rounded-md disabled:opacity-60" disabled={isSaving}>
                {isSaving ? <LoadingSpinner /> : t('profile.save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
