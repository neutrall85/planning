// src/components/Lightbox.jsx
import { useEffect } from 'react';
import { Ic, ICONS } from './Icons';

export const Lightbox = ({ photos, currentIndex, onClose, onPrev, onNext }) => {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, onPrev, onNext]);

  if (currentIndex === null || currentIndex === undefined) return null;
  const photo = photos[currentIndex];
  if (!photo) return null;

  const hasMultiple = photos.length > 1;

  // Обработчики с остановкой всплытия, чтобы не закрывать лайтбокс
  const handlePrev = (e) => {
    e.stopPropagation();
    onPrev();
  };

  const handleNext = (e) => {
    e.stopPropagation();
    onNext();
  };

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img src={photo.url} alt={photo.name || 'Фото'} className="lightbox-image" />
        
        {hasMultiple && (
          <>
            <button className="lightbox-btn prev" onClick={handlePrev}>
              <Ic d={ICONS.left} size={32} />
            </button>
            <button className="lightbox-btn next" onClick={handleNext}>
              <Ic d={ICONS.right} size={32} />
            </button>
          </>
        )}
        
        <button className="lightbox-close" onClick={onClose}>
          <Ic d={ICONS.x} size={24} />
        </button>
        
        <div className="lightbox-info">
          <span className="lightbox-name">{photo.name}</span>
          <span className="lightbox-counter">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>

        {hasMultiple && (
          <div className="lightbox-dots">
            {photos.map((_, idx) => (
              <span
                key={idx}
                className={`lightbox-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  const diff = idx - currentIndex;
                  if (diff > 0) onNext();
                  else if (diff < 0) onPrev();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};