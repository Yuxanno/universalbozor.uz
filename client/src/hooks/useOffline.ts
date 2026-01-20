/**
 * useOffline Hook
 * Provides offline functionality for POS components
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initDB,
  saveOfflineSale,
  getCachedProducts,
  cacheProducts,
  getUnsyncedSalesCount,
  CachedProduct,
  OfflineSale
} from '../utils/indexedDbService';
import {
  initSyncListeners,
  subscribeSyncStatus,
  triggerManualSync,
  isOnline as checkOnline
} from '../utils/syncService';
import api from '../utils/api';

interface UseOfflineReturn {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  // Products
  fetchProductsWithCache: (query?: string) => Promise<CachedProduct[]>;
  // Sales
  createSaleOfflineFirst: (saleData: Omit<OfflineSale, 'id' | 'synced' | 'createdAt'>) => Promise<{ success: boolean; offline: boolean }>;
  // Sync
  manualSync: () => Promise<{ success: boolean; synced: number; error?: string }>;
}

/**
 * Hook for offline POS functionality
 * Handles:
 * - Online/offline status
 * - Product caching
 * - Offline-first sales
 * - Sync status
 */
export const useOffline = (): UseOfflineReturn => {
  const [isOnline, setIsOnline] = useState(checkOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [initialized, setInitialized] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      // Initialize IndexedDB
      await initDB();
      
      // Initialize sync listeners (only once)
      if (!initialized) {
        initSyncListeners();
        setInitialized(true);
      }

      // Get initial pending count
      const count = await getUnsyncedSalesCount();
      setPendingCount(count);
    };

    init();

    // Subscribe to sync status changes
    const unsubscribe = subscribeSyncStatus((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
      setIsSyncing(status === 'syncing');
    });

    // Online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initialized]);

  /**
   * Fetch products with caching
   * - If online: fetch from server and cache
   * - If offline: return cached products
   */
  const fetchProductsWithCache = useCallback(async (query?: string): Promise<CachedProduct[]> => {
    if (checkOnline()) {
      try {
        // Fetch from server
        const res = await api.get(`/products${query ? `?${query}` : ''}`);
        const products = res.data;
        
        // Cache products for offline use
        await cacheProducts(products);
        
        return products;
      } catch (error) {
        console.log('Failed to fetch from server, using cache');
        // Fall back to cache on error
        return getCachedProducts();
      }
    } else {
      // Offline - use cache
      console.log('Offline - using cached products');
      return getCachedProducts();
    }
  }, []);

  /**
   * Create sale with offline-first approach
   * IMPORTANT: Always save locally first, then try server
   */
  const createSaleOfflineFirst = useCallback(async (
    saleData: Omit<OfflineSale, 'id' | 'synced' | 'createdAt'>
  ): Promise<{ success: boolean; offline: boolean }> => {
    try {
      // Step 1: ALWAYS save to IndexedDB first (safety)
      const offlineSale = await saveOfflineSale(saleData);
      console.log('Sale saved locally:', offlineSale.id);

      // Step 2: If online, try to sync immediately
      if (checkOnline()) {
        try {
          // Try to create on server
          await api.post('/receipts', {
            items: saleData.items,
            total: saleData.total,
            paymentMethod: saleData.paymentMethod,
            customer: saleData.customer,
            isReturn: saleData.isReturn
          });

          // Success - mark local sale as synced and delete
          const { markSalesAsSynced, deleteSyncedSales } = await import('../utils/indexedDbService');
          await markSalesAsSynced([offlineSale.id]);
          await deleteSyncedSales([offlineSale.id]);

          // Update pending count
          const count = await getUnsyncedSalesCount();
          setPendingCount(count);

          return { success: true, offline: false };
        } catch (serverError) {
          // Server failed - sale is still saved locally
          console.log('Server sync failed, sale saved offline');
          const count = await getUnsyncedSalesCount();
          setPendingCount(count);
          return { success: true, offline: true };
        }
      } else {
        // Offline - sale saved locally
        const count = await getUnsyncedSalesCount();
        setPendingCount(count);
        return { success: true, offline: true };
      }
    } catch (error) {
      console.error('Failed to save sale:', error);
      return { success: false, offline: false };
    }
  }, []);

  /**
   * Manual sync trigger
   */
  const manualSync = useCallback(async () => {
    const result = await triggerManualSync();
    const count = await getUnsyncedSalesCount();
    setPendingCount(count);
    return result;
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncStatus,
    fetchProductsWithCache,
    createSaleOfflineFirst,
    manualSync
  };
};

export default useOffline;
