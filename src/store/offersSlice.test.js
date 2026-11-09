import { describe, expect, it } from 'vitest';

import offersReducer, { fetchOffers, resetOffers } from './offersSlice';

const arg = { number: 'OC90', brand: 'MAHLE' };

const abortError = { name: 'AbortError', message: 'Aborted' };

const row = {
	id: '1-1',
	name: 'Фильтр масляный',
	brand: 'MAHLE',
	number: 'OC90',
	isAnalogue: false,
	warehouse: 'МСК',
	price: 384.05,
	stock: 100,
};

describe('offersSlice', () => {
	it('resetOffers очищает таблицу прошлого поиска', () => {
		const filled = offersReducer(undefined, fetchOffers.fulfilled([row], 'r1', arg));

		expect(filled.items).toHaveLength(1);

		expect(offersReducer(filled, resetOffers())).toEqual({ items: [], status: 'idle', error: null });
	});

	it('смена бренда (pending) сразу убирает строки прошлого бренда', () => {
		const filled = offersReducer(undefined, fetchOffers.fulfilled([row], 'r1', arg));

		const state = offersReducer(filled, fetchOffers.pending('r2', { ...arg, brand: 'AM Point' }));

		expect(state).toMatchObject({ items: [], status: 'loading' });
	});

	it('отменённый запрос (meta.aborted) не переводит в failed и не пишет ошибку', () => {
		const loading = offersReducer(undefined, fetchOffers.pending('r2', arg));
		const action = fetchOffers.rejected(abortError, 'r2', arg);

		expect(offersReducer(loading, action)).toBe(loading);
	});

	it('отмена после resetOffers (новый поиск) не возвращает блок предложений в loading/failed', () => {
		// App при новом поиске сначала abort(), потом resetOffers(); rejected отменённого запроса приходит позже.
		const loading = offersReducer(undefined, fetchOffers.pending('r1', arg));
		const reset = offersReducer(loading, resetOffers());

		const state = offersReducer(reset, fetchOffers.rejected(abortError, 'r1', arg));

		expect(state).toEqual({ items: [], status: 'idle', error: null });
	});
});
