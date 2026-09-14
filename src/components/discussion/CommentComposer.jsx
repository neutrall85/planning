import React, { useCallback, useRef, useState } from 'react';
import { Ic, ICONS } from '../Icons';
import MentionPopup from './MentionPopup';
import { useMentions } from './useMentions';

export default function CommentComposer({
  store, filter, currentUser, candidates, toast,
  replyTo, setReplyTo, comments, getAuthor,
  readOnly,
}) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef(null);

  const mentions = useMentions({ text, setText, candidates, textareaRef });

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (readOnly) {
      toast?.('У вас нет прав для загрузки файлов', 'warning');
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    const valid = files.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
    if (valid.length !== files.length) {
      toast?.('Некоторые файлы пропущены (только изображения до 5 МБ)', 'warning');
    }
    if (valid.length) {
      setAttachments(prev => [...prev, ...valid]);
      toast?.(`Добавлено ${valid.length} файлов`, 'success');
    }
  }, [readOnly, toast]);

  const removeAttachment = (idx) =>
    setAttachments(prev => prev.filter((_, i) => i !== idx));

  const send = async () => {
    if (readOnly) return;
    if (!text.trim() && attachments.length === 0) {
      toast?.('Введите текст или прикрепите изображение', 'warning');
      return;
    }
    const created = store.addComment({
      projectId: filter.projectId || null,
      taskId: filter.taskId || null,
      parentId: replyTo || null,
      authorId: currentUser.id,
      text: text.trim(),
      attachments: [],
    });
    for (const file of attachments) {
      try {
        await store.addAttachment(created.id, file);
      } catch (err) {
        toast?.(`Ошибка загрузки ${file.name}: ${err.message}`, 'error');
      }
    }
    setText('');
    setReplyTo(null);
    setAttachments([]);
    mentions.reset();
    toast?.('Комментарий добавлен', 'success');
  };

  const onKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const { selectionStart: start, selectionEnd: end } = e.target;
      setText(text.substring(0, start) + '\n' + text.substring(end));
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 1;
      });
      return;
    }
    e.preventDefault();
    send();
  };

  const parent = replyTo ? comments.find(x => x.id === replyTo) : null;
  const parentAuthor = parent ? getAuthor(parent.authorId) : null;

  return (
    <div className="cm-composer">
      {replyTo && (
        <div className="reply-banner">
          Ответ на комментарий{' '}
          {parentAuthor ? `${parentAuthor.last} ${parentAuthor.first}` : ''}
          <button className="link" onClick={() => setReplyTo(null)}>отменить</button>
        </div>
      )}

      <div
        className={`cm-input-wrap${isDragOver ? ' drag-over' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <MentionPopup
          popup={mentions.popup}
          candidates={mentions.filteredCandidates}
          onPick={mentions.pick}
        />
        <textarea
          ref={textareaRef}
          className="inp"
          rows="2"
          placeholder="Комментарий… Введите @ для упоминания участника. Перетащите изображения сюда."
          value={text}
          onChange={(e) => mentions.onType(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={readOnly}
        />
      </div>

      {attachments.length > 0 && (
        <div className="cm-attachments">
          {attachments.map((file, idx) => (
            <div key={idx} className="cm-attachment-chip">
              <span className="text-sm">{file.name}</span>
              <button className="icon-btn xs" onClick={() => removeAttachment(idx)}>
                <Ic d={ICONS.x} size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="cm-foot">
        <span className="mut sm">
          Участники получат уведомление; упомянутые — отдельно.
        </span>
        <div className="flex gap-2">
          <button className="btn primary sm" onClick={send}>
            <Ic d={ICONS.chat} size={13} /> Отправить
          </button>
        </div>
      </div>
    </div>
  );
}