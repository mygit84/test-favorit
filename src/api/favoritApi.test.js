import { describe, expect, it, vi } from 'vitest';

import { getBrands, getOffers } from './favoritApi';
import { REQUEST_TIMEOUT, TIMEOUT_ERROR } from '../constants';

import { mockFetch } from '../test/mockFetch';
import brandsFixture from '../test/fixtures/brands.json';
import notFoundFixture from '../test/fixtures/not-found.json';
import offersFixture from '../test/fixtures/offers.json';

// Фикстуры — урезанные реальные ответы API (артикул OC90, бренд MAHLE).
// Весь разбор «сырого» ответа живёт в favoritApi.js, поэтому основная масса тестов здесь.

const KEY_MESSAGE = /ключ/i;

describe('getBrands', () => {
	it('«ничего не найдено» (массив с одной пустой структурой) — пустой список, а не ошибка', async () => {
		mockFetch(() => notFoundFixture);

		await expect(getBrands('NOPE')).resolves.toEqual([]);
	});

	it('возвращает уникальные бренды по алфавиту', async () => {
		// Реальный ответ: MAHLE, AM Point. Добавляем дубль — у одного бренда может быть несколько позиций.
		const [mahle, amPoint] = brandsFixture.goods;

		mockFetch(() => ({ goods: [mahle, amPoint, { ...mahle, goodsID: 'other' }] }));

		await expect(getBrands('OC90')).resolves.toEqual(['AM Point', 'MAHLE']);
	});

	it('позиция с артикулом, но без бренда, не даёт пустой кнопки', async () => {
		// isNotEmpty пропускает такую позицию (есть number), а кнопка с пустым брендом отправила бы brand=.
		const [mahle] = brandsFixture.goods;

		mockFetch(() => ({ goods: [mahle, { ...mahle, brand: '' }] }));

		await expect(getBrands('OC90')).resolves.toEqual(['MAHLE']);
	});
});

describe('getOffers', () => {
	it('одна строка на складское предложение, цена — из warehouses[].price, а не из верхнего price', async () => {
		mockFetch(() => offersFixture);

		const rows = await getOffers('OC90', 'MAHLE');
		const originals = rows.filter((row) => !row.isAnalogue);

		// Верхнее price у MAHLE = 384, по складам — 384.05 и 476.4. Если код возьмёт верхнее, тест упадёт.
		expect(originals.map((row) => row.price)).toEqual([384.05, 476.4]);
		expect(originals.map((row) => row.stock)).toEqual([100, 100]);

		expect(originals[0]).toMatchObject({
			name: 'Фильтр масляный',
			brand: 'MAHLE',
			number: 'OC90',
			warehouse: 'МСК РС',
		});
	});

	it('аналоги из goods[i].analogues помечены и идут после оригиналов, внутри — по цене, без цены — в конце', async () => {
		mockFetch(() => offersFixture);

		const rows = await getOffers('OC90', 'MAHLE');

		// В фикстуре аналоги намеренно в «неправильном» порядке: MANN (555.16), TUYI (без складов), TESLA (328.45 ×2).
		expect(rows.map((row) => [row.brand, row.isAnalogue, row.price])).toEqual([
			['MAHLE', false, 384.05],
			['MAHLE', false, 476.4],
			['TESLA TECHNICS', true, 328.45],
			['TESLA TECHNICS', true, 328.45],
			['MANN-FILTER', true, 555.16],
			['TUYI', true, null],
		]);

		// id строк используются как React key — должны быть уникальны.
		expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
	});

	it('позиция без складов — одна строка с price: null и stock: 0', async () => {
		mockFetch(() => offersFixture);

		const rows = await getOffers('OC90', 'MAHLE');

		// У TUYI верхнее price = 0 — его нельзя выдавать за цену, иначе в таблице будет «0,00 ₽».
		expect(rows.filter((row) => row.brand === 'TUYI')).toEqual([
			expect.objectContaining({ number: 'OF96879797', price: null, stock: 0 }),
		]);
	});

	it('аналог, повторённый у нескольких позиций goods, выводится один раз', async () => {
		const [original] = offersFixture.goods;

		// Вторая позиция с теми же аналогами — например, другое написание артикула.
		mockFetch(() => ({ goods: [original, { ...original, goodsID: 'second', warehouses: [] }] }));

		const rows = await getOffers('OC90', 'MAHLE');
		const analogueIds = rows.filter((row) => row.isAnalogue).map((row) => row.id);

		// id — React key: дубль дал бы повторяющиеся строки в таблице.
		expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);

		// В фикстуре 4 строки аналогов: каждая осталась ровно один раз, а не пропала при дедупликации.
		expect(analogueIds).toHaveLength(4);
	});

	it('склад без поля price — price: null и строка в конце, а не NaN в сортировке и «NaN ₽» в таблице', async () => {
		const [original] = offersFixture.goods;
		const [warehouse] = original.warehouses;
		const { price: _, ...withoutPrice } = warehouse;

		const item = {
			...original,
			analogues: [],
			warehouses: [{ ...withoutPrice, id: 'no-price' }, ...original.warehouses],
		};

		mockFetch(() => ({ goods: [item] }));

		const rows = await getOffers('OC90', 'MAHLE');

		expect(rows.map((row) => row.price)).toEqual([384.05, 476.4, null]);
	});

	it('отправляет brand и analogues=on', async () => {
		const fetchMock = mockFetch(() => offersFixture);

		await getOffers('OC90', 'MAHLE');

		const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost');

		expect(url.pathname).toBe('/api/');

		expect(Object.fromEntries(url.searchParams)).toEqual({
			key: 'test-key',
			number: 'OC90',
			brand: 'MAHLE',
			analogues: 'on',
		});
	});
});

describe('запрос: кодирование и ошибки', () => {
	it('спецсимволы в артикуле и бренде (#, &, пробел, +) не ломают query', async () => {
		// Без кодирования «#» обрежет URL, а «&» создаст лишний параметр.
		const fetchMock = mockFetch(() => offersFixture);

		await getOffers('A#1&b=2 +3', 'B&B #1');

		const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost');

		expect(url.searchParams.get('number')).toBe('A#1&b=2 +3');
		expect(url.searchParams.get('brand')).toBe('B&B #1');
		expect(url.searchParams.has('b')).toBe(false);
	});

	it('поле error при HTTP 200 — ошибка с текстом из ответа', async () => {
		mockFetch(() => ({ error: 'Empty number goods!' }));

		await expect(getBrands('OC90')).rejects.toThrow('Empty number goods!');
	});

	it.each([
		['Invalid key client!', 200], // из документации
		['Invalid access key', 403], // так отвечает реальный API на неверный ключ
		['Empty key!', 403], // реальный ответ без ключа
	])('ошибка ключа «%s» (HTTP %i) — понятный текст про ключ', async (error, status) => {
		mockFetch(() => ({ status, body: { error } }));

		await expect(getBrands('OC90')).rejects.toThrow(KEY_MESSAGE);
	});

	it('превышение лимита — понятный текст про лимит', async () => {
		mockFetch(() => ({ error: 'Request quota exceeded!' }));

		await expect(getBrands('OC90')).rejects.toThrow(/лимит/i);
	});

	it('HTTP-ошибка без поля error (например, HTML от прокси) — «Ошибка сервера: <статус>»', async () => {
		const badJson = async () => Promise.reject(new SyntaxError('bad json'));

		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, json: badJson })));

		await expect(getBrands('OC90')).rejects.toThrow('Ошибка сервера: 502');
	});

	it('fetch бросил исключение — «Нет связи с сервером…»', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

		await expect(getBrands('OC90')).rejects.toThrow(/^Нет связи с сервером/);
	});

	it('отмена запроса пробрасывается как AbortError, а не превращается в «нет связи»', async () => {
		// На этом держится защита от гонок: createAsyncThunk помечает такой rejected как aborted,
		// и редьюсер его игнорирует. Если обернуть AbortError в «нет связи», пользователь увидит ложную ошибку.
		mockFetch(() => new Promise(() => {}));

		const controller = new AbortController();
		const promise = getBrands('OC90', controller.signal);

		controller.abort();

		await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
	});

	it('API не ответил за REQUEST_TIMEOUT — ошибка с текстом про таймаут, а не вечная загрузка', async () => {
		vi.useFakeTimers();

		try {
			mockFetch(() => new Promise(() => {}));

			const assertion = expect(getBrands('OC90')).rejects.toThrow(TIMEOUT_ERROR);

			await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT);

			await assertion;
		} finally {
			vi.useRealTimers();
		}
	});
});
