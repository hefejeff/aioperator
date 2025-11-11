/**
 * Agent Configuration
 * Add your OpenAI Agent Builder workflows here
 * 
 * To get your workflow ID and domain:
 * 1. Go to https://platform.openai.com/agents (or wherever you built your agent)
 * 2. Copy the workflow ID (starts with wf_)
 * 3. Copy the domain_pk (starts with domain_pk_)
 * 4. Add it to the array below
 */

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  model?: string;
  domainPk?: string;
}

export const CUSTOM_AGENTS: AgentConfig[] = [
  {
    id: 'wf_68e5a5764ff081908531ad1e8445213b07689f422e186df8',
    name: 'My Travel Agent',
    description: 'Agent Builder workflow for travel assistance',
    model: 'gpt-4o',
    domainPk: 'domain_pk_6911f6f3ba5c81908ab78f9f9ada4cb80699125eda6fa530',
  },
  // Add more agents here:
  // {
  //   id: 'wf_your_workflow_id_here',
  //   name: 'Your Agent Name',
  //   description: 'What this agent does',
  //   model: 'gpt-4o',
  //   domainPk: 'domain_pk_your_domain_here',
  // },
];
