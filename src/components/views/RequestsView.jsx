// src/components/views/RequestsView.jsx
import Requests from '../Requests';
import { useRequestsDb } from '../../hooks/useDb';

/**
 * Вьюха раздела «Запросы и заявки».
 *
 * initialTab - какая вкладка открывается при монтировании.
 *
 * Пробрасывается из MainLayout: клик на уведомление о регистрации
 * должен открыть вкладку «Заявки на регистрацию» (reg), клик на
 * уведомление о делегировании - «Передача ролей» (rd), клик на
 * уведомление о часах - «Изменение часов» (hours). При обычном входе
 * в раздел через боковое меню MainLayout передаёт дефолтный 'hours'.
 *
 * Requests держит активную вкладку в локальном useState(initialTab) -
 * проп читается один раз при монтировании. Чтобы смена initialTab
 * действительно переключала вкладку, MainLayout ставит на этот
 * компонент key={initialTab}: изменение key вызывает пере-монтирование
 * со свежим состоянием.
 */
export function RequestsView({ ur, initialTab = 'hours' }) {
  const db = useRequestsDb();
  return <Requests db={db} ur={ur} initialTab={initialTab} />;
}