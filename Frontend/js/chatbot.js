// ============================================================
// chatbot.js – Floating chatbot widget
// Connects to POST /api/chatbot via ChatbotAPI (api.js)
// ============================================================

// ── In-memory conversation history (kept per page session) ──
const chatHistory = [];
// ── State flags ──────────────────────────────────────────
let isSending = false;

// ── Lazy DOM resolver ──────────────────────────────────────
// Always fetch from DOM on demand — never cache at parse time.
// This eliminates any dependency on DOMContentLoaded timing.
function el(id) { return document.getElementById(id); }

// ── EXTENSION OVERLAY NEUTRALIZER ──────────────────────────
// Root cause: browser extensions like ChatGPT Sidebar inject a fixed
// full-viewport element (e.g. <chatgpt-sidebar>) that intercepts ALL clicks.
// document.elementFromPoint() confirmed this by returning <chatgpt-sidebar>.
//
// Fix strategy:
//   1. Inject a <style> tag that sets pointer-events:none on known extension
//      elements. !important overrides any inline styles the extension set.
//   2. Use a MutationObserver to re-apply the rule if the extension injects
//      its overlay AFTER our script runs (extensions often do this async).

(function neutralizeExtensionOverlays() {
  // Known extension overlay element names (add more if needed)
  var OVERLAY_SELECTORS = [
    'chatgpt-sidebar',
    'chatgpt-sidebar-container',
    'openai-sidebar',
    'ai-sidebar',
    '#chatgpt-sidebar',
    '[id*="chatgpt"]',
    '[class*="chatgpt-sidebar"]',
  ];

  // Inject a <style> block that disables pointer-events on extension overlays
  function injectOverrideStyle() {
    var existing = document.getElementById('__chatbot_override_style');
    if (existing) return; // already injected
    var style = document.createElement('style');
    style.id = '__chatbot_override_style';
    style.textContent = OVERLAY_SELECTORS.join(', ') + ' { pointer-events: none !important; z-index: -1 !important; }';
    document.head.appendChild(style);
    console.log('[Chatbot] Extension overlay neutralizer CSS injected ✔');
  }

  // Run immediately
  injectOverrideStyle();

  // Re-run whenever new elements are injected into the DOM
  // (extensions often inject their overlay 500ms–1s after page load)
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return; // only consider elements
        var tag = node.tagName ? node.tagName.toLowerCase() : '';
        var id  = node.id  ? node.id.toLowerCase()  : '';
        if (tag.includes('chatgpt') || tag.includes('sidebar') || id.includes('chatgpt') || tag.includes('ai-sidebar')) {
          console.warn('[Chatbot] Extension overlay detected and neutralized:', node.tagName);
          node.style.setProperty('pointer-events', 'none', 'important');
          node.style.setProperty('z-index', '-1', 'important');
        }
      });
    });
  });
  
  // Wait for the document to initially be ready so document.documentElement exists
  if(document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
      document.addEventListener('DOMContentLoaded', () => {
           observer.observe(document.documentElement, { childList: true, subtree: true });
      });
  }
})();

// ── Named handlers (named refs allow removeEventListener) ──

function onSendClick() {
  console.log('SEND CLICKED');
  handleSend();
}

function onInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    console.log('SEND CLICKED (Enter key)');
    handleSend();
  }
}

// ── Strategy 1: Direct element binding ─────────────────────
// Called from DOMContentLoaded — attaches directly to each element.
function attachEvents() {
  const sendBtn = el('sendChat');
  const input   = el('chatInput');
  const toggle  = el('chatbotToggle');
  const close   = el('closeChatbot');

  if (sendBtn) {
    sendBtn.removeEventListener('click', onSendClick); // prevent double-bind
    sendBtn.addEventListener('click', onSendClick);
    console.log('[Chatbot] sendChat listener attached directly ✔');
  } else {
    console.warn('[Chatbot] sendChat not found during attachEvents');
  }

  if (input) {
    input.removeEventListener('keydown', onInputKeydown);
    input.addEventListener('keydown', onInputKeydown);
  }

  if (toggle) {
    toggle.removeEventListener('click', openChatbot);
    toggle.addEventListener('click', openChatbot);
  }

  if (close) {
    close.removeEventListener('click', closeChatbot);
    close.addEventListener('click', closeChatbot);
  }
}

// Removed Strategy 2 and Strategy 3 document delegation to prevent duplicate API calls.
// The direct element bindings inside attachEvents() are the ONLY source of truth now.

// ── DOMContentLoaded ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Validate DOM elements
  const required = ['chatbotWindow','chatMessages','chatInput','sendChat','typingIndicator','chatbotToggle','closeChatbot'];
  const missing  = required.filter(id => !el(id));
  if (missing.length) {
    console.warn('[Chatbot] Missing DOM elements:', missing);
  } else {
    console.log('[Chatbot] All DOM elements found ✔');
  }

  // Validate ChatbotAPI
  if (typeof ChatbotAPI === 'undefined') {
    console.error('[Chatbot] FATAL: ChatbotAPI is not defined. Check api.js is loaded before chatbot.js.');
  } else {
    console.log('[Chatbot] ChatbotAPI ready ✔');
  }

  // Attach direct listeners (Strategy 1)
  attachEvents();

  // Welcome message
  appendBotMessage("Hi! I'm LiveLearn AI 🤖 Ask me anything about Maths, Physics, Chemistry, or any academic topic!");
});

