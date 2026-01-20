/**
 * IndexedDB Service for Offline POS Support
 * Handles local storage of sales and products for offline functionality
 */

const DB_NAME = 'pos_offline_db';
const DB_VERSION = 2;

// Store names
const STORES = {
  SALES: 'offline_sales',
  PRODUCTS: 'cached_products',
  STAFF_RECEIPTS: 'staff_receipts'
};

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB connection
 * Creates stores if they don't exist
 */
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Return existing connection if available
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB: Failed to open database');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB: Database opened successfully');
      resolve(db);
    };

    // Create object stores on first run or version upgrade
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Store for offline sales
      if (!database.objectStoreNames.contains(STORES.SALES)) {
        const salesStore = database.createObjectStore(STORES.SALES, { keyPath: 'id' });
        salesStore.createIndex('synced', 'synced', { unique: false });
        salesStore.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('IndexedDB: Created offline_sales store');
      }

      // Store for cached products
      if (!database.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productsStore = database.createObjectStore(STORES.PRODUCTS, { keyPath: '_id' });
        productsStore.createIndex('code', 'code', { unique: true });
        console.log('IndexedDB: Created cached_products store');
      }

      // Store for staff receipts
      if (!database.objectStoreNames.contains(STORES.STAFF_RECEIPTS)) {
        const receiptsStore = database.createObjectStore(STORES.STAFF_RECEIPTS, { keyPath: 'id' });
        receiptsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        receiptsStore.createIndex('createdAt', 'createdAt', { unique: false });
        receiptsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        receiptsStore.createIndex('userId', 'userId', { unique: false });
        console.log('IndexedDB: Created staff_receipts store');
      }
    };
  });
};


// ============================================
// STAFF RECEIPTS OPERATIONS
// ============================================

export type StaffReceiptSyncStatus = 'pending' | 'synced' | 'conflict';

export interface StaffReceiptDBRecord {
  id: string;
  userId: string; // сотрудник/хелпер
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: StaffReceiptSyncStatus;
}

export const saveStaffReceipt = async (receipt: Omit<StaffReceiptDBRecord, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> & {id?: string, createdAt?: string, updatedAt?: string, syncStatus?: StaffReceiptSyncStatus}): Promise<StaffReceiptDBRecord> => {
  const database = await initDB();

  const now = new Date().toISOString();
  const staffReceipt: StaffReceiptDBRecord = {
    ...receipt,
    id: receipt.id || generateUUID(),
    createdAt: receipt.createdAt || now,
    updatedAt: receipt.updatedAt || now,
    syncStatus: receipt.syncStatus || 'pending',
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.STAFF_RECEIPTS], 'readwrite');
    const store = transaction.objectStore(STORES.STAFF_RECEIPTS);
    const request = store.put(staffReceipt);
    request.onsuccess = () => {
      console.log('IndexedDB: StaffReceipt saved', staffReceipt.id);
      resolve(staffReceipt);
    };
    request.onerror = () => {
      console.error('IndexedDB: Failed to save staffReceipt');
      reject(request.error);
    };
  });
};

export const getAllStaffReceipts = async (): Promise<StaffReceiptDBRecord[]> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.STAFF_RECEIPTS], 'readonly');
    const store = transaction.objectStore(STORES.STAFF_RECEIPTS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const getUnsyncedStaffReceipts = async (): Promise<StaffReceiptDBRecord[]> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.STAFF_RECEIPTS], 'readonly');
    const store = transaction.objectStore(STORES.STAFF_RECEIPTS);
    const index = store.index('syncStatus');
    const request = index.getAll('pending');
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const markStaffReceiptsAsSynced = async (ids: string[]): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve) => {
    const transaction = database.transaction([STORES.STAFF_RECEIPTS], 'readwrite');
    const store = transaction.objectStore(STORES.STAFF_RECEIPTS);
    let completed = 0;
    const total = ids.length;
    if (total === 0) { resolve(); return; }
    ids.forEach((id) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.syncStatus = 'synced';
          record.updatedAt = new Date().toISOString();
          store.put(record);
        }
        completed++;
        if (completed === total) resolve();
      };
      getRequest.onerror = () => {
        completed++;
        if (completed === total) resolve();
      };
    });
  });
};

export const deleteSyncedStaffReceipts = async (ids: string[]): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve) => {
    const transaction = database.transaction([STORES.STAFF_RECEIPTS], 'readwrite');
    const store = transaction.objectStore(STORES.STAFF_RECEIPTS);
    let completed = 0;
    const total = ids.length;
    if (total === 0) { resolve(); return; }
    ids.forEach((id) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        completed++;
        if (completed === total) resolve();
      };
      request.onerror = () => {
        completed++;
        if (completed === total) resolve();
      };
    });
  });
};

export const getStaffReceiptById = async (id: string): Promise<StaffReceiptDBRecord | undefined> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.STAFF_RECEIPTS], 'readonly');
    const store = transaction.objectStore(STORES.STAFF_RECEIPTS);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// ============================================
// SALES OPERATIONS
// ============================================

export interface OfflineSale {
  id: string;
  items: {
    product: string;
    name: string;
    code: string;
    price: number;
    quantity: number;
  }[];
  total: number;
  paymentMethod: 'cash' | 'card';
  customer?: string;
  isReturn?: boolean;
  createdAt: string;
  synced: boolean;
}

/**
 * Generate UUID for offline sales
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Save a sale to IndexedDB
 * IMPORTANT: Always save locally first before attempting server sync
 */
export const saveOfflineSale = async (sale: Omit<OfflineSale, 'id' | 'synced' | 'createdAt'>): Promise<OfflineSale> => {
  const database = await initDB();
  
  const offlineSale: OfflineSale = {
    ...sale,
    id: generateUUID(),
    createdAt: new Date().toISOString(),
    synced: false
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SALES], 'readwrite');
    const store = transaction.objectStore(STORES.SALES);
    const request = store.add(offlineSale);

    request.onsuccess = () => {
      console.log('IndexedDB: Sale saved offline', offlineSale.id);
      resolve(offlineSale);
    };

    request.onerror = () => {
      console.error('IndexedDB: Failed to save sale');
      reject(request.error);
    };
  });
};

/**
 * Get all unsynced sales
 * Used for bulk sync when internet is restored
 */
export const getUnsyncedSales = async (): Promise<OfflineSale[]> => {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SALES], 'readonly');
    const store = transaction.objectStore(STORES.SALES);
    const request = store.getAll();

    request.onsuccess = () => {
      const allSales = request.result || [];
      const unsynced = allSales.filter((sale: OfflineSale) => sale.synced === false);
      resolve(unsynced);
    };

    request.onerror = () => {
      console.error('IndexedDB: Failed to get unsynced sales');
      reject(request.error);
    };
  });
};

/**
 * Mark sales as synced after successful server sync
 * IMPORTANT: Only call this after server confirms receipt
 */
export const markSalesAsSynced = async (saleIds: string[]): Promise<void> => {
  const database = await initDB();

  return new Promise((resolve) => {
    const transaction = database.transaction([STORES.SALES], 'readwrite');
    const store = transaction.objectStore(STORES.SALES);

    let completed = 0;
    const total = saleIds.length;

    if (total === 0) {
      resolve();
      return;
    }

    saleIds.forEach((id) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const sale = getRequest.result;
        if (sale) {
          sale.synced = true;
          store.put(sale);
        }
        completed++;
        if (completed === total) {
          console.log(`IndexedDB: Marked ${total} sales as synced`);
          resolve();
        }
      };

      getRequest.onerror = () => {
        completed++;
        if (completed === total) resolve();
      };
    });
  });
};

/**
 * Delete synced sales from IndexedDB
 * IMPORTANT: Only delete after marking as synced
 */
export const deleteSyncedSales = async (saleIds: string[]): Promise<void> => {
  const database = await initDB();

  return new Promise((resolve) => {
    const transaction = database.transaction([STORES.SALES], 'readwrite');
    const store = transaction.objectStore(STORES.SALES);

    let completed = 0;
    const total = saleIds.length;

    if (total === 0) {
      resolve();
      return;
    }

    saleIds.forEach((id) => {
      const request = store.delete(id);
      
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          console.log(`IndexedDB: Deleted ${total} synced sales`);
          resolve();
        }
      };

      request.onerror = () => {
        completed++;
        if (completed === total) resolve();
      };
    });
  });
};

/**
 * Get count of unsynced sales
 * Useful for UI indicators
 */
export const getUnsyncedSalesCount = async (): Promise<number> => {
  const sales = await getUnsyncedSales();
  return sales.length;
};


// ============================================
// PRODUCTS CACHE OPERATIONS
// ============================================

export interface CachedProduct {
  _id: string;
  code: string;
  name: string;
  price: number;
  costPrice?: number;
  quantity: number;
  isMainWarehouse?: boolean;
  [key: string]: any;
}

/**
 * Cache products in IndexedDB
 * Called after successful fetch from server
 */
export const cacheProducts = async (products: CachedProduct[]): Promise<void> => {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PRODUCTS], 'readwrite');
    const store = transaction.objectStore(STORES.PRODUCTS);

    // Clear existing products first
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      let completed = 0;
      const total = products.length;

      if (total === 0) {
        resolve();
        return;
      }

      products.forEach((product) => {
        const request = store.add(product);
        
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            console.log(`IndexedDB: Cached ${total} products`);
            resolve();
          }
        };

        request.onerror = () => {
          completed++;
          if (completed === total) resolve();
        };
      });
    };

    clearRequest.onerror = () => {
      reject(clearRequest.error);
    };
  });
};

/**
 * Get all cached products
 * Used when offline
 */
export const getCachedProducts = async (): Promise<CachedProduct[]> => {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PRODUCTS], 'readonly');
    const store = transaction.objectStore(STORES.PRODUCTS);
    const request = store.getAll();

    request.onsuccess = () => {
      console.log(`IndexedDB: Retrieved ${request.result?.length || 0} cached products`);
      resolve(request.result || []);
    };

    request.onerror = () => {
      console.error('IndexedDB: Failed to get cached products');
      reject(request.error);
    };
  });
};

/**
 * Get cached product by code
 * Useful for barcode scanning when offline
 */
export const getCachedProductByCode = async (code: string): Promise<CachedProduct | null> => {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PRODUCTS], 'readonly');
    const store = transaction.objectStore(STORES.PRODUCTS);
    const index = store.index('code');
    const request = index.get(code);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Check if products are cached
 */
export const hasProductsCache = async (): Promise<boolean> => {
  const products = await getCachedProducts();
  return products.length > 0;
};
