// ============================================================
// videoPlayer.js – Video Player Component helper
// ============================================================

/**
 * Initialize a video card with play & download functionality.
 * Called from student.js when rendering video cards.
 *
 * @param {Object} video - { id, title, desc, src, thumbnail, duration, subject }
 * @returns {string} HTML string for the video card
 */
function createVideoCard(video) {
  return `
    <div class="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden hover:shadow-md transition">
      <div class="bg-blue-50 h-32 flex items-center justify-center text-5xl cursor-pointer relative group"
           onclick="playVideo(${JSON.stringify(video).replace(/"/g, '&quot;')})">
        ${video.thumbnail}
        <div class="absolute inset-0 bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
            <svg class="w-5 h-5 text-primary ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="p-4">
        <p class="text-xs text-gray-400 mb-1">${video.subject}</p>
        <h3 class="font-bold text-gray-800 text-sm mb-1">${video.title}</h3>
        <p class="text-xs text-gray-500 mb-3 line-clamp-2">${video.desc}</p>
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-400">⏱ ${video.duration}</span>
          <div class="flex gap-2">
            <button onclick="playVideo(${JSON.stringify(video).replace(/"/g, '&quot;')})"
              class="text-xs bg-primary text-white px-3 py-1 rounded-lg font-semibold hover:bg-primary-dark transition">
              ▶ Play
            </button>
            <button onclick="downloadVideo('${video.title}')"
              class="text-xs border border-primary text-primary px-3 py-1 rounded-lg font-semibold hover:bg-blue-50 transition">
              ⬇
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

/**
 * Download a video (in production would fetch a signed URL)
 */
function downloadVideo(title) {
  alert(`Downloading: ${title}\n(Connect backend API to enable real video downloads)`);
}
