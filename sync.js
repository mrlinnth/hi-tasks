// Sync manager for offline queue processing
import db from './db.js';
import api from './api.js';

class SyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.listeners = [];
    }

    init() {
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    handleOnline() {
        this.isOnline = true;
        this.notifyListeners({ online: true });
        this.processQueue();
    }

    handleOffline() {
        this.isOnline = false;
        this.notifyListeners({ online: false });
    }

    // Add listener for sync status changes
    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(data) {
        this.listeners.forEach(callback => callback(data));
    }

    // Add operation to sync queue
    async queueOperation(type, data) {
        const operation = {
            type, // 'create', 'update', 'delete'
            data
        };

        await db.addToQueue(operation);

        // Try to sync immediately if online
        if (this.isOnline) {
            this.processQueue();
        }
    }

    // Process sync queue
    async processQueue() {
        if (this.isSyncing || !this.isOnline) {
            return;
        }

        this.isSyncing = true;
        this.notifyListeners({ syncing: true });

        try {
            const queue = await db.getQueue();

            for (const item of queue) {
                try {
                    await this.processQueueItem(item);
                    await db.removeFromQueue(item.id);
                } catch (error) {
                    console.error('Error processing queue item:', error);
                    // Keep item in queue for retry
                }
            }
        } catch (error) {
            console.error('Error processing queue:', error);
        } finally {
            this.isSyncing = false;
            this.notifyListeners({ syncing: false });
        }
    }

    async processQueueItem(item) {
        const { type, data } = item;

        switch (type) {
            case 'create':
                return await api.createTask(data);
            
            case 'update':
                return await api.updateTask(data._id, data);
            
            case 'delete':
                return await api.deleteTask(data._id);
            
            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
    }

    // Sync tasks from server
    async syncFromServer() {
        if (!this.isOnline) {
            throw new Error('Cannot sync while offline');
        }

        try {
            const tasks = await api.getTasks();
            await db.clearTasks();
            if (tasks.length > 0) {
                await db.saveTasks(tasks);
            }
            return tasks;
        } catch (error) {
            console.error('Error syncing from server:', error);
            throw error;
        }
    }

    // Full sync: process queue then pull from server
    async fullSync() {
        if (!this.isOnline) {
            return;
        }

        await this.processQueue();
        await this.syncFromServer();
    }
}

export default new SyncManager();
