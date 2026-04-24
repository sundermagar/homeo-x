import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App';
import './shared/styles/global.css';

// StrictMode intentionally omitted — it double-invokes effects in dev
// and can cause issues in production builds.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
