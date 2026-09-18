import React, { useLayoutEffect, useRef } from 'react';
import { useDiscussion } from './context';

export default function CommentEditor({ comment }) {
  const { editText, setEditText, setEditingId, saveEdit } = useDiscussion();
  const textareaRef = useRef(null);

  /**
   * При появлении редактора сразу фокусируем textarea и ставим курсор
   * в конец текста. useLayoutEffect - а не useEffect - чтобы позиция
   * курсора была выставлена до первого пейнта: иначе на мгновение
   * видно курсор в начале, а затем его прыжок в конец.
   *
   * Зависимостей нет: компонент монтируется заново при каждом переходе
   * в режим редактирования (родитель условно рендерит его, когда
   * editingId === comment.id), поэтому эффект выполняется один раз за
   * сессию редактирования - а не на каждое нажатие клавиши.
   */
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    const end = ta.value.length;
    ta.setSelectionRange(end, end);
  }, []);

  return (
    <div className="cm-edit" onClick={(e) => e.stopPropagation()}>
      <textarea
        ref={textareaRef}
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