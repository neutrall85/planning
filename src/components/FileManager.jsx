// src/components/FileManager.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { copyToClipboard } from '../utils/clipboard';
import { fileShareUrl, folderShareUrl } from '../utils/fileLinks';
import FloatingMenu from './FloatingMenu';

const formatSize = (size) => {
  if (size < 1024) return size + ' Б';
  if (size < 1048576) return (size / 1024).toFixed(1) + ' КБ';
  return (size / 1048576).toFixed(1) + ' МБ';
};

const COPY_TOASTS = Object.freeze({
  ok: 'Ссылка скопирована',
  fail: 'Не удалось скопировать ссылку',
});

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

const FolderRow = ({ folder, canDelete, onOpen, onDelete, onCopyLink, highlighted }) => {
  // Меню вместо одинокой иконки удаления: у папки теперь два действия -
  // «скопировать ссылку» (доступно всем) и «удалить» (под правом).
  // FloatingMenu - тот же компонент, что в DocumentRow; единый вид
  // контекстных действий по вложениям.
  const menuItems = [
    {
      id: 'copy',
      label: 'Скопировать ссылку',
      icon: ICONS.link,
      onClick: onCopyLink,
    },
    canDelete && { type: 'divider' },
    canDelete && {
      id: 'del',
      label: 'Удалить папку',
      icon: ICONS.trash,
      danger: true,
      onClick: onDelete,
    },
  ].filter(Boolean);

  const cls = `file-item file-folder clickable-row${highlighted ? ' file-folder--shared' : ''}`;

  return (
    <div className={cls} onClick={onOpen}>
      <Ic d={ICONS.folder} size={24} />
      <div className="file-info">
        <div className="file-name">{folder.name}</div>
        <div className="file-meta">Папка</div>
      </div>
      {/*
        stopPropagation на обёртке: клик по кнопке меню не должен
        проваливаться в onOpen строки (открытие папки). Тот же приём,
        что у кнопки «Удалить» в старой версии FolderRow.
      */}
      <span onClick={(e) => e.stopPropagation()}>
        <FloatingMenu items={menuItems}>
          {({ buttonProps }) => (
            <button
              {...buttonProps}
              className="icon-btn"
              title="Действия"
              aria-label={`Действия с папкой ${folder.name}`}
            >
              <Ic d={ICONS.more} size={15} />
            </button>
          )}
        </FloatingMenu>
      </span>
    </div>
  );
};

