import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App'
import './index.css'

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 text-center">
      <div className="max-w-md w-full p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Oops! Something went wrong.</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6 truncate">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Clear planner draft if it's causing the crash
        localStorage.removeItem('bicly_planner_draft')
        window.location.reload()
      }}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
