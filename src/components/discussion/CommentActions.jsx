import { useDiscussion } from './context';

export default function CommentActions({ comment }) {
  const {
    policy, readOnly,
    setEditingId, setEditText,
    onReply, togglePin, onDelete,
  } = useDiscussion();

  if (readOnly) return null;

  return (
    <div className="cm-actions" onClick={(e) => e.stopPropagation()}>
      <button className="link" onClick={() => onReply(comment.id)}>Ответить</button>
      {policy.canEdit(comment) && (
        <button
          className="link"
          onClick={() => { setEditingId(comment.id); setEditText(comment.text); }}
        >
          Редактировать
        </button>
      )}
      {policy.canPin(comment) && (
        <button className="link" onClick={() => togglePin(comment)}>
          {comment.pinned ? 'Открепить' : 'Закрепить'}
        </button>
      )}
      {policy.canDelete(comment) && (
        <button className="link red-link" onClick={() => onDelete(comment)}>Удалить</button>
      )}
    </div>
  );
}