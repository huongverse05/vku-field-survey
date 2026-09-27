/**
 * ==============================================================================
 * VKU FIELD SURVEY PWA - INDEXEDDB LAYER (js/db.js)
 * Course: Cross-Platform Mobile App Development - Week 3
 * Faculty of Computer Science - VKU (Vietnam - Korea University of ICT)
 * ==============================================================================
 * 
 * Provides an asynchronous, Promise-based IndexedDB interface for:
 * - Structured offline storage of facility inspection records
 * - Handling photo binary / base64 payloads
 * - Offline sync queue management (pending vs synced)
 * - Real-time form draft persistence
 * ==============================================================================
 */

const DB_NAME = 'VKU_Field_Survey_DB';
const DB_VERSION = 1;
const STORE_SURVEYS = 'surveys';
const STORE_DRAFTS = 'drafts';

class SurveyDatabase {
  constructor() {
    this.db = null;
  }

  /**
   * Initializes or upgrades the IndexedDB database
   * @returns {Promise<IDBDatabase>}
   */
  async initDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('[IndexedDB] Upgrading schema to version:', DB_VERSION);

        // 1. Surveys Store
        if (!db.objectStoreNames.contains(STORE_SURVEYS)) {
          const surveyStore = db.createObjectStore(STORE_SURVEYS, { keyPath: 'id' });
          surveyStore.createIndex('by_synced', 'synced', { unique: false });
          surveyStore.createIndex('by_category', 'category', { unique: false });
          surveyStore.createIndex('by_facility', 'facilityType', { unique: false });
          surveyStore.createIndex('by_createdAt', 'createdAt', { unique: false });
          surveyStore.createIndex('by_condition', 'condition', { unique: false });
          console.log('[IndexedDB] Created object store: surveys with indexes');
        }

        // 2. Drafts Store (Key: 'active_draft')
        if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
          db.createObjectStore(STORE_DRAFTS, { keyPath: 'key' });
          console.log('[IndexedDB] Created object store: drafts');
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[IndexedDB] Database connected successfully.');
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Database connection error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Helper: Runs a transaction
   */
  async getStore(storeName, mode = 'readonly') {
    const db = await this.initDB();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  /**
   * Save or update an inspection record
   * @param {Object} survey
   */
  async saveSurvey(survey) {
    const store = await this.getStore(STORE_SURVEYS, 'readwrite');
    return new Promise((resolve, reject) => {
      const record = {
        ...survey,
        id: survey.id || `vku-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: survey.createdAt || new Date().toISOString(),
        synced: survey.synced !== undefined ? survey.synced : false,
        syncedAt: survey.syncedAt || null
      };

      const request = store.put(record);
      request.onsuccess = () => resolve(record);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Retrieve all surveys sorted chronologically (newest first)
   */
  async getAllSurveys() {
    const store = await this.getStore(STORE_SURVEYS, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result || [];
        // Sort descending by createdAt
        records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        resolve(records);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Retrieve survey by ID
   */
  async getSurveyById(id) {
    const store = await this.getStore(STORE_SURVEYS, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Retrieve surveys queued for synchronization (synced == false)
   */
  async getPendingSurveys() {
    const all = await this.getAllSurveys();
    return all.filter((s) => s.synced === false || s.synced === 0);
  }

  /**
   * Mark a survey as synchronized with server timestamp
   */
  async markSurveySynced(id, syncReceipt = {}) {
    const survey = await this.getSurveyById(id);
    if (!survey) throw new Error(`Survey ID ${id} not found.`);

    survey.synced = true;
    survey.syncedAt = new Date().toISOString();
    survey.serverReceiptId = syncReceipt.serverId || `SRV-${Date.now()}`;

    const store = await this.getStore(STORE_SURVEYS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(survey);
      request.onsuccess = () => resolve(survey);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Delete an inspection record
   */
  async deleteSurvey(id) {
    const store = await this.getStore(STORE_SURVEYS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Save ongoing form inputs as draft
   */
  async saveDraft(formData) {
    const store = await this.getStore(STORE_DRAFTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const draftRecord = {
        key: 'active_draft',
        data: formData,
        savedAt: new Date().toISOString()
      };
      const request = store.put(draftRecord);
      request.onsuccess = () => resolve(draftRecord);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Retrieve saved draft
   */
  async getDraft() {
    const store = await this.getStore(STORE_DRAFTS, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get('active_draft');
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Clear active draft after successful submission
   */
  async clearDraft() {
    const store = await this.getStore(STORE_DRAFTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete('active_draft');
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get database statistics for the Dashboard
   */
  async getStats() {
    const surveys = await this.getAllSurveys();
    const stats = {
      total: surveys.length,
      synced: surveys.filter((s) => s.synced).length,
      pending: surveys.filter((s) => !s.synced).length,
      byCondition: {
        good: surveys.filter((s) => s.condition === 'good').length,
        maintenance: surveys.filter((s) => s.condition === 'maintenance').length,
        critical: surveys.filter((s) => s.condition === 'critical').length
      },
      byFacility: {}
    };

    surveys.forEach((s) => {
      const fac = s.facilityType || 'Khác';
      stats.byFacility[fac] = (stats.byFacility[fac] || 0) + 1;
    });

    return stats;
  }
}

// Global instance
window.vkuDB = new SurveyDatabase();
