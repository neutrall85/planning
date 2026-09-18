// src/components/ProjectGallery.jsx
import { useEffect, useId, useState } from 'react';
import { Ic, ICONS } from './Icons';
import { fmtDMY } from '../utils/date';

const EMPTY_PHOTOS = [];

export const ProjectGallery = ({
  photos = EMPTY_PHOTOS,
  onUpload,                       // (files: File[], onDone: () => void) => void
  onDelete,
  onSetMain,
  onOpenLightbox,
  canUpload = true,
  canDelete = true,
  employeeName = (id) => id,
}) => {
  const [uploading, setUploading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const uploadInputId = useId();

  const photoList = photos;
  const preferredIndex = photoList.findIndex(p => p.isMain);

  const [currentIndex, setCurrentIndex] = useState(() =>
    preferredIndex >= 0 ? preferredIndex : 0
  );

  // Если фото удалили и индекс оказался за границей - вернуться к главному.
  // В effect, а не во время рендера: setState во время рендера того же
  // компонента - антипаттерн React.
  useEffect(() => {
    if (currentIndex >= photoList.length) {
      setCurrentIndex(preferredIndex >= 0 ? preferredIndex : 0);
    }
  }, [currentIndex, photoList.length, preferredIndex]);

  const currentPhoto = photoList[currentIndex] || null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    onUpload(files, () => setUploading(false));
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (photoList.length <= 1) return;
    setCurrentIndex(prev => (prev === 0 ? photoList.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (photoList.length <= 1) return;
    setCurrentIndex(prev => (prev === photoList.length - 1 ? 0 : prev + 1));
  };

  const uploadButton = canUpload && (
    <div className="gallery-upload-wrapper">
      <input
        type="file"
        accept="image/*"
        multiple
        id={uploadInputId}
        className="file-input-hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <label htmlFor={uploadInputId} className="btn primary sm">
        {uploading ? 'Загрузка…' : 'Загрузить фото'}
      </label>
    </div>
  );

  if (photoList.length === 0) {
    return (
      <div className="gallery-empty-state">
        <div className="gallery-empty-text">Нет фотографий</div>
        {uploadButton}
      </div>
    );
  }

  return (
    <div className="gallery-with-photos">
      <div
        className="gallery-main"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <img
          src={currentPhoto.url}
          alt={currentPhoto.name || 'Фото'}
          className="gallery-main-image"
          onClick={() => onOpenLightbox(currentIndex)}
        />

        {isHovering && (
          <div className="gallery-main-overlay">
            {canDelete && (
              <button
                type="button"
                className="icon-btn danger"
                onClick={(e) => { e.stopPropagation(); onDelete(currentPhoto.id); }}
                title="Удалить фото"
              >
                <Ic d={ICONS.trash} size={14} />
              </button>
            )}
            {!currentPhoto.isMain && canUpload && (
              <button
                type="button"
                className="icon-btn"
                onClick={(e) => { e.stopPropagation(); onSetMain(currentPhoto.id); }}
                title="Сделать главным"
              >
                <Ic d={ICONS.star} size={14} />
              </button>
            )}
            {currentPhoto.isMain && (
              <span className="gallery-main-badge" title="Главное фото">★</span>
            )}
          </div>
        )}

        <div className="gallery-counter">
          {currentIndex + 1} / {photoList.length}
        </div>

        {photoList.length > 1 && (
          <div className={`gallery-nav ${isHovering ? 'visible' : ''}`}>
            <button type="button" className="gallery-nav-btn prev" onClick={handlePrev}>
              <Ic d={ICONS.left} size={20} />
            </button>
            <button type="button" className="gallery-nav-btn next" onClick={handleNext}>
              <Ic d={ICONS.right} size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="gallery-meta">
        <span className="gallery-name">{currentPhoto.name}</span>
        <span className="gallery-user">{employeeName(currentPhoto.uploadedBy)}</span>
        {currentPhoto.uploadedAt && (
          <span className="gallery-date">{fmtDMY(currentPhoto.uploadedAt)}</span>
        )}
      </div>

      {uploadButton}
    </div>
  );
};