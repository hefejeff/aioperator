
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Prevent re-initializing the root on fast refreshes or script re-executions.
// React internally adds a _reactRootContainer property to the element, 
// so we can check for its existence to avoid creating a new root.
if (!(rootElement as any)._reactRootContainer) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