const DocumentRow = ({ doc, onDelete, canDelete, employeeName, onCopyLink, highlighted }) => {
  const [expanded, setExpanded] = useState(false);
  const { latest, versions } = doc;
  const hasHistory = versions.length > 1;

  // Порядок пунктов меню: сначала «поделиться» (безопасное действие),
  // потом действия над версиями, потом удаление. Разделители только
  // там, где они разделяют разные категории - чтобы не было двух
  // подряд идущих разделителей при hasHistory && !canDelete.
  const menuItems = [];
  menuItems.push({
    id: 'copy',
    label: 'Скопировать ссылку',
    icon: ICONS.link,
    onClick: () => onCopyLink(latest.id),
  });
  if (hasHistory) {
    menuItems.push({ type: 'divider' });
    menuItems.push({
      id: 'history',
      label: expanded ? 'Скрыть историю' : `История версий (${versions.length})`,
      icon: ICONS.archive,
      onClick: () => setExpanded(v => !v),
    });
  }
  if (canDelete) {
    menuItems.push({ type: 'divider' });
    menuItems.push({
      id: 'del',
      label: 'Удалить последнюю версию',
      icon: ICONS.trash,
      danger: true,
      onClick: () => onDelete(latest.id),
    });
  }

  const wrapperCls = `file-document${highlighted ? ' file-document--shared' : ''}`;

  return (
    <div className={wrapperCls}>
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
        <a
          href={latest.url}
          download={latest.name}
          target="_blank"
          rel="noopener noreferrer"
          className="btn ghost sm"
        >
          Скачать
        </a>
        {menuItems.length > 0 && (
          <FloatingMenu items={menuItems}>
            {({ buttonProps }) => (
              <button
                {...buttonProps}
                className="icon-btn"
                title="Действия"
                aria-label={`Действия с файлом ${latest.name}`}
              >
                <Ic d={ICONS.more} size={15} />
              </button>
            )}
          </FloatingMenu>
        )}
      </div>
      {expanded && hasHistory && (
        <div className="file-versions">
          {versions.map((v, i) => (
            <div key={v.id} className={`file-version-row${i === 0 ? ' current' : ''}`}>
              <span className="file-version-tag">v{v.version}</span>
              <span className="file-version-date">{v.uploadedAt ? fmtDT(v.uploadedAt) : '-'}</span>
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
  onCopyLink,
  highlightFileId = null,
  emptyMessage = 'Файлов нет',
}) => {
  if (documents.length === 0) {
    return <div className="mut sm">{emptyMessage}</div>;
  }

  return (
    <div className="file-all-list">
      {documents.map(f => {
        const highlighted = highlightFileId && f.id === highlightFileId;
        const cls = `file-item${highlighted ? ' file-item--shared' : ''}`;
        return (
          <div key={f.id} className={cls}>
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
            <button
              type="button"
              className="icon-btn"
              onClick={() => onCopyLink(f.id)}
              title="Скопировать ссылку"
              aria-label={`Скопировать ссылку на файл ${f.name}`}
            >
              <Ic d={ICONS.link} size={15} />
            </button>
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
        );
      })}
    </div>
  );
};

export const FileManager = ({
  files = [],
  folders = [],
  highlightFileId = null,
  highlightFolderId = null,
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

  const [view, setView] = useState({
    folderId: null,
    showAll: false,
    searchQuery: '',
  });

  const [history, setHistory] = useState([]);

  const navigate = useCallback((patch) => {
    setHistory(prev => [...prev, view]);
    setView(prev => ({ ...prev, ...patch }));
  }, [view]);

  const goBack = useCallback(() => {
    if (history.length === 0) return;
    setView(history[history.length - 1]);
    setHistory(prev => prev.slice(0, -1));
  }, [history]);

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

  /**
   * Авто-навигация к подсвеченной папке.
   *
   * Открываем родителя папки, а не саму папку: пользователь должен
   * видеть узел в контексте (его соседей и крошки), чтобы понимать,
   * куда он попал. Открыть содержимое папки сразу - тоже вариант,
   * но тогда «где я» приходится восстанавливать из крошек, а строка
   * самой папки нигде не видна. Для файловой ссылки аналог - тот же
   * приём: открываем папку-владельца и подсвечиваем файл.
   *
   * Ref-защёлка: эффект идемпотентен, но deps (folders, files) могут
   * пересоздаваться - без защёлки каждое обновление вложений
   * возвращало бы пользователя к подсвеченному узлу.
   */
  const highlightFolderRef = useRef(null);
  useEffect(() => {
    if (!highlightFolderId) return;
    if (highlightFolderRef.current === highlightFolderId) return;
    const folder = folders.find(f => f.id === highlightFolderId);
    if (!folder) return;
    highlightFolderRef.current = highlightFolderId;
    setHistory([]);
    setView({
      folderId: folder.parentId ?? null,
      showAll: false,
      searchQuery: '',
    });
  }, [highlightFolderId, folders]);

  const highlightFileRef = useRef(null);
  useEffect(() => {
    if (!highlightFileId) return;
    if (highlightFileRef.current === highlightFileId) return;
    const file = files.find(f => f.id === highlightFileId);
    if (!file) return;
    highlightFileRef.current = highlightFileId;
    setHistory([]);
    setView({
      folderId: file.folderId ?? null,
      showAll: false,
      searchQuery: '',
    });
  }, [highlightFileId, files]);

  const handleCopyFileLink = useCallback(async (fileId) => {
    const ok = await copyToClipboard(fileShareUrl(fileId));
    showToast(ok ? COPY_TOASTS.ok : COPY_TOASTS.fail, ok ? 'success' : 'warning');
  }, [showToast]);

  const handleCopyFolderLink = useCallback(async (folderId) => {
    const ok = await copyToClipboard(folderShareUrl(folderId));
    showToast(ok ? COPY_TOASTS.ok : COPY_TOASTS.fail, ok ? 'success' : 'warning');
  }, [showToast]);

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
          onCopyLink={handleCopyFileLink}
          highlightFileId={highlightFileId}
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
          onCopyLink={handleCopyFileLink}
          highlightFileId={highlightFileId}
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
              highlighted={folder.id === highlightFolderId}
              onOpen={() => navigateToFolder(folder.id)}
              onDelete={() => handleDeleteFolder(folder)}
              onCopyLink={() => handleCopyFolderLink(folder.id)}
            />
          ))}

          {documents.map(doc => {
            // Подсветка срабатывает и если ссылка ведёт на не-последнюю
            // версию: пользователь ждёт «вот этот файл», а не «вот эта
            // строка документа». Проверяем все версии, не только latest.
            const highlighted = highlightFileId
              && doc.versions.some(v => v.id === highlightFileId);
            return (
              <DocumentRow
                key={doc.name}
                doc={doc}
                onDelete={onDelete}
                canDelete={canDelete}
                employeeName={employeeName}
                highlighted={highlighted}
                onCopyLink={handleCopyFileLink}
              />
            );
          })}
        </>
      )}
    </div>
  );
};