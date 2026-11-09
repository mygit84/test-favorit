import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { fetchBrands, selectBrand } from './store/searchSlice';
import { fetchOffers, resetOffers } from './store/offersSlice';

import SearchForm from './components/SearchForm';
import BrandList from './components/BrandList';
import OffersTable from './components/OffersTable';
import StatusSection from './components/StatusSection';

function App() {
	const dispatch = useDispatch();

	const search = useSelector((state) => state.search);
	const offers = useSelector((state) => state.offers);

	const hasBrands = search.status === 'succeeded' && search.brands.length > 0;

	// Промисы последних диспатчей: по ним отменяем устаревшие запросы.
	const brandsRequest = useRef(null);
	const offersRequest = useRef(null);

	const searchBrands = (number) => {
		brandsRequest.current?.abort();
		offersRequest.current?.abort();

		dispatch(resetOffers());

		brandsRequest.current = dispatch(fetchBrands(number));
	};

	const loadOffers = (brand) => {
		// Повторный клик по уже выбранному бренду не тратит лимит запросов; после ошибки — повтор.
		if (brand === search.selectedBrand && offers.status !== 'failed') return;

		offersRequest.current?.abort();

		dispatch(selectBrand(brand));

		offersRequest.current = dispatch(fetchOffers({ number: search.number, brand }));
	};

	return (
		<div className="container py-4">
			<h1 className="h3 mb-3">Подбор автозапчастей по артикулу</h1>

			<div className="mb-4">
				<SearchForm onSearch={searchBrands} />
			</div>

			<div className="row g-4">
				<StatusSection
					title="Производители"
					className="col-12 col-lg-3"
					status={search.status}
					error={search.error}
					isEmpty={search.brands.length === 0}
					emptyText="По этому артикулу ничего не найдено"
					onRetry={() => searchBrands(search.number)}
				>
					<BrandList
						brands={search.brands}
						selectedBrand={search.selectedBrand}
						onSelect={loadOffers}
					/>
				</StatusSection>

				<StatusSection
					title="Предложения"
					className="col-12 col-lg-9"
					status={offers.status}
					error={offers.error}
					isEmpty={offers.items.length === 0}
					emptyText="Предложений по выбранному производителю нет"
					idleText={hasBrands ? 'Выберите производителя, чтобы увидеть предложения' : undefined}
					onRetry={() => loadOffers(search.selectedBrand)}
				>
					<OffersTable items={offers.items} />
				</StatusSection>
			</div>
		</div>
	);
}

export default App;
