import { api } from './api.js';

const app = document.querySelector('#app');
let renderToken = 0;
let boardState = { filter: 'all', search: '', sort: 'deadline' };
let leaderboardState = { slug: '', data: null, limit: 50 };

function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') return { name: 'leaderboard', slug: parts[1] };
  if (parts[0] === 'bounty' && parts[1]) return { name: 'bounty', slug: parts[1] };
  if (parts[0] === 'profile' && parts[1]) return { name: 'profile', handle: parts[1] };
  return { name: 'board' };
}

function loading(current) {
  const label = current.name === 'board' ? 'Scanning open calls' : current.name === 'profile' ? 'Loading builder record' : 'Reading live competition data';
  return `<section class="loading" role="status"><div class="loader" aria-hidden="true"><i></i><i></i><i></i></div><p>${label}…</p></section>`;
}

function failure(error) {
  return `<section class="error" role="alert"><span aria-hidden="true">!</span><p class="eyebrow">LIVE DATA UNAVAILABLE</p><h1>We lost the signal.</h1><p>${String(error?.message || 'The request could not be completed.')}</p><button id="retry">Try again</button><a href="#/">Return to board</a></section>`;
}

function setNavigation(name) {
  document.querySelectorAll('[data-nav]').forEach((link) => link.toggleAttribute('aria-current', link.dataset.nav === name || (name === 'bounty' && link.dataset.nav === 'board')));
}

function applyBoardControls() {
  const list = document.querySelector('#bounty-list');
  if (!list) return;
  const cards = [...list.children];
  const search = boardState.search.toLowerCase().trim();
  let shown = 0;
  cards.forEach((card) => {
    const visible = (boardState.filter === 'all' || card.dataset.state === boardState.filter) && (!search || card.dataset.search.includes(search));
    card.hidden = !visible;
    if (visible) shown += 1;
  });
  cards.sort((a, b) => {
    if (boardState.sort === 'pot') return b.dataset.pot - a.dataset.pot;
    if (boardState.sort === 'entries') return b.dataset.entries - a.dataset.entries;
    if (a.dataset.state !== b.dataset.state) return a.dataset.state === 'live' ? -1 : 1;
    return a.dataset.deadline - b.dataset.deadline;
  }).forEach((card) => list.append(card));
  document.querySelector('#result-count').textContent = shown;
  document.querySelector('#no-results').hidden = shown !== 0;
}

function bindBoard() {
  const search = document.querySelector('#search');
  const sort = document.querySelector('#sort');
  if (!search || !sort) return;
  search.value = boardState.search;
  sort.value = boardState.sort;
  search.addEventListener('input', () => { boardState.search = search.value; applyBoardControls(); });
  sort.addEventListener('change', () => { boardState.sort = sort.value; applyBoardControls(); });
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    boardState.filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button));
    applyBoardControls();
  }));
  applyBoardControls();
}

function bindLeaderboard(views) {
  document.querySelector('#load-more')?.addEventListener('click', () => {
    leaderboardState.limit += 50;
    app.innerHTML = views.leaderboardView(leaderboardState.data, leaderboardState.slug, leaderboardState.limit);
    bindLeaderboard(views);
    document.querySelector('#load-more')?.focus();
  });
}

async function render() {
  const token = ++renderToken;
  const current = route();
  window.__shotReady = false;
  app.innerHTML = loading(current);
  app.setAttribute('aria-busy', 'true');
  setNavigation(current.name);
  try {
    const views = await import('./views.js');
    let html;
    if (current.name === 'bounty') html = views.bountyView(await api.bounty(current.slug));
    else if (current.name === 'leaderboard') {
      if (leaderboardState.slug !== current.slug || !leaderboardState.data) leaderboardState = { slug: current.slug, data: await api.leaderboard(current.slug), limit: 50 };
      html = views.leaderboardView(leaderboardState.data, current.slug, leaderboardState.limit);
    }
    else if (current.name === 'profile') html = views.profileView(await api.profile(current.handle));
    else html = views.boardView(await api.bounties());
    if (token !== renderToken) return;
    app.innerHTML = html;
    app.setAttribute('aria-busy', 'false');
    if (current.name === 'board') bindBoard();
    if (current.name === 'leaderboard') bindLeaderboard(views);
    const heading = app.querySelector('h1');
    document.title = `${heading?.textContent.replace(/\s+/g, ' ').trim() || 'Bounties'} — Fieldwork`;
    window.scrollTo(0, 0);
    window.__shotReady = true;
  } catch (error) {
    if (token !== renderToken) return;
    app.innerHTML = failure(error);
    app.setAttribute('aria-busy', 'false');
    document.querySelector('#retry')?.addEventListener('click', render);
    window.__shotReady = true;
  }
}

window.addEventListener('hashchange', render);
render();
