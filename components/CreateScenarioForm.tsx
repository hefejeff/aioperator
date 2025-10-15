import React, { useState } from 'react';
import { LoadingSpinner } from './OperatorConsole';

interface CreateScenarioFormProps {
  onSave: (data: { title: string; description: string; goal: string; currentWorkflowImage?: File }) => Promise<void>;
  onClose: () => void;
}

const CreateScenarioForm: React.FC<CreateScenarioFormProps> = ({ onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [currentWorkflowImage, setCurrentWorkflowImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError("Image size should be less than 5MB");
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError("Please upload an image file");
        return;
      }
      setCurrentWorkflowImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !goal.trim()) {
      setError("All fields are required.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await onSave({ 
        title, 
        description, 
        goal,
        ...(currentWorkflowImage ? { currentWorkflowImage } : {})
      });
      onClose(); // Close on success
    } catch (err) {
      setError("Failed to save scenario. Please try again later.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl text-left relative animate-fade-in-up"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
      >
        <h2 className="text-2xl font-bold text-white mb-2">Create a New Scenario</h2>
        <p className="text-slate-400 mb-6 text-lg">Turn your ideas into smart workflows - We'll guide you through building AI-powered solutions that work for you</p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">Scenario Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Onboarding a New Team Member"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="A brief overview of the scenario's context."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
            />
          </div>
          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-slate-300 mb-1">Your Goal</label>
            <textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={5}
              placeholder="Describe the task the user needs to accomplish. What workflow should they design?"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Current Workflow Image <span className="text-slate-400">(Optional)</span>
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="workflow-image"
                  className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 
                    ${previewUrl ? 'border-sky-500/50 bg-sky-500/10' : 'border-slate-600 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-800/50'}`}
                >
                  {previewUrl ? (
                    <div className="relative w-full p-2">
                      <img
                        src={previewUrl}
                        alt="Current workflow preview"
                        className="max-h-64 object-contain mx-auto rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentWorkflowImage(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-4 right-4 p-1 bg-red-500/90 hover:bg-red-600 text-white rounded-full transition-colors"
                        title="Remove image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 px-4">
                      <svg
                        className="w-8 h-8 mb-3 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-sm text-slate-400">
                        Click to upload your current workflow diagram
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                  )}
                  <input
                    id="workflow-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
          
          {error && (
            <p className="text-sm text-red-400 bg-red-900/30 p-3 rounded-lg text-center">{error}</p>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center px-6 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : 'Save Scenario'}
            </button>
          </div>
        </form>
        <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Close"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>
    </div>
  );
};

export default CreateScenarioForm;
