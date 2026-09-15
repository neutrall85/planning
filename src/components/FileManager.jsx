// src/components/FileManager.jsx
import { useCallback, useMemo, useState } from 'react';
import { Ic, ICONS } from './Icons';
import { SearchBox } from './SearchBox';
import { fmtDMY, fmtDT } from '../utils/date';
import { groupByDocument } from '../utils/fileVersions';
import {
  getChildren,
  buildBreadcrumb,
  validateFolderName,
  getFolderPathString,
  flattenLatestDocuments,
} from '../utils/fileTree';
import { DIALOGS, TOASTS, FILE_ROOT_LABEL } from '../utils/constants';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

const formatSize = (size) => {
  if (size < 1024) return size + ' Б';
  if (size < 1048576) return (size / 1024).toFixed(1) + ' КБ';
  return (size / 1048576).toFixed(1) + ' МБ';
};

const Breadcrumb = ({ items, onNavigate }) => (
  <div className="file-breadcrumb">
    <button type="button" className="link" onClick={() => onNavigate(null)}>
      {FILE_ROOT_LABEL}
    </button>
    {' '}
    {items.map(folder => (
      <span key={folder.id} className="file-breadcrumb-item">
        <span className="file-breadcrumb-sep">/</span>
        {' '}
        <button type="button" className="link" onClick={() => onNavigate(folder.id)}>
          {folder.name}
        </button>
        {' '}
      </span>
    ))}
  </div>
);

/**
 * Путь к файлу в режимах «Все файлы» и «Поиск» — одна кликабельная
 * строка, ведущая в папку, где расположен файл.
 *
 * Строится через getFolderPathString — единый источник правды о
 * строковом представлении пути в стиле "/a/b/". Клик передаёт id папки
 * файла наверх (или null для корня) — компонент не знает, что делать
 * дальше; вся логика перехода живёт в FileManager.navigateToFolder.
 */
const FilePathButton = ({ folders, folderId, onNavigate }) => {
  const label = getFolderPathString(folders, folderId);
  return (
    <button
      type="button"
      className="file-path file-path-button"
      onClick={() => onNavigate(folderId || null)}
      title={`Перейти в папку: ${label}`}
    >
      {label}
    </button>
  );
};

const FolderRow = ({ folder, canDelete, onOpen, onDelete }) => (
  <div className="file-item file-folder clickable-row" onClick={onOpen}>
    <Ic d={ICONS.folder} size={24} />
    <div className="file-info">
      <div className="file-name">{folder.name}</div>
      <div className="file-meta">Папка</div>
    </div>
    {canDelete && (
      <button
        type="button"
        className="icon-btn danger"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Удалить папку"
      >
        <Ic d={ICONS.trash} size={14} />
      </button>
    )}
  </div>
);

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
            type="button"
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
            type="button"
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
                  type="button"
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

