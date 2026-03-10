/**
 * Offline Storage and Sync Service for DocScan Pro
 * Handles offline document storage and background sync
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
const OFFLINE_DOCS_KEY = '@DocScanPro:offlineDocs';
const PENDING_SYNC_KEY = '@DocScanPro:pendingSync';
const LAST_SYNC_KEY = '@DocScanPro:lastSync';

export interface OfflineDocument {
  id: string;
  localId: string;
  title: string;
  content?: string;
  pages: { imageUri: string; base64?: string }[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  syncError?: string;
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  retries: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingItems: number;
  isSyncing: boolean;
}

class OfflineSyncService {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private unsubscribeNetInfo: (() => void) | null = null;

  constructor() {
    this.initNetworkListener();
  }

  /**
   * Initialize network status listener
   */
  private initNetworkListener() {
    // Store unsubscribe function to prevent memory leaks
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      // If we just came online, trigger sync
      if (wasOffline && this.isOnline) {
        this.syncPendingChanges();
      }
      
      this.notifyListeners();
    });
  }

  /**
   * Cleanup network listener - call when service is no longer needed
   */
  destroy() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    this.listeners.clear();
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of status change
   */
  private async notifyListeners() {
    const status = await this.getStatus();
    this.listeners.forEach((cb) => cb(status));
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatus> {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const pending = await this.getPendingQueue();
    
    return {
      isOnline: this.isOnline,
      lastSync,
      pendingItems: pending.length,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Save document offline
   */
  async saveDocumentOffline(doc: Partial<OfflineDocument>): Promise<OfflineDocument> {
    const docs = await this.getOfflineDocuments();
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newDoc: OfflineDocument = {
      id: doc.id || localId,
      localId,
      title: doc.title || 'Untitled Document',
      content: doc.content,
      pages: doc.pages || [],
      tags: doc.tags || [],
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
    };
    
    docs.push(newDoc);
    await AsyncStorage.setItem(OFFLINE_DOCS_KEY, JSON.stringify(docs));
    
    // Add to sync queue
    await this.addToSyncQueue({
      id: localId,
      action: 'create',
      data: newDoc,
      timestamp: new Date().toISOString(),
      retries: 0,
    });
    
    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingChanges();
    }
    
    return newDoc;
  }

  /**
   * Get all offline documents
   */
  async getOfflineDocuments(): Promise<OfflineDocument[]> {
    try {
      const docs = await AsyncStorage.getItem(OFFLINE_DOCS_KEY);
      return docs ? JSON.parse(docs) : [];
    } catch {
      return [];
    }
  }

  /**
   * Update offline document
   */
  async updateDocumentOffline(localId: string, updates: Partial<OfflineDocument>): Promise<void> {
    const docs = await this.getOfflineDocuments();
    const index = docs.findIndex((d) => d.localId === localId);
    
    if (index !== -1) {
      docs[index] = {
        ...docs[index],
        ...updates,
        updatedAt: new Date().toISOString(),
        synced: false,
      };
      
      await AsyncStorage.setItem(OFFLINE_DOCS_KEY, JSON.stringify(docs));
      
      await this.addToSyncQueue({
        id: localId,
        action: 'update',
        data: docs[index],
        timestamp: new Date().toISOString(),
        retries: 0,
      });
    }
  }

  /**
   * Delete offline document
   */
  async deleteDocumentOffline(localId: string): Promise<void> {
    const docs = await this.getOfflineDocuments();
    const doc = docs.find((d) => d.localId === localId);
    const filtered = docs.filter((d) => d.localId !== localId);
    
    await AsyncStorage.setItem(OFFLINE_DOCS_KEY, JSON.stringify(filtered));
    
    if (doc?.id && !doc.id.startsWith('local_')) {
      await this.addToSyncQueue({
        id: localId,
        action: 'delete',
        data: { id: doc.id },
        timestamp: new Date().toISOString(),
        retries: 0,
      });
    }
  }

  /**
   * Add item to sync queue
   */
  private async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    const queue = await this.getPendingQueue();
    
    // Remove existing item with same id to avoid duplicates
    const filtered = queue.filter((q) => q.id !== item.id);
    filtered.push(item);
    
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
    this.notifyListeners();
  }

  /**
   * Get pending sync queue
   */
  async getPendingQueue(): Promise<SyncQueueItem[]> {
    try {
      const queue = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch {
      return [];
    }
  }

  /**
   * Sync all pending changes
   */
  async syncPendingChanges(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing || !this.isOnline) {
      return { success: 0, failed: 0 };
    }
    
    this.isSyncing = true;
    this.notifyListeners();
    
    const queue = await this.getPendingQueue();
    let success = 0;
    let failed = 0;
    const remainingQueue: SyncQueueItem[] = [];
    
    for (const item of queue) {
      try {
        await this.syncItem(item);
        success++;
        
        // Mark document as synced
        if (item.action !== 'delete') {
          await this.markAsSynced(item.id);
        }
      } catch (e) {
        failed++;
        item.retries++;
        
        // Keep in queue if retries < 5
        if (item.retries < 5) {
          remainingQueue.push(item);
        } else {
          // Mark as sync error
          await this.markSyncError(item.id, String(e));
        }
      }
    }
    
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remainingQueue));
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    
    this.isSyncing = false;
    this.notifyListeners();
    
    return { success, failed };
  }

  /**
   * Sync a single item
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    const token = await AsyncStorage.getItem('@DocScanPro:authToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    switch (item.action) {
      case 'create':
        const createRes = await fetch(`${BACKEND_URL}/api/documents`, {
          method: 'POST',
          headers,
          body: JSON.stringify(item.data),
        });
        if (!createRes.ok) throw new Error('Failed to create document');
        break;
        
      case 'update':
        const updateRes = await fetch(`${BACKEND_URL}/api/documents/${item.data.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(item.data),
        });
        if (!updateRes.ok) throw new Error('Failed to update document');
        break;
        
      case 'delete':
        const deleteRes = await fetch(`${BACKEND_URL}/api/documents/${item.data.id}`, {
          method: 'DELETE',
          headers,
        });
        if (!deleteRes.ok) throw new Error('Failed to delete document');
        break;
    }
  }

  /**
   * Mark document as synced
   */
  private async markAsSynced(localId: string): Promise<void> {
    const docs = await this.getOfflineDocuments();
    const index = docs.findIndex((d) => d.localId === localId);
    
    if (index !== -1) {
      docs[index].synced = true;
      docs[index].syncError = undefined;
      await AsyncStorage.setItem(OFFLINE_DOCS_KEY, JSON.stringify(docs));
    }
  }

  /**
   * Mark document with sync error
   */
  private async markSyncError(localId: string, error: string): Promise<void> {
    const docs = await this.getOfflineDocuments();
    const index = docs.findIndex((d) => d.localId === localId);
    
    if (index !== -1) {
      docs[index].syncError = error;
      await AsyncStorage.setItem(OFFLINE_DOCS_KEY, JSON.stringify(docs));
    }
  }

  /**
   * Force full sync
   */
  async forceFullSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.syncPendingChanges();
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    await AsyncStorage.multiRemove([OFFLINE_DOCS_KEY, PENDING_SYNC_KEY, LAST_SYNC_KEY]);
    this.notifyListeners();
  }
}

export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;
