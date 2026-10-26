/**
 * Realm DB - Local Embedded Database Engine for Intent
 * Adheres to Realm Database Architecture (Schemas, Transactions, ObjectStores, Reactive Listeners)
 * Uses IndexedDB for true persistent local embedded storage.
 */

class RealmResults extends Array {
  constructor(...items) {
    super(...items);
    this._listeners = [];
  }

  filtered(predicateFn) {
    if (typeof predicateFn === 'string') {
      // Simple query parser (e.g., "chatId == '1'")
      const parts = predicateFn.split('==').map(s => s.trim().replace(/['"]/g, ''));
      if (parts.length === 2) {
        const [key, val] = parts;
        return new RealmResults(...this.filter(item => String(item[key]) === String(val)));
      }
      return this;
    } else if (typeof predicateFn === 'function') {
      return new RealmResults(...this.filter(predicateFn));
    }
    return this;
  }

  sorted(key, descending = false) {
    const copy = [...this].sort((a, b) => {
      if (a[key] < b[key]) return descending ? 1 : -1;
      if (a[key] > b[key]) return descending ? -1 : 1;
      return 0;
    });
    return new RealmResults(...copy);
  }

  addListener(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  _notify() {
    this._listeners.forEach(cb => {
      try { cb(this); } catch (e) { console.error('Realm listener error:', e); }
    });
  }
}

class Realm {
  constructor(config = {}) {
    this.schema = config.schema || [];
    this.schemaVersion = config.schemaVersion || 1;
    this.dbName = config.dbName || 'IntentRealmDB';
    this._data = {};
    this._listeners = {};
    this._isReady = false;
    this._readyPromise = this._init();
  }

  static async open(config) {
    const realm = new Realm(config);
    await realm._readyPromise;
    return realm;
  }

  async _init() {
    // Initialize in-memory schema stores
    this.schema.forEach(s => {
      this._data[s.name] = new Map();
      this._listeners[s.name] = [];
    });

    // Load from IndexedDB or localStorage
    try {
      const persisted = await this._loadFromStorage();
      if (persisted && Object.keys(persisted).length > 0) {
        for (const [schemaName, items] of Object.entries(persisted)) {
          if (this._data[schemaName]) {
            items.forEach(item => {
              const schema = this.schema.find(s => s.name === schemaName);
              const pKey = (schema && schema.primaryKey) || 'id';
              this._data[schemaName].set(String(item[pKey]), item);
            });
          }
        }
      } else {
        await this._seedInitialData();
      }
    } catch (err) {
      console.warn('Realm storage init fallback to seed:', err);
      await this._seedInitialData();
    }
    this._isReady = true;
  }

  async _loadFromStorage() {
    if (window.indexedDB) {
      return new Promise((resolve) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('realm_stores')) {
            db.createObjectStore('realm_stores');
          }
        };
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction('realm_stores', 'readonly');
          const store = tx.objectStore('realm_stores');
          const getReq = store.get('root_data');
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(this._loadFromLocalStorage());
      });
    }
    return this._loadFromLocalStorage();
  }

  _loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(this.dbName);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  async _persist() {
    const serialized = {};
    for (const [name, map] of Object.entries(this._data)) {
      serialized[name] = Array.from(map.values());
    }

    try {
      if (window.indexedDB) {
        const req = indexedDB.open(this.dbName, 1);
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction('realm_stores', 'readwrite');
          const store = tx.objectStore('realm_stores');
          store.put(serialized, 'root_data');
        };
      }
    } catch (e) {
      console.error('Failed to persist to IndexedDB:', e);
    }

    try {
      localStorage.setItem(this.dbName, JSON.stringify(serialized));
    } catch (e) {
      // Quota exceeded or private browsing
    }
  }

  objects(schemaName) {
    if (!this._data[schemaName]) {
      throw new Error(`Schema '${schemaName}' not defined in Realm.`);
    }
    const items = Array.from(this._data[schemaName].values());
    return new RealmResults(...items);
  }

  objectForPrimaryKey(schemaName, key) {
    if (!this._data[schemaName]) return null;
    return this._data[schemaName].get(String(key)) || null;
  }

  write(callback) {
    try {
      const res = callback();
      this._persist();
      // Notify listeners
      for (const [schemaName, listeners] of Object.entries(this._listeners)) {
        listeners.forEach(cb => {
          try { cb(); } catch (e) { console.error(e); }
        });
      }
      return res;
    } catch (err) {
      console.error('Realm transaction aborted:', err);
      throw err;
    }
  }

  create(schemaName, obj, updateMode = 'modified') {
    const schema = this.schema.find(s => s.name === schemaName);
    if (!schema) throw new Error(`Schema ${schemaName} not found.`);
    const pKey = schema.primaryKey || 'id';
    const keyVal = String(obj[pKey]);

    const existing = this._data[schemaName].get(keyVal);
    let record;
    if (existing && updateMode === 'modified') {
      record = Object.assign(existing, obj);
    } else {
      record = { ...obj };
    }
    this._data[schemaName].set(keyVal, record);
    return record;
  }