const AllFilesList = ({
  folders,
  documents,
  canDelete,
  onDelete,
  employeeName,
  onNavigateToFolder,
  emptyMessage = 'Файлов нет',
}) => {
  if (documents.length === 0) {
    return <div className="mut sm">{emptyMessage}</div>;
  }

  return (
    <div className="file-all-list">
      {documents.map(f => (
        <div key={f.id} className="file-item">
          <Ic d={ICONS.file} size={24} />
          <div className="file-info">
            <div className="file-name">
              {f.name}
              {f.version > 1 && <span className="file-version-badge">v{f.version}</span>}
            </div>
            <div className="file-meta">
              <FilePathButton
                folders={folders}
                folderId={f.folderId}
                onNavigate={onNavigateToFolder}
              />
              {' · '}
              {formatSize(f.size)} · загрузил {employeeName(f.uploadedBy)}
            </div>
          </div>
          <a
            href={f.url}
            download={f.name}
            target="_blank"
            rel="noopener noreferrer"
            className="btn ghost sm"
          >
            Скачать
          </a>
          {canDelete && (
            <button
              type="button"
              className="icon-btn danger"
              onClick={() => onDelete(f.id)}
              title="Удалить"
            >
              <Ic d={ICONS.trash} size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export const FileManager = ({
  files = [],
  folders = [],
  onUpload,
  onDelete,
  onCreateFolder,
  onDeleteFolder,
  canUpload = true,
  canDelete = true,
  employeeName = (id) => id,
}) => {
  const { prompt, confirm } = useConfirm();
  const { showToast } = useToast();

  /**
   * Единое состояние навигации: папка + режим «Все файлы» + поисковый
   * запрос. Три «измерения» меняются согласованно, поэтому хранятся
   * одним объектом — снимок такого состояния и есть единица истории
   * для кнопки «Назад».
   */
  const [view, setView] = useState({
    folderId: null,
    showAll: false,
    searchQuery: '',
  });

  const [history, setHistory] = useState([]);

  // Любое изменение «где я нахожусь» идёт через navigate: оно сохраняет
  // текущее состояние в историю и применяет патч.
  const navigate = useCallback((patch) => {
    setHistory(prev => [...prev, view]);
    setView(prev => ({ ...prev, ...patch }));
  }, [view]);

  const goBack = useCallback(() => {
    if (history.length === 0) return;
    setView(history[history.length - 1]);
    setHistory(prev => prev.slice(0, -1));
  }, [history]);

  // Поиск — это НЕ навигация: печатание в поле не наполняет историю.
  const setSearchQuery = useCallback((q) => {
    setView(prev => ({ ...prev, searchQuery: q }));
  }, []);

  const breadcrumb = useMemo(
    () => buildBreadcrumb(folders, view.folderId),
    [folders, view.folderId]
  );

  const { subfolders, subfiles } = useMemo(
    () => getChildren(folders, files, view.folderId),
    [folders, files, view.folderId]
  );

  const documents = useMemo(() => groupByDocument(subfiles), [subfiles]);
  const allDocuments = useMemo(
    () => flattenLatestDocuments(folders, files),
    [folders, files]
  );

  const normalizedQuery = view.searchQuery.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return allDocuments.filter(f =>
      f.name.toLowerCase().includes(normalizedQuery)
    );
  }, [allDocuments, isSearching, normalizedQuery]);

  const navigateToFolder = useCallback((folderId) => {
    navigate({ folderId, showAll: false, searchQuery: '' });
  }, [navigate]);

  const handleCreateFolder = async () => {
    const name = await prompt(DIALOGS.createFolder);
    if (!name) return;

    const error = validateFolderName(name, subfolders, subfiles);
    if (error) {
      showToast(error, 'error');
      return;
    }

    onCreateFolder(name.trim(), view.folderId);
    showToast(TOASTS.folderCreated(name.trim()), 'success');
  };

  const handleDeleteFolder = async (folder) => {
    const inside = getChildren(folders, files, folder.id);
    if (inside.subfolders.length > 0 || inside.subfiles.length > 0) {
      showToast(TOASTS.folderNotEmpty, 'warning');
      return;
    }
    const ok = await confirm(DIALOGS.deleteFolder(folder.name));
    if (!ok) return;
    onDeleteFolder(folder.id);
    showToast(TOASTS.folderDeleted, 'success');
  };

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length > 0) onUpload(picked, view.folderId);
    e.target.value = '';
  };

  const isEmpty = subfolders.length === 0 && documents.length === 0;
  const hasAnyFiles = files.length > 0;
  const canGoBack = history.length > 0;

  const viewMode = isSearching ? 'search' : view.showAll ? 'all' : 'folder';

  return (
    <div className="tm-block">
      <div className="file-toolbar">
        <div className="file-toolbar-row">
          {canGoBack && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={goBack}
              title="Вернуться к предыдущему виду"
            >
              <Ic d={ICONS.left} size={14} /> Назад
            </button>
          )}

          <SearchBox
            value={view.searchQuery}
            onChange={setSearchQuery}
            placeholder="Поиск файла…"
            className="file-search-box"
          />

          {viewMode === 'folder' && hasAnyFiles && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => navigate({ showAll: true })}
            >
              <Ic d={ICONS.list} size={13} /> Все файлы
            </button>
          )}

          {viewMode !== 'search' && canUpload && (
            <>
              <button type="button" className="btn ghost sm" onClick={handleCreateFolder}>
                <Ic d={ICONS.folder} size={13} /> Создать папку
              </button>
              <input
                type="file"
                id="file-upload-input"
                className="file-input-hidden"
                onChange={handleFileChange}
                multiple
              />
              <label htmlFor="file-upload-input" className="btn primary sm">
                <Ic d={ICONS.file} size={14} /> Загрузить файлы
              </label>
            </>
          )}
        </div>

        <Breadcrumb
          items={breadcrumb}
          onNavigate={navigateToFolder}
        />
      </div>

      {viewMode === 'search' && (
        <AllFilesList
          folders={folders}
          documents={searchResults}
          canDelete={canDelete}
          onDelete={onDelete}
          employeeName={employeeName}
          onNavigateToFolder={navigateToFolder}
          emptyMessage="Ничего не найдено"
        />
      )}

      {viewMode === 'all' && (
        <AllFilesList
          folders={folders}
          documents={allDocuments}
          canDelete={canDelete}
          onDelete={onDelete}
          employeeName={employeeName}
          onNavigateToFolder={navigateToFolder}
        />
      )}

      {viewMode === 'folder' && (
        <>
          {isEmpty && <div className="mut sm">Папка пуста</div>}

          {subfolders.map(folder => (
            <FolderRow
              key={folder.id}
              folder={folder}
              canDelete={canDelete}
              onOpen={() => navigateToFolder(folder.id)}
              onDelete={() => handleDeleteFolder(folder)}
            />
          ))}

          {documents.map(doc => (
            <DocumentRow
              key={doc.name}
              doc={doc}
              onDelete={onDelete}
              canDelete={canDelete}
              employeeName={employeeName}
            />
          ))}
        </>
      )}
    </div>
  );
};