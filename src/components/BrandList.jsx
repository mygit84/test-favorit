function BrandList({ brands, selectedBrand, onSelect }) {
	return (
		<div className="list-group">
			{brands.map((brand) => {
				const isSelected = brand === selectedBrand;

				return (
					<button
						key={brand}
						type="button"
						className={`list-group-item list-group-item-action${isSelected ? ' active' : ''}`}
						aria-current={isSelected ? 'true' : undefined}
						onClick={() => onSelect(brand)}
					>
						{brand}
					</button>
				);
			})}
		</div>
	);
}

export default BrandList;
