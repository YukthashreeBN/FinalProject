// ============================================================
// payment.js – Payment page logic
// ============================================================

let selectedMethod = 'card';

document.addEventListener('DOMContentLoaded', () => {
  // Read course info from URL params
  const params = new URLSearchParams(window.location.search);
  const title  = params.get('title') || 'Advanced Mathematics – Grade 12';
  const price  = params.get('price') || '₹1,999';

  const titleEl  = document.getElementById('courseTitle');
  const feeEl    = document.getElementById('courseFee');
  const totalEl  = document.getElementById('totalAmount');
  const btnText  = document.getElementById('payBtnText');

  if (titleEl) titleEl.textContent = title;
  if (feeEl)   feeEl.textContent = price;
  // Simulate ₹500 discount
  if (totalEl) {
    const rawPrice = parseInt(price.replace(/[^\d]/g, '')) || 1999;
    const discounted = rawPrice - 500;
    totalEl.textContent = '₹' + discounted.toLocaleString('en-IN');
    if (btnText) btnText.textContent = `🔒 Pay ₹${discounted.toLocaleString('en-IN')}`;
  }
});

// ── Payment Method Selection ──────────────────────────────
function selectMethod(method) {
  selectedMethod = method;
  // Update button states
  ['card','upi','netbanking'].forEach(m => {
    const btn = document.getElementById(`btn-${m}`);
    if (btn) {
      if (m === method) {
        btn.classList.add('active');
        btn.style.borderColor = '#1D4ED8';
        btn.style.background  = '#EFF6FF';
        btn.style.color       = '#1D4ED8';
      } else {
        btn.classList.remove('active');
        btn.style.borderColor = '#E5E7EB';
        btn.style.background  = '';
        btn.style.color       = '#6B7280';
      }
    }
  });
  // Show/hide forms
  ['cardForm','upiForm','netbankingForm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  const activeForm = document.getElementById(`${method}Form`);
  if (activeForm) activeForm.classList.remove('hidden');
}

// ── Process Payment ───────────────────────────────────────
async function processPayment() {
  const btn     = document.getElementById('payBtn');
  const btnText = document.getElementById('payBtnText');
  const spinner = document.getElementById('paySpinner');

  // Basic validation
  if (selectedMethod === 'card') {
    const num  = document.getElementById('cardNumber').value.replace(/\s/g,'');
    const exp  = document.getElementById('cardExpiry').value;
    const cvv  = document.getElementById('cardCvv').value;
    const name = document.getElementById('cardName').value.trim();
    if (!num || num.length < 16) { alert('Please enter a valid 16-digit card number.'); return; }
    if (!exp || exp.length < 5)  { alert('Please enter a valid expiry date.'); return; }
    if (!cvv || cvv.length < 3)  { alert('Please enter a valid CVV.'); return; }
    if (!name)                   { alert('Please enter the name on card.'); return; }
  } else if (selectedMethod === 'upi') {
    const upi = document.getElementById('upiId').value.trim();
    if (!upi || !upi.includes('@')) { alert('Please enter a valid UPI ID.'); return; }
  }

  // Start loading
  if (btn)     btn.disabled = true;
  if (btnText) btnText.textContent = 'Processing...';
  if (spinner) spinner.classList.remove('hidden');

  // Call backend API (POST /payment/create-order + /payment/verify-payment)
  let success = false;
  try {
    const totalText = document.getElementById('totalAmount')?.textContent || '1499';
    const amount = parseInt(totalText.replace(/[^\d]/g, '')) || 1499;
    const courseTitle = document.getElementById('courseTitle')?.textContent || 'Course Enrollment';
    
    // Create simulated order in backend
    const orderRes = await PaymentAPI.createOrder("demo_course", amount, courseTitle, selectedMethod);
    const orderId = orderRes.data.orderId;
    
    // Verify payment in backend
    const verifyRes = await PaymentAPI.verifyPayment({ orderId });
    success = verifyRes.data.success;
  } catch (error) {
    console.error("Backend payment flow failed or not signed in:", error);
    // Fallback to purely simulated flow if backend API fails (constraint: keep simulated flow)
    await delay(2000);
    success = Math.random() > 0.1;
  }

  if (spinner) spinner.classList.add('hidden');

  const formEl   = document.getElementById('paymentForm');
  const successEl = document.getElementById('paymentSuccess');
  const failureEl = document.getElementById('paymentFailure');

  if (formEl)   formEl.classList.add('hidden');

  if (success) {
    if (successEl) successEl.classList.remove('hidden');
    // Animate redirect progress bar
    let progress = 0;
    const bar = document.getElementById('redirectProgress');
    const interval = setInterval(() => {
      progress += 5;
      if (bar) bar.style.width = progress + '%';
      if (progress >= 100) {
        clearInterval(interval);
        window.location.href = 'student-dashboard.html';
      }
    }, 150);
  } else {
    if (failureEl) failureEl.classList.remove('hidden');
  }
}

function resetPayment() {
  const formEl    = document.getElementById('paymentForm');
  const failureEl = document.getElementById('paymentFailure');
  const btn       = document.getElementById('payBtn');
  if (formEl)    formEl.classList.remove('hidden');
  if (failureEl) failureEl.classList.add('hidden');
  if (btn)       btn.disabled = false;
}

// ── Card Number Formatting ────────────────────────────────
function formatCardNumber(input) {
  let val = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = val.match(/.{1,4}/g)?.join(' ') || val;
}

function formatExpiry(input) {
  let val = input.value.replace(/\D/g, '').slice(0, 4);
  if (val.length >= 2) val = val.slice(0,2) + '/' + val.slice(2);
  input.value = val;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
