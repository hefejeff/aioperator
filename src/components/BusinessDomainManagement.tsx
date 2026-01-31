import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { ref, onValue, push } from 'firebase/database';
import { db } from '../services/firebaseInit';
import { UseCase } from '../types';

interface BusinessDomainManagementProps {
  currentUser: any;
}

interface DomainWithExamples {
  name: string;
  examples: string[];
}

const DEFAULT_DOMAINS: DomainWithExamples[] = [
  { name: 'Sales', examples: ['Lead Qualification', 'Proposal Generation', 'Contract Review'] },
  { name: 'HR', examples: ['Resume Screening', 'Onboarding Automation', 'Performance Review'] },
  { name: 'Finance', examples: ['Invoice Processing', 'Expense Approval', 'Financial Reporting'] },
  { name: 'Operations', examples: ['Workflow Optimization', 'Resource Allocation'] },
  { name: 'Logistics', examples: ['Shipment Tracking', 'Inventory Management'] },
  { name: 'Healthcare', examples: ['Patient Intake', 'Appointment Scheduling'] },
  { name: 'Manufacturing', examples: ['Quality Control', 'Production Planning'] },
  { name: 'Legal', examples: ['Document Review', 'Contract Analysis'] },
  { name: 'Procurement', examples: ['Purchase Order Processing', 'Vendor Management'] },
  { name: 'Marketing', examples: ['Campaign Analytics', 'Content Generation'] },
  { name: 'IT', examples: ['Ticket Routing', 'System Monitoring'] },
  { name: 'Customer Support', examples: ['Email Triage', 'Knowledge Base Search'] }
];

