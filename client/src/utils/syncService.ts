/**
 * Sync Service for Offline POS
 * Handles synchronization of offline sales with the server
 * 
 * SAFETY RULES:
 * 1. Never delete local data without server confirmation
 * 2. Always mark as synced before deleting
 * 3. Handle network failures gracefully
 */

import api from './api';
import {
  getUnsyncedSales,
  markSalesAsSynced,
  deleteSyncedSales,
  getUnsyncedSalesCount
} from './indexedDbService';

// Sync status for UI updates
type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
type SyncListener = (status: SyncStatus, pendingCount: number) => void;

let syncListeners: SyncListener[] = [];
let isSyncing = false;

/**
 * Subscribe to sync status changes
 * Returns unsubscribe function
 */
export const subscribeSyncStatus = (listener: SyncListener): (() => void) => {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
};

/**
 * Notify all listeners of status change
 */
const notifyListeners = async (status: SyncStatus) => {
  const count = await getUnsyncedSalesCount();
  syncListeners.forEach(listener => listener(status, count));
};

/**
 * Check if device is online
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Sync all unsynced sales to server
 * IMPORTANT: This is the main sync function
 * 
 * Flow:
 * 1. Get all unsynced sales from IndexedDB
 * 2. Send to server via bulk endpoint
 * 3. On success: mark as synced, then delete
 * 4. On failure: keep data unchanged
 */
export const syncOfflineSales = async (): Promise<{ success: boolean; synced: number; error?: string }> => {
  // Prevent concurrent syncs
  if (isSyncing) {
    console.log('Sync: Already syncing, skipping...');
    return { success: false, synced: 0, error: 'Sync already in progress' };
  }

  // Check if online
  if (!isOnline()) {
    console.log('Sync: Device is offline, skipping...');
    return { success: false, synced: 0, error: 'Device is offline' };
  }

  isSyncing = true;
  await notifyListeners('syncing');

  try {
    // Step 1: Get unsynced sales
    const unsyncedSales = await getUnsyncedSales();
    
    if (unsyncedSales.length === 0) {
      console.log('Sync: No unsynced sales to sync');
      isSyncing = false;
      await notifyListeners('idle');
      return { success: true, synced: 0 };
    }

    console.log(`Sync: Found ${unsyncedSales.length} unsynced sales`);

    // Step 2: Send to server
    // Transform to server format
    const salesForServer = unsyncedSales.map(sale => ({
      offlineId: sale.id,
      items: sale.items,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      customer: sale.customer,
      isReturn: sale.isReturn,
      createdAt: sale.createdAt
    }));

    const response = await api.post('/receipts/bulk', { sales: salesForServer });

    // Step 3: On success - mark as synced, then delete
    if (response.data.success) {
      const syncedIds = unsyncedSales.map(s => s.id);
      
      // IMPORTANT: First mark as synced
      await markSalesAsSynced(syncedIds);
      
      // IMPORTANT: Only then delete
      await deleteSyncedSales(syncedIds);

      console.log(`Sync: Successfully synced ${syncedIds.length} sales`);
      isSyncing = false;
      await notifyListeners('success');
      
      return { success: true, synced: syncedIds.length };
    } else {
      throw new Error(response.data.message || 'Server returned error');
    }

  } catch (error: any) {
    // Step 4: On failure - keep data unchanged
    console.error('Sync: Failed to sync sales', error);
    isSyncing = false;
    await notifyListeners('error');
    
    return { 
      success: false, 
      synced: 0, 
      error: error.message || 'Sync failed' 
    };
  }
};


/**
 * Initialize online/offline event listeners
 * Automatically syncs when internet is restored
 */
export const initSyncListeners = (): void => {
  // Sync when coming back online
  window.addEventListener('online', async () => {
    console.log('Sync: Internet connection restored');
    
    // Small delay to ensure connection is stable
    setTimeout(async () => {
      const result = await syncOfflineSales();
      if (result.success && result.synced > 0) {
        console.log(`Sync: Auto-synced ${result.synced} sales after reconnection`);
      }
    }, 2000);
  });

  // Log when going offline
  window.addEventListener('offline', () => {
    console.log('Sync: Internet connection lost - sales will be saved locally');
    notifyListeners('idle');
  });

  // Sync on page load if online
  if (isOnline()) {
    setTimeout(() => {
      syncOfflineSales();
    }, 3000);
  }

  console.log('Sync: Event listeners initialized');
};

/**
 * Sync before page unload (best effort)
 * Note: This may not complete if user closes tab quickly
 */
export const initBeforeUnloadSync = (): void => {
  window.addEventListener('beforeunload', async (event) => {
    const count = await getUnsyncedSalesCount();
    
    if (count > 0 && isOnline()) {
      // Try to sync, but don't block page close
      syncOfflineSales();
    }
    
    // Show warning if there are unsynced sales
    if (count > 0) {
      event.preventDefault();
      event.returnValue = `Sizda ${count} ta sinxronlanmagan sotuv bor. Sahifani yopishni xohlaysizmi?`;
      return event.returnValue;
    }
  });
};

/**
 * Manual sync trigger
 * Can be called from UI button
 */
export const triggerManualSync = async (): Promise<{ success: boolean; synced: number; error?: string }> => {
  if (!isOnline()) {
    return { success: false, synced: 0, error: 'Internet aloqasi yo\'q' };
  }
  
  return syncOfflineSales();
};

/**
 * Get current sync status info
 */
export const getSyncInfo = async (): Promise<{
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
}> => {
  const pendingCount = await getUnsyncedSalesCount();
  
  return {
    isOnline: isOnline(),
    pendingCount,
    isSyncing
  };
};
