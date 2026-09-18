// src/components/Modals/TaskModal/TaskNotesTab.jsx
import { Ic, ICONS } from '../../Icons';
import { fmtDT } from '../../../utils/date';

/** Вкладка «Личные заметки» - видна и доступна только исполнителю задачи. */
export function TaskNotesTab({ notesList, onNewNote, onOpenNote }) {
  return (
    <div className="tm-block">
      <div className="subtask-header">
        <div className="rep-panel-title">Личные заметки</div>
        <button
          type="button"
          className="btn primary sm"
          onClick={onNewNote}
        >
          <Ic d={ICONS.plus} size={13} /> Новая заметка
        </button>
      </div>
      <p className="mut sm mb-2">
        Видны только вам. Сохраняются отдельно от формы задачи.
      </p>
      {notesList.length === 0 ? (
        <div className="mut sm">Заметок пока нет</div>
      ) : (
        <div className="note-grid">
          {notesList.map(n => (
            <button
              key={n.id}
              type="button"
              className="note-tile"
              onClick={() => onOpenNote(n)}
            >
              <div className="note-tile-title">{n.title || 'Без названия'}</div>
              <div className="note-tile-preview">{n.text || 'Пустая заметка'}</div>
              <div className="note-tile-date">{fmtDT(n.updatedAt)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