  delete(objOrResults) {
    if (Array.isArray(objOrResults)) {
      objOrResults.forEach(item => this.delete(item));
      return;
    }
    // Find schema
    for (const [schemaName, map] of Object.entries(this._data)) {
      for (const [key, val] of map.entries()) {
        if (val === objOrResults || val.id === objOrResults.id) {
          map.delete(key);
          return;
        }
      }
    }
  }

  addListener(schemaName, listener) {
    if (!this._listeners[schemaName]) this._listeners[schemaName] = [];
    this._listeners[schemaName].push(listener);
    return () => {
      this._listeners[schemaName] = this._listeners[schemaName].filter(l => l !== listener);
    };
  }

  async _seedInitialData() {
    // Standard sample contacts & chats from Intent 0.6.0.1 report
    const initialChats = [
      {
        id: 'c1',
        contactName: 'Léa Martin',
        avatarText: 'L',
        avatarClass: 'b1',
        countryCode: 'FR',
        countryBg: '#EEF4FF',
        countryColor: '#1D4ED8',
        sourceLang: 'fr',
        targetLang: 'ar',
        unreadCount: 2,
        lastMessageTime: '21:07',
        lastOriginalText: 'Parfait 🙌 je t\'envoie le dossier.',
        lastTranslatedText: 'ممتاز 🙌 سأرسل لك الملف الآن.',
        badgeType: 'translated',
        badgeText: '✓ Translated',
        isOnline: true
      },
      {
        id: 'c2',
        contactName: 'Marco Rossi',
        avatarText: 'M',
        avatarClass: 'b2',
        countryCode: 'IT',
        countryBg: '#ECFDF5',
        countryColor: '#047857',
        sourceLang: 'it',
        targetLang: 'ar',
        unreadCount: 1,
        lastMessageTime: '20:41',
        lastOriginalText: 'Il volo è in ritardo di due ore',
        lastTranslatedText: 'الرحلة متأخرة ساعتين، سأصل ليلاً',
        badgeType: 'translated',
        badgeText: '✓ Translated',
        isOnline: false
      },
      {
        id: 'c3',
        contactName: 'Chen Wei',
        avatarText: '陈',
        avatarClass: 'b3',
        countryCode: 'ZH',
        countryBg: '#FEF2F2',
        countryColor: '#B91C1C',
        sourceLang: 'zh',
        targetLang: 'ar',
        unreadCount: 0,
        lastMessageTime: '19:58',
        lastOriginalText: '明天的会议改到十点',
        lastTranslatedText: 'اجتماع الغد تأجّل إلى الساعة العاشرة',
        badgeType: 'translated',
        badgeText: '✓ Translated',
        isOnline: true
      },
      {
        id: 'c4',
        contactName: 'Sofia Almeida',
        avatarText: 'S',
        avatarClass: 'b4',
        countryCode: 'PT',
        countryBg: '#F0FDFA',
        countryColor: '#0F766E',
        sourceLang: 'pt',
        targetLang: 'ar',
        unreadCount: 0,
        lastMessageTime: '18:20',
        lastOriginalText: '🎙 Mensagem de voz · 00:12',
        lastTranslatedText: 'رسالة صوتية مستنسخة بالنبرة الأصلية',
        badgeType: 'cloned',
        badgeText: '🎙 Cloned voice',
        isOnline: false
      },
      {
        id: 'c5',
        contactName: 'Jonas Weber',
        avatarText: 'J',
        avatarClass: 'b1',
        countryCode: 'DE',
        countryBg: '#F8FAFC',
        countryColor: '#334155',
        sourceLang: 'de',
        targetLang: 'ar',
        unreadCount: 0,
        lastMessageTime: 'أمس',
        lastOriginalText: 'Können wir das Protokoll teilen?',
        lastTranslatedText: 'هل يمكننا مشاركة محضر الاجتماع؟',
        badgeType: 'standard',
        badgeText: '',
        isOnline: false
      }
    ];

    const initialMessages = [
      {
        id: 'm1_1',
        chatId: 'c1',
        sender: 'other',
        originalText: 'Hi! Will you be at the studio tomorrow morning?',
        translatedText: 'مرحباً! هل ستكون في الاستوديو صباح الغد؟',
        sourceLang: 'fr',
        targetLang: 'ar',
        timestamp: '2026-10-24T21:05:00Z',
        timeFormatted: '21:05',
        latencyMs: 210,
        isVoice: false,
        voiceDuration: '',
        isCloned: false,
        status: 'read'
      },
      {
        id: 'm1_2',
        chatId: 'c1',
        sender: 'me',
        originalText: 'نعم، سأصل قبل التاسعة بقليل.',
        translatedText: "Yes, I'll be there just before nine.",
        sourceLang: 'ar',
        targetLang: 'fr',
        timestamp: '2026-10-24T21:06:00Z',
        timeFormatted: '21:06',
        latencyMs: 195,
        isVoice: true,
        voiceDuration: '00:04',
        isCloned: true,
        status: 'read'
      },
      {
        id: 'm1_3',
        chatId: 'c1',
        sender: 'other',
        originalText: "Parfait 🙌 je t'envoie le dossier.",
        translatedText: 'ممتاز 🙌 سأرسل لك الملف الآن.',
        sourceLang: 'fr',
        targetLang: 'ar',
        timestamp: '2026-10-24T21:07:00Z',
        timeFormatted: '21:07',
        latencyMs: 240,
        isVoice: false,
        voiceDuration: '',
        isCloned: false,
        status: 'read'
      }
    ];

    const initialSettings = {
      id: 'settings_global',
      myLanguage: 'ar',
      autoPlayVoice: true,
      zeroShotCloningEnabled: true,
      freeWordsLimit: 500,
      wordsUsedToday: 128,
      audioMinutesLimit: 10,
      audioMinutesUsed: 4,
      plan: 'free',
      latencyTargetMs: 250
    };

    const initialVoiceProfiles = [
      {
        id: 'vp_default',
        userName: 'أيوب',
        sampleText: 'صباح الخير، اسمي أيوب وأعمل في مجال التصميم. أحبّ أن أشارك الأفكار مع زملائي في فريق المنتج كل صباح.',
        sampleDurationSeconds: 10,
        pitch: 1.05,
        rate: 0.98,
        timbreScore: 98.4,
        noiseLevel: 'منخفض',
        createdDate: new Date().toISOString(),
        isActive: true
      }
    ];

    const initialVocabulary = [
      {
        id: 'v1',
        originalWord: 'le dossier',
        translatedWord: 'الملف / المستند',
        sourceLang: 'fr',
        targetLang: 'ar',
        contextSentence: "Parfait 🙌 je t'envoie le dossier.",
        mastered: false,
        addedAt: new Date().toISOString()
      },
      {
        id: 'v2',
        originalWord: 'ritardo',
        translatedWord: 'تأخير',
        sourceLang: 'it',
        targetLang: 'ar',
        contextSentence: 'Il volo è in ritardo di due ore',
        mastered: true,
        addedAt: new Date().toISOString()
      },
      {
        id: 'v3',
        originalWord: '会议',
        translatedWord: 'اجتماع',
        sourceLang: 'zh',
        targetLang: 'ar',
        contextSentence: '明天的会议改到十点',
        mastered: false,
        addedAt: new Date().toISOString()
      }
    ];

    initialChats.forEach(c => this._data['Chat'].set(c.id, c));
    initialMessages.forEach(m => this._data['Message'].set(m.id, m));
    this._data['Settings'].set(initialSettings.id, initialSettings);
    initialVoiceProfiles.forEach(vp => this._data['VoiceProfile'].set(vp.id, vp));
    initialVocabulary.forEach(v => this._data['Vocabulary'].set(v.id, v));

    await this._persist();
  }
}

// Global Schema Definitions
const RealmSchemas = {
  ChatSchema: {
    name: 'Chat',
    primaryKey: 'id',
    properties: {
      id: 'string',
      contactName: 'string',
      avatarText: 'string',
      avatarClass: 'string',
      countryCode: 'string',
      countryBg: 'string',
      countryColor: 'string',
      sourceLang: 'string',
      targetLang: 'string',
      unreadCount: 'int',
      lastMessageTime: 'string',
      lastOriginalText: 'string',
      lastTranslatedText: 'string',
      badgeType: 'string',
      badgeText: 'string',
      isOnline: 'bool'
    }
  },
  MessageSchema: {
    name: 'Message',
    primaryKey: 'id',
    properties: {
      id: 'string',
      chatId: 'string',
      sender: 'string',
      originalText: 'string',
      translatedText: 'string',
      sourceLang: 'string',
      targetLang: 'string',
      timestamp: 'string',
      timeFormatted: 'string',
      latencyMs: 'int',
      isVoice: 'bool',
      voiceDuration: 'string',
      isCloned: 'bool',
      status: 'string'
    }
  },
  SettingsSchema: {
    name: 'Settings',
    primaryKey: 'id',
    properties: {
      id: 'string',
      myLanguage: 'string',
      autoPlayVoice: 'bool',
      zeroShotCloningEnabled: 'bool',
      freeWordsLimit: 'int',
      wordsUsedToday: 'int',
      audioMinutesLimit: 'int',
      audioMinutesUsed: 'int',
      plan: 'string',
      latencyTargetMs: 'int'
    }
  },
  VoiceProfileSchema: {
    name: 'VoiceProfile',
    primaryKey: 'id',
    properties: {
      id: 'string',
      userName: 'string',
      sampleText: 'string',
      sampleDurationSeconds: 'int',
      pitch: 'float',
      rate: 'float',
      timbreScore: 'float',
      noiseLevel: 'string',
      createdDate: 'string',
      isActive: 'bool'
    }
  },
  VocabularySchema: {
    name: 'Vocabulary',
    primaryKey: 'id',
    properties: {
      id: 'string',
      originalWord: 'string',
      translatedWord: 'string',
      sourceLang: 'string',
      targetLang: 'string',
      contextSentence: 'string',
      mastered: 'bool',
      addedAt: 'string'
    }
  }
};

window.Realm = Realm;
window.RealmSchemas = RealmSchemas;
