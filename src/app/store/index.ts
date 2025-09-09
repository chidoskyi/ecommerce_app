// app/store/index.ts
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
  whitelist: ['cart', 'wishlist', 'order', "address"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Create a function that returns a new store instance
export const makeStore = () => {
  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
    devTools: process.env.NODE_ENV !== 'production',
  });

  const persistor = persistStore(store);
  return { store, persistor };
};

// Get the type of the store
export type AppStore = ReturnType<typeof makeStore>['store'];
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch']; // This should properly include thunk dispatch
export type AppPersistor = ReturnType<typeof makeStore>['persistor'];