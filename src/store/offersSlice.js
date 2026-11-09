import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { getOffers } from '../api/favoritApi';

export const fetchOffers = createAsyncThunk(
	'offers/fetchOffers',
	({ number, brand }, { signal }) => getOffers(number, brand, signal),
);

const initialState = {
	items: [],
	status: 'idle',
	error: null,
};

const offersSlice = createSlice({
	name: 'offers',
	initialState,

	reducers: {
		resetOffers() {
			return initialState;
		},
	},

	extraReducers: (builder) => {
		builder
			.addCase(fetchOffers.pending, (state) => {
				state.items = [];
				state.error = null;
				state.status = 'loading';
			})

			.addCase(fetchOffers.fulfilled, (state, action) => {
				state.items = action.payload;
				state.status = 'succeeded';
			})

			.addCase(fetchOffers.rejected, (state, action) => {
				if (action.meta.aborted) return;

				state.error = action.error.message;
				state.status = 'failed';
			});
	},
});

export const { resetOffers } = offersSlice.actions;

export default offersSlice.reducer;
