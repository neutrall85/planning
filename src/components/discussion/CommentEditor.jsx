import React from 'react';
import { useDiscussion } from './context';

export default function CommentEditor({ comment }) {
  const { editText, setEditText, setEditingId, saveEdit } = useDiscussion();

  return (
    <div className="cm-edit" onClick={(e) => e.stopPropagation()}>
      <textarea
        className="inp"
        rows="2"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
      />
      <div className="cm-actions">
        <button className="btn primary sm" onClick={() => saveEdit(comment)}>Сохранить</button>
        <button className="btn ghost sm" onClick={() => setEditingId(null)}>Отмена</button>
      </div>
    </div>
  );
}