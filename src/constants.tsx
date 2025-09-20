// constants and icons
import type { Scenario } from './types';

export const ALL_SCENARIOS: Scenario[] = [
  {
    id: 'support-triage',
    title: 'Automating Customer Support Triage',
  title_es: 'Automatizando la Clasificación de Soporte al Cliente',
    description: 'Design a workflow to manage incoming customer support tickets, deciding which steps to automate with AI and when to escalate to a human agent.',
  description_es: 'Diseña un flujo de trabajo para gestionar tickets de soporte entrantes, decidiendo qué pasos automatizar con IA y cuándo escalar a un agente humano.',
    goal: "You're given a sample customer support email. First, define a process flow (e.g., categorize intent, check urgency, draft response, decide on escalation). Identify which steps are best for an AI vs. a human. Then, for an AI-suitable step like 'Categorize and Summarize', write a prompt that takes the email and outputs a structured summary (e.g., JSON with category, urgency, and a one-sentence summary).",
  goal_es: "Se te da un correo de soporte al cliente de ejemplo. Primero, define un flujo de proceso (p.ej., categorizar intención, comprobar urgencia, redactar respuesta, decidir escalado). Identifica qué pasos son mejores para IA vs. humano. Luego, para un paso apto para IA como 'Categorizar y Resumir', escribe un prompt que tome el correo y devuelva un resumen estructurado (p.ej., JSON con categoría, urgencia y un resumen de una frase).",
    type: 'TRAINING',
  },
  {
    id: 'sales-personalization',
    title: 'Hyper-Personalizing Sales Outreach',
  title_es: 'Hiperpersonalización del Alcance de Ventas',
    description: "Design a process that uses AI to research prospects and personalize email drafts, deciding what parts of the process should remain human-driven.",
  description_es: "Diseña un proceso que use IA para investigar prospectos y personalizar borradores de correo, decidiendo qué partes deben permanecer dirigidas por humanos.",
    goal: "You have a prospect's professional bio. First, outline a workflow for personalizing a sales email. What part should be templated vs. AI-generated? Then, write a prompt that takes the bio and a product description to identify the prospect's potential needs and drafts a highly personalized, 3-sentence email opener that connects their role to your product's value.",
  goal_es: "Tienes la biografía profesional de un prospecto. Primero, esboza un flujo para personalizar un correo de ventas. ¿Qué parte debe ser plantillas vs. generada por IA? Luego, escribe un prompt que tome la biografía y la descripción del producto para identificar necesidades potenciales y redacte un inicio de correo altamente personalizado de 3 frases que conecte su rol con el valor de tu producto.",
    type: 'TRAINING',
  },
  {
    id: 'content-pipeline',
    title: 'Content Pipeline: From Transcript to Blog Post',
  title_es: 'Canal de Contenido: De la Transcripción al Post del Blog',
    description: 'Create a workflow to turn a raw meeting transcript into a polished blog post, strategically using AI for steps like summarization and drafting while reserving others for human oversight.',
  description_es: 'Crea un flujo para convertir una transcripción cruda de reunión en un post de blog pulido, usando IA estratégicamente para pasos como resumen y redacción mientras se reserva la revisión humana para otros.',
    goal: "You are given a messy meeting transcript. First, define the steps to get from transcript to blog post (e.g., cleaning, summarizing, outlining, drafting, human review). Which steps are ideal for AI? Then, write a prompt for a core AI step: taking a cleaned summary of the meeting and generating a structured outline for a blog post, complete with a catchy title and section headers.",
  goal_es: "Se te da una transcripción desordenada de una reunión. Primero, define los pasos para pasar de la transcripción al post (p.ej., limpiar, resumir, esbozar, redactar, revisión humana). ¿Qué pasos son ideales para IA? Luego, escribe un prompt para un paso central de IA: tomar un resumen limpio de la reunión y generar un esquema estructurado para un post, con título llamativo y encabezados de sección.",
    type: 'TRAINING',
  },
  {
    id: 'market-research',
    title: 'Analyzing Customer Feedback at Scale',
  title_es: 'Analizar Comentarios de Clientes a Gran Escala',
    description: 'Design an AI-powered workflow to analyze hundreds of app store reviews to extract themes, sentiment, and feature requests. Determine the AI\'s role versus the human analyst\'s.',
  description_es: 'Diseña un flujo potenciado por IA para analizar cientos de reseñas de tiendas de apps y extraer temas, sentimiento y solicitudes de funciones. Determina el rol de la IA frente al analista humano.',
    goal: 'You are given a batch of app reviews. First, design a workflow for processing them. How do you categorize feedback? What is the role of a human in verifying results? Then, write a prompt that instructs an AI to process one review to extract sentiment (Positive/Negative), identify mentioned feature requests, and provide a one-sentence summary of the core feedback.',
  goal_es: 'Se te da un lote de reseñas de apps. Primero, diseña un flujo para procesarlas. ¿Cómo categorizas los comentarios? ¿Cuál es el papel humano para verificar resultados? Luego, escribe un prompt que instruya a la IA a procesar una reseña y extraer sentimiento (Positivo/Negativo), identificar solicitudes de funciones mencionadas y ofrecer un resumen de una frase.',
    type: 'TRAINING',
  },
  {
    id: 'eval-crisis-comm',
    title: 'Crisis Communication',
  title_es: 'Comunicación en Crisis',
    description: 'This is an evaluation of your ability to handle a complex, high-stakes communication task under pressure.',
  description_es: 'Esta es una evaluación de tu capacidad para manejar una tarea de comunicación compleja y de alto riesgo bajo presión.',
    goal: 'You are the head of PR for a popular social media company. A major data breach has just been discovered. Draft a public statement (under 250 words) to be posted on your company blog. The statement must: 1. Acknowledge the breach. 2. Express sincere apology. 3. Outline immediate steps being taken to secure user data. 4. Reassure users without making false promises. Your prompt should guide the AI to create a statement that is clear, empathetic, and responsible.',
  goal_es: 'Eres el jefe de PR de una popular red social. Se acaba de descubrir una brecha de datos importante. Redacta una declaración pública (menos de 250 palabras) para publicar en el blog de la compañía. Debe: 1. Reconocer la brecha. 2. Expresar disculpa sincera. 3. Resumir pasos inmediatos para asegurar datos. 4. Tranquilizar sin hacer promesas falsas. Tu prompt debe guiar a la IA para crear una declaración clara, empática y responsable.',
    type: 'TRAINING',
  },
];


