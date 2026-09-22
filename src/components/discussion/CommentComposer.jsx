// src/components/discussion/CommentComposer.jsx
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Ic, ICONS } from '../Icons';
import MentionPopup from './MentionPopup';
import { useMentions } from '../../hooks/useMentions';
import { FILE_LIMITS, FILE_MESSAGES } from '../../utils/constants';

const REPLY_PREFIX_RE = /^@?[^\s,]+\s+[^\s,]+,\s*/;

/**
 * Композер комментария: текст, вложения-изображения, @-упоминания.
 *
 * Внутри — in-flight lock (sendingRef + isSending). Без него:
 *
 *   - между store.addComment({...}) и очисткой state (setText('') /
 *     setAttachments([])) стоит await store.addAttachment(...) в цикле
 *     по вложениям. Пока цикл идёт, text и attachments ещё не сброшены,
 *     и повторный Enter (автоповтор клавиши) или клик по «Отправить»
 *     пройдут валидацию заново — создастся второй комментарий с тем же
 *     текстом и повторной загрузкой вложений;
 *
 *   - sendingRef отсекает повтор синхронно, ещё до того, как React
 *     успеет показать disabled на кнопке (между setIsSending(true) и
 *     его коммитом есть такт).
 *
 * isSending — для UI: disabled кнопки и подмена подписи на «Отправка…».
 */
function CommentComposer({
  store,
  projectId = null,
  taskId = null,
  currentUser,
  candidates,
  toast,
  replyTo,
  setReplyTo,
  comments,
  getAuthor,
  readOnly,
  onCommentCreated,
}) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);
  const textareaRef = useRef(null);

  const mentions = useMentions({
    text,
    setText,
    candidates,
    textareaRef,
  });

  useLayoutEffect(() => {
    if (!replyTo) return;
    const parent = comments.find(c => c.id === replyTo);
    const author = parent ? getAuthor(parent.authorId) : null;
    if (!author) return;
    const prefix = `@${author.last} ${author.first}, `;
    setText(prev => prefix + prev.replace(REPLY_PREFIX_RE, ''));
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });
  }, [replyTo]);

  const cancelReply = useCallback(() => {
    setReplyTo(null);
    setText(prev => prev.replace(REPLY_PREFIX_RE, ''));
  }, [setReplyTo]);

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
    const valid = files.filter(f => f.type.startsWith('image/') && f.size <= FILE_LIMITS.image);
    if (valid.length !== files.length) toast?.(FILE_MESSAGES.someImagesSkipped, 'warning');
    if (valid.length) {
      setAttachments(prev => [...prev, ...valid]);
      toast?.(`Добавлено ${valid.length} файлов`, 'success');
    }
  }, [readOnly, toast]);

  const send = async () => {
    if (readOnly || sendingRef.current) return;
    if (!text.trim() && attachments.length === 0) {
      toast?.('Введите текст или прикрепите изображение', 'warning');
      return;
    }

    sendingRef.current = true;
    setIsSending(true);
    try {
      const created = store.addComment({
        projectId: projectId || null,
        taskId: taskId || null,
        parentId: replyTo || null,
        authorId: currentUser.id,
        text: text.trim(),
        attachments: [],
      });
      if (created?.id) onCommentCreated?.(created.id);

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
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
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
    // Синхронный guard для автоповтора Enter: пока первый вызов send()
    // не завершился, повторные нажатия не проходят.
    if (sendingRef.current) return;
    send();
  };

  const parent = replyTo ? comments.find(x => x.id === replyTo) : null;
  const parentAuthor = parent ? getAuthor(parent.authorId) : null;

  return (
    <div className="cm-composer">
      {replyTo && (
        <div className="reply-banner">
          Ответ на комментарий {parentAuthor ? `${parentAuthor.last} ${parentAuthor.first}` : ''}
          <button className="link" onClick={cancelReply}>отменить</button>
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
            <div className="cm-attachment-chip" key={idx}>
              <span className="text-sm">{file.name}</span>
              <button
                className="icon-btn xs"
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                disabled={isSending}
              >
                <Ic d={ICONS.x} size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="cm-foot">
        <span className="mut sm">
          Участники получат уведомление; упомянутые - отдельно.
        </span>
        <div className="flex gap-2">
          <button
            className="btn primary sm"
            onClick={send}
            disabled={isSending}
          >
            <Ic d={ICONS.chat} size={13} /> {isSending ? 'Отправка…' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommentComposer;
export { CommentComposer };