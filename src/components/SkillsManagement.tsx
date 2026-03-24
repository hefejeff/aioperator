import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { Icons } from '../constants';
import type { SkillMarkdownFile } from '../types';
import {
  deleteSkillMarkdownFile,
  listSkillMarkdownFiles,
  saveSkillMarkdownFile,
} from '../services/firebaseService';

interface SkillsManagementProps {
  currentUser: User;
}

type SkillDraft = {
  id?: string;
  title: string;
  fileName: string;
  description: string;
  markdown: string;
};

const EMPTY_DRAFT: SkillDraft = {
  title: '',
  fileName: '',
  description: '',
  markdown: '# New Skill\n\nDescribe the skill, learning objectives, and examples.',
};

const toDraft = (skill: SkillMarkdownFile): SkillDraft => ({
  id: skill.id,
  title: skill.title,
  fileName: skill.fileName,
  description: skill.description || '',
  markdown: skill.markdown,
});

const formatTimestamp = (timestamp: number): string => {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toLocaleString();
};

const slugify = (value: string): string => {
  const sanitized = value
    .toLowerCase()
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9\s-_]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return `${sanitized || 'new-skill'}.md`;
};

const downloadMarkdownFile = (fileName: string, markdown: string) => {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'skill.md';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const SkillsManagement: React.FC<SkillsManagementProps> = ({ currentUser }) => {
  const [skills, setSkills] = useState<SkillMarkdownFile[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SkillDraft>(EMPTY_DRAFT);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listSkillMarkdownFiles();
      setSkills(items);
      if (selectedSkillId) {
        const selected = items.find((item) => item.id === selectedSkillId);
        if (selected) {
          setDraft(toDraft(selected));
          return;
        }
      }
      if (items.length > 0) {
        setSelectedSkillId(items[0].id);
        setDraft(toDraft(items[0]));
      } else {
        setSelectedSkillId(null);
        setDraft(EMPTY_DRAFT);
      }
    } catch {
      setError('Failed to load skill markdown files.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSkills = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return skills;
    return skills.filter((item) =>
      [item.title, item.fileName, item.description || '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [skills, searchTerm]);

  const handleSelectSkill = (skill: SkillMarkdownFile) => {
    setSelectedSkillId(skill.id);
    setDraft(toDraft(skill));
    setSuccess(null);
    setError(null);
  };

  const handleCreateNew = () => {
    setSelectedSkillId(null);
    setDraft(EMPTY_DRAFT);
    setSuccess(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await saveSkillMarkdownFile({
        id: draft.id,
        title: draft.title,
        fileName: draft.fileName || slugify(draft.title),
        description: draft.description,
        markdown: draft.markdown,
        updatedBy: currentUser.uid,
      });

      setDraft(toDraft(saved));
      setSelectedSkillId(saved.id);
      await loadSkills();
      setSuccess('Skill markdown saved.');
    } catch {
      setError('Failed to save skill markdown file.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft.id) return;
    if (!window.confirm(`Delete ${draft.fileName || draft.title}? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteSkillMarkdownFile(draft.id);
      setSelectedSkillId(null);
      setDraft(EMPTY_DRAFT);
      await loadSkills();
      setSuccess('Skill markdown deleted.');
    } catch {
      setError('Failed to delete skill markdown file.');
    } finally {
      setDeleting(false);
    }
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    try {
      const content = await file.text();
      const titleFromFile = file.name.replace(/\.md$/i, '').replace(/[-_]/g, ' ').trim();
      setSelectedSkillId(null);
      setDraft({
        title: titleFromFile || 'Imported Skill',
        fileName: file.name.toLowerCase().endsWith('.md') ? file.name : `${file.name}.md`,
        description: '',
        markdown: content,
      });
      setSuccess('Imported markdown. Save to persist.');
      setError(null);
    } catch {
      setError('Could not import markdown file.');
    }
  };

  const selectedSkillMeta = skills.find((item) => item.id === selectedSkillId) || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white border border-wm-neutral/30 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-bold text-wm-blue">Skills .md Files</h2>
          <button
            onClick={handleCreateNew}
            className="px-3 py-1.5 text-sm font-bold bg-wm-accent text-white rounded-lg hover:bg-wm-accent/90 transition-colors"
          >
            New
          </button>
        </div>

        <div className="mb-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search skills"
            className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg text-sm focus:outline-none focus:border-wm-accent"
          />
        </div>

        <label className="mb-3 inline-flex items-center gap-2 px-3 py-2 border border-wm-neutral/30 rounded-lg text-sm text-wm-blue hover:bg-wm-neutral/10 transition-colors cursor-pointer">
          <Icons.Upload />
          Import .md
          <input
            type="file"
            accept=".md,text/markdown"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              void handleImport(file);
              event.target.value = '';
            }}
          />
        </label>

        <div className="space-y-2 max-h-[480px] overflow-auto pr-1">
          {loading ? (
            <div className="text-sm text-wm-blue/60">Loading...</div>
          ) : filteredSkills.length === 0 ? (
            <div className="text-sm text-wm-blue/60">No skills found.</div>
          ) : (
            filteredSkills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => handleSelectSkill(skill)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedSkillId === skill.id
                    ? 'border-wm-accent bg-wm-accent/5'
                    : 'border-wm-neutral/20 hover:border-wm-accent/40'
                }`}
              >
                <p className="font-semibold text-sm text-wm-blue truncate">{skill.title}</p>
                <p className="text-sm text-wm-blue/60 truncate">{skill.fileName}</p>
                <p className="text-sm text-wm-blue/40 mt-1">Updated {formatTimestamp(skill.updatedAt)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white border border-wm-neutral/30 rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold text-wm-blue">Skill Markdown Editor</h3>
            <p className="text-sm text-wm-blue/60 mt-1">
              Create and maintain skill markdown files for the project library.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadMarkdownFile(draft.fileName || slugify(draft.title), draft.markdown)}
              className="px-3 py-2 border border-wm-neutral/30 rounded-lg text-sm font-bold text-wm-blue hover:bg-wm-neutral/10"
            >
              Download .md
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-wm-accent text-white rounded-lg text-sm font-bold hover:bg-wm-accent/90 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleDelete}
              disabled={!draft.id || deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {success && <p className="text-sm text-green-700 mb-3">{success}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-wm-blue/70 mb-1">Title</label>
            <input
              value={draft.title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                setDraft((prev) => ({
                  ...prev,
                  title: nextTitle,
                  fileName: prev.id ? prev.fileName : slugify(nextTitle),
                }));
              }}
              placeholder="Prompt Engineering Basics"
              className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg text-sm focus:outline-none focus:border-wm-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-wm-blue/70 mb-1">File name</label>
            <input
              value={draft.fileName}
              onChange={(event) => setDraft((prev) => ({ ...prev, fileName: event.target.value }))}
              placeholder="prompt-engineering-basics.md"
              className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg text-sm font-mono focus:outline-none focus:border-wm-accent"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold text-wm-blue/70 mb-1">Description</label>
          <input
            value={draft.description}
            onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Short summary used in the admin list"
            className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg text-sm focus:outline-none focus:border-wm-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-wm-blue/70 mb-1">Markdown</label>
          <textarea
            value={draft.markdown}
            onChange={(event) => setDraft((prev) => ({ ...prev, markdown: event.target.value }))}
            rows={18}
            className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg text-sm font-mono focus:outline-none focus:border-wm-accent"
            placeholder="# Skill title"
          />
        </div>

        {selectedSkillMeta && (
          <div className="mt-4 text-sm text-wm-blue/50">
            Last updated: {formatTimestamp(selectedSkillMeta.updatedAt)}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillsManagement;
