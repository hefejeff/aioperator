/**
 * TypeScript declarations for OpenAI ChatKit web component
 */

declare namespace JSX {
  interface IntrinsicElements {
    'openai-chatkit': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        domain_pk: string;
        workflow_id: string;
        version?: string;
      },
      HTMLElement
    >;
  }
}
