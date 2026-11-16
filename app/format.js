export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => `&#${character.charCodeAt(0)};`);
}

export function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(number) ? 0 : 2 });
}

export function dateTime(value) {
  if (!value) return 'Not announced';
  return `${new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

export function timeLeft(value) {
  const milliseconds = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return 'Entries closed';
  const days = Math.floor(milliseconds / 86400000);
  const hours = Math.floor((milliseconds % 86400000) / 3600000);
  const minutes = Math.max(0, Math.floor((milliseconds % 3600000) / 60000));
  if (days) return `${days}d ${hours}h left`;
  if (hours) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export const accepting = (bounty) => new Date(bounty.deadline).getTime() > Date.now() && bounty.acceptingSubmissions !== false;
export const pot = (bounty) => money(bounty.potUsd ?? bounty.rewardAmount);
export const plural = (count, one, many = `${one}s`) => `${Number(count || 0).toLocaleString()} ${count === 1 ? one : many}`;

export function initials(value) {
  return String(value || '?').split(/[-_\s]+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

// Safe, deliberately small Markdown renderer for API-authored bounty copy.
export function richText(value) {
  const lines = String(value || '').replace(/\r/g, '').split('\n');
  let output = '';
  let list = false;
  const closeList = () => { if (list) { output += '</ul>'; list = false; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    const heading = line.match(/^(#{2,4})\s+(.+)/);
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (heading) { closeList(); const level = Math.min(4, heading[1].length); output += `<h${level}>${escapeHtml(heading[2])}</h${level}>`; }
    else if (bullet) { if (!list) { output += '<ul>'; list = true; } output += `<li>${escapeHtml(bullet[1])}</li>`; }
    else { closeList(); output += `<p>${escapeHtml(line)}</p>`; }
  }
  closeList();
  return output || '<p>No additional notes were published.</p>';
}

export function score(value, key) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (key === 'judge') return `${(number / 10000).toFixed(1)}%`;
  return number.toLocaleString('en-US', { maximumFractionDigits: 4 });
}