export const Icons = {
  Star: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 2.5l2.472 4.95 5.466.795-3.969 3.87.937 5.457L10 14.9l-4.906 2.67.937-5.457L2.062 8.245l5.466-.795L10 2.5z" />
    </svg>
  ),
  StarSolid: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
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
  ),
  Trophy: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.926 5.074a1 1 0 00-1.21-.064L13 7.438V3a1 1 0 00-1-1H8a1 1 0 00-1 1v4.438l-3.716-2.428a1 1 0 00-1.21.064 1 1 0 00-.188 1.293l4.5 5.833a1 1 0 00.785.399h.215a1 1 0 00.785-.399l4.5-5.833a1 1 0 00-.188-1.293zM12 11a1 1 0 01-1 1H9a1 1 0 110-2h2a1 1 0 011 1z" />
      <path d="M5 12a1 1 0 100 2h10a1 1 0 100-2H5z" />
      <path d="M6 15a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" />
    </svg>
  ),
  ChartBar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm3 2a1 1 0 00-1 1v10a1 1 0 102 0V6a1 1 0 00-1-1zm3 2a1 1 0 00-1 1v8a1 1 0 102 0V9a1 1 0 00-1-1zm3 2a1 1 0 00-1 1v6a1 1 0 102 0v-6a1 1 0 00-1-1zm3 2a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  Menu: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  ChevronUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ),
  ChevronDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Cog: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Document: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Megaphone: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
};

export const DOMAIN_COLORS: Record<string, string> = {
  'Sales': 'bg-rose-700 text-rose-100',
  'HR': 'bg-violet-700 text-violet-100',
  'Finance': 'bg-emerald-700 text-emerald-100',
  'Operations': 'bg-sky-700 text-sky-100',
  'Logistics': 'bg-orange-700 text-orange-100',
  'Healthcare': 'bg-green-700 text-green-100',
  'Manufacturing': 'bg-yellow-700 text-yellow-100',
  'Legal': 'bg-indigo-700 text-indigo-100',
  'Procurement': 'bg-fuchsia-700 text-fuchsia-100',
  'Marketing': 'bg-pink-700 text-pink-100',
  'IT': 'bg-slate-700 text-slate-100',
  'Customer Support': 'bg-cyan-700 text-cyan-100',
  'General': 'bg-slate-700 text-slate-100',
};
