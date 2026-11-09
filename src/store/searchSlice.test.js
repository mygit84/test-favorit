import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';

import searchReducer, { fetchBrands, selectBrand } from './searchSlice';

import { mockFetch } from '../test/mockFetch';

const abortError = { name: 'AbortError', message: 'Aborted' };

// Состояние после успешного поиска с выбранным брендом — от него проверяем сбросы.
const loadingState = searchReducer(undefined, fetchBrands.pending('r1', 'OC90'));
const foundState = searchReducer(loadingState, fetchBrands.fulfilled(['AM Point', 'MAHLE'], 'r1', 'OC90'));
const filledState = searchReducer(foundState, selectBrand('MAHLE'));

describe('searchSlice', () => {
	it('новый поиск (pending) сбрасывает бренды, выбранный бренд и ошибку прошлого поиска', () => {
		const state = searchReducer(filledState, fetchBrands.pending('r2', 'W712'));

		expect(state).toEqual({
			number: 'W712',
			brands: [],
			selectedBrand: null,
			error: null,
			status: 'loading',
		});
	});

	it('ошибка прошлого поиска тоже сбрасывается при новом поиске', () => {
		const failed = searchReducer(undefined, fetchBrands.rejected(new Error('Нет связи'), 'r1', 'OC90'));

		expect(failed).toMatchObject({ status: 'failed', error: 'Нет связи' });

		const state = searchReducer(failed, fetchBrands.pending('r2', 'OC90'));

		expect(state).toMatchObject({ status: 'loading', error: null });
	});

	it('отменённый запрос (meta.aborted) не переводит в failed и не пишет ошибку', () => {
		const loading = searchReducer(filledState, fetchBrands.pending('r2', 'W712'));
		const action = fetchBrands.rejected(abortError, 'r2', 'W712');

		expect(action.meta.aborted).toBe(true);

		expect(searchReducer(loading, action)).toBe(loading);
	});

	it('устаревший поиск, отменённый новым, не затирает результат и не показывает ошибку', async () => {
		// Полная цепочка: abort() → signal → fetch → AbortError → rejected с aborted → редьюсер его игнорирует.
		// Первый запрос «висит», второй отвечает сразу — как при быстром повторном поиске.
		mockFetch((url) => {
			if (url.searchParams.get('number') === 'SLOW') return new Promise(() => {});

			return { goods: [{ brand: 'MAHLE', number: 'OC90' }] };
		});

		const store = configureStore({ reducer: { search: searchReducer } });

		const stale = store.dispatch(fetchBrands('SLOW'));

		stale.abort(); // так делает App перед новым поиском

		await store.dispatch(fetchBrands('OC90'));
		await stale;

		expect(store.getState().search).toMatchObject({
			number: 'OC90',
			brands: ['MAHLE'],
			status: 'succeeded',
			error: null,
		});
	});
});
