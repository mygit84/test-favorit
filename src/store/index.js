import { configureStore } from '@reduxjs/toolkit';

import searchReducer from './searchSlice';
import offersReducer from './offersSlice';

export const store = configureStore({
	reducer: {
		search: searchReducer,
		offers: offersReducer,
	},
});
