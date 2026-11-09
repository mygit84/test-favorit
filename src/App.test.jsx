import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';

import App from './App';
import searchReducer from './store/searchSlice';
import offersReducer from './store/offersSlice';

import { mockFetch } from './test/mockFetch';
import brandsFixture from './test/fixtures/brands.json';
import notFoundFixture from './test/fixtures/not-found.json';
import offersFixture from './test/fixtures/offers.json';

// Сценарии пользователя целиком: форма → App → thunk → favoritApi → (мок fetch) → store → компоненты.
// Проверяем то, что видит пользователь, через роли и тексты, а не через классы.

function renderApp() {
	const store = configureStore({
		reducer: {
			search: searchReducer,
			offers: offersReducer,
		},
	});

	render(
		<Provider store={store}>
			<App />
		</Provider>,
	);
}

function mockApi() {
	return mockFetch((url) => {
		if (url.searchParams.get('number') !== 'OC90') return notFoundFixture;

		return url.searchParams.has('brand') ? offersFixture : brandsFixture;
	});
}

// Intl форматирует с неразрывными пробелами — сравниваем текст без учёта вида пробела.
const normalize = (text) => text.replace(/\s/g, ' ');

describe('App', () => {
	it('артикул → Enter → бренды → клик по бренду → таблица предложений с аналогами', async () => {
		const user = userEvent.setup();
		const fetchMock = mockApi();

		renderApp();

		await user.type(screen.getByRole('textbox', { name: 'Артикул' }), '  OC90  {Enter}');

		// Артикул ушёл в запрос без пробелов по краям.
		const requestUrl = new URL(fetchMock.mock.calls[0][0], 'http://localhost');

		expect(requestUrl.searchParams.get('number')).toBe('OC90');

		// Бренды — по алфавиту.
		const mahle = await screen.findByRole('button', { name: 'MAHLE' });
		const brandButtons = within(mahle.parentElement).getAllByRole('button');

		expect(brandButtons.map((button) => button.textContent)).toEqual(['AM Point', 'MAHLE']);

		await user.click(mahle);

		const table = await screen.findByRole('table');
		const [, firstRow, ...rest] = within(table).getAllByRole('row');

		// Первая строка — оригинал по минимальной цене склада (верхнее price = 384 не используется).
		const cells = within(firstRow)
			.getAllByRole('cell')
			.map((cell) => normalize(cell.textContent));

		expect(cells).toEqual(['Фильтр масляный', 'MAHLE', 'OC90', 'МСК РС', '384,05 ₽', '100']);

		// Аналоги помечены бейджем, оригиналы — нет.
		expect(within(firstRow).queryByText('аналог')).not.toBeInTheDocument();

		const analogueRows = rest.filter((row) => within(row).queryByText('аналог'));

		expect(analogueRows).toHaveLength(4);
		expect(within(analogueRows[0]).getByText('TESLA TECHNICS')).toBeInTheDocument();

		// Позиция без складов: цена «—», остаток 0.
		const tuyiRow = within(table).getByText('TUYI').closest('tr');

		const tuyiCells = within(tuyiRow)
			.getAllByRole('cell')
			.map((cell) => cell.textContent);

		expect(tuyiCells.slice(-2)).toEqual(['—', '0']);
	});

	it('несуществующий артикул → «По этому артикулу ничего не найдено», а не ошибка', async () => {
		const user = userEvent.setup();

		mockApi();
		renderApp();

		await user.type(screen.getByRole('textbox', { name: 'Артикул' }), 'NOPE{Enter}');

		expect(await screen.findByText('По этому артикулу ничего не найдено')).toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('пока бренды грузятся, можно искать снова: зависший запрос не блокирует форму', async () => {
		// Если форму снова заблокировать на время загрузки, зависший API запрёт поиск до перезагрузки страницы.
		const user = userEvent.setup();
		let calls = 0;

		// Первый запрос зависает навсегда, следующие отвечают сразу.
		mockFetch(() => (++calls === 1 ? new Promise(() => {}) : brandsFixture));

		renderApp();

		await user.type(screen.getByRole('textbox', { name: 'Артикул' }), 'OC90{Enter}');

		expect(screen.getByRole('status')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Найти' }));

		expect(await screen.findByRole('button', { name: 'MAHLE' })).toBeInTheDocument();
	});

	it('повторный клик по выбранному бренду не отправляет новый запрос', async () => {
		// У API лимит запросов: лишний клик не должен его тратить и сбрасывать уже загруженную таблицу.
		const user = userEvent.setup();
		const fetchMock = mockApi();

		renderApp();

		await user.type(screen.getByRole('textbox', { name: 'Артикул' }), 'OC90{Enter}');

		const mahle = await screen.findByRole('button', { name: 'MAHLE' });

		await user.click(mahle);
		await screen.findByRole('table');
		await user.click(mahle);

		const offerRequests = fetchMock.mock.calls.filter(([url]) => url.includes('brand='));

		expect(offerRequests).toHaveLength(1);
		expect(screen.getByRole('table')).toBeInTheDocument();
	});

	it('ошибка загрузки предложений → «Повторить» → таблица', async () => {
		// Повтор идёт по уже выбранному бренду. Защита от повторного клика не должна его глушить.
		const user = userEvent.setup();
		let offerCalls = 0;

		mockFetch((url) => {
			if (!url.searchParams.has('brand')) return brandsFixture;

			return ++offerCalls === 1 ? { error: 'Request quota exceeded!' } : offersFixture;
		});

		renderApp();

		await user.type(screen.getByRole('textbox', { name: 'Артикул' }), 'OC90{Enter}');
		await user.click(await screen.findByRole('button', { name: 'MAHLE' }));

		expect(await screen.findByRole('alert')).toHaveTextContent(/лимит/i);

		await user.click(screen.getByRole('button', { name: 'Повторить' }));

		expect(await screen.findByRole('table')).toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});
});
