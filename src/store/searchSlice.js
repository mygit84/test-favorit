import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { getBrands } from '../api/favoritApi';

export const fetchBrands = createAsyncThunk(
	'search/fetchBrands',
	(number, { signal }) => getBrands(number, signal),
);

const initialState = {
	number: '',
	brands: [],
	status: 'idle',
	error: null,
	selectedBrand: null,
};

const searchSlice = createSlice({
	name: 'search',
	initialState,

	reducers: {
		selectBrand(state, action) {
			state.selectedBrand = action.payload;
		},
	},

	extraReducers: (builder) => {
		builder
			.addCase(fetchBrands.pending, (state, action) => {
				state.number = action.meta.arg;
				state.brands = [];
				state.selectedBrand = null;
				state.error = null;
				state.status = 'loading';
			})

			.addCase(fetchBrands.fulfilled, (state, action) => {
				state.brands = action.payload;
				state.status = 'succeeded';
			})

			.addCase(fetchBrands.rejected, (state, action) => {
				if (action.meta.aborted) return;

				state.error = action.error.message;
				state.status = 'failed';
			});
	},
});

export const { selectBrand } = searchSlice.actions;

export default searchSlice.reducer;
