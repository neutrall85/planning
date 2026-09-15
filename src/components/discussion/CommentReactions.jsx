import { useDiscussion } from './context';

export default function CommentReactions({ comment }) {
  const { currentUser, getAuthor, setReaction, readOnly } = useDiscussion();
  const reactions = comment.reactions || {};

  const entries = Object.entries(reactions).filter(([, users]) => users?.length > 0);
  if (entries.length === 0) return null;

  return (
    <div className="cm-reactions">
      {entries.map(([emoji, users]) => {
        const mine = users.includes(currentUser.id);
        const title = users
          .map(id => {
            const e = getAuthor(id);
            return e ? `${e.last} ${e.first}` : id;
          })
          .join(', ');

        return (
          <button
            key={emoji}
            type="button"
            className={`reaction-chip${mine ? ' on' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!readOnly) setReaction(comment.id, emoji);
            }}
            title={title}
            disabled={readOnly}
          >
            <span className="reaction-emoji">{emoji}</span>
            <span className="reaction-count">{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}