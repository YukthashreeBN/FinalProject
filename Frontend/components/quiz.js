// ============================================================
// quiz.js – MCQ Quiz Component
// ============================================================

const MOCK_QUIZZES = [
  {
    id: 1,
    title: 'Mathematics – Chapter 3: Integration',
    subject: 'Mathematics',
    questions: [
      {
        text: 'What is the integral of 2x with respect to x?',
        options: ['x²', 'x² + C', '2x² + C', 'x + C'],
        correct: 1
      },
      {
        text: 'Which rule is used to differentiate a product of two functions?',
        options: ['Chain Rule', 'Quotient Rule', 'Product Rule', 'Power Rule'],
        correct: 2
      },
      {
        text: 'What is d/dx of sin(x)?',
        options: ['-cos(x)', 'cos(x)', '-sin(x)', 'tan(x)'],
        correct: 1
      },
      {
        text: 'The derivative of a constant is:',
        options: ['1', 'Undefined', '0', 'The constant itself'],
        correct: 2
      },
    ]
  },
  {
    id: 2,
    title: 'Physics – Newton\'s Laws',
    subject: 'Physics',
    questions: [
      {
        text: 'What does Newton\'s second law state?',
        options: ['Every action has an equal and opposite reaction', 'F = ma', 'An object at rest stays at rest', 'None of the above'],
        correct: 1
      },
      {
        text: 'Which law explains why we feel pushed back in a seat when a car accelerates?',
        options: ['Newton\'s First Law', 'Newton\'s Second Law', 'Newton\'s Third Law', 'Law of Gravitation'],
        correct: 0
      },
      {
        text: 'The SI unit of Force is:',
        options: ['Joule', 'Watt', 'Newton', 'Pascal'],
        correct: 2
      },
    ]
  }
];

let activeQuiz     = null;
let currentQIndex  = 0;
let selectedAnswer = null;
let score          = 0;
let answered       = false;

// ── Render Quiz Selector ──────────────────────────────────
function renderQuiz(container) {
  container.innerHTML = `
    <div id="quizSelector">
      <div class="grid sm:grid-cols-2 gap-5">
        ${MOCK_QUIZZES.map(q => `
          <div class="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 hover:shadow-md transition">
            <p class="text-xs text-gray-400 mb-1">${q.subject}</p>
            <h3 class="font-bold text-gray-800 mb-2">${q.title}</h3>
            <p class="text-sm text-gray-500 mb-4">${q.questions.length} questions</p>
            <button onclick="startQuiz(${q.id})"
              class="w-full bg-primary text-white font-bold py-2 rounded-xl hover:bg-primary-dark transition text-sm">
              Start Quiz →
            </button>
          </div>
        `).join('')}
      </div>
    </div>
    <div id="quizActive" class="hidden max-w-xl"></div>
  `;
}

// ── Start Quiz ────────────────────────────────────────────
function startQuiz(quizId) {
  activeQuiz    = MOCK_QUIZZES.find(q => q.id === quizId);
  currentQIndex = 0;
  score         = 0;
  selectedAnswer = null;
  answered      = false;

  document.getElementById('quizSelector').classList.add('hidden');
  document.getElementById('quizActive').classList.remove('hidden');
  renderQuestion();
}

// ── Render Question ───────────────────────────────────────
function renderQuestion() {
  const q          = activeQuiz.questions[currentQIndex];
  const total      = activeQuiz.questions.length;
  const progressPct = Math.round(((currentQIndex) / total) * 100);
  const container  = document.getElementById('quizActive');
  answered = false;
  selectedAnswer = null;

  container.innerHTML = `
    <div class="bg-white rounded-2xl border border-blue-100 shadow-sm p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <p class="text-xs text-gray-400 font-semibold uppercase tracking-wide">${activeQuiz.subject}</p>
        <p class="text-sm text-gray-500">Question <strong>${currentQIndex + 1}</strong> of ${total}</p>
      </div>

      <!-- Progress bar -->
      <div class="w-full bg-gray-100 rounded-full h-2 mb-6">
        <div class="bg-primary h-2 rounded-full transition-all duration-500" style="width:${progressPct}%"></div>
      </div>

      <!-- Question -->
      <h3 class="font-bold text-gray-900 text-base mb-5">${q.text}</h3>

      <!-- Options -->
      <div id="optionsContainer" class="space-y-3 mb-6">
        ${q.options.map((opt, i) => `
          <button class="quiz-option" onclick="selectOption(${i})" id="opt_${i}">
            <span class="font-semibold text-gray-400 mr-2">${String.fromCharCode(65+i)}.</span> ${opt}
          </button>
        `).join('')}
      </div>

      <!-- Feedback -->
      <div id="quizFeedback" class="hidden p-3 rounded-xl text-sm font-medium mb-4"></div>

      <!-- Actions -->
      <div class="flex items-center justify-between">
        <button onclick="exitQuiz()" class="text-sm text-gray-400 hover:text-gray-600 transition">✕ Exit Quiz</button>
        <button id="nextBtn" onclick="nextQuestion()" class="hidden bg-primary text-white font-bold px-5 py-2 rounded-xl hover:bg-primary-dark transition text-sm">
          ${currentQIndex + 1 < total ? 'Next →' : 'Finish Quiz'}
        </button>
      </div>
    </div>`;
}

