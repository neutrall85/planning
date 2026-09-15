// src/components/ProjectGallery.jsx
import { useState } from 'react';
import { Ic, ICONS } from './Icons';
import { fmtDMY } from '../utils/date';
import { useToast } from '../context/ToastContext';
import { FILE_LIMITS, FILE_MESSAGES } from '../utils/constants';

export const ProjectGallery = ({
  photos = [],
  onUpload,
  onDelete,
  onSetMain,
  onOpenLightbox,
  canUpload = true,
  canDelete = true,
  employeeName = (id) => id,
}) => {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const photoList = photos || [];

  const mainIndex = photoList.findIndex(p => p.isMain);
  const startIndex = mainIndex !== -1 ? mainIndex : 0;
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  if (photoList.length > 0 && currentIndex >= photoList.length) {
    setCurrentIndex(startIndex);
  }

  const currentPhoto = photoList[currentIndex] || null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(FILE_MESSAGES.notImage, 'error');
      e.target.value = '';
      return;
    }
    if (file.size > FILE_LIMITS.image) {
      showToast(FILE_MESSAGES.imageTooLarge, 'error');
      e.target.value = '';
      return;
    }
    setUploading(true);
    onUpload(file, () => setUploading(false));
    e.target.value = '';
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (photoList.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? photoList.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (photoList.length <= 1) return;
    setCurrentIndex((prev) => (prev === photoList.length - 1 ? 0 : prev + 1));
  };

  if (photoList.length === 0) {
    return (
      <div className="gallery-empty-state">
        <div className="gallery-empty-text">Нет фотографий</div>
        {canUpload && (
          <div className="gallery-upload-wrapper">
            <input
              type="file"
              accept="image/*"
              id="photo-upload-input"
              className="file-input-hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <label htmlFor="photo-upload-input" className="btn primary sm">
              {uploading ? 'Загрузка...' : 'Загрузка фото'}
            </label>
          </div>
        )}
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
                className="icon-btn danger"
                onClick={(e) => { e.stopPropagation(); onDelete(currentPhoto.id); }}
                title="Удалить фото"
              >
                <Ic d={ICONS.trash} size={14} />
              </button>
            )}
            {!currentPhoto.isMain && canUpload && (
              <button
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
            <div className="gallery-counter">
              {currentIndex + 1} / {photoList.length}
            </div>
          </div>
        )}

        {photoList.length > 1 && (
          <div className={`gallery-nav ${isHovering ? 'visible' : ''}`}>
            <button className="gallery-nav-btn prev" onClick={handlePrev}>
              <Ic d={ICONS.left} size={20} />
            </button>
            <button className="gallery-nav-btn next" onClick={handleNext}>
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

      {canUpload && (
        <div className="gallery-upload-wrapper">
          <input
            type="file"
            accept="image/*"
            id="photo-upload-input"
            className="file-input-hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <label htmlFor="photo-upload-input" className="btn primary sm">
            {uploading ? 'Загрузка...' : 'Загрузка фото'}
          </label>
        </div>
      )}
    </div>
  );
};