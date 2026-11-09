import {
	API_KEY,
	BAD_RESPONSE_ERROR,
	KEY_ERROR,
	KEY_ERROR_MESSAGES,
	NETWORK_ERROR,
	QUOTA_ERROR,
	QUOTA_ERROR_MESSAGE,
	REQUEST_TIMEOUT,
	SERVER_ERROR,
	TIMEOUT_ERROR,
} from '../constants';

function translateError(error) {
	const text = Array.isArray(error) ? error.join(' ') : String(error);

	if (KEY_ERROR_MESSAGES.some((msg) => text.includes(msg))) {
		return KEY_ERROR;
	}

	if (text.includes(QUOTA_ERROR_MESSAGE)) {
		return QUOTA_ERROR;
	}

	return text;
}

async function send(query, signal) {
	let res;

	try {
		res = await fetch(`/api/?${query}`, { signal });
	} catch (err) {
		if (err.name === 'AbortError') throw err;

		throw new Error(NETWORK_ERROR);
	}

	// API присылает ошибки в поле `error`, в том числе с HTTP-статусом 403,
	// поэтому сначала читаем тело, а уже потом смотрим на статус.
	let data = null;

	try {
		data = await res.json();
	} catch (err) {
		if (err.name === 'AbortError') throw err;
	}

	if (data?.error) throw new Error(translateError(data.error));
	if (!res.ok) throw new Error(`${SERVER_ERROR}: ${res.status}`);
	if (!data) throw new Error(BAD_RESPONSE_ERROR);

	return data;
}

// Свой контроллер объединяет внешнюю отмену (signal из thunk) с таймаутом.
// Внешняя отмена пробрасывается как AbortError, таймаут — как обычная ошибка с текстом.
async function request(params, signal) {
	const query = new URLSearchParams({ key: API_KEY ?? '', ...params });

	const controller = new AbortController();
	const abort = () => controller.abort();

	let timedOut = false;

	const timer = setTimeout(() => {
		timedOut = true;
		abort();
	}, REQUEST_TIMEOUT);

	if (signal?.aborted) abort();

	signal?.addEventListener('abort', abort);

	try {
		return await send(query, controller.signal);
	} catch (err) {
		if (timedOut) throw new Error(TIMEOUT_ERROR);

		throw err;
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener('abort', abort);
	}
}

// «Ничего не найдено» приходит как массив с одной пустой структурой.
const isNotEmpty = (item) => Boolean(item.brand || item.number);

export async function getBrands(number, signal) {
	const data = await request({ number }, signal);

	// Позиция без бренда в список не попадает: по пустому бренду предложения не запросить.
	const brands = new Set((data.goods ?? []).map((item) => item.brand).filter(Boolean));

	return [...brands].toSorted((a, b) => a.localeCompare(b));
}

// Цена без значения или не числом считается отсутствующей, чтобы не ломать сортировку и вывод.
function toPrice(value) {
	if (value === null || value === undefined || value === '') return null;

	const price = Number(value);

	return Number.isFinite(price) ? price : null;
}

function toRows(item, isAnalogue) {
	const base = {
		name: item.name,
		brand: item.brand,
		number: item.number,
		isAnalogue,
	};

	const warehouses = item.warehouses ?? [];

	if (warehouses.length === 0) {
		return [{ ...base, id: item.goodsID, warehouse: null, price: null, stock: 0 }];
	}

	// Цена только из warehouses[].price: верхнеуровневое price по документации не используется.
	return warehouses.map((warehouse) => ({
		...base,
		id: `${item.goodsID}-${warehouse.id}`,
		warehouse: warehouse.code,
		price: toPrice(warehouse.price),
		stock: warehouse.stock,
	}));
}

// Один аналог может прийти у нескольких позиций goods, а id строки — React key.
// Оставляем первое вхождение: оригиналы идут раньше аналогов, поэтому оригинал не станет аналогом.
function uniqueById(rows) {
	const seen = new Set();

	return rows.filter((row) => {
		if (seen.has(row.id)) return false;

		seen.add(row.id);

		return true;
	});
}

export async function getOffers(number, brand, signal) {
	const data = await request({ number, brand, analogues: 'on' }, signal);

	// Фактический ответ: аналоги вложены в элементы goods (goods[i].analogues).
	const goods = (data.goods ?? []).filter(isNotEmpty);
	const analogues = goods.flatMap((item) => item.analogues ?? []).filter(isNotEmpty);

	const rows = uniqueById([
		...goods.flatMap((item) => toRows(item, false)),
		...analogues.flatMap((item) => toRows(item, true)),
	]);

	const priceOf = (row) => (row.price === null ? Infinity : row.price);

	return rows.toSorted((a, b) => a.isAnalogue - b.isAnalogue || priceOf(a) - priceOf(b));
}
