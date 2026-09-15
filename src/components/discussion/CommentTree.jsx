import React, { useMemo } from 'react';
import CommentItem from './CommentItem';
import { sortSiblings } from '../../utils/commentTree';
import { useDiscussion } from './context';

export default function CommentTree({ parentId = null, depth = 0 }) {
  const { comments, visibleComments, sortOrder, searchQuery } = useDiscussion();

  const children = useMemo(() => {
    const pool = searchQuery.trim() ? visibleComments : comments;
    const list = pool.filter(c => (c.parentId || null) === parentId);
    return sortSiblings(list, parentId === null, sortOrder);
  }, [comments, visibleComments, parentId, sortOrder, searchQuery]);

  return children.map(c => (
    <CommentItem key={c.id} comment={c} depth={depth}>
      <CommentTree parentId={c.id} depth={depth + 1} />
    </CommentItem>
  ));
}