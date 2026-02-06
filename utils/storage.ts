import { Photo } from '../types';

const DB_NAME = 'scattered_memories_v1';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

// Helper to open the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const loadPhotos = async (): Promise<Photo[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // Ensure we return an array, handling potential undefined results
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load photos from DB:', error);
    return [];
  }
};

export const savePhotos = async (photos: Photo[]): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // We use a clear-then-add approach to ensure the DB perfectly mirrors state
      // (handling deletions and reordering).
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        if (photos.length === 0) {
          resolve();
          return;
        }

        let completedCount = 0;
        let hasError = false;

        photos.forEach((photo) => {
          const addRequest = store.put(photo);
          
          addRequest.onsuccess = () => {
            completedCount++;
            if (completedCount === photos.length) {
              resolve();
            }
          };

          addRequest.onerror = () => {
            console.error('Failed to save photo:', photo.id);
            if (!hasError) {
              hasError = true;
              reject(addRequest.error);
            }
          };
        });
      };

      clearRequest.onerror = () => reject(clearRequest.error);
    });
  } catch (error) {
    console.error('Failed to save photos to DB:', error);
  }
};