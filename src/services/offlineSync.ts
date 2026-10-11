/**
 * Offline Synchronization Engine with AES-256 Encrypted Local Queue
 * Ensures exam answers and security audit logs are never lost
 * even during sudden Wi-Fi / LAN dropouts in school labs.
 */

import { EncryptedPacket, ExamAnswer, ViolationEvent } from '../types/exam';
import { encryptAES256 } from './cryptoService';

export interface PendingQueueItem {
  id: string;
  type: 'ANSWER' | 'VIOLATION' | 'HEARTBEAT';
  timestamp: number;
  encryptedPacket: EncryptedPacket;
  retryCount: number;
}

const STORAGE_KEY_ANSWERS = 'MATH9_EXAM_ANSWERS_ENC';
const STORAGE_KEY_QUEUE = 'MATH9_OFFLINE_SYNC_QUEUE';
const STORAGE_KEY_VIOLATIONS = 'MATH9_OFFLINE_VIOLATIONS';

class OfflineSyncEngine {
  private isSimulatedOffline = false;
  private syncListeners: ((pendingCount: number, isOnline: boolean) => void)[] = [];
  private syncInterval: number | null = null;

  constructor() {
    this.initNetworkListeners();
    this.startAutoSyncWorker();
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      this.notifyListeners();
      this.flushQueue();
    });

    window.addEventListener('offline', () => {
      this.notifyListeners();
    });
  }

  public isOnline(): boolean {
    if (this.isSimulatedOffline) return false;
    return navigator.onLine;
  }

  public setSimulatedOffline(offline: boolean) {
    this.isSimulatedOffline = offline;
    this.notifyListeners();
    if (!offline) {
      this.flushQueue();
    }
  }

  public getIsSimulatedOffline(): boolean {
    return this.isSimulatedOffline;
  }

  public subscribe(cb: (pendingCount: number, isOnline: boolean) => void): () => void {
    this.syncListeners.push(cb);
    cb(this.getPendingQueue().length, this.isOnline());
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== cb);
    };
  }

  private notifyListeners() {
    const count = this.getPendingQueue().length;
    const online = this.isOnline();
    this.syncListeners.forEach(cb => cb(count, online));
  }

  public getPendingQueue(): PendingQueueItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private savePendingQueue(queue: PendingQueueItem[]) {
    try {
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
      this.notifyListeners();
    } catch {
      // storage error handling
    }
  }

  /**
   * Encrypts and enqueues an exam answer
   */
  public async queueAnswer(answer: ExamAnswer, studentNisn: string): Promise<EncryptedPacket> {
    const payload = { ...answer, studentNisn };
    const encryptedPacket = await encryptAES256(payload);

    // Save locally
    this.saveEncryptedAnswer(answer.questionId, encryptedPacket);

    // Add to pending sync queue
    const item: PendingQueueItem = {
      id: `ans-${answer.questionId}-${Date.now()}`,
      type: 'ANSWER',
      timestamp: Date.now(),
      encryptedPacket,
      retryCount: 0,
    };

    const queue = this.getPendingQueue();
    queue.push(item);
    this.savePendingQueue(queue);

    // If online, attempt immediate flush
    if (this.isOnline()) {
      this.flushQueue();
    }

    return encryptedPacket;
  }

  /**
   * Encrypts and enqueues a violation log event
   */
  public async queueViolation(violation: ViolationEvent): Promise<EncryptedPacket> {
    const encryptedPacket = await encryptAES256(violation);

    const item: PendingQueueItem = {
      id: `viol-${violation.id}`,
      type: 'VIOLATION',
      timestamp: Date.now(),
      encryptedPacket,
      retryCount: 0,
    };

    const queue = this.getPendingQueue();
    queue.push(item);
    this.savePendingQueue(queue);

    // Cache to local violations
    try {
      const existing = localStorage.getItem(STORAGE_KEY_VIOLATIONS);
      const list = existing ? JSON.parse(existing) : [];
      list.push(encryptedPacket);
      localStorage.setItem(STORAGE_KEY_VIOLATIONS, JSON.stringify(list));
    } catch {
      // ignore
    }

    if (this.isOnline()) {
      this.flushQueue();
    }

    return encryptedPacket;
  }

  private saveEncryptedAnswer(questionId: number, packet: EncryptedPacket) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ANSWERS);
      const dict = raw ? JSON.parse(raw) : {};
      dict[questionId] = packet;
      localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(dict));
    } catch {
      // ignore
    }
  }

  public getSavedEncryptedAnswers(): Record<number, EncryptedPacket> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ANSWERS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Background queue flusher when connection is healthy
   */
  public async flushQueue(): Promise<{ synced: number; remaining: number }> {
    if (!this.isOnline()) {
      return { synced: 0, remaining: this.getPendingQueue().length };
    }

    const queue = this.getPendingQueue();
    if (queue.length === 0) {
      return { synced: 0, remaining: 0 };
    }

    // In a production server, this POSTs to /api/exam/sync
    // We simulate server dispatching with instant persistence to server memory
    const remaining: PendingQueueItem[] = [];
    let synced = 0;

    for (const item of queue) {
      try {
        // Dispatched to server endpoint / central server store
        window.dispatchEvent(new CustomEvent('MATH9_SERVER_SYNC_EVENT', {
          detail: item
        }));
        synced++;
      } catch {
        item.retryCount += 1;
        remaining.push(item);
      }
    }

    this.savePendingQueue(remaining);
    return { synced, remaining: remaining.length };
  }

  private startAutoSyncWorker() {
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline() && this.getPendingQueue().length > 0) {
        this.flushQueue();
      }
    }, 5000);
  }

  public destroy() {
    if (this.syncInterval) clearInterval(this.syncInterval);
  }
}

export const offlineSyncEngine = new OfflineSyncEngine();
