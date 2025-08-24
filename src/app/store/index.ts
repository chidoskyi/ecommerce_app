import { configureStore } from '@reduxjs/toolkit';
import { 
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from '@/lib/storage';
import rootReducer from './reducers';

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['cart', 'wishlist', 'order', "address", "categories"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Create a singleton store instance
let store: ReturnType<typeof configureStore> | null = null;
let persistor: ReturnType<typeof persistStore> | null = null;

export const makeStore = () => {
  if (store && persistor) {
    return { store, persistor };
  }

  store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
    devTools: process.env.NODE_ENV !== 'production',
  });

  persistor = persistStore(store);
  return { store, persistor };
};

// Export the store instance for direct access
export const getStore = () => {
  if (!store) {
    throw new Error('Store not initialized. Call makeStore() first.');
  }
  return store;
};

export const getPersistor = () => {
  if (!persistor) {
    throw new Error('Persistor not initialized. Call makeStore() first.');
  }
  return persistor;
};

export type AppStore = ReturnType<typeof makeStore>['store'];
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch'];
export type AppPersistor = ReturnType<typeof makeStore>['persistor']; 