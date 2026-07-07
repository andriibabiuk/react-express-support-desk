import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

Sentry.init({
	dsn: import.meta.env.VITE_SENTRY_DSN,
	environment: import.meta.env.MODE,
});

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</Sentry.ErrorBoundary>
	</StrictMode>,
);
