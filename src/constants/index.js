// API

export const API_KEY = import.meta.env.VITE_API_KEY;

// Без ответа за это время запрос прерывается, чтобы зависший API не блокировал интерфейс.
export const REQUEST_TIMEOUT = 15000;

// Тексты ошибок для пользователя

export const NETWORK_ERROR = 'Нет связи с сервером. Проверьте подключение и попробуйте ещё раз.';
export const TIMEOUT_ERROR = 'Сервер не ответил вовремя. Попробуйте ещё раз.';
export const SERVER_ERROR = 'Ошибка сервера';
export const BAD_RESPONSE_ERROR = 'Ошибка сервера: некорректный ответ';
export const KEY_ERROR = 'Неверный или не указан ключ API. Проверьте значение VITE_API_KEY в файле .env.';
export const QUOTA_ERROR = 'Превышен лимит запросов к API. Попробуйте позже.';

// Сообщения об ошибках, которые присылает API

// 'Invalid key client!' — из документации, 'Invalid access key' — фактический ответ API на неверный ключ.
export const KEY_ERROR_MESSAGES = ['Invalid key client!', 'Invalid access key', 'Empty key!'];
export const QUOTA_ERROR_MESSAGE = 'Request quota exceeded!';

// Форматирование

export const PRICE_FORMAT = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' });
