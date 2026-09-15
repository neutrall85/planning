import { createContext, useCallback, useContext, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';

const ConfirmContext = createContext(null);

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
};

/**
 * Провайдер диалогов подтверждения и ввода.
 *
 * `confirm(opts)` возвращает Promise<boolean>; `prompt(opts)` - Promise<string|null>.
 * Ждём результат через await в вызывающем коде - это позволяет линейно читать
 * сценарий «спросили → сделали», без коллбеков и без window.confirm.
 */
export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null);

  const confirm = useCallback((options = {}) =>
    new Promise((resolve) => {
      setState({ mode: 'confirm', resolve, ...options });
    }), []);

  const prompt = useCallback((options = {}) =>
    new Promise((resolve) => {
      setState({ mode: 'prompt', resolve, ...options });
    }), []);

  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      {state && (
        <ConfirmDialog
          state={state}
          onCancel={() => close(state.mode === 'prompt' ? null : false)}
          onSubmit={(value) => close(state.mode === 'prompt' ? value : true)}
        />
      )}
    </ConfirmContext.Provider>
  );
};