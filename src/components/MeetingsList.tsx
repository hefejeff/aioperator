import React, { useState } from 'react';
import type { Meeting } from '../types';
import { useTranslation } from '../i18n';

interface MeetingsListProps {
  meetings: Meeting[];
  onAddMeeting: (meeting: Omit<Meeting, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateMeeting: (meetingId: string, meeting: Omit<Meeting, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteMeeting: (meetingId: string) => Promise<void>;
  isLoading?: boolean;
}

const MeetingsList: React.FC<MeetingsListProps> = ({
  meetings,
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [step, setStep] = useState<'transcript' | 'edit'>('transcript');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transcriptInput, setTranscriptInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'Project Kickoff' as Meeting['type'],
    date: '',
    time: '',
    participants: '',
    transcript: '',
    summary: '',
  });
  const [isSummarizing, setIsSummarizing] = useState(false);

  const selectedMeeting = meetings.find(m => m.id === selectedId);

  const handleAddClick = () => {
    setTranscriptInput('');
    setFormData({ title: '', type: 'Project Kickoff' as Meeting['type'], date: '', time: '', participants: '', transcript: '', summary: '' });
    setEditingId(null);
    setStep('transcript');
    setIsAdding(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setTranscriptInput(text);
    } catch (error) {
      console.error('Failed to read file:', error);
      alert('Failed to read file');
    }
  };

  const generateSummary = async () => {
    if (!formData.transcript.trim()) {
      alert('Please add a transcript first');
      return;
    }

    setIsSummarizing(true);
    try {
      const mod = await import('../services/geminiService');
      const prompt = `You are a meeting analyst. Create a concise bullet-point summary tailored to the meeting type: ${formData.type || 'Unknown'}.

    If the type is:
    - Project Kickoff: summarize goals, scope, timeline, roles/owners, risks, and next steps.
    - Functional High Level Overview: summarize processes, pain points, opportunities, systems, and success metrics.
    - Functional Deep Dive Session: summarize detailed requirements, edge cases, data inputs/outputs, integrations, constraints, and acceptance criteria.
    - DSU: summarize progress since last update, blockers, plans for next 24 hours, and risks.
    - Other types: summarize key decisions, action items, and takeaways.

    TRANSCRIPT:
    ${formData.transcript}

    Provide only the summary, formatted as bullet points with clear labels when relevant.`;

      const response = await mod.generateText(prompt, null, { temperature: 0.3 });
      
      if (response) {
        setFormData(prev => ({ ...prev, summary: response.trim() }));
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert('Failed to generate summary');
    } finally {
      setIsSummarizing(false);
    }
  };

  const extractMeetingDetails = async () => {
    if (!transcriptInput.trim()) {
      alert('Please paste or upload a transcript');
      return;
    }

    setIsExtracting(true);
    try {
      const mod = await import('../services/geminiService');
      const prompt = `Extract meeting details from the following transcript. Return a JSON object with these fields (be concise):
    - title: Brief meeting title (max 50 chars)
    - type: One of [Project Kickoff, Functional High Level Overview, Functional Deep Dive Session, DSU, Technical Discovery, Stakeholder Interview, Requirements Gathering, Other]
    - date: Date in YYYY-MM-DD format (estimate if not explicit)
    - time: Start time in HH:mm format (estimate if not explicit)
    - participants: Array of participant names
    - summary: Bullet-point summary tailored to the meeting type

    Type-specific summary guidance:
    - Project Kickoff: goals, scope, timeline, roles/owners, risks, next steps
    - Functional High Level Overview: processes, pain points, opportunities, systems, success metrics
    - Functional Deep Dive Session: detailed requirements, edge cases, data inputs/outputs, integrations, constraints, acceptance criteria
    - DSU: progress, blockers, plan, risks
    - Other types: key decisions, action items, takeaways

    TRANSCRIPT:
    ${transcriptInput}

    Return ONLY the JSON object, no other text.`;

      const response = await mod.generateText(prompt, null, { temperature: 0.3 });
      
      if (!response) throw new Error('No response from AI');

      // Parse the JSON response
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
      const details = JSON.parse(cleaned);

      setFormData({
        title: details.title || '',
        type: (details.type || 'Project Kickoff') as Meeting['type'],
        date: details.date || new Date().toISOString().split('T')[0],
        time: details.time || '09:00',
        participants: Array.isArray(details.participants) 
          ? details.participants.join(', ') 
          : details.participants || '',
        transcript: transcriptInput,
        summary: details.summary || '',
      });

      setStep('edit');
    } catch (error) {
      console.error('Failed to extract meeting details:', error);
      // Fallback: let user fill it manually
      setFormData({
        title: '',
        type: 'Project Kickoff' as Meeting['type'],
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        participants: '',
        transcript: transcriptInput,
        summary: '',
      });
      setStep('edit');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.date || !formData.time) {
      alert('Please fill in title, date, and time');
      return;
    }

    try {
      const meetingData = {
        title: formData.title,
        type: formData.type,
        date: formData.date,
        time: formData.time,
        participants: formData.participants
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p),
        transcript: formData.transcript,
        summary: formData.summary,
      };

      if (editingId) {
        await onUpdateMeeting(editingId, meetingData);
      } else {
        await onAddMeeting(meetingData);
      }

      setIsAdding(false);
      setEditingId(null);
      setFormData({ title: '', type: 'Project Kickoff' as Meeting['type'], date: '', time: '', participants: '', transcript: '', summary: '' });
    } catch (error) {
      console.error('Failed to save meeting:', error);
      alert('Failed to save meeting');
    }
  };

  const handleEditClick = (meeting: Meeting) => {
    setEditingId(meeting.id);
    setFormData({
      title: meeting.title,
      type: meeting.type || 'Project Kickoff',
      date: meeting.date,
      time: meeting.time,
      participants: meeting.participants.join(', '),
      transcript: meeting.transcript,
      summary: meeting.summary || '',
    });
    setStep('edit');
    setIsAdding(true);
  };

  const handleDelete = async (meetingId: string) => {
    if (!confirm('Delete this meeting?')) return;
    try {
      await onDeleteMeeting(meetingId);
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      alert('Failed to delete meeting');
    }
  };

  const sortedMeetings = [...meetings].sort(
    (a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()
  );

  return (
    <div className="grid grid-cols-3 gap-4 h-[600px]">
      {/* Left pane - Meeting details */}
      <div className="col-span-2 flex flex-col bg-white border border-wm-neutral/30 rounded-lg overflow-hidden">
        {selectedMeeting ? (
          <>
            <div className="p-6 border-b border-wm-neutral/30">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-wm-blue mb-2">{selectedMeeting.title}</h3>
                  {selectedMeeting.type && (
                    <span className="inline-block px-3 py-1 bg-wm-pink/10 text-wm-pink text-xs font-bold rounded-full mb-2">
                      {selectedMeeting.type}
                    </span>
                  )}
                  <p className="text-sm text-wm-blue/60">
                    {new Date(`${selectedMeeting.date}T${selectedMeeting.time}`).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-wm-blue/70 text-sm mb-2">Participants</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.participants.map((participant, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-wm-accent/10 text-wm-accent text-xs font-bold rounded-full"
                      >
                        {participant}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedMeeting.summary && (
                <div>
                  <h4 className="font-bold text-wm-blue/70 text-sm mb-3">Summary</h4>
                  <div className="bg-wm-accent/5 p-4 rounded-lg border border-wm-accent/20">
                    <p className="text-sm text-wm-blue/80 whitespace-pre-wrap font-normal leading-relaxed">
                      {selectedMeeting.summary}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <h4 className="font-bold text-wm-blue/70 text-sm mb-3">Transcript / Notes</h4>
                <p className="text-sm text-wm-blue/80 whitespace-pre-wrap font-normal leading-relaxed">
                  {selectedMeeting.transcript}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-wm-neutral/30 space-y-2">
              {!selectedMeeting.summary && (
                <button
                  onClick={async () => {
                    setIsSummarizing(true);
                    try {
                      const mod = await import('../services/geminiService');
                      const prompt = `You are a meeting analyst. Create a concise bullet-point summary tailored to the meeting type: ${selectedMeeting.type || 'Unknown'}.\n\nIf the type is:\n- Project Kickoff: summarize goals, scope, timeline, roles/owners, risks, and next steps.\n- Functional High Level Overview: summarize processes, pain points, opportunities, systems, and success metrics.\n- Functional Deep Dive Session: summarize detailed requirements, edge cases, data inputs/outputs, integrations, constraints, and acceptance criteria.\n- DSU: summarize progress since last update, blockers, plans for next 24 hours, and risks.\n- Other types: summarize key decisions, action items, and takeaways.\n\nTRANSCRIPT:\n${selectedMeeting.transcript}\n\nProvide only the summary, formatted as bullet points with clear labels when relevant.`;

                      const response = await mod.generateText(prompt, null, { temperature: 0.3 });
                      
                      if (response) {
                        const updatedMeeting = { ...selectedMeeting, summary: response.trim() };
                        await onUpdateMeeting(selectedMeeting.id, {
                          title: updatedMeeting.title,
                          date: updatedMeeting.date,
                          time: updatedMeeting.time,
                          participants: updatedMeeting.participants,
                          transcript: updatedMeeting.transcript,
                          summary: updatedMeeting.summary,
                        });
                      }
                    } catch (error) {
                      console.error('Failed to generate summary:', error);
                      alert('Failed to generate summary');
                    } finally {
                      setIsSummarizing(false);
                    }
                  }}
                  disabled={isSummarizing}
                  className="w-full px-3 py-2 bg-wm-accent text-white font-bold text-sm rounded-lg hover:bg-wm-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSummarizing && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isSummarizing ? 'Generating Summary...' : 'Generate Summary'}
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleEditClick(selectedMeeting);
                    setSelectedId(null);
                  }}
                  className="flex-1 px-3 py-2 bg-wm-accent/10 text-wm-accent font-bold text-sm rounded-lg hover:bg-wm-accent/20 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    handleDelete(selectedMeeting.id);
                    setSelectedId(null);
                  }}
                  className="flex-1 px-3 py-2 bg-wm-pink/10 text-wm-pink font-bold text-sm rounded-lg hover:bg-wm-pink/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <svg className="w-12 h-12 mx-auto mb-3 text-wm-blue/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-wm-blue/60">Select a meeting to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Right pane - Meetings list */}
      <div className="flex flex-col bg-white border border-wm-neutral/30 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-wm-neutral/30 flex-shrink-0">
          <button
            onClick={handleAddClick}
            disabled={isLoading || isAdding}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-wm-accent text-white font-bold rounded-lg hover:bg-wm-accent/90 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sortedMeetings.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-wm-blue/60">No meetings yet</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {sortedMeetings.map((meeting) => (
                <button
                  key={meeting.id}
                  onClick={() => setSelectedId(meeting.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    selectedId === meeting.id
                      ? 'bg-wm-accent/10 border-l-4 border-wm-accent'
                      : 'hover:bg-wm-neutral/5 border-l-4 border-transparent'
                  }`}
                >
                  <h4 className="font-bold text-wm-blue text-sm truncate">{meeting.title}</h4>
                  {meeting.type && (
                    <p className="text-xs text-wm-pink font-semibold mt-1">{meeting.type}</p>
                  )}
                  <p className="text-xs text-wm-blue/60 mt-1">
                    {new Date(`${meeting.date}T${meeting.time}`).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit form overlay */}
      {isAdding && step === 'transcript' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h4 className="font-bold text-wm-blue mb-4 text-lg">Upload or Paste Meeting Transcript</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-wm-blue/70 mb-2">Paste Transcript</label>
                <textarea
                  value={transcriptInput}
                  onChange={(e) => setTranscriptInput(e.target.value)}
                  className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:border-wm-accent resize-none"
                  rows={6}
                  placeholder="Paste meeting transcript or notes here..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-wm-blue/70 mb-2">Or Upload File</label>
                <input
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-wm-blue/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-wm-accent/10 file:text-wm-accent hover:file:bg-wm-accent/20"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={extractMeetingDetails}
                  disabled={isLoading || isExtracting || !transcriptInput.trim()}
                  className="flex-1 px-4 py-2 bg-wm-accent text-white font-bold rounded-lg hover:bg-wm-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isExtracting && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isExtracting ? 'Extracting...' : 'Extract Details & Continue'}
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setStep('transcript');
                  }}
                  className="flex-1 px-4 py-2 bg-wm-neutral/20 text-wm-blue font-bold rounded-lg hover:bg-wm-neutral/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdding && step === 'edit' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h4 className="font-bold text-wm-blue mb-4 text-lg">{editingId ? 'Edit Meeting' : 'New Meeting'}</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-wm-blue/70 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:border-wm-accent"
                  placeholder="Meeting title"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-wm-blue/70 mb-1">Meeting Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Meeting['type'] })}
                  className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:border-wm-accent bg-white"
                >
                  <option value="Project Kickoff">Project Kickoff</option>
                  <option value="Functional High Level Overview">Functional High Level Overview</option>
                  <option value="Functional Deep Dive Session">Functional Deep Dive Session</option>
                  <option value="DSU">DSU</option>
                  <option value="Technical Discovery">Technical Discovery</option>
                  <option value="Stakeholder Interview">Stakeholder Interview</option>
                  <option value="Requirements Gathering">Requirements Gathering</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-wm-blue/70 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:border-wm-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-wm-blue/70 mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:border-wm-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-wm-blue/70 mb-1">Participants (comma-separated)</label>
                <input
                  type="text"
                  value={formData.participants}
                  onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                  className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:border-wm-accent"
                  placeholder="John Doe, jane@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-wm-blue/70 mb-1">Transcript / Notes</label>
                <textarea
                  value={formData.transcript}
                  onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                  className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:border-wm-accent resize-none"
                  rows={4}
                  placeholder="Meeting transcript or notes..."
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold text-wm-blue/70">Summary</label>
                  <button
                    onClick={generateSummary}
                    disabled={isSummarizing || !formData.transcript.trim()}
                    className="text-xs px-2 py-1 bg-wm-accent/10 text-wm-accent font-bold rounded hover:bg-wm-accent/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {isSummarizing && <span className="inline-block w-3 h-3 border-2 border-wm-accent border-t-transparent rounded-full animate-spin" />}
                    {isSummarizing ? 'Generating...' : 'Generate'}
                  </button>
                </div>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-3 py-2 border border-wm-neutral/30 rounded-lg focus:outline-none focus:border-wm-accent resize-none"
                  rows={3}
                  placeholder="Meeting summary (auto-generated or manual)..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-wm-accent text-white font-bold rounded-lg hover:bg-wm-accent/90 transition-colors disabled:opacity-50"
                >
                  {editingId ? 'Update Meeting' : 'Save Meeting'}
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setStep('transcript');
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2 bg-wm-neutral/20 text-wm-blue font-bold rounded-lg hover:bg-wm-neutral/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingsList;
