import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../constants';
import { useTranslation } from '../i18n';
import type { WorkflowVersion, Scenario, TeamRole, UserProfile } from '../types';
import { getWorkflowVersion, getScenarioById, updateWorkflowVersion, addTeamMember, removeTeamMember, updateTeamMemberRole, getAllUsers } from '../services/firebaseService';

interface WorkflowDetailViewProps {
  workflowId: string;
  userId: string;
  onBack: () => void;
}

const WorkflowDetailView: React.FC<WorkflowDetailViewProps> = ({ workflowId, userId, onBack }) => {
  const [workflow, setWorkflow] = useState<WorkflowVersion | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'problem' | 'workflow' | 'prd' | 'pitch' | 'evaluation' | 'canvas' | 'team'>('problem');
  
  // Canvas editing state
  const [isCanvasEditing, setIsCanvasEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedCanvas, setEditedCanvas] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [newSubItemInputs, setNewSubItemInputs] = useState<Record<string, string>>({});
  
  // Team collaboration state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('VIEWER');
  const [isInviting, setIsInviting] = useState(false);
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set());
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { t } = useTranslation();

  // Helper function to extract value proposition from scenario description
  const extractValueProp = (description: string): string => {
    // Look for key phrases that indicate value
    const valuePhrases = [
      'automate', 'streamline', 'improve', 'reduce', 'increase', 'optimize',
      'enhance', 'accelerate', 'simplify', 'eliminate', 'save time', 'cut costs'
    ];
    
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const valueSentence = sentences.find(sentence => 
      valuePhrases.some(phrase => sentence.toLowerCase().includes(phrase))
    );
    
    return valueSentence?.trim() || 'Improved operational efficiency and reduced manual work';
  };

  // Helper function to infer customer segments from scenario
  const inferCustomerSegments = (scenario: Scenario): string => {
    const title = scenario.title.toLowerCase();
    const description = scenario.description.toLowerCase();
    
    if (title.includes('support') || description.includes('support')) {
      return 'Customer support teams, Help desk agents, Service managers';
    } else if (title.includes('sales') || description.includes('sales')) {
      return 'Sales teams, Account managers, Business development';
    } else if (title.includes('hr') || description.includes('human resource')) {
      return 'HR professionals, Recruiters, People operations';
    } else if (title.includes('content') || description.includes('content')) {
      return 'Content creators, Marketing teams, Communications';
    } else if (title.includes('market') || description.includes('feedback')) {
      return 'Product managers, Market researchers, Analytics teams';
    } else {
      return 'Operations teams, Process managers, Business analysts';
    }
  };

  // Helper function to suggest key metrics based on scenario
  const suggestKeyMetrics = (scenario: Scenario, evaluationScore?: number): string => {
    const title = scenario.title.toLowerCase();
    const description = scenario.description.toLowerCase();
    
    let baseMetrics = '';
    if (title.includes('support') || description.includes('support')) {
      baseMetrics = 'Response time reduction, Customer satisfaction score, Ticket resolution rate';
    } else if (title.includes('sales') || description.includes('sales')) {
      baseMetrics = 'Lead conversion rate, Sales cycle time, Revenue per contact';
    } else if (title.includes('content') || description.includes('content')) {
      baseMetrics = 'Content production time, Publishing frequency, Engagement rate';
    } else if (title.includes('market') || description.includes('feedback')) {
      baseMetrics = 'Feedback processing time, Insight quality, Decision speed';
    } else {
      baseMetrics = 'Processing time, Error reduction, Cost savings';
    }
    
    if (evaluationScore) {
      baseMetrics += `, Implementation readiness: ${evaluationScore}/10`;
    }
    
    return baseMetrics;
  };

  // Helper function to generate Lean Canvas data
  const generateLeanCanvas = (scenario: Scenario, workflow: WorkflowVersion) => {
    const title = scenario.title.toLowerCase();
    const description = scenario.description.toLowerCase();

    return {
      problem: {
        title: t('canvas.problem'),
        content: scenario.description,
        subItems: [
          t('canvas.existingAlternatives'),
          t('canvas.currentSolutions'),
          t('canvas.manualProcesses')
        ]
      },
      solution: {
        title: t('canvas.solution'),
        content: workflow.workflowExplanation,
        subItems: [
          t('canvas.automatedSteps'),
          t('canvas.aiIntegration'),
          t('canvas.processOptimization')
        ]
      },
      keyMetrics: {
        title: t('canvas.keyMetrics'),
        content: suggestKeyMetrics(scenario, workflow.evaluationScore || undefined),
        subItems: []
      },
      uniqueValueProposition: {
        title: t('canvas.uniqueValueProposition'),
        content: extractValueProp(scenario.description),
        subItems: [
          t('canvas.timeReduction'),
          t('canvas.errorMinimization'),
          t('canvas.scalability')
        ]
      },
      unfairAdvantage: {
        title: t('canvas.unfairAdvantage'),
        content: title.includes('ai') || description.includes('ai') 
          ? t('canvas.aiCapabilities')
          : t('canvas.processExpertise'),
        subItems: []
      },
      channels: {
        title: t('canvas.channels'),
        content: workflow.prdMarkdown?.includes('Microsoft') || workflow.prdMarkdown?.includes('Office') 
          ? t('canvas.microsoftEcosystem')
          : workflow.prdMarkdown?.includes('Google') || workflow.prdMarkdown?.includes('Workspace')
          ? t('canvas.googleEcosystem')
          : t('canvas.enterprisePlatforms'),
        subItems: []
      },
      customerSegments: {
        title: t('canvas.customerSegments'),
        content: inferCustomerSegments(scenario),
        subItems: []
      },
      costStructure: {
        title: t('canvas.costStructure'),
        content: t('canvas.developmentCosts'),
        subItems: [
          t('canvas.platformLicensing'),
          t('canvas.developmentTime'),
          t('canvas.maintenanceSupport')
        ]
      },
      revenueStreams: {
        title: t('canvas.revenueStreams'),
        content: title.includes('support') || description.includes('support')
          ? t('canvas.costSavings')
          : title.includes('sales') || description.includes('sales')
          ? t('canvas.revenueIncrease')
          : t('canvas.efficiencyGains'),
        subItems: []
      }
    };
  };

  // Canvas editing functions
  const startCanvasEditing = () => {
    if (scenario && workflow) {
      const canvas = generateLeanCanvas(scenario, workflow);
      setEditedCanvas(canvas);
      setIsCanvasEditing(true);
    }
  };

  const cancelCanvasEditing = () => {
    setIsCanvasEditing(false);
    setEditingSection(null);
    setEditedCanvas(null);
  };

  const saveCanvasChanges = async () => {
    if (!editedCanvas || !workflow || !scenario) return;
    
    try {
      // Save the edited canvas data to the workflow version
      await updateWorkflowVersion(workflowId, userId, scenario.id, {
        leanCanvas: editedCanvas
      });

      console.log('Canvas saved successfully to database!');
      
      // Update local state
      setWorkflow({
        ...workflow,
        leanCanvas: editedCanvas,
        lastModified: Date.now()
      });
      
      setIsCanvasEditing(false);
      setEditingSection(null);
      
    } catch (error) {
      console.error('Error saving canvas:', error);
      // TODO: Show error message to user
      alert('Failed to save canvas changes. Please try again.');
    }
  };

  const startEditingSection = (sectionKey: string) => {
    setEditingSection(sectionKey);
  };

  const cancelEditingSection = () => {
    setEditingSection(null);
  };

  const updateCanvasSection = (sectionKey: string, field: string, value: string | string[]) => {
    if (editedCanvas) {
      setEditedCanvas({
        ...editedCanvas,
        [sectionKey]: {
          ...editedCanvas[sectionKey],
          [field]: value
        }
      });
    }
  };

  const addSubItem = (sectionKey: string, item: string) => {
    if (editedCanvas && item.trim()) {
      setEditedCanvas({
        ...editedCanvas,
        [sectionKey]: {
          ...editedCanvas[sectionKey],
          subItems: [...(editedCanvas[sectionKey].subItems || []), item.trim()]
        }
      });
    }
  };

  const removeSubItem = (sectionKey: string, index: number) => {
    if (editedCanvas) {
      setEditedCanvas({
        ...editedCanvas,
        [sectionKey]: {
          ...editedCanvas[sectionKey],
          subItems: editedCanvas[sectionKey].subItems.filter((_: any, i: number) => i !== index)
        }
      });
    }
  };

  // Text truncation and expansion helpers
  const toggleSectionExpansion = (sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  const truncateText = (text: string, maxLines: number = 5): { truncated: string; hasMore: boolean } => {
    const words = text.split(' ');
    // Approximate 8-10 words per line for responsive design
    const wordsPerLine = 8;
    const maxWords = maxLines * wordsPerLine;
    
    if (words.length <= maxWords) {
      return { truncated: text, hasMore: false };
    }
    
    const truncated = words.slice(0, maxWords).join(' ') + '...';
    return { truncated, hasMore: true };
  };

  // New sub-item management helpers
  const updateNewSubItemInput = (sectionKey: string, value: string) => {
    setNewSubItemInputs(prev => ({
      ...prev,
      [sectionKey]: value
    }));
  };

  const addNewSubItem = (sectionKey: string) => {
    const newItem = newSubItemInputs[sectionKey]?.trim();
    if (!newItem) return;

    if (isCanvasEditing && editedCanvas) {
      // In edit mode, add to edited canvas
      addSubItem(sectionKey, newItem);
    } else {
      // In view mode, add to local state and save immediately
      const currentCanvas = workflow?.leanCanvas || generateLeanCanvas(scenario!, workflow!);
      const currentSection = currentCanvas[sectionKey as keyof typeof currentCanvas];
      const updatedSection = {
        ...currentSection,
        subItems: [...(currentSection.subItems || []), newItem]
      };
      
      // Update the workflow with new sub-item
      if (workflow && scenario) {
        const updatedCanvas = {
          ...currentCanvas,
          [sectionKey]: updatedSection
        };
        
        // Save to database immediately
        updateWorkflowVersion(workflowId, userId, scenario.id, {
          leanCanvas: updatedCanvas
        }).then(() => {
          setWorkflow({
            ...workflow,
            leanCanvas: updatedCanvas,
            lastModified: Date.now()
          });
        }).catch(error => {
          console.error('Error saving new sub-item:', error);
        });
      }
    }

    // Clear the input
    updateNewSubItemInput(sectionKey, '');
  };

  // Canvas section rendering component
  const renderCanvasSection = (
    sectionKey: string,
    section: any,
    colorClasses: string,
    colSpan?: string
  ) => {
    const isEditing = isCanvasEditing && editingSection === sectionKey;
    const canvasData = isCanvasEditing ? editedCanvas : null;
    const currentSection = canvasData ? canvasData[sectionKey] : section;

    return (
      <div className={`${colorClasses} p-4 rounded-lg border min-h-fit ${colSpan || ''}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold mb-0">{currentSection.title}</h4>
          {isCanvasEditing && !isEditing && (
            <button
              onClick={() => startEditingSection(sectionKey)}
              className="text-white/60 hover:text-white text-xs flex items-center gap-1"
            >
              <Icons.Edit />
              {t('canvas.editSection')}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={currentSection.content}
              onChange={(e) => updateCanvasSection(sectionKey, 'content', e.target.value)}
              className="w-full bg-black/20 text-white text-sm p-2 rounded border border-white/20 resize-none"
              rows={3}
              placeholder="Enter content..."
              autoComplete="off"
            />
            
            {currentSection.subItems && (
              <div className="space-y-2">
                <div className="text-xs text-white/60">Sub-items:</div>
                {currentSection.subItems.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={item}
                      onChange={(e) => {
                        const newSubItems = [...currentSection.subItems];
                        newSubItems[idx] = e.target.value;
                        updateCanvasSection(sectionKey, 'subItems', newSubItems);
                      }}
                      className="flex-1 bg-black/20 text-white text-xs p-1 rounded border border-white/20"
                      autoComplete="off"
                    />
                    <button
                      onClick={() => removeSubItem(sectionKey, idx)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    value={newSubItemInputs[sectionKey] || ''}
                    onChange={(e) => updateNewSubItemInput(sectionKey, e.target.value)}
                    placeholder="Add new item..."
                    className="flex-1 bg-black/20 text-white text-xs p-1 rounded border border-white/20"
                    autoComplete="off"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addNewSubItem(sectionKey);
                      }
                    }}
                  />
                  <button
                    onClick={() => addNewSubItem(sectionKey)}
                    disabled={!newSubItemInputs[sectionKey]?.trim()}
                    className="text-green-400 hover:text-green-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    <Icons.Plus />
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={cancelEditingSection}
                className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded"
              >
                {t('canvas.cancelSection')}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {(() => {
              const isExpanded = expandedSections.has(sectionKey);
              const { truncated, hasMore } = truncateText(currentSection.content);
              const displayText = isExpanded ? currentSection.content : truncated;
              
              return (
                <div className="mb-3">
                  <p className="text-sm text-white/80 break-words">{displayText}</p>
                  {hasMore && (
                    <button
                      onClick={() => toggleSectionExpansion(sectionKey)}
                      className="text-xs text-white/50 hover:text-white/80 mt-1 flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <Icons.ChevronUp />
                          {t('canvas.showLess')}
                        </>
                      ) : (
                        <>
                          <Icons.ChevronDown />
                          {t('canvas.showMore')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })()}
            
            {currentSection.subItems && currentSection.subItems.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                {currentSection.subItems.map((item: string, idx: number) => (
                  <div 
                    key={idx}
                    className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md px-3 py-2 text-xs text-white/70 hover:text-white/90 hover:border-white/20 transition-all"
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
            
            {/* Empty editable sub-item card */}
            <div className="bg-black/10 border-2 border-dashed border-white/20 rounded-md p-2 hover:border-white/30 transition-colors">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubItemInputs[sectionKey] || ''}
                  onChange={(e) => updateNewSubItemInput(sectionKey, e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addNewSubItem(sectionKey);
                    }
                  }}
                  placeholder={t('canvas.addSubItem')}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-white/70 placeholder-white/40"
                  autoComplete="off"
                />
                <button
                  onClick={() => addNewSubItem(sectionKey)}
                  disabled={!newSubItemInputs[sectionKey]?.trim()}
                  className="text-white/60 hover:text-white/90 disabled:text-white/30 disabled:cursor-not-allowed"
                >
                  <Icons.Plus />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Team collaboration functions
  const loadUsers = async () => {
    try {
      const users = await getAllUsers();
      setAllUsers(users);
      setFilteredUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleInviteTeamMember = async () => {
    if (!inviteEmail.trim() || !workflowId || !userId) return;
    
    setIsInviting(true);
    try {
      await addTeamMember(
        workflowId,
        userId,
        workflow?.scenarioId || '',
        inviteEmail.trim(),
        inviteRole,
        userId
      );
      
      // Clear input fields
      setInviteEmail('');
      setInviteRole('VIEWER');
      setShowUserDropdown(false);
      
      // Reload workflow to get updated team data
      if (workflowId && userId) {
        loadWorkflow();
      }
      
      console.log('Team member invited successfully!');
      
    } catch (error) {
      console.error('Failed to invite team member:', error);
      // TODO: Show error message to user
    } finally {
      setIsInviting(false);
    }
  };

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInviteEmail(value);
    
    // Filter users based on input
    if (value.trim()) {
      const filtered = allUsers.filter(user => 
        user.email?.toLowerCase().includes(value.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredUsers(filtered);
      setShowUserDropdown(true);
    } else {
      setShowUserDropdown(false);
    }
  };

  const handleUserSelect = (selectedUser: UserProfile) => {
    setInviteEmail(selectedUser.email || '');
    setShowUserDropdown(false);
  };

  const handleInputFocus = () => {
    setFilteredUsers(allUsers);
    setShowUserDropdown(true);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRemoveTeamMember = async (memberUserId: string) => {
    if (!workflowId || !userId || !workflow?.scenarioId) return;
    
    try {
      await removeTeamMember(
        workflowId,
        userId,
        workflow.scenarioId,
        memberUserId
      );
      
      // Reload workflow to get updated team data
      await loadWorkflow();
      
      console.log('Team member removed successfully!');
      
    } catch (error) {
      console.error('Failed to remove team member:', error);
      // TODO: Show error message to user
    }
  };

  const handleUpdateTeamMemberRole = async (memberUserId: string, newRole: TeamRole) => {
    if (!workflowId || !userId || !workflow?.scenarioId) return;
    
    // Add to updating set to show loading state
    setUpdatingRoles(prev => new Set(prev).add(memberUserId));
    
    try {
      await updateTeamMemberRole(
        workflowId,
        userId,
        workflow.scenarioId,
        memberUserId,
        newRole
      );
      
      // Reload workflow to get updated team data
      await loadWorkflow();
      
      console.log('Team member role updated successfully!');
      
    } catch (error) {
      console.error('Failed to update team member role:', error);
      // TODO: Show error message to user
    } finally {
      // Remove from updating set
      setUpdatingRoles(prev => {
        const newSet = new Set(prev);
        newSet.delete(memberUserId);
        return newSet;
      });
    }
  };

  const loadWorkflow = async () => {
    try {
      setIsLoading(true);
      const workflowData = await getWorkflowVersion(workflowId, userId);
      setWorkflow(workflowData);
      
      // Load scenario data if workflow is found
      if (workflowData?.scenarioId) {
        const scenarioData = await getScenarioById(workflowData.scenarioId, userId);
        setScenario(scenarioData);
      }
      
      // Load users for team collaboration
      await loadUsers();
      
    } catch (err) {
      console.error('Failed to load workflow:', err);
      setError('Failed to load workflow details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflow();
  }, [workflowId, userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-300">{t('loading')}</div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={onBack}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label={t('common.close')}
          >
            <Icons.ChevronLeft />
          </button>
          <h1 className="text-xl font-semibold text-white">{t('workflowDetail.error')}</h1>
        </div>
        <div className="space-y-4">
          <p className="text-slate-300">{error || t('workflowDetail.notFound')}</p>
          
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              {t('dashboard.back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'problem', label: t('workflowDetail.problem'), icon: Icons.ClipboardCheck },
    { id: 'workflow', label: t('workflowDetail.workflow'), icon: Icons.Cog },
    { id: 'prd', label: t('workflowDetail.prd'), icon: Icons.Document },
    { id: 'pitch', label: t('workflowDetail.pitch'), icon: Icons.Megaphone },
    { id: 'evaluation', label: t('workflowDetail.evaluation'), icon: Icons.ClipboardCheck },
    { id: 'canvas', label: t('workflowDetail.canvas'), icon: Icons.ChartBar },
    { id: 'team', label: t('workflowDetail.team'), icon: Icons.Users },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={onBack}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <Icons.ChevronLeft />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-white">
              {workflow.versionTitle || t('workflowDetail.untitled')}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {t('workflowDetail.scenario')}: {workflow.scenarioId}
            </p>
          </div>
          <div className="text-right text-sm text-slate-400">
            <div>{new Date(workflow.timestamp).toLocaleDateString()}</div>
            <div>{new Date(workflow.timestamp).toLocaleTimeString()}</div>
          </div>
        </div>
        
        {workflow.evaluationScore !== null && (
          <div className="flex items-center gap-2 text-sm">
            <Icons.Star />
            <span className="text-slate-300">
              {t('workflowDetail.score')}: <span className="font-semibold text-white">{workflow.evaluationScore}/10</span>
            </span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-700 text-white border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <tab.icon />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'problem' && (
            <div className="space-y-6">
              {scenario ? (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">{t('workflowDetail.title')}</h3>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
                      <p className="text-slate-300">{scenario.title}</p>
                      {scenario.title_es && (
                        <p className="text-slate-400 text-sm mt-2 italic">ES: {scenario.title_es}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">{t('workflowDetail.problemDescription')}</h3>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
                      <p className="text-slate-300 whitespace-pre-wrap">{scenario.description}</p>
                      {scenario.description_es && (
                        <p className="text-slate-400 text-sm mt-3 italic whitespace-pre-wrap">ES: {scenario.description_es}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">{t('workflowDetail.target')}</h3>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
                      <p className="text-slate-300 whitespace-pre-wrap">{scenario.goal}</p>
                      {scenario.goal_es && (
                        <p className="text-slate-400 text-sm mt-3 italic whitespace-pre-wrap">ES: {scenario.goal_es}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Business Context - Lean Canvas Elements */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">{t('workflowDetail.businessContext')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
                        <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                          <Icons.Star />
                          {t('workflowDetail.customerSegments')}
                        </h4>
                        <p className="text-slate-300 text-sm">
                          {inferCustomerSegments(scenario)}
                        </p>
                      </div>
                      
                      <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
                        <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                          <Icons.Sparkles />
                          {t('workflowDetail.valueProposition')}
                        </h4>
                        <p className="text-slate-300 text-sm">
                          {extractValueProp(scenario.description)}
                        </p>
                      </div>
                      
                      <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
                        <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                          <Icons.ChartBar />
                          {t('workflowDetail.keyMetrics')}
                        </h4>
                        <p className="text-slate-300 text-sm">
                          {suggestKeyMetrics(scenario, workflow?.evaluationScore || undefined)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-400 italic">{t('workflowDetail.noScenario')}</p>
              )}
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">{t('workflowDetail.explanation')}</h3>
                <div className="prose prose-slate prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-slate-300 bg-slate-900 p-4 rounded-lg border border-slate-600">
                    {workflow.workflowExplanation}
                  </pre>
                </div>
              </div>
              
              {/* Current/Before Workflow */}
              {scenario?.currentWorkflowImage && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Current Workflow</h3>
                  <img 
                    src={scenario.currentWorkflowImage}
                    alt="Current workflow diagram"
                    className="max-w-full h-auto rounded-lg border border-slate-600"
                  />
                </div>
              )}

              {/* Mermaid Diagram */}
              {workflow.mermaidSvg && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">{t('workflowDetail.diagram')}</h3>
                  <div className="bg-white p-4 rounded-lg border border-slate-600">
                    <div dangerouslySetInnerHTML={{ __html: workflow.mermaidSvg }} />
                  </div>
                </div>
              )}
              
              {/* Proposed/After Workflow */}
              {workflow.imageBase64 && workflow.imageMimeType && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Proposed Workflow</h3>
                  <img 
                    src={`data:${workflow.imageMimeType};base64,${workflow.imageBase64}`}
                    alt="Proposed workflow diagram"
                    className="max-w-full h-auto rounded-lg border border-slate-600"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'prd' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">{t('workflowDetail.prdContent')}</h3>
              {workflow.prdMarkdown ? (
                <div className="prose prose-slate prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-slate-300 bg-slate-900 p-4 rounded-lg border border-slate-600">
                    {workflow.prdMarkdown}
                  </pre>
                </div>
              ) : (
                <p className="text-slate-400 italic">{t('workflowDetail.noPrd')}</p>
              )}
            </div>
          )}

          {activeTab === 'pitch' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">{t('workflowDetail.pitchContent')}</h3>
              {workflow.pitchMarkdown ? (
                <div className="prose prose-slate prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-slate-300 bg-slate-900 p-4 rounded-lg border border-slate-600">
                    {workflow.pitchMarkdown}
                  </pre>
                </div>
              ) : (
                <p className="text-slate-400 italic">{t('workflowDetail.noPitch')}</p>
              )}
            </div>
          )}

          {activeTab === 'evaluation' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">{t('workflowDetail.evaluationDetails')}</h3>
                
                {workflow.evaluationScore !== null ? (
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-600 space-y-3">
                    <div className="flex items-center gap-3">
                      <Icons.Star />
                      <span className="text-slate-300">
                        {t('workflowDetail.finalScore')}: 
                        <span className="font-semibold text-white ml-2">{workflow.evaluationScore}/10</span>
                      </span>
                    </div>
                    
                    {workflow.evaluationFeedback && (
                      <div>
                        <h4 className="text-white font-medium mb-2">{t('workflowDetail.feedback')}</h4>
                        <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
                          <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {workflow.evaluationFeedback}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {workflow.sourceEvaluationId && (
                      <div className="text-xs text-slate-400">
                        {t('workflowDetail.evaluationId')}: {workflow.sourceEvaluationId}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">{t('workflowDetail.noEvaluation')}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'canvas' && scenario && workflow && (
            <div className="space-y-6">
              <div className="bg-white/5 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">{t('workflowDetail.canvas')}</h3>
                  <div className="flex items-center gap-2">
                    {!isCanvasEditing ? (
                      <button
                        onClick={startCanvasEditing}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                      >
                        <Icons.Edit />
                        {t('canvas.edit')}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={saveCanvasChanges}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <Icons.Check />
                          {t('canvas.save')}
                        </button>
                        <button
                          onClick={cancelCanvasEditing}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <Icons.X />
                          {t('canvas.cancel')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Canvas Grid */}
                <div className="grid grid-cols-5 gap-4">
                  {(() => {
                    // Use saved canvas data if available, otherwise generate fresh canvas
                    const canvas = workflow.leanCanvas || generateLeanCanvas(scenario, workflow);
                    
                    return (
                      <>
                        {/* Problem */}
                        {renderCanvasSection('problem', canvas.problem, 'bg-red-500/20 border-red-500/30 text-red-200')}

                        {/* Solution */}
                        {renderCanvasSection('solution', canvas.solution, 'bg-green-500/20 border-green-500/30 text-green-200')}

                        {/* Key Metrics */}
                        {renderCanvasSection('keyMetrics', canvas.keyMetrics, 'bg-blue-500/20 border-blue-500/30 text-blue-200')}

                        {/* Unique Value Proposition */}
                        {renderCanvasSection('uniqueValueProposition', canvas.uniqueValueProposition, 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200')}

                        {/* Unfair Advantage */}
                        {renderCanvasSection('unfairAdvantage', canvas.unfairAdvantage, 'bg-purple-500/20 border-purple-500/30 text-purple-200')}

                        {/* Second Row */}
                        
                        {/* Channels */}
                        {renderCanvasSection('channels', canvas.channels, 'bg-indigo-500/20 border-indigo-500/30 text-indigo-200')}

                        {/* Customer Segments - spans 2 columns */}
                        {renderCanvasSection('customerSegments', canvas.customerSegments, 'bg-orange-500/20 border-orange-500/30 text-orange-200', 'col-span-2')}

                        {/* Cost Structure */}
                        {renderCanvasSection('costStructure', canvas.costStructure, 'bg-gray-500/20 border-gray-500/30 text-gray-200')}

                        {/* Revenue Streams */}
                        {renderCanvasSection('revenueStreams', canvas.revenueStreams, 'bg-teal-500/20 border-teal-500/30 text-teal-200')}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="bg-white/5 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">{t('workflowDetail.teamCollaboration')}</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Existing Team Members */}
                  {workflow?.team?.members && Object.keys(workflow.team.members).length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-white mb-3">{t('workflowDetail.teamMembers')}</h4>
                      <div className="space-y-2">
                        {Object.entries(workflow.team.members).map(([memberId, member]) => (
                          <div
                            key={memberId}
                            className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg border border-slate-700/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {member.displayName ? member.displayName.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white flex items-center gap-2">
                                  {member.displayName || member.email}
                                  {member.userId === userId && (
                                    <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded-full">
                                      Owner
                                    </span>
                                  )}
                                </div>
                                {member.displayName && (
                                  <div className="text-xs text-slate-400">{member.email}</div>
                                )}
                                <div className="text-xs text-slate-500">
                                  Added {new Date(member.addedAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {member.userId === userId ? (
                                // Show owner badge instead of dropdown for workflow owner
                                <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  OWNER
                                </span>
                              ) : (
                                // Show role dropdown for other members
                                <div className="relative">
                                  <select
                                    value={member.role}
                                    onChange={(e) => handleUpdateTeamMemberRole(member.userId, e.target.value as TeamRole)}
                                    disabled={updatingRoles.has(member.userId)}
                                    className={`px-2 py-1 text-xs rounded-full border focus:outline-none transition-colors ${
                                      member.role === 'EDITOR'
                                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/30 focus:border-orange-400'
                                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30 focus:border-blue-400'
                                    } ${updatingRoles.has(member.userId) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={`Current role: ${member.role}. Click to change.`}
                                  >
                                    <option value="VIEWER">VIEWER</option>
                                    <option value="EDITOR">EDITOR</option>
                                  </select>
                                  {updatingRoles.has(member.userId) && (
                                    <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {member.userId !== userId && (
                                <button 
                                  onClick={() => handleRemoveTeamMember(member.userId)}
                                  className="text-slate-400 hover:text-red-400 p-1"
                                  title="Remove team member"
                                >
                                  <Icons.X />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invite New Collaborator */}
                  <div>
                    <h4 className="text-lg font-medium text-white mb-3">{t('workflowDetail.inviteCollaborator')}</h4>
                    <div className="space-y-3">
                      <div className="relative">
                        {/* Hidden dummy input to fool browser autofill */}
                        <input
                          type="email"
                          style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
                          tabIndex={-1}
                          autoComplete="email"
                        />
                        <input
                          ref={inputRef}
                          type="text"
                          name="invite-collaborator-email"
                          value={inviteEmail}
                          onChange={handleEmailInputChange}
                          onFocus={handleInputFocus}
                          placeholder={t('workflowDetail.emailPlaceholder')}
                          className="w-full bg-slate-900 text-white p-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                          autoComplete="new-password"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          data-lpignore="true"
                          data-form-type="other"
                          role="combobox"
                          aria-expanded={showUserDropdown}
                          aria-haspopup="listbox"
                        />
                        {showUserDropdown && filteredUsers.length > 0 && (
                          <div 
                            ref={dropdownRef}
                            className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                          >
                            {filteredUsers.map((userItem) => (
                              <div
                                key={userItem.uid}
                                onClick={() => handleUserSelect(userItem)}
                                className="p-3 hover:bg-slate-700 cursor-pointer flex items-center space-x-3 border-b border-slate-700 last:border-b-0"
                              >
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-white">
                                    {userItem.displayName || userItem.email}
                                  </div>
                                  {userItem.displayName && (
                                    <div className="text-xs text-slate-400">{userItem.email}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-3">
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                          className="flex-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="VIEWER">{t('workflowDetail.roles.viewer')}</option>
                          <option value="EDITOR">{t('workflowDetail.roles.editor')}</option>
                        </select>
                        <button
                          onClick={handleInviteTeamMember}
                          disabled={!inviteEmail.includes('@') || isInviting}
                          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isInviting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              {t('workflowDetail.inviting')}
                            </>
                          ) : (
                            <>
                              <Icons.Plus />
                              {t('workflowDetail.invite')}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400 mb-2">
                      {t('workflowDetail.teamCollaborationDesc')}
                    </p>
                    <div className="text-xs text-slate-500 space-y-1">
                      <div><strong>VIEWER:</strong> Can view the workflow but cannot make changes</div>
                      <div><strong>EDITOR:</strong> Can view and edit the workflow content</div>
                      <div><strong>OWNER:</strong> Full control over the workflow and team management</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowDetailView;