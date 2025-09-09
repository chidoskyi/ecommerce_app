import createWebStorage from "redux-persist/lib/storage/createWebStorage";

// Define the storage interface to match redux-persist's WebStorage interface
interface ReduxPersistStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const createNoopStorage = (): ReduxPersistStorage => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getItem(_key: string): Promise<string | null> {
      return Promise.resolve(null);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setItem(_key: string, value: string): Promise<void> {
      return Promise.resolve();
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removeItem(_key: string): Promise<void> {
      return Promise.resolve();
    },
  };
};

const storage: ReduxPersistStorage = typeof window !== "undefined" 
  ? createWebStorage("local") 
  : createNoopStorage();

export default storage;