// src/repositories/EmployeeRepository.js
import { Repository } from './Repository';

export class EmployeeRepository extends Repository {
  /**
   * Поиск сотрудника по e-mail.
   *
   * В моках и внутренних конфигурациях поле `email` исторически хранит
   * короткий логин без домена («sergey.adminov»), а пользователь на входе
   * вводит полный e-mail («sergey.adminov@hor.ru»). Сравниваем по обоим
   * вариантам: точное совпадение строки и совпадение по local-part
   * (часть до «@»). Во внутренних системах обе формы обычно валидны.
   *
   * После перехода на реальный бэкенд правило остаётся полезным: не все
   * сотрудники запомнят «строгую» форму, а различать их по local-part
   * безопасно - уникальность local-part гарантирована политикой выдачи
   * учётных записей, а не приложением.
   */
  findByEmail(email) {
    const needle = String(email || '').trim().toLowerCase();
    if (!needle) return null;
    const local = needle.includes('@') ? needle.split('@')[0] : needle;
    return this.findOne((e) => {
      const stored = String(e.email || '').toLowerCase();
      return stored === needle || stored === local;
    });
  }
}