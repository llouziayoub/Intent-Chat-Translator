/**
 * Intent Chat Translator - Main Application Controller
 * Connects Realm DB, Translation Engine, Audio Engine and UI.
 */

let realm = null;
let translationEngine = null;
let audioEngine = null;

let activeChatId = 'c1';
let activeLongPressMsgId = null;
let longPressTimer = null;
let isF2FRecordingTop = false;
let isF2FRecordingBottom = false;
let vcCountdownInterval = null;
let vcRemainingSeconds = 10;
let callInterval = null;

// DOM Ready initialization
document.addEventListener('DOMContentLoaded', async () => {
  initClock();
  await initDatabase();
  initEngines();
  initNavigation();
  initChatList();
  initConversationEvents();
  initFaceToFaceEvents();
  initLiveCaptionsEvents();
  initVoiceCloneEvents();
  initToolsEvents();
  initBillingEvents();
  initCallEvents();
});

// Update system clock
function initClock() {
  const clockEl = document.getElementById('statusBarClock');
  const update = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${h}:${m}`;
  };
  update();
  setInterval(update, 30000);
}

// 1. Initialize Local Embedded Realm DB
async function initDatabase() {
  try {
    realm = await Realm.open({
      schema: [
        RealmSchemas.ChatSchema,
        RealmSchemas.MessageSchema,
        RealmSchemas.SettingsSchema,
        RealmSchemas.VoiceProfileSchema,
        RealmSchemas.VocabularySchema
      ],
      schemaVersion: 1
    });

    // Setup reactive listeners
    realm.addListener('Chat', () => renderChatList());
    realm.addListener('Message', () => {
      if (document.getElementById('viewConversation').classList.contains('active')) {
        renderMessages(activeChatId);
      }
    });
    realm.addListener('Vocabulary', () => renderVocabularyList());
  } catch (err) {
    console.error('Failed to initialize Realm DB:', err);
  }
}

// 2. Initialize Translation & Audio Engines
function initEngines() {
  translationEngine = new TranslationEngine();
  audioEngine = new AudioEngine();
}

// 3. Screen Navigation
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const screens = document.querySelectorAll('.screen-view');
  const statusBar = document.getElementById('systemStatusBar');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-target');
      showScreen(targetId);

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  document.getElementById('openVoiceCloneBtn').addEventListener('click', () => {
    showScreen('viewVoiceClone');
    updateBottomNavActive('viewVoiceClone');
  });

  document.getElementById('openTurboBtn').addEventListener('click', () => {
    openTurboModal();
  });

  document.getElementById('backToChatListBtn').addEventListener('click', () => {
    showScreen('viewChatList');
    updateBottomNavActive('viewChatList');
  });

  document.getElementById('backFromVoiceCloneBtn').addEventListener('click', () => {
    showScreen('viewChatList');
    updateBottomNavActive('viewChatList');
  });
}

function showScreen(screenId) {
  const screens = document.querySelectorAll('.screen-view');
  const statusBar = document.getElementById('systemStatusBar');

  screens.forEach(s => s.classList.remove('active'));
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
  }

  // Dark status bar for dark-themed screens
  if (screenId === 'viewFaceToFace' || screenId === 'viewLiveCaptions' || screenId === 'viewCall') {
    statusBar.classList.add('dark-theme');
  } else {
    statusBar.classList.remove('dark-theme');
  }

  // Refresh data on screen switch
  if (screenId === 'viewChatList') renderChatList();
  if (screenId === 'viewConversation') renderMessages(activeChatId);
  if (screenId === 'viewTools') renderVocabularyList();
}

function updateBottomNavActive(screenId) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(n => {
    if (n.getAttribute('data-target') === screenId) {
      n.classList.add('active');
    } else {
      n.classList.remove('active');
    }
  });
}

// ================= 4. CHAT LIST LOGIC =================
function initChatList() {
  renderChatList();

  const searchInput = document.getElementById('chatSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderChatList(e.target.value.trim().toLowerCase());
    });
  }

  const tabs = document.querySelectorAll('.top-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabType = tab.getAttribute('data-tab');
      if (tabType === 'live') {
        showScreen('viewFaceToFace');
        updateBottomNavActive('viewFaceToFace');
      } else if (tabType === 'calls') {
        startVoipCall('c1');
      } else {
        renderChatList();
      }
    });
  });
}

function renderChatList(filterQuery = '') {
  const container = document.getElementById('chatListContainer');
  if (!container || !realm) return;

  const chats = realm.objects('Chat');
  let filtered = chats;

  if (filterQuery) {
    filtered = chats.filter(c =>
      c.contactName.toLowerCase().includes(filterQuery) ||
      c.lastOriginalText.toLowerCase().includes(filterQuery) ||
      c.lastTranslatedText.toLowerCase().includes(filterQuery) ||
      c.countryCode.toLowerCase().includes(filterQuery)
    );
  }

  container.innerHTML = '';
  filtered.forEach(chat => {
    const row = document.createElement('div');
    row.className = `chat-row ${chat.unreadCount > 0 ? 'unread' : ''}`;
    row.onclick = () => openChat(chat.id);

    const badgeHtml = chat.badgeType === 'translated'
      ? `<span class="translated-badge">✓ Translated</span>`
      : (chat.badgeType === 'cloned'
        ? `<span class="translated-badge" style="color:#7C3AED;background:#F5F3FF;border-color:#DDD6FE">🎙 Cloned voice</span>`
        : '');

    row.innerHTML = `
      <div class="contact-pic ${chat.avatarClass}">
        ${chat.avatarText}
        <span class="flag-tag" style="color:${chat.countryColor};background:${chat.countryBg}">
          ${chat.countryCode}
        </span>
      </div>
      <div class="row-content">
        <div class="row-header">
          <div class="contact-name">${chat.contactName}</div>
          <div class="msg-time">${chat.lastMessageTime}</div>
        </div>
        <div class="dual-preview">
          <div class="preview-orig">${chat.lastOriginalText}</div>
          <div class="preview-trans">${chat.lastTranslatedText}</div>
        </div>
        <div class="row-chips">
          <span class="lang-chip">${chat.sourceLang.toUpperCase()}</span>
          <span class="lang-chip">→</span>
          <span class="lang-chip">${chat.targetLang.toUpperCase()}</span>
          ${badgeHtml}
        </div>
      </div>
      ${chat.unreadCount > 0 ? `<div class="unread-badge">${chat.unreadCount}</div>` : ''}
    `;

    container.appendChild(row);
  });
}

function openChat(chatId) {
  activeChatId = chatId;
  const chat = realm.objectForPrimaryKey('Chat', chatId);
  if (!chat) return;

  // Mark as read in Realm
  realm.write(() => {
    chat.unreadCount = 0;
  });

  // Set chat header
  document.getElementById('activeChatName').textContent = chat.contactName;
  document.getElementById('activeChatAvatarText').textContent = chat.avatarText;
  document.getElementById('activeChatFlag').textContent = chat.countryCode;
  document.getElementById('activeChatFlag').style.color = chat.countryColor;
  document.getElementById('activeChatFlag').style.background = chat.countryBg;

  // Set composer language tags
  const srcLang = translationEngine.getLanguage(chat.targetLang);
  const tgtLang = translationEngine.getLanguage(chat.sourceLang);
  document.getElementById('composerSourceLangBtn').textContent = srcLang.name;
  document.getElementById('composerTargetLangBtn').textContent = tgtLang.native;

  showScreen('viewConversation');
  renderMessages(chatId);
}

// ================= 5. CONVERSATION LOGIC =================
function initConversationEvents() {
  const sendBtn = document.getElementById('composerSendBtn');
  const textInput = document.getElementById('composerTextInput');
  const micBtn = document.getElementById('composerMicBtn');

  const handleSend = async () => {
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = '';

    await sendUserMessage(text);
  };

  sendBtn.addEventListener('click', handleSend);
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  // Voice recording button in composer
  let isRec = false;
  micBtn.addEventListener('click', () => {
    if (!isRec) {
      isRec = true;
      micBtn.classList.add('recording');
      audioEngine.playBeep(520, 0.1);

      const started = audioEngine.startSpeechRecognition('ar', (transcript, isFinal) => {
        textInput.value = transcript;
        if (isFinal) {
          micBtn.classList.remove('recording');
          isRec = false;
          handleSend();
        }
      });

      // If speech recognition isn't allowed, simulate voice speech
      if (!started) {
        setTimeout(async () => {
          micBtn.classList.remove('recording');
          isRec = false;
          await sendUserMessage('سأصل إلى موقع الاجتماع خلال دقائق.', true, '00:05');
        }, 3000);
      }
    } else {
      isRec = false;
      micBtn.classList.remove('recording');
      audioEngine.stopSpeechRecognition();
      if (textInput.value.trim()) handleSend();
    }
  });

  // Context Menu items
  document.getElementById('lpViewOriginal').addEventListener('click', () => {
    closeLongPressMenu();
    if (!activeLongPressMsgId) return;
    const msg = realm.objectForPrimaryKey('Message', activeLongPressMsgId);
    if (msg) {
      document.getElementById('fullOrigContent').textContent = msg.originalText;
      document.getElementById('fullOrigModal').classList.add('active');
    }
  });

  document.getElementById('lpRegenVoice').addEventListener('click', () => {
    closeLongPressMenu();
    if (!activeLongPressMsgId) return;
    const msg = realm.objectForPrimaryKey('Message', activeLongPressMsgId);
    if (msg) {
      regenerateVoiceMessage(msg);
    }
  });

  document.getElementById('lpManualEdit').addEventListener('click', () => {
    closeLongPressMenu();
    if (!activeLongPressMsgId) return;
    const msg = realm.objectForPrimaryKey('Message', activeLongPressMsgId);
    if (msg) {
      document.getElementById('editModalOrigText').textContent = msg.originalText;
      document.getElementById('editModalTransInput').value = msg.translatedText;
      document.getElementById('editTransModal').classList.add('active');
    }
  });

  document.getElementById('lpTranslateThird').addEventListener('click', async () => {
    closeLongPressMenu();
    if (!activeLongPressMsgId) return;
    const msg = realm.objectForPrimaryKey('Message', activeLongPressMsgId);
    if (!msg) return;

    const thirdLang = prompt('اختر رمز اللغة الثالثة (es, en, de, it, ru):', 'es');
    if (thirdLang) {
      const res = await translationEngine.translate(msg.originalText, msg.sourceLang, thirdLang);
      realm.write(() => {
        msg.translatedText = res.text;
        msg.targetLang = thirdLang;
      });
      renderMessages(activeChatId);
    }
  });

  document.getElementById('lpSaveVocab').addEventListener('click', () => {
    closeLongPressMenu();
    if (!activeLongPressMsgId) return;
    const msg = realm.objectForPrimaryKey('Message', activeLongPressMsgId);
    if (msg) {
      realm.write(() => {
        realm.create('Vocabulary', {
          id: 'v_' + Date.now(),
          originalWord: msg.originalText.slice(0, 30),
          translatedWord: msg.translatedText.slice(0, 30),
          sourceLang: msg.sourceLang,
          targetLang: msg.targetLang,
          contextSentence: msg.originalText,
          mastered: false,
          addedAt: new Date().toISOString()
        });
      });
      alert('✓ تم حفظ المفردة في دفتر المفردات المخصص!');
    }
  });

  // Close menus on outside click
  document.addEventListener('click', (e) => {
    const lpMenu = document.getElementById('longPressMenu');
    if (lpMenu && !lpMenu.contains(e.target) && !e.target.closest('.bubble-box')) {
      closeLongPressMenu();
    }
  });
}

function renderMessages(chatId) {
  const stream = document.getElementById('messagesStream');
  if (!stream || !realm) return;

  const messages = realm.objects('Message')
    .filtered(`chatId == '${chatId}'`)
    .sorted('timestamp', false);

  // Keep day separator
  stream.innerHTML = '<div class="day-separator">اليوم</div>';

  messages.forEach(msg => {
    const msgEl = document.createElement('div');
    const isOut = msg.sender === 'me';
    msgEl.className = `chat-msg ${isOut ? 'msg-outgoing' : 'msg-incoming'}`;

    let voiceBarHtml = '';
    if (msg.isVoice) {
      voiceBarHtml = `
        <div class="bubble-voicebar">
          <button class="voicebar-play-btn" onclick="playVoiceMessage('${msg.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <div class="bubble-wave" id="wave_${msg.id}">
            <i style="height:8px" class="active-bar"></i>
            <i style="height:15px" class="active-bar"></i>
            <i style="height:10px" class="active-bar"></i>
            <i style="height:18px" class="active-bar"></i>
            <i style="height:7px"></i>
            <i style="height:14px"></i>
            <i style="height:9px"></i>
            <i style="height:16px"></i>
            <i style="height:6px"></i>
            <i style="height:12px"></i>
          </div>
          <span style="font-size:10px;font-weight:800">${msg.voiceDuration || '00:04'}</span>
        </div>
      `;
    }

    const badgeLabel = isOut
      ? (msg.isCloned ? '🎙 نسختك الصوتية' : '✦ صادر')
      : `✦ Translated · ${msg.sourceLang.toUpperCase()} → ${msg.targetLang.toUpperCase()} · ${msg.latencyMs} مللي ثانية`;

    msgEl.innerHTML = `
      <div class="bubble-box" id="msgbox_${msg.id}">
        <div class="msg-orig" dir="${msg.sourceLang === 'ar' ? 'rtl' : 'ltr'}">${msg.originalText}</div>
        <div class="msg-trans" dir="${msg.targetLang === 'ar' ? 'rtl' : 'ltr'}">${msg.translatedText}</div>
        ${voiceBarHtml}
        <div class="msg-meta">
          <span class="meta-badge">${badgeLabel}</span>
          <span>${msg.timeFormatted}</span>
          ${isOut ? '<span>✓✓</span>' : ''}
        </div>
      </div>
    `;

    // Long press listener
    const box = msgEl.querySelector('.bubble-box');
    setupLongPress(box, msg.id);

    stream.appendChild(msgEl);
  });

  // Auto scroll to bottom
  stream.scrollTop = stream.scrollHeight;
}

function setupLongPress(element, msgId) {
  let pressTimer = null;

  const startPress = (e) => {
    pressTimer = setTimeout(() => {
      openLongPressMenu(msgId, element);
    }, 450);
  };

  const cancelPress = () => {
    if (pressTimer) clearTimeout(pressTimer);
  };

  element.addEventListener('mousedown', startPress);
  element.addEventListener('mouseup', cancelPress);
  element.addEventListener('mouseleave', cancelPress);
  element.addEventListener('touchstart', startPress, { passive: true });
  element.addEventListener('touchend', cancelPress);
}

function openLongPressMenu(msgId, targetEl) {
  activeLongPressMsgId = msgId;
  const menu = document.getElementById('longPressMenu');
  if (!menu) return;

  targetEl.parentElement.appendChild(menu);
  menu.classList.add('visible');
  audioEngine.playBeep(480, 0.08);
}

function closeLongPressMenu() {
  const menu = document.getElementById('longPressMenu');
  if (menu) menu.classList.remove('visible');
}

async function sendUserMessage(text, isVoice = false, voiceDuration = '') {
  const chat = realm.objectForPrimaryKey('Chat', activeChatId);
  if (!chat) return;

  const srcLang = chat.targetLang || 'ar'; // My language (ar)
  const tgtLang = chat.sourceLang || 'fr'; // Their language (fr)

  // Real-time Neural Translation (< 250ms target)
  const translationResult = await translationEngine.translate(text, srcLang, tgtLang);

  const now = new Date();
  const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newMsg = {
    id: 'm_' + Date.now(),
    chatId: activeChatId,
    sender: 'me',
    originalText: text,
    translatedText: translationResult.text,
    sourceLang: srcLang,
    targetLang: tgtLang,
    timestamp: now.toISOString(),
    timeFormatted: timeFormatted,
    latencyMs: translationResult.latencyMs,
    isVoice: isVoice,
    voiceDuration: voiceDuration,
    isCloned: isVoice,
    status: 'sent'
  };

  realm.write(() => {
    realm.create('Message', newMsg);
    chat.lastMessageTime = timeFormatted;
    chat.lastOriginalText = text;
    chat.lastTranslatedText = translationResult.text;

    // Deduct words from usage
    const settings = realm.objectForPrimaryKey('Settings', 'settings_global');
    if (settings) {
      settings.wordsUsedToday += text.split(/\s+/).length;
    }
  });

  renderMessages(activeChatId);

  // Simulate contact automatic reply after 1.8 seconds
  setTimeout(() => {
    simulateContactReply(chat);
  }, 1800);
}

async function simulateContactReply(chat) {
  const replies = {
    c1: [
      { orig: "Parfait 🙌 je t'envoie le dossier.", trans: "ممتاز 🙌 سأرسل لك الملف الآن." },
      { orig: "Très bien, à tout de suite !", trans: "جيد جداً، أراك بعد قليل!" }
    ],
    c2: [
      { orig: "Grazie mille per l'aggiornamento.", trans: "شكراً جزيلاً لك على التحديث." }
    ],
    c3: [
      { orig: "好的，收到！明天见。", trans: "حسناً، تم الاستلام! أراك غداً." }
    ]
  };

  const pool = replies[chat.id] || [{ orig: "D'accord, merci !", trans: "حسناً، شكراً لك!" }];
  const picked = pool[Math.floor(Math.random() * pool.length)];

  const now = new Date();
  const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const incomingMsg = {
    id: 'm_' + Date.now(),
    chatId: chat.id,
    sender: 'other',
    originalText: picked.orig,
    translatedText: picked.trans,
    sourceLang: chat.sourceLang,
    targetLang: chat.targetLang,
    timestamp: now.toISOString(),
    timeFormatted: timeFormatted,
    latencyMs: Math.floor(Math.random() * 50) + 180,
    isVoice: false,
    voiceDuration: '',
    isCloned: false,
    status: 'read'
  };

  realm.write(() => {
    realm.create('Message', incomingMsg);
    chat.lastMessageTime = timeFormatted;
    chat.lastOriginalText = picked.orig;
    chat.lastTranslatedText = picked.trans;
    chat.unreadCount = 0;
  });

  audioEngine.playBeep(680, 0.12);
  renderMessages(chat.id);
}

function playVoiceMessage(msgId) {
  const msg = realm.objectForPrimaryKey('Message', msgId);
  if (!msg) return;

  const vp = realm.objectForPrimaryKey('VoiceProfile', 'vp_default');
  const waveContainer = document.getElementById(`wave_${msgId}`);

  let waveInterval = null;
  if (waveContainer) {
    const bars = waveContainer.querySelectorAll('i');
    waveInterval = setInterval(() => {
      bars.forEach(b => {
        b.style.height = `${Math.floor(Math.random() * 16) + 4}px`;
      });
    }, 100);
  }

  // Play translated text in target voice with cloned audio profile
  audioEngine.speakText(msg.translatedText, msg.targetLang, vp, () => {
    if (waveInterval) clearInterval(waveInterval);
  });
}

function regenerateVoiceMessage(msg) {
  alert('جارٍ إعادة استنساخ البصمة الصوتية بالنبرة والتواتر...');
  playVoiceMessage(msg.id);
}

function saveManualTranslation() {
  const newTrans = document.getElementById('editModalTransInput').value.trim();
  if (!newTrans || !activeLongPressMsgId) return;

  const msg = realm.objectForPrimaryKey('Message', activeLongPressMsgId);
  if (msg) {
    realm.write(() => {
      msg.translatedText = newTrans;
    });
    renderMessages(activeChatId);
  }
  closeEditTransModal();
}

function closeEditTransModal() {
  document.getElementById('editTransModal').classList.remove('active');
}

function closeFullOrigModal() {
  document.getElementById('fullOrigModal').classList.remove('active');
}

// ================= 6. FACE TO FACE (180° INVERTED) LOGIC =================
function initFaceToFaceEvents() {
  const topMic = document.getElementById('f2fTopMicBtn');
  const bottomMic = document.getElementById('f2fBottomMicBtn');
  const swapBtn = document.getElementById('f2fSwapBtn');

  topMic.addEventListener('click', () => {
    toggleF2FSpeech('top');
  });

  bottomMic.addEventListener('click', () => {
    toggleF2FSpeech('bottom');
  });

  swapBtn.addEventListener('click', () => {
    const topFlag = document.getElementById('f2fTopFlag').textContent;
    const topLang = document.getElementById('f2fTopLangText').textContent;
    const bottomFlag = document.getElementById('f2fBottomFlag').textContent;
    const bottomLang = document.getElementById('f2fBottomLangText').textContent;

    document.getElementById('f2fTopFlag').textContent = bottomFlag;
    document.getElementById('f2fTopLangText').textContent = bottomLang;
    document.getElementById('f2fBottomFlag').textContent = topFlag;
    document.getElementById('f2fBottomLangText').textContent = topLang;
    audioEngine.playBeep(450, 0.1);
  });
}

async function toggleF2FSpeech(side) {
  if (side === 'top') {
    const mic = document.getElementById('f2fTopMicBtn');
    isF2FRecordingTop = !isF2FRecordingTop;
    if (isF2FRecordingTop) {
      mic.classList.add('active-recording');
      animateWave('f2fTopWave', true);
      audioEngine.playBeep(520, 0.1);

      // Simulate French speech recognition & instant Arabic translation
      setTimeout(() => {
        document.getElementById('f2fTopText').innerHTML = `
          Le vol de demain est confirmé à neuf heures.
          <small>ترجمة: الرحلة غداً مؤكدة في التاسعة صباحاً</small>
        `;
        document.getElementById('f2fBottomText').innerHTML = `
          الرحلة غداً مؤكدة في التاسعة صباحاً
          <small dir="ltr">Le vol de demain est confirmé à 9h00.</small>
        `;
        audioEngine.speakText('الرحلة غداً مؤكدة في التاسعة صباحاً', 'ar');
        mic.classList.remove('active-recording');
        animateWave('f2fTopWave', false);
        isF2FRecordingTop = false;
      }, 2500);
    }
  } else {
    const mic = document.getElementById('f2fBottomMicBtn');
    isF2FRecordingBottom = !isF2FRecordingBottom;
    if (isF2FRecordingBottom) {
      mic.classList.add('active-recording');
      animateWave('f2fBottomWave', true);
      audioEngine.playBeep(520, 0.1);

      setTimeout(() => {
        document.getElementById('f2fBottomText').innerHTML = `
          هل وصلت إلى المطار؟ سأنتظرك عند المخرج.
          <small dir="ltr">Did you arrive at the airport? I'll wait at the exit.</small>
        `;
        document.getElementById('f2fTopText').innerHTML = `
          Es-tu arrivé à l'aéroport ? Je t'attendrai à la sortie.
          <small>ترجمة: هل وصلت إلى المطار؟ سأنتظرك عند المخرج.</small>
        `;
        audioEngine.speakText("Es-tu arrivé à l'aéroport ? Je t'attendrai à la sortie.", 'fr');
        mic.classList.remove('active-recording');
        animateWave('f2fBottomWave', false);
        isF2FRecordingBottom = false;
      }, 2500);
    }
  }
}

function animateWave(waveId, active) {
  const wave = document.getElementById(waveId);
  if (!wave) return;
  const bars = wave.querySelectorAll('i');
  if (active) {
    wave._interval = setInterval(() => {
      bars.forEach(b => {
        const h = Math.floor(Math.random() * 24) + 6;
        b.style.height = `${h}px`;
        b.classList.toggle('active-peak', h > 16);
      });
    }, 110);
  } else {
    if (wave._interval) clearInterval(wave._interval);
    bars.forEach(b => {
      b.style.height = '10px';
      b.classList.remove('active-peak');
    });
  }
}

// ================= 7. LIVE CAPTIONS / MEETING LOGIC =================
function initLiveCaptionsEvents() {
  const waveLine = document.getElementById('capsWaveLine');
  const bars = waveLine.querySelectorAll('i');

  // Continuous subtle live equalizing
  setInterval(() => {
    bars.forEach(b => {
      b.style.height = `${Math.floor(Math.random() * 26) + 6}px`;
    });
  }, 150);

  document.getElementById('capsStopBtn').addEventListener('click', () => {
    alert('تم إنهاء جلسة التفريغ المباشر وتوثيق المحضر بنجاح.');
  });

  document.getElementById('capsExportBtn').addEventListener('click', () => {
    const text = `
Intent - Live Captions Export
اجتماع فريق المنتج · الربع الرابع
Google Meet · 00:42:18

Amina (Product Lead):
- EN: We need to lock the release date before Friday.
- AR: علينا تثبيت تاريخ الإصدار قبل يوم الجمعة.

Marco (Engineering):
- EN: The beta build is ready — latency is now under 800 ms.
- AR: نسخة البيتا جاهزة الآن، وزمن التأخير انخفض إلى أقل من 800 مللي ثانية.
    `.trim();

    downloadTextFile('Intent_Meeting_Captions.txt', text);
  });
}

// ================= 8. ZERO-SHOT VOICE CLONING WIZARD LOGIC =================
function initVoiceCloneEvents() {
  const ring = document.getElementById('vcRecordRing');
  const resetBtn = document.getElementById('vcResetBtn');
  const saveBtn = document.getElementById('vcSaveProfileBtn');

  ring.addEventListener('click', () => {
    startVoiceCloneRecording();
  });

  resetBtn.addEventListener('click', () => {
    resetVoiceClone();
  });

  saveBtn.addEventListener('click', () => {
    saveVoiceProfile();
  });
}

function startVoiceCloneRecording() {
  if (vcCountdownInterval) return;

  vcRemainingSeconds = 10;
  const timerDisplay = document.getElementById('vcTimerDisplay');
  const statusText = document.getElementById('vcStatusText');
  statusText.textContent = 'جارٍ التسجيل...';
  audioEngine.playBeep(600, 0.15);

  vcCountdownInterval = setInterval(() => {
    vcRemainingSeconds--;
    timerDisplay.textContent = `00:${String(vcRemainingSeconds).padStart(2, '0')}`;

    if (vcRemainingSeconds <= 0) {
      clearInterval(vcCountdownInterval);
      vcCountdownInterval = null;
      statusText.textContent = 'تم التقاط البصمة!';
      document.getElementById('vcNoiseText').textContent = 'تحليل النبرة: 98.4% دقة مطابقة';
      audioEngine.playBeep(880, 0.2);
    }
  }, 1000);
}

function resetVoiceClone() {
  if (vcCountdownInterval) {
    clearInterval(vcCountdownInterval);
    vcCountdownInterval = null;
  }
  vcRemainingSeconds = 10;
  document.getElementById('vcTimerDisplay').textContent = '00:10';
  document.getElementById('vcStatusText').textContent = 'اضغط للتسجيل';
}

function saveVoiceProfile() {
  realm.write(() => {
    realm.create('VoiceProfile', {
      id: 'vp_default',
      userName: 'أيوب',
      sampleText: document.getElementById('vcSampleSentence').textContent.trim(),
      sampleDurationSeconds: 10,
      pitch: 1.05,
      rate: 1.0,
      timbreScore: 98.4,
      noiseLevel: 'منخفض',
      createdDate: new Date().toISOString(),
      isActive: true
    });
  });

  alert('✓ تم حفظ البصمة الصوتية بنجاح! سيتم استخدام نبرتك الأصلية في جميع الرسائل والمكالمات.');
  showScreen('viewChatList');
  updateBottomNavActive('viewChatList');
}

window.previewClonedVoice = function(lang, text) {
  const vp = realm.objectForPrimaryKey('VoiceProfile', 'vp_default');
  audioEngine.speakText(text, lang, vp);
};

// ================= 9. PRODUCTIVITY TOOLS LOGIC =================
function initToolsEvents() {
  // Document translator
  const dropzone = document.getElementById('docDropzone');
  const fileInput = document.getElementById('docFileInput');

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      setTimeout(() => {
        document.getElementById('docTranslateResult').style.display = 'block';
      }, 1000);
    }
  });

  // Currency Converter
  const amountInput = document.getElementById('currAmount');
  const fromSelect = document.getElementById('currFrom');
  const toSelect = document.getElementById('currTo');
  const resultInput = document.getElementById('currResult');

  const rates = {
    USD: 1.0,
    EUR: 0.92,
    SAR: 3.75,
    AED: 3.67,
    GBP: 0.79
  };

  const updateCurrency = () => {
    const amount = parseFloat(amountInput.value) || 0;
    const fromRate = rates[fromSelect.value] || 1;
    const toRate = rates[toSelect.value] || 1;
    const usd = amount / fromRate;
    const converted = usd * toRate;
    resultInput.value = converted.toFixed(2);
  };

  amountInput.addEventListener('input', updateCurrency);
  fromSelect.addEventListener('change', updateCurrency);
  toSelect.addEventListener('change', updateCurrency);
}

function renderVocabularyList() {
  const container = document.getElementById('vocabItemsContainer');
  if (!container || !realm) return;

  const vocabItems = realm.objects('Vocabulary');
  container.innerHTML = '';

  vocabItems.forEach(v => {
    const item = document.createElement('div');
    item.className = 'vocab-item';
    item.innerHTML = `
      <div>
        <b style="font-size:13px;color:var(--navy)">${v.originalWord}</b>
        <span style="font-size:12px;color:#2563EB;margin-right:6px">→ ${v.translatedWord}</span>
        <div style="font-size:10px;color:#94A3B8;margin-top:2px">${v.sourceLang.toUpperCase()} · ${v.targetLang.toUpperCase()}</div>
      </div>
      <button onclick="playVocabAudio('${v.originalWord}', '${v.sourceLang}')" style="background:#EFF4FF;border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;color:#2563EB">
        🔊
      </button>
    `;
    container.appendChild(item);
  });
}

window.playVocabAudio = function(word, lang) {
  audioEngine.speakText(word, lang);
};

window.downloadTranslatedDoc = function() {
  downloadTextFile('Intent_Translated_Document.txt', 'هذا هو المستند المترجم بالكامل بواسطة Intent NMT Engine.');
};

window.generateSampleSRT = function() {
  const srtContent = `
1
00:00:01,000 --> 00:00:04,500
مرحباً بكم في Intent مترجم المحادثات الفوري

2
00:00:05,000 --> 00:00:09,000
الترجمة بدقة فائقة وبزمن استجابة أقل من 250 مللي ثانية
  `.trim();
  downloadTextFile('captions.srt', srtContent);
};

// ================= 10. BILLING & TURBO LOGIC =================
function initBillingEvents() {
  updateTurboUI();
}

function openTurboModal() {
  updateTurboUI();
  document.getElementById('turboModal').classList.add('active');
}

function closeTurboModal() {
  document.getElementById('turboModal').classList.remove('active');
}

function updateTurboUI() {
  if (!realm) return;
  const settings = realm.objectForPrimaryKey('Settings', 'settings_global');
  if (!settings) return;

  document.getElementById('turboWordsUsed').textContent = settings.wordsUsedToday;
  document.getElementById('turboWordsLimit').textContent = settings.freeWordsLimit;
  document.getElementById('turboAudioUsed').textContent = settings.audioMinutesUsed;

  const pct = Math.min(100, (settings.wordsUsedToday / settings.freeWordsLimit) * 100);
  document.getElementById('turboProgressBar').style.width = `${pct}%`;
}

window.selectPlan = function(el, planType) {
  document.querySelectorAll('.plan-card').forEach(p => p.classList.remove('active-plan'));
  el.classList.add('active-plan');
};

window.confirmTurboUpgrade = function() {
  realm.write(() => {
    const s = realm.objectForPrimaryKey('Settings', 'settings_global');
    if (s) {
      s.plan = 'turbo_annual';
      s.freeWordsLimit = 999999;
      s.audioMinutesLimit = 999999;
    }
  });
  alert('🎉 تهانينا! تمت ترقية حسابك إلى Intent Turbo بنجاح.');
  closeTurboModal();
  updateTurboUI();
};

// ================= 11. VOIP CALL LOGIC =================
function initCallEvents() {
  document.getElementById('startCallBtn').addEventListener('click', () => {
    startVoipCall(activeChatId);
  });

  document.getElementById('callEndBtn').addEventListener('click', () => {
    endVoipCall();
  });
}

function startVoipCall(chatId) {
  const chat = realm.objectForPrimaryKey('Chat', chatId);
  if (!chat) return;

  document.getElementById('callTargetName').textContent = chat.contactName;
  document.getElementById('callAvatarLetter').textContent = chat.avatarText;

  showScreen('viewCall');
  audioEngine.playBeep(440, 0.3);

  // Live call speech dubbing simulation
  callInterval = setInterval(() => {
    audioEngine.speakText('نعم، أسمعك بوضوح تام بنبرتك الأصلية.', 'ar');
  }, 6000);
}

function endVoipCall() {
  if (callInterval) clearInterval(callInterval);
  audioEngine.stopSpeaking();
  showScreen('viewConversation');
}

// Server error banner simulator
window.dismissErrorBanner = function() {
  document.getElementById('serverErrorBanner').classList.remove('visible');
};

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
