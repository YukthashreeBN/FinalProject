// ============================================================
// chatbotUI.js – Floating Chatbot Widget Component
// ============================================================

function initChatbotWidget() {
  const container = document.getElementById('chatbotWidget');
  if (!container) return;

  // Create toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'chatbotToggle';
  toggleBtn.innerHTML = '🤖';
  toggleBtn.title = 'AI Assistant';
  toggleBtn.addEventListener('click', toggleChatbot);
  container.appendChild(toggleBtn);

  // Create chat window
  const chatWindow = document.createElement('div');
  chatWindow.id = 'chatbotWindow';
  chatWindow.className = 'hidden';
  chatWindow.innerHTML = `
    <!-- Header -->
    <div class="bg-primary px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-sm">🤖</div>
        <div>
          <p class="text-white font-semibold text-sm">AI Assistant</p>
          <p class="text-blue-200 text-xs">Ask anything academic</p>
        </div>
      </div>
      <button onclick="toggleChatbot()" class="text-white/70 hover:text-white transition text-lg leading-none">&times;</button>
    </div>

    <!-- Messages -->
    <div id="chatbotMessages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" style="height:280px">
      <div class="chat-msg-bot">
        <div class="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">🤖</div>
        <div class="bubble">Hi! I'm your AI assistant. Ask me any academic question! 📚</div>
      </div>
    </div>

    <!-- Input -->
    <div class="p-3 border-t border-blue-100 bg-white flex gap-2">
      <input type="text" id="chatbotInput" placeholder="Ask a question..."
        class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
      <button onclick="sendChatbotMessage()" class="bg-primary text-white px-3 py-2 rounded-xl hover:bg-primary-dark transition text-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
        </svg>
      </button>
    </div>`;
  document.body.appendChild(chatWindow);

  // Enter key
  chatWindow.querySelector('#chatbotInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChatbotMessage();
  });
}

function toggleChatbot() {
  const window_ = document.getElementById('chatbotWindow');
  if (!window_) return;
  window_.classList.toggle('hidden');
}

async function sendChatbotMessage() {
  const input = document.getElementById('chatbotInput');
  const msgs  = document.getElementById('chatbotMessages');
  if (!input || !msgs || !input.value.trim()) return;

  const message = input.value.trim();
  input.value = '';

  // User bubble
  msgs.innerHTML += `
    <div class="chat-msg-user">
      <div class="bubble">${escapeHtmlChatbot(message)}</div>
    </div>`;
  msgs.scrollTop = msgs.scrollHeight;

  // Typing indicator
  const typingId = 'cb_typing_' + Date.now();
  msgs.innerHTML += `
    <div class="chat-msg-bot" id="${typingId}">
      <div class="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">🤖</div>
      <div class="bubble typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  msgs.scrollTop = msgs.scrollHeight;

  try {
    // Get chat history from existing messages
    const history = Array.from(msgs.querySelectorAll('.chat-msg-user, .chat-msg-bot'))
      .slice(-10)
      .map(el => {
        const bubble = el.querySelector('.bubble');
        const text = bubble?.textContent || '';
        const isUser = el.classList.contains('chat-msg-user');
        return { role: isUser ? 'user' : 'assistant', content: text };
      });

    // Call API
    const token = localStorage.getItem('ll_token');
    const apiResponse = await fetch('http://localhost:5000/api/chatbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message, history })
    });

    document.getElementById(typingId)?.remove();

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      msgs.innerHTML += `
        <div class="chat-msg-bot">
          <div class="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">🤖</div>
          <div class="bubble text-red-600">${escapeHtmlChatbot(errorData.error || 'Error getting response')}</div>
        </div>`;
      msgs.scrollTop = msgs.scrollHeight;
      return;
    }

    const data = await apiResponse.json();
    const response = data.reply || 'No response received';
    msgs.innerHTML += `
      <div class="chat-msg-bot">
        <div class="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">🤖</div>
        <div class="bubble">${escapeHtmlChatbot(response)}</div>
      </div>`;
    msgs.scrollTop = msgs.scrollHeight;
  } catch (error) {
    document.getElementById(typingId)?.remove();
    msgs.innerHTML += `
      <div class="chat-msg-bot">
        <div class="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">🤖</div>
        <div class="bubble text-red-600">Error: ${escapeHtmlChatbot(error.message)}</div>
      </div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }
}

function generateChatbotResponse(q) {
  const ql = q.toLowerCase();
  if (ql.includes('calculus') || ql.includes('derivative') || ql.includes('integral'))
    return "Calculus is the study of rates of change (derivatives) and accumulated quantities (integrals). The fundamental theorem of calculus connects these two concepts. Would you like me to explain a specific topic?";
  if (ql.includes('physics') || ql.includes('newton') || ql.includes('force'))
    return "Newton's laws form the foundation of classical mechanics. The first law is inertia, the second is F=ma, and the third is action-reaction. Which law would you like to explore further?";
  if (ql.includes('chemistry') || ql.includes('element') || ql.includes('molecule'))
    return "Chemistry deals with the composition, structure, and properties of matter. Are you asking about organic chemistry, inorganic chemistry, or a specific reaction or element?";
  if (ql.includes('hello') || ql.includes('hi') || ql.includes('hey'))
    return "Hello! 👋 I'm your AI academic assistant. I can help with Mathematics, Physics, Chemistry, English, and more. What would you like to learn today?";
  return `Great question about "${q.slice(0,40)}...". This is an important academic concept. In a production environment, I'd provide a detailed explanation with examples. Connect the /api/chatbot endpoint for full AI responses!`;
}

function escapeHtmlChatbot(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
