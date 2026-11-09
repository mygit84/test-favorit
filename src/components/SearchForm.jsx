import { useState } from 'react';

// Форма не блокируется во время загрузки: новый поиск отменяет предыдущий запрос (см. App).
function SearchForm({ onSearch }) {
	const [value, setValue] = useState('');

	const number = value.trim();

	const handleSubmit = (event) => {
		event.preventDefault();

		if (!number) return;

		onSearch(number);
	};

	return (
		<form className="d-flex gap-2" onSubmit={handleSubmit}>
			<label htmlFor="article" className="visually-hidden">
				Артикул
			</label>

			<input
				id="article"
				type="text"
				className="form-control"
				placeholder="Введите артикул"
				value={value}
				onChange={(event) => setValue(event.target.value)}
			/>

			<button
				type="submit"
				className="btn btn-primary"
				disabled={!number}
			>
				Найти
			</button>
		</form>
	);
}

export default SearchForm;
