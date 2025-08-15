import React from 'react';
import type { Scenario } from './types';

export const ALL_SCENARIOS: Scenario[] = [
  {
    id: 'support-triage',
    title: 'Automating Customer Support Triage',
    description: 'Design a workflow to manage incoming customer support tickets, deciding which steps to automate with AI and when to escalate to a human agent.',
    goal: "You're given a sample customer support email. First, define a process flow (e.g., categorize intent, check urgency, draft response, decide on escalation). Identify which steps are best for an AI vs. a human. Then, for an AI-suitable step like 'Categorize and Summarize', write a prompt that takes the email and outputs a structured summary (e.g., JSON with category, urgency, and a one-sentence summary).",
    type: 'TRAINING',
  },
  {
    id: 'sales-personalization',
    title: 'Hyper-Personalizing Sales Outreach',
    description: "Design a process that uses AI to research prospects and personalize email drafts, deciding what parts of the process should remain human-driven.",
    goal: "You have a prospect's professional bio. First, outline a workflow for personalizing a sales email. What part should be templated vs. AI-generated? Then, write a prompt that takes the bio and a product description to identify the prospect's potential needs and drafts a highly personalized, 3-sentence email opener that connects their role to your product's value.",
    type: 'TRAINING',
  },
  {
    id: 'content-pipeline',
    title: 'Content Pipeline: From Transcript to Blog Post',
    description: 'Create a workflow to turn a raw meeting transcript into a polished blog post, strategically using AI for steps like summarization and drafting while reserving others for human oversight.',
    goal: "You are given a messy meeting transcript. First, define the steps to get from transcript to blog post (e.g., cleaning, summarizing, outlining, drafting, human review). Which steps are ideal for AI? Then, write a prompt for a core AI step: taking a cleaned summary of the meeting and generating a structured outline for a blog post, complete with a catchy title and section headers.",
    type: 'TRAINING',
  },
  {
    id: 'market-research',
    title: 'Analyzing Customer Feedback at Scale',
    description: 'Design an AI-powered workflow to analyze hundreds of app store reviews to extract themes, sentiment, and feature requests. Determine the AI\'s role versus the human analyst\'s.',
    goal: 'You are given a batch of app reviews. First, design a workflow for processing them. How do you categorize feedback? What is the role of a human in verifying results? Then, write a prompt that instructs an AI to process one review to extract sentiment (Positive/Negative), identify mentioned feature requests, and provide a one-sentence summary of the core feedback.',
    type: 'TRAINING',
  },
  {
    id: 'eval-crisis-comm',
    title: 'Crisis Communication',
    description: 'This is an evaluation of your ability to handle a complex, high-stakes communication task under pressure.',
    goal: 'You are the head of PR for a popular social media company. A major data breach has just been discovered. Draft a public statement (under 250 words) to be posted on your company blog. The statement must: 1. Acknowledge the breach. 2. Express sincere apology. 3. Outline immediate steps being taken to secure user data. 4. Reassure users without making false promises. Your prompt should guide the AI to create a statement that is clear, empathetic, and responsible.',
    type: 'EVALUATION',
  },
];


export const Icons = {
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  Sparkles: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v2.586l1.707-1.707a1 1 0 111.414 1.414L12.414 8H15a1 1 0 110 2h-2.586l1.707 1.707a1 1 0 11-1.414 1.414L11 11.414V14a1 1 0 11-2 0v-2.586l-1.707 1.707a1 1 0 11-1.414-1.414L7.586 10H5a1 1 0 110-2h2.586L5.793 6.293a1 1 0 011.414-1.414L9 6.586V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  ),
  Beaker: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 00.517 3.86l2.387.477a2 2 0 001.806-.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 01-.517-3.86l-2.387-.477a2 2 0 01-.547-1.806zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m12 0a2 2 0 100-4m0 4a2 2 0 110-4" />
    </svg>
  ),
   LightBulb: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
   ),
   ClipboardCheck: () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
     </svg>
   ),
   Upload: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
};