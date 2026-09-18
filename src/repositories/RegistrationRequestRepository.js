// src/repositories/RegistrationRequestRepository.js
//
// Репозиторий заявок на регистрацию.
//
// До появления этого класса заявки жили только как `this._data.regRequests`,
// и работа с ними шла через `setDb` в Requests.jsx. Это уходило от общей
// схемы «репозиторий → сервис → вьюха» и заставляло вьюху писать аудит
// руками. Ключ - id, поэтому базовый Repository подходит без изменений.
import { Repository } from './Repository';

export class RegistrationRequestRepository extends Repository {}