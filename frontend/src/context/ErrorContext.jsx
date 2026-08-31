import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ErrorDialog from '../components/ErrorDialog';
import { formatErrorMessage } from '../utils/errorMessage';

const ErrorContext = createContext(null);

export function ErrorProvider({ children }) {
  const [message, setMessage] = useState('');

  const showError = useCallback((error) => {
    setMessage(formatErrorMessage(error));
  }, []);

  const clearError = useCallback(() => {
    setMessage('');
  }, []);

  const value = useMemo(() => ({ showError, clearError }), [showError, clearError]);

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <ErrorDialog message={message} onClose={clearError} />
    </ErrorContext.Provider>
  );
}

export function useErrorAlert() {
  const ctx = useContext(ErrorContext);
  if (!ctx) {
    throw new Error('useErrorAlert must be used within ErrorProvider');
  }
  return ctx;
}