const BusinessDomainManagement: React.FC<BusinessDomainManagementProps> = () => {
  const [domains, setDomains] = useState<DomainWithExamples[]>(DEFAULT_DOMAINS);
  const [isAdding, setIsAdding] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedDomain, setExpandedDomain] = useState<number | null>(null);
  const [addingExampleTo, setAddingExampleTo] = useState<number | null>(null);
  const [newExample, setNewExample] = useState('');
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [generatingForDomain, setGeneratingForDomain] = useState<number | null>(null);

  // Fetch use cases from Firebase
  useEffect(() => {
    const scenariosRef = ref(db, 'scenarios');
    const unsubscribe = onValue(scenariosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const scenariosList: UseCase[] = Object.keys(data).map((key) => ({
          ...data[key],
          id: key,
        }));
        setUseCases(scenariosList);
      } else {
        setUseCases([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Function to count use cases for a specific process
  const getProcessCount = (domainName: string, processName: string): number => {
    return useCases.filter(
      uc => uc.domain === domainName && uc.process === processName
    ).length;
  };

  const handleAddDomain = () => {
    if (newDomain.trim() && !domains.find(d => d.name === newDomain.trim())) {
      setDomains([...domains, { name: newDomain.trim(), examples: [] }]);
      setNewDomain('');
      setIsAdding(false);
    }
  };

  const handleDeleteDomain = (index: number) => {
    if (window.confirm(`Delete "${domains[index].name}"? This will affect all processes using this domain.`)) {
      setDomains(domains.filter((_, i) => i !== index));
    }
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(domains[index].name);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      const updated = [...domains];
      updated[editingIndex] = { ...updated[editingIndex], name: editValue.trim() };
      setDomains(updated);
      setEditingIndex(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleAddExample = (domainIndex: number) => {
    if (newExample.trim()) {
      const updated = [...domains];
      updated[domainIndex].examples = [...updated[domainIndex].examples, newExample.trim()];
      setDomains(updated);
      setNewExample('');
      setAddingExampleTo(null);
    }
  };

  const handleDeleteExample = (domainIndex: number, exampleIndex: number) => {
    const updated = [...domains];
    updated[domainIndex].examples = updated[domainIndex].examples.filter((_, i) => i !== exampleIndex);
    setDomains(updated);
  };

  const handleGenerateWorkflows = async (domainIndex: number) => {
    const domainName = domains[domainIndex].name;
    setGeneratingForDomain(domainIndex);
    
    try {
      const mod = await import('../services/geminiService');
      
      // Generate 6 complete workflow use cases with all fields
      const prompt = `Generate 6 unique and complete workflow automation use cases for the ${domainName} domain. For each use case, provide ALL of the following fields:

For each of the 6 use cases, return in EXACTLY this format:

USE_CASE_1:
TITLE: [Specific, actionable title for this workflow - one sentence]
PROCESS: [Short process name, 5 words or less, like "Invoice Processing" or "Lead Qualification"]
CURRENT_PROCESS: [Detailed description of the current manual process with specific pain points and inefficiencies - 2-3 sentences with realistic details and metrics]
DESIRED_OUTCOME: [Concrete, measurable outcomes and success criteria - 2-3 sentences with specific improvements and metrics]
VALUE_DRIVERS: [List 3-5 key business value drivers separated by commas, like: Reduce processing time by 70%, Eliminate manual data entry, Improve accuracy to 99.5%, Cut operational costs by $50K annually]
PAIN_POINTS: [List 3-5 specific pain points separated by commas, like: High error rate in manual data entry, 8-hour turnaround time, Lack of real-time visibility, Staff burnout from repetitive tasks]

USE_CASE_2:
[repeat format]

...through USE_CASE_6

Make each use case specific to ${domainName} with realistic details, metrics, and business impact. Focus on different processes within ${domainName} to ensure variety and coverage of common automation opportunities.`;

      const response = await mod.generateText(prompt, null, { temperature: 0.7 });
      console.log('AI Response:', response);
      
      // Parse the response
      const useCaseBlocks = response.split(/USE_CASE_\d+:/);
      const newUseCases: Partial<UseCase>[] = [];
      
      for (const block of useCaseBlocks) {
        if (!block.trim()) continue;
        
        const markers = ['TITLE:', 'PROCESS:', 'CURRENT_PROCESS:', 'DESIRED_OUTCOME:', 'VALUE_DRIVERS:', 'PAIN_POINTS:'];
        let title = '';
        let process = '';
        let currentProcess = '';
        let desiredOutcome = '';
        let valueDrivers = '';
        let painPoints = '';
        let currentSection = '';
        let currentContent: string[] = [];
        
        const lines = block.split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          let foundMarker = false;
          for (const marker of markers) {
            if (trimmedLine.startsWith(marker)) {
              // Save previous section
              if (currentSection) {
                const content = currentContent.join(' ').replace(/['"]/g, '').trim();
                if (currentSection === 'TITLE:') title = content;
                else if (currentSection === 'PROCESS:') process = content;
                else if (currentSection === 'CURRENT_PROCESS:') currentProcess = content;
                else if (currentSection === 'DESIRED_OUTCOME:') desiredOutcome = content;
                else if (currentSection === 'VALUE_DRIVERS:') valueDrivers = content;
                else if (currentSection === 'PAIN_POINTS:') painPoints = content;
              }
              
              currentSection = marker;
              currentContent = [trimmedLine.replace(marker, '').trim()];
              foundMarker = true;
              break;
            }
          }
          
          if (!foundMarker && currentSection) {
            currentContent.push(trimmedLine);
          }
        }
        
        // Save last section
        if (currentSection) {
          const content = currentContent.join(' ').replace(/['"]/g, '').trim();
          if (currentSection === 'TITLE:') title = content;
          else if (currentSection === 'PROCESS:') process = content;
          else if (currentSection === 'CURRENT_PROCESS:') currentProcess = content;
          else if (currentSection === 'DESIRED_OUTCOME:') desiredOutcome = content;
          else if (currentSection === 'VALUE_DRIVERS:') valueDrivers = content;
          else if (currentSection === 'PAIN_POINTS:') painPoints = content;
        }
        
        // Only add if we have minimum required fields
        if (title && currentProcess && desiredOutcome) {
          console.log('Parsed use case:', {
            title,
            process,
            currentProcess: currentProcess.substring(0, 50) + '...',
            desiredOutcome: desiredOutcome.substring(0, 50) + '...',
            valueDrivers,
            painPoints
          });
          newUseCases.push({
            title,
            description: currentProcess,
            goal: desiredOutcome,
            domain: domainName,
            process: process || undefined,
            valueDrivers: valueDrivers || undefined,
            painPoints: painPoints || undefined,
            type: 'TRAINING'
            // No userId = public scenario available to all users
          });
        }
      }
      
      // Save to Firebase
      if (newUseCases.length > 0) {
        console.log('About to save use cases to Firebase:', newUseCases);
        const scenariosRef = ref(db, 'scenarios');
        let savedCount = 0;
        
        for (const useCase of newUseCases) {
          try {
            const result = await push(scenariosRef, useCase);
            console.log('Saved use case with key:', result.key);
            savedCount++;
          } catch (err) {
            console.error('Failed to save use case:', err);
          }
        }
        
        if (savedCount > 0) {
          console.log(`Successfully saved ${savedCount} workflows to Firebase`);
          alert(`Successfully created ${savedCount} sample workflow${savedCount !== 1 ? 's' : ''} for ${domainName}!\n\nThey are now available in the "Processes and Use Cases" library.`);
        } else {
          throw new Error('Failed to save workflows');
        }
      } else {
        throw new Error('No valid use cases generated');
      }
      
    } catch (err) {
      console.error('Failed to generate workflows', err);
      alert('Failed to generate sample workflows. Please try again.');
    } finally {
      setGeneratingForDomain(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-wm-blue">Business Domains</h2>
          <p className="text-sm text-wm-blue/60 mt-1">Manage domain categories used to classify processes</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-wm-accent hover:bg-wm-accent/90 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <Icons.Plus />
          Add Domain
        </button>
      </div>

      <div className="bg-white border border-wm-neutral/30 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {isAdding && (
            <div className="border-2 border-wm-accent rounded-lg p-3 bg-wm-accent/5">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
                placeholder="Enter domain name"
                className="w-full bg-white border border-wm-neutral/30 rounded-md px-3 py-2 text-sm text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddDomain}
                  className="flex-1 px-3 py-1.5 text-xs font-bold bg-wm-accent text-white rounded hover:bg-wm-accent/90 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewDomain('');
                  }}
                  className="flex-1 px-3 py-1.5 text-xs font-bold text-wm-blue/70 hover:bg-wm-neutral/20 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {domains.map((domain, index) => (
            <div
              key={index}
              className="border border-wm-neutral/30 rounded-lg p-3 bg-white hover:border-wm-accent/50 transition-colors group"
            >
              {editingIndex === index ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                    className="w-full bg-white border border-wm-neutral/30 rounded-md px-2 py-1 text-sm text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-2 py-1 text-xs font-bold bg-wm-accent text-white rounded hover:bg-wm-accent/90 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-2 py-1 text-xs font-bold text-wm-blue/70 hover:bg-wm-neutral/20 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-wm-blue text-sm">{domain.name}</span>
                      <span className="text-xs text-wm-blue/40 bg-wm-neutral/20 px-1.5 py-0.5 rounded">
                        {useCases.filter(uc => uc.domain === domain.name).length} workflows
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(index)}
                        className="p-1 text-wm-blue/60 hover:text-wm-accent transition-colors"
                        title="Edit"
                      >
                        <Icons.Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDomain(index)}
                        className="p-1 text-wm-blue/60 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Icons.Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* AI Generate Workflows Button */}
                  <button
                    onClick={() => handleGenerateWorkflows(index)}
                    disabled={generatingForDomain === index}
                    className="w-full mb-2 px-3 py-2 text-xs font-bold bg-gradient-to-r from-wm-accent/10 to-wm-pink/10 text-wm-accent rounded hover:from-wm-accent/20 hover:to-wm-pink/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingForDomain === index ? (
                      <>
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating Sample Workflows...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate 6 Sample Workflows with AI
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setExpandedDomain(expandedDomain === index ? null : index)}
                    className="w-full text-left text-xs text-wm-blue/50 hover:text-wm-accent transition-colors flex items-center gap-1"
                  >
                    <svg className={`w-3 h-3 transition-transform ${expandedDomain === index ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {expandedDomain === index ? 'Hide' : 'View'} example processes
                  </button>

                  {expandedDomain === index && (
                    <div className="mt-3 pt-3 border-t border-wm-neutral/20 space-y-2">
                      {domain.examples.map((example, exIdx) => {
                        const count = getProcessCount(domain.name, example);
                        return (
                          <div key={exIdx} className="flex items-center justify-between text-xs bg-wm-neutral/10 rounded px-2 py-1.5 group/example">
                            <div className="flex items-center gap-2">
                              <span className="text-wm-blue">{example}</span>
                              <span className="text-xs text-wm-blue/40 bg-wm-accent/10 px-1.5 py-0.5 rounded font-bold">
                                {count}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteExample(index, exIdx)}
                              className="opacity-0 group-hover/example:opacity-100 text-wm-blue/40 hover:text-red-600 transition-all"
                              title="Delete example"
                            >
                              <Icons.X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                      
                      {addingExampleTo === index ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newExample}
                            onChange={(e) => setNewExample(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddExample(index)}
                            placeholder="Example process name"
                            className="flex-1 bg-white border border-wm-neutral/30 rounded px-2 py-1 text-xs text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleAddExample(index)}
                            className="px-2 py-1 text-xs font-bold bg-wm-accent text-white rounded hover:bg-wm-accent/90"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setAddingExampleTo(null);
                              setNewExample('');
                            }}
                            className="px-2 py-1 text-xs font-bold text-wm-blue/70 hover:bg-wm-neutral/20 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingExampleTo(index)}
                          className="w-full text-xs text-wm-accent hover:text-wm-accent/80 font-bold flex items-center gap-1 px-2 py-1.5 hover:bg-wm-accent/5 rounded transition-colors"
                        >
                          <Icons.Plus className="w-3 h-3" />
                          Add example process
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {domains.length === 0 && !isAdding && (
          <div className="text-center py-12 text-wm-blue/40">
            <p>No domains configured. Add your first domain to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessDomainManagement;
