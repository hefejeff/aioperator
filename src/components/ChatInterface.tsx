import React, { useState, useRef, useEffect } from 'react';
import { generateChatResponse } from '../services/geminiService';
import { sendMessageToAssistant, listAssistants } from '../services/openaiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentName?: string;
  images?: string[];
  files?: Array<{ name: string; type: string; url: string }>;
}

interface OpenAIAgent {
  id: string;
  name: string;
  description: string;
  assistantId: string;
  domainPk?: string;
}

interface ChatInterfaceProps {
  onClose: () => void;
}

export default function ChatInterface({ onClose }: ChatInterfaceProps) {
  const [selectedAgent, setSelectedAgent] = useState<OpenAIAgent | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [agents, setAgents] = useState<OpenAIAgent[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; type: string; data: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load real assistants from OpenAI on mount
  useEffect(() => {
    const loadAssistants = async () => {
      setIsLoadingAgents(true);
      try {
        const assistants = await listAssistants();
        console.log('Loaded assistants:', assistants);
        setAgents(assistants.map(a => ({
          id: `openai-${a.id}`,
          name: a.name,
          description: a.description,
          assistantId: a.id,
          domainPk: a.domainPk, // Include domain_pk for ChatKit workflows
        })));
      } catch (error) {
        console.error('Failed to load OpenAI assistants:', error);
      } finally {
        setIsLoadingAgents(false);
      }
    };
    
    loadAssistants();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachedImages.length === 0 && attachedFiles.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input || '(attached files)',
      timestamp: new Date(),
      images: attachedImages.length > 0 ? [...attachedImages] : undefined,
      files: attachedFiles.length > 0 ? attachedFiles.map(f => ({ name: f.name, type: f.type, url: f.data })) : undefined,
    };

    // Store attachments before clearing state
    const messageImages = [...attachedImages];
    const messageFiles = [...attachedFiles];

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedImages([]);
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      let response: string;

      // Use OpenAI Assistant if one is selected, otherwise use Gemini
      if (selectedAgent) {
        response = await sendMessageToAssistant(
          selectedAgent.assistantId,
          input.trim(),
          conversationHistory,
          messageImages.length > 0 ? messageImages : undefined,
          messageFiles.length > 0 ? messageFiles : undefined
        );
      } else {
        response = await generateChatResponse(
          input.trim(),
          conversationHistory,
          messageImages.length > 0 ? messageImages : undefined,
          messageFiles.length > 0 ? messageFiles : undefined
        );
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        agentName: selectedAgent?.name,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result as string;
        
        if (file.type.startsWith('image/')) {
          setAttachedImages(prev => [...prev, result]);
        } else {
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            type: file.type,
            data: result
          }]);
        }
      };
      
      reader.readAsDataURL(file);
    });
    
    // Reset input
    if (e.target) e.target.value = '';
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {selectedAgent ? selectedAgent.name : 'AI Assistant'}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedAgent ? selectedAgent.description : 'Powered by Gemini 2.0'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              title="Toggle agents sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              title="Close chat (ESC)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {/* Use ChatKit for Agent Builder workflows */}
          {selectedAgent && selectedAgent.assistantId.startsWith('wf_') && selectedAgent.domainPk ? (
            <div className="h-full w-full">
              <openai-chatkit 
                domain_pk={selectedAgent.domainPk}
                workflow_id={selectedAgent.assistantId}
                version="1"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          ) : (
            /* Standard chat UI for Gemini and regular assistants */
            <div className="max-w-4xl mx-auto p-4 space-y-6">{messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-100 border border-slate-700'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {message.content}
                  </div>
                  
                  {/* Display attached images */}
                  {message.images && message.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {message.images.map((img, idx) => (
                        <img key={idx} src={img} alt="Attachment" className="rounded-lg max-h-48 object-cover" />
                      ))}
                    </div>
                  )}
                  
                  {/* Display attached files */}
                  {message.files && message.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs bg-slate-700/50 rounded px-2 py-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                          </svg>
                          <span className="truncate">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-violet-200' : 'text-slate-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
          )}
        </div>

        {/* Input - Hide when using ChatKit (it has its own input) */}
        {!(selectedAgent && selectedAgent.assistantId.startsWith('wf_') && selectedAgent.domainPk) && (
          <div className="border-t border-slate-700 bg-slate-900/95 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto p-4">
              {/* Attachment previews */}
              {(attachedImages.length > 0 || attachedFiles.length > 0) && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedImages.map((img, idx) => (
                    <div key={`img-${idx}`} className="relative group">
                      <img src={img} alt="Attached" className="h-20 w-20 object-cover rounded-lg border border-slate-600" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {attachedFiles.map((file, idx) => (
                    <div key={`file-${idx}`} className="relative group flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2">
                      <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-slate-300 truncate max-w-[120px]">{file.name}</span>
                      <button
                        onClick={() => removeFile(idx)}
                        className="ml-1 text-red-400 hover:text-red-300"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.json,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-3 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                title="Attach files or images"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none max-h-32"
                rows={1}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={(!input.trim() && attachedImages.length === 0 && attachedFiles.length === 0) || isLoading}
                className="px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
            <p className="text-xs text-slate-500 mt-2">
              📎 Attach images & documents • Press Enter to send • Shift+Enter for new line • ESC to close
            </p>
          </div>
        </div>
        )}
      </div>

      {/* Right Sidebar - Agents */}
      {isSidebarOpen && (
        <div className="w-80 border-l border-slate-700 bg-slate-800/50 backdrop-blur-sm flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">AI Agents</h3>
                <p className="text-xs text-slate-400 mt-1">Select an agent to chat with</p>
              </div>
              {isLoadingAgents && (
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">{/* Default AI Option */}
            <button
              onClick={() => {
                setSelectedAgent(null);
                setMessages([{
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: 'Hello! I\'m your AI assistant. How can I help you today?',
                  timestamp: new Date(),
                }]);
              }}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                selectedAgent === null
                  ? 'bg-violet-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">Default AI</div>
                  <div className="text-xs opacity-80 truncate">Gemini 2.0 Flash</div>
                </div>
              </div>
            </button>

            {/* OpenAI Agents */}
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgent(agent);
                  setMessages([{
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `Hello! I'm ${agent.name}. ${agent.description}. How can I assist you?`,
                    timestamp: new Date(),
                    agentName: agent.name,
                  }]);
                }}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  selectedAgent?.id === agent.id
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{agent.name}</div>
                    <div className="text-xs opacity-80 truncate">{agent.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-slate-700">
            <button className="w-full px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors text-sm flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Agent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