// ── Select Option ─────────────────────────────────────────
function selectOption(index) {
  if (answered) return;
  answered = true;
  selectedAnswer = index;

  const q       = activeQuiz.questions[currentQIndex];
  const feedback = document.getElementById('quizFeedback');
  const nextBtn  = document.getElementById('nextBtn');

  // Style options
  q.options.forEach((_, i) => {
    const btn = document.getElementById(`opt_${i}`);
    if (!btn) return;
    if (i === q.correct) {
      btn.classList.add('correct');
    } else if (i === index) {
      btn.classList.add('wrong');
    }
  });

  // Show feedback
  if (index === q.correct) {
    score++;
    feedback.className = 'p-3 rounded-xl text-sm font-medium mb-4 bg-green-50 text-green-700 border border-green-200';
    feedback.textContent = '✓ Correct! Great job!';
  } else {
    feedback.className = 'p-3 rounded-xl text-sm font-medium mb-4 bg-red-50 text-red-700 border border-red-200';
    feedback.textContent = `✗ Incorrect. The correct answer is: ${q.options[q.correct]}`;
  }
  feedback.classList.remove('hidden');
  if (nextBtn) nextBtn.classList.remove('hidden');
}

// ── Next Question ─────────────────────────────────────────
function nextQuestion() {
  currentQIndex++;
  if (currentQIndex < activeQuiz.questions.length) {
    renderQuestion();
  } else {
    showResult();
  }
}

// ── Show Result ───────────────────────────────────────────
function showResult() {
  const total   = activeQuiz.questions.length;
  const pct     = Math.round((score / total) * 100);
  const grade   = pct >= 80 ? '🏆 Excellent!' : pct >= 60 ? '👍 Good Job!' : pct >= 40 ? '📚 Keep Practicing' : '💪 Don\'t Give Up!';
  const color   = pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-blue-600' : pct >= 40 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = pct >= 80 ? 'bg-green-50 border-green-200' : pct >= 60 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200';

  document.getElementById('quizActive').innerHTML = `
    <div class="bg-white rounded-2xl border border-blue-100 shadow-sm p-8 text-center">
      <div class="text-5xl mb-4">${pct >= 80 ? '🏆' : pct >= 60 ? '🎯' : '📚'}</div>
      <h2 class="font-serif text-2xl text-gray-900 mb-1">Quiz Complete!</h2>
      <p class="text-gray-500 mb-6">${activeQuiz.title}</p>

      <div class="inline-block border ${bgColor} rounded-2xl px-8 py-5 mb-6">
        <p class="text-5xl font-bold ${color}">${score}/${total}</p>
        <p class="text-gray-500 text-sm mt-1">${pct}% Correct</p>
      </div>

      <p class="font-bold text-lg text-gray-800 mb-6">${grade}</p>

      <div class="flex gap-3 justify-center">
        <button onclick="startQuiz(${activeQuiz.id})" class="bg-primary text-white font-bold px-5 py-2 rounded-xl hover:bg-primary-dark transition text-sm">
          🔄 Try Again
        </button>
        <button onclick="exitQuiz()" class="border border-gray-200 text-gray-600 font-semibold px-5 py-2 rounded-xl hover:bg-gray-50 transition text-sm">
          ← Back to Quizzes
        </button>
      </div>
    </div>`;
}

// ── Exit Quiz ─────────────────────────────────────────────
function exitQuiz() {
  activeQuiz = null;
  document.getElementById('quizSelector').classList.remove('hidden');
  document.getElementById('quizActive').classList.add('hidden');
  document.getElementById('quizActive').innerHTML = '';
}
