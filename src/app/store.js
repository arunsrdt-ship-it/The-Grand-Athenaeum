import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { libraryApi } from '../services/libraryApi.js';

export const store = configureStore({
  reducer: {
    [libraryApi.reducerPath]: libraryApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(libraryApi.middleware),
});

setupListeners(store.dispatch);
