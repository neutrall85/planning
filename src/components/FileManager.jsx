import { Ic, ICONS } from './Icons';
import { fmtDMY } from '../utils/date';

export const FileManager = ({ 
  files = [], 
  onUpload, 
  onDelete, 
  canUpload = true, 
  canDelete = true,
  employeeName = (id) => id,
}) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  const formatSize = (size) => {
    if (size < 1024) return size + ' Б';
    if (size < 1048576) return (size / 1024).toFixed(1) + ' КБ';
    return (size / 1048576).toFixed(1) + ' МБ';
  };

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
        </div>
      )}
      {files.length === 0 && <div className="mut sm">Файлы не загружены</div>}
      {files.map(file => (
        <div key={file.id} className="file-item">
          <Ic d={ICONS.file} size={24} />
          <div className="file-info">
            <div className="file-name">{file.name}</div>
            <div className="file-meta">
              {formatSize(file.size)} · загрузил {employeeName(file.uploadedBy)}
              {file.uploadedAt && ` ${fmtDMY(file.uploadedAt)}`}
            </div>
          </div>
          <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer" className="btn ghost sm">Скачать</a>
          {canDelete && (
            <button className="icon-btn danger" onClick={() => onDelete(file.id)} title="Удалить файл">
              <Ic d={ICONS.trash} size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};