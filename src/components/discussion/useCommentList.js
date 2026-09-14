import { useEffect, useMemo, useState } from 'react';

export function useCommentList(store, filter, searchQuery) {
  const [comments, setComments] = useState(() =>
    store.getComments({ ...filter, search: undefined })
  );

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setComments(store.getComments({ ...filter, search: undefined }));
    });
    return unsub;
  }, [store, filter]);

  const visibleComments = useMemo(() => {
    if (!searchQuery.trim()) return comments;
    return store.getComments({ ...filter, search: searchQuery });
  }, [comments, searchQuery, store, filter]);

  return { comments, visibleComments };
}