import React, { useState, useRef, useEffect } from 'react';
import { generateChatResponse } from '../services/geminiService';
import { sendMessageToAssistant, listAssistants } from '../services/openaiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentName?: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
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
          conversationHistory
        );
      } else {
        response = await generateChatResponse(
          input.trim(),
          conversationHistory
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
      handleSubmit(e);
    }
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
              <form onSubmit={handleSubmit} className="flex gap-2">
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
                disabled={!input.trim() || isLoading}
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
              Press Enter to send, Shift+Enter for a new line, ESC to close
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
