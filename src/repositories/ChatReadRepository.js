import { Repository } from "./Repository.js";

/**
 * Отметки «прочитано до» по чатам.
 *
 * Одна запись на пару (пользователь, чат). id собирается как
 * `${userId}|${chatKey}` — это даёт прямой findById без составного
 * поиска и защищает от дублей.
 */
export class ChatReadRepository extends Repository {}