// Line icons for lessons (drawn, not emoji, so they look consistent everywhere).
const P = {
  flask: '<path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.8-2.5L14 9V3"/><path d="M7 15h10"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
  nail: '<path d="M5 4h14"/><path d="M12 4v13l-2 3h4l-2-3"/><path d="M9 8h6M9 11h6"/>',
  hex: '<path d="M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4z"/><circle cx="12" cy="12" r="2.5"/>',
  beam: '<path d="M3 12h6"/><path d="M9 12l12-6"/><path d="M9 12l12 0"/><path d="M9 12l12 6"/><circle cx="9" cy="12" r="1.6"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  magnet: '<path d="M6 3v9a6 6 0 0 0 12 0V3"/><path d="M6 7h4M14 7h4"/><path d="M10 3v9a2 2 0 0 0 4 0V3"/>',
};
export const icon = (name, size = 24) => `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${P[name] || P.flask}</svg>`;
