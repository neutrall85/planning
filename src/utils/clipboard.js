// src/utils/clipboard.js
//
// Копирование текста в буфер обмена. Единственная точка: если завтра
// появится третья точка копирования или тост-обёртка над ним -
// менять здесь, а не в каждом вызывающем.
//
// Возвращает Promise<boolean> - вызывающий показывает тост по факту
// успеха. Ошибку не пробрасываем: неудачное копирование - не повод
// ломать форму/меню, пользователь просто увидит warning-тост.

export async function copyToClipboard(text) {
  if (!text) return false;

  // Современный API: работает только в secure context (HTTPS,
  // localhost). При неудаче падаем в execCommand-фолбэк.
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Сюда попадаем, если браузер отказал в разрешении или
      // потерял user activation. Пробуем фолбэк.
    }
  }

  // execCommand('copy') синхронный и работает без user activation в
  // большинстве браузеров, но требует выделенного элемента в DOM.
  // Позиционируем за пределами вьюпорта через .copy-helper - без
  // инлайн-стилей в JS.
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.className = 'copy-helper';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}