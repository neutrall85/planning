// src/components/FileManager.jsx
import { useState } from 'react';
import { Ic, ICONS } from './Icons';
import { fmtDMY, fmtDT } from '../utils/date';
import { groupByDocument } from '../utils/fileVersions';

const formatSize = (size) => {
  if (size < 1024) return size + ' Б';
  if (size < 1048576) return (size / 1024).toFixed(1) + ' КБ';
  return (size / 1048576).toFixed(1) + ' МБ';
};

const DocumentRow = ({ doc, onDelete, canDelete, employeeName }) => {
  const [expanded, setExpanded] = useState(false);
  const { latest, versions } = doc;
  const hasHistory = versions.length > 1;

  return (
    <div className="file-document">
      <div className="file-item">
        <Ic d={ICONS.file} size={24} />
        <div className="file-info">
          <div className="file-name">
            {latest.name}
            {hasHistory && <span className="file-version-badge">v{latest.version}</span>}
          </div>
          <div className="file-meta">
            {formatSize(latest.size)} · загрузил {employeeName(latest.uploadedBy)}
            {latest.uploadedAt && ` ${fmtDMY(latest.uploadedAt)}`}
          </div>
        </div>
        {hasHistory && (
          <button
            className="btn ghost sm"
            onClick={() => setExpanded(v => !v)}
            title="История версий"
          >
            <Ic d={ICONS.archive} size={13} /> История ({versions.length})
          </button>
        )}
        <a
          href={latest.url}
          download={latest.name}
          target="_blank"
          rel="noopener noreferrer"
          className="btn ghost sm"
        >
          Скачать
        </a>
        {canDelete && (
          <button
            className="icon-btn danger"
            onClick={() => onDelete(latest.id)}
            title="Удалить последнюю версию"
          >
            <Ic d={ICONS.trash} size={14} />
          </button>
        )}
      </div>
      {expanded && hasHistory && (
        <div className="file-versions">
          {versions.map((v, i) => (
            <div key={v.id} className={`file-version-row${i === 0 ? ' current' : ''}`}>
              <span className="file-version-tag">v{v.version}</span>
              <span className="file-version-date">{v.uploadedAt ? fmtDT(v.uploadedAt) : '—'}</span>
              <span className="file-version-author">{employeeName(v.uploadedBy)}</span>
              <span className="file-version-size">{formatSize(v.size)}</span>
              <a
                href={v.url}
                download={v.name}
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                Скачать
              </a>
              {canDelete && (
                <button
                  className="icon-btn danger xs"
                  onClick={() => onDelete(v.id)}
                  title={`Удалить версию v${v.version}`}
                >
                  <Ic d={ICONS.trash} size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const FileManager = ({
  files = [],
  onUpload,
  onDelete,
  canUpload = true,
  canDelete = true,
  employeeName = (id) => id,
}) => {
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  const documents = groupByDocument(files);

  return (
    <div className="tm-block">
      <div className="rep-panel-title">Файлы</div>
      {canUpload && (
        <div className="toolbar">
          <input
            type="file"
            id="file-upload-input"
            className="file-input-hidden"
            onChange={handleFileChange}
          />
          <label htmlFor="file-upload-input" className="btn primary sm">
            <Ic d={ICONS.file} size={14} /> Выбрать файл
          </label>
          <span className="mut sm">Файл с существующим именем создаст новую версию</span>
        </div>
      )}
      {documents.length === 0 && <div className="mut sm">Файлы не загружены</div>}
      {documents.map(doc => (
        <DocumentRow
          key={doc.name}
          doc={doc}
          onDelete={onDelete}
          canDelete={canDelete}
          employeeName={employeeName}
        />
      ))}
    </div>
  );
};