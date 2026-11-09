import { PRICE_FORMAT } from '../constants';

function OffersTable({ items }) {
	return (
		<div className="table-responsive">
			<table className="table table-striped table-hover align-middle">
				<thead>
					<tr>
						<th>Название</th>
						<th>Производитель</th>
						<th>Артикул</th>
						<th>Склад</th>
						<th className="text-end">Цена</th>
						<th className="text-end">Остаток</th>
					</tr>
				</thead>

				<tbody>
					{items.map((row) => {
						// В Bootstrap 5.3 цвет задаётся на ячейках, поэтому text-muted ставим на td.
						const muted = row.stock === 0 ? 'text-muted' : '';

						return (
							<tr key={row.id}>
								<td className={muted}>
									{row.name}

									{row.isAnalogue && (
										<span className="badge text-bg-secondary ms-2">аналог</span>
									)}
								</td>

								<td className={muted}>{row.brand}</td>

								<td className={`${muted} text-nowrap`}>{row.number}</td>

								<td className={`${muted} text-nowrap`}>{row.warehouse ?? '—'}</td>

								<td className={`${muted} text-end text-nowrap`}>
									{row.price === null ? '—' : PRICE_FORMAT.format(row.price)}
								</td>

								<td className={`${muted} text-end`}>{row.stock}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

export default OffersTable;