// ── Open / Close ──────────────────────────────────────────
function openChatbot() {
  const win = el('chatbotWindow');
  if (!win) return;
  win.classList.remove('hidden');
  win.style.display = 'flex';
  const input = el('chatInput');
  input && input.focus();
}

function closeChatbot() {
  const win = el('chatbotWindow');
  if (!win) return;
  win.classList.add('hidden');
  win.style.display = '';
}

// ── Main send handler ─────────────────────────────────────
async function handleSend() {
  if (isSending) {
    console.warn('[Chatbot] REQUEST BLOCKED (duplicate)');
    return;
  }

  const input   = el('chatInput');
  const message = input ? input.value.trim() : '';
  if (!message) return;

  // Lock the request
  isSending = true;
  console.log('REQUEST SENT');
  console.log('[Chatbot] handleSend triggered, message:', message);

  input.value = '';

  appendUserMessage(message);
  chatHistory.push({ role: 'user', content: message });

  setTyping(true);
  setInputEnabled(false);

  try {
    console.log('[Chatbot] Calling ChatbotAPI.sendMessage...');
    const res   = await ChatbotAPI.sendMessage(message, chatHistory.slice(-6));
    const reply = res && res.data && res.data.reply
      ? res.data.reply
      : "Sorry, I couldn't get a response. Please try again.";

    console.log('[Chatbot] Got reply:', reply.slice(0, 80));

    chatHistory.push({ role: 'assistant', content: reply });
    setTyping(false);
    appendBotMessage(reply);

  } catch (err) {
    setTyping(false);
    console.error('[Chatbot] FULL error object:', err);

    // Fake/missing token
    if (err.isFakeToken) {
      appendErrorMessage('Your session is invalid. Please log out and log in with your real account.');
      const msgs = el('chatMessages');
      if (msgs) {
        const div = document.createElement('div');
        div.className = 'flex justify-center mt-1';
        div.innerHTML = '<a href="login.html" onclick="localStorage.removeItem(\'ll_token\');localStorage.removeItem(\'ll_user\');" class="text-xs text-blue-600 underline">Log out and log in again &rarr;</a>';
        msgs.appendChild(div);
        scrollToBottom();
      }
      return; // "finally" block will re-enable input and release the lock below
    }

    // HTTP / network errors
    var status = err && err.response ? err.response.status : null;
    if (status === 401) {
      appendErrorMessage('Session expired. Redirecting to login...');
    } else if (status === 429) {
      appendErrorMessage("You're sending messages too fast. Please wait a moment. ⏳");
    } else if (status === 400) {
      appendErrorMessage("Couldn't send that message. Please try rephrasing.");
    } else if (!err.response) {
      appendErrorMessage('Cannot reach the server. Is the backend running on port 5000? 🔌');
    } else {
      var serverMsg = err.response && err.response.data ? err.response.data.error : null;
      appendErrorMessage(serverMsg || "I'm having trouble connecting right now. Please try again.");
    }
  } finally {
    // Release the request lock and re-enable inputs
    isSending = false;
    setInputEnabled(true);
    if (input) input.focus();
  }
}

// ── Render helpers ────────────────────────────────────────

function appendUserMessage(text) {
  const msgs = el('chatMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'flex justify-end';
  div.innerHTML = '<div class="bg-blue-600 text-white rounded-xl rounded-br-none px-3 py-2 text-sm max-w-[75%] break-words">' + escapeHtml(text) + '</div>';
  msgs.appendChild(div);
  scrollToBottom();
}

function appendBotMessage(text) {
  const msgs = el('chatMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'flex gap-2 items-start';
  div.innerHTML = '<div class="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">AI</div><div class="bg-white border border-gray-100 shadow-sm rounded-xl rounded-tl-none px-3 py-2 text-sm text-gray-700 max-w-[75%] break-words whitespace-pre-wrap">' + escapeHtml(text) + '</div>';
  msgs.appendChild(div);
  scrollToBottom();
}

function appendErrorMessage(text) {
  const msgs = el('chatMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'flex justify-center';
  div.innerHTML = '<div class="bg-red-50 border border-red-100 text-red-500 rounded-lg px-3 py-1.5 text-xs text-center max-w-[85%]">⚠️ ' + escapeHtml(text) + '</div>';
  msgs.appendChild(div);
  scrollToBottom();
}

// ── UI state helpers ──────────────────────────────────────

function setTyping(visible) {
  const ind = el('typingIndicator');
  if (!ind) return;
  ind.classList.toggle('hidden', !visible);
  if (visible) scrollToBottom();
}

function setInputEnabled(enabled) {
  const input = el('chatInput');
  const btn   = el('sendChat');
  if (input) input.disabled = !enabled;
  if (btn)   btn.disabled   = !enabled;
}

function scrollToBottom() {
  const msgs = el('chatMessages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

// ── XSS protection ────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

// ── doubtSolverSend: backward-compatibility stub ──────────
// student.js wires the doubt panel directly via ChatbotAPI.askDoubt()
async function doubtSolverSend(question) {
  // Handled directly in student.js
}
