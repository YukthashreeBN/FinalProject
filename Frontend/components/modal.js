// ============================================================
// modal.js – Reusable Modal Component
// ============================================================

/**
 * Show a modal dialog.
 * @param {Object} opts - { title, body, confirmLabel, cancelLabel, onConfirm }
 */
function showModal({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm }) {
  // Remove any existing modal
  const existing = document.getElementById('llpModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'llpModal';
  overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-blue-100 w-full max-w-md p-6 animate-fade-in">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-gray-900 text-lg">${title}</h3>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>
      <div class="text-sm text-gray-600 mb-6">${body}</div>
      <div class="flex gap-3 justify-end">
        <button onclick="closeModal()"
          class="border border-gray-200 text-gray-600 font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition text-sm">
          ${cancelLabel}
        </button>
        <button onclick="handleModalConfirm()"
          class="bg-primary text-white font-semibold px-4 py-2 rounded-xl hover:bg-primary-dark transition text-sm">
          ${confirmLabel}
        </button>
      </div>
    </div>`;

  // Store callback
  overlay._onConfirm = onConfirm;
  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
}

function handleModalConfirm() {
  const modal = document.getElementById('llpModal');
  if (modal && modal._onConfirm) modal._onConfirm();
  closeModal();
}

function closeModal() {
  const modal = document.getElementById('llpModal');
  if (modal) modal.remove();
}

/**
 * Show a simple alert modal (no cancel button).
 */
function showAlertModal(title, message, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  showModal({
    title: `${icons[type]} ${title}`,
    body: message,
    confirmLabel: 'OK',
    cancelLabel: '',
    onConfirm: () => {}
  });
  // Hide cancel button
  setTimeout(() => {
    const btns = document.querySelectorAll('#llpModal button');
    if (btns.length > 1) btns[0].style.display = 'none';
  }, 0);
}
