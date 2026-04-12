/**
 * main.js – Landing page logic
 * Cookie consent banner
 */

document.addEventListener('DOMContentLoaded', () => {
  initCookieBanner();
  initSmoothScroll();
});

function initCookieBanner() {
  const banner    = document.getElementById('cookieBanner');
  const acceptBtn = document.getElementById('acceptCookie');
  const declineBtn = document.getElementById('declineCookie');

  if (!banner) return;

  // Show banner if no decision stored
  const consent = localStorage.getItem('ll_cookie_consent');
  if (!consent) {
    setTimeout(() => banner.classList.remove('hidden'), 1500);
  }

  acceptBtn && acceptBtn.addEventListener('click', () => {
    localStorage.setItem('ll_cookie_consent', 'accepted');
    banner.classList.add('hidden');
  });

  declineBtn && declineBtn.addEventListener('click', () => {
    localStorage.setItem('ll_cookie_consent', 'declined');
    banner.classList.add('hidden');
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}
