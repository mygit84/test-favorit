import { vi } from 'vitest';

// Минимальный объект ответа: request() использует только ok, status и json().
export function jsonResponse(data, status = 200) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => data,
	};
}

// Подменяет глобальный fetch. handler получает разобранный URL и возвращает тело ответа
// (или { status, body } для не-200). Как и настоящий fetch, мок реагирует на signal.
export function mockFetch(handler) {
	const fetchMock = vi.fn((url, { signal } = {}) => {
		const parsed = new URL(url, 'http://localhost');

		return new Promise((resolve, reject) => {
			const abortError = () => new DOMException('The operation was aborted.', 'AbortError');

			if (signal?.aborted) return reject(abortError());

			signal?.addEventListener('abort', () => reject(abortError()));

			Promise.resolve(handler(parsed)).then((result) => {
				if (result && 'status' in result && 'body' in result) {
					resolve(jsonResponse(result.body, result.status));
				} else {
					resolve(jsonResponse(result));
				}
			}, reject);
		});
	});

	vi.stubGlobal('fetch', fetchMock);

	return fetchMock;
}
