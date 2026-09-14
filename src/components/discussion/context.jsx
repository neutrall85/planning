import { createContext, useContext } from 'react';

const DiscussionContext = createContext(null);

export function DiscussionProvider({ value, children }) {
  return <DiscussionContext.Provider value={value}>{children}</DiscussionContext.Provider>;
}

export function useDiscussion() {
  const ctx = useContext(DiscussionContext);
  if (!ctx) throw new Error('useDiscussion must be used inside DiscussionProvider');
  return ctx;
}