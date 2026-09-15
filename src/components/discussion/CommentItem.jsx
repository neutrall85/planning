// src/components/discussion/CommentItem.jsx
import { useRef } from 'react';
import Avatar from '../Avatar';
import { fmtDT } from '../../utils/date';
import { highlightText, renderMentionText } from './render';
import { useDiscussion } from './context';
import { CommentPolicy } from './CommentPolicy';
import CommentEditor from './CommentEditor';
import CommentReactions from './CommentReactions';
import CommentAttachments from './CommentAttachments';
import CommentActions from './CommentActions';
import ReactionPicker from './ReactionPicker';
import { useReactionPicker } from '../../hooks';

export default function CommentItem({ comment, depth, children }) {
  const {
    currentUser, getAuthor, editingId, searchQuery,
    showTaskLink, onTaskClick, tasks,
    readOnly, setReaction,
  } = useDiscussion();

  const rootRef = useRef(null);
  const picker = useReactionPicker(rootRef);

  const author = getAuthor(comment.authorId);
  const task = comment.taskId && tasks?.find(t => t.id === comment.taskId);
  const myReaction = CommentPolicy.getUserReaction(comment, currentUser.id);

  const textContent = searchQuery.trim()
    ? highlightText(comment.text, searchQuery.trim())
    : renderMentionText(comment.text);

  const handleCommentClick = (e) => {
    if (readOnly || editingId === comment.id) return;
    if (e.target.closest('button, a, input, textarea')) return;
    picker.toggle();
  };

  const pick = (emoji) => {
    setReaction(comment.id, emoji);
    picker.close();
  };

  // Класс на обёртке: отступ накапливается за счёт вложенности самих обёрток.
  // depth === 0 → без отступа; depth >= 1 → 26px, но каждый уровень вложен
  // в предыдущий, поэтому суммарный отступ = 26 * depth.
  const wrapperClass = 'cm-item' + (depth > 0 ? ' cm-item--nested' : '');

  return (
    <div
      id={`comment-${comment.id}`}
      ref={rootRef}
      className={wrapperClass}
    >
      <div
        className={'cm' + (depth > 0 ? ' reply' : '') + (comment.pinned ? ' pinned' : '')}
        onClick={handleCommentClick}
      >
        <div className="cm-head">
          <Avatar employee={author} size="xs" />
          <span className="cm-author">{author ? `${author.last} ${author.first}` : '—'}</span>
          <span className="mut sm">{fmtDT(comment.createdAt)}</span>
          {comment.updatedAt > comment.createdAt && <span className="mut sm">(ред.)</span>}
          {comment.pinned && <span className="pinned-badge" title="Закреплено">📌</span>}
          {showTaskLink && task && onTaskClick && (
            <button
              className="link"
              onClick={(e) => { e.stopPropagation(); onTaskClick(comment.taskId); }}
              title="Открыть задачу"
            >
              {task.title}
            </button>
          )}
        </div>

        {editingId === comment.id
          ? <CommentEditor comment={comment} />
          : <div className="cm-text">{textContent}</div>}

        <CommentAttachments attachments={comment.attachments || []} />

        {picker.open && (
          <ReactionPicker
            containerRef={picker.pickerRef}
            activeEmoji={myReaction}
            onPick={pick}
          />
        )}

        <CommentReactions comment={comment} />
        <CommentActions comment={comment} />
      </div>
      {children}
    </div>
  );
}