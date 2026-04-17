export const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const strH = h > 0 ? `${h.toString().padStart(2, '0')}:` : '';
  return `${strH}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const formatTimeLocal = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const formatRest = (sec: number) => {
  if (sec <= 0) return 'OFF';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? (s > 0 ? `${m}m ${s}s` : `${m}m`) : `${s}s`;
};
