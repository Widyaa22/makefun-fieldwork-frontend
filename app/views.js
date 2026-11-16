import { accepting, dateTime, escapeHtml as esc, initials, money, plural, pot, richText, score, timeLeft } from './format.js';

const categoryClass = (value) => `tag tag-${String(value || 'open').toLowerCase().replace(/[^a-z]+/g, '-')}`;
const statusLabel = (bounty) => accepting(bounty) ? 'Accepting entries' : bounty.resolvedAt ? 'Results published' : 'Entries closed';
// Initials are instant and reliable even when an API-provided avatar blocks cross-origin embedding.
const avatar = (_profile, name) => `<span aria-hidden="true">${initials(name)}</span>`;

function empty(message) {
  return `<div class="empty"><span aria-hidden="true">⌁</span><h2>Nothing here yet</h2><p>${esc(message)}</p></div>`;
}

export function boardView(data) {
  const items = data.items || [];
  const live = items.filter(accepting).length;
  const totalPot = items.filter(accepting).reduce((sum, item) => sum + Number(item.potUsd ?? item.rewardAmount ?? 0), 0);
  const cards = items.map((bounty) => `
    <article class="bounty-card" data-search="${esc(`${bounty.title} ${bounty.category} ${(bounty.skills || []).join(' ')}`.toLowerCase())}" data-state="${accepting(bounty) ? 'live' : 'closed'}" data-pot="${Number(bounty.potUsd ?? bounty.rewardAmount ?? 0)}" data-deadline="${new Date(bounty.deadline).getTime()}" data-entries="${Number(bounty.submissionCount || 0)}">
      <div class="card-top"><span class="${categoryClass(bounty.category)}">${esc(bounty.category || 'Open')}</span><span class="state ${accepting(bounty) ? 'live' : ''}"><i></i>${statusLabel(bounty)}</span></div>
      <h2><a href="#/bounty/${encodeURIComponent(bounty.slug)}">${esc(bounty.title)}</a></h2>
      <p class="summary">${esc(bounty.summary || bounty.description || '')}</p>
      <div class="card-metrics">
        <div><small>Live pot</small><strong>${pot(bounty)}</strong></div>
        <div><small>Entry fee</small><strong>${bounty.entryFeeUsd ? money(bounty.entryFeeUsd) : 'Free'}</strong></div>
        <div><small>Entries</small><strong>${Number(bounty.submissionCount || 0).toLocaleString()}</strong></div>
      </div>
      <div class="card-foot"><strong>${timeLeft(bounty.deadline)}</strong><a href="#/bounty/${encodeURIComponent(bounty.slug)}" aria-label="View ${esc(bounty.title)}">View brief <span>→</span></a></div>
    </article>`).join('');
  return `
    <section class="hero board-hero">
      <div><p class="eyebrow">THE OPEN BUILD INDEX</p><h1>Find work worth<br><em>making.</em></h1><p class="lede">Live competitions for agents, programs, games, and ideas—ranked in the open.</p></div>
      <aside aria-label="Board summary"><span><strong>${live}</strong> accepting now</span><span><strong>${money(totalPot)}</strong> live rewards</span><span><strong>${items.reduce((n, b) => n + Number(b.submissionCount || 0), 0).toLocaleString()}</strong> entries tracked</span></aside>
    </section>
    <section class="board-section" aria-labelledby="board-title">
      <div class="section-title"><div><p class="eyebrow">BOUNTY BOARD</p><h2 id="board-title">Open calls</h2></div><p><span id="result-count">${items.length}</span> opportunities</p></div>
      <div class="toolbar">
        <label class="search"><span aria-hidden="true">⌕</span><span class="sr-only">Search bounties</span><input id="search" type="search" placeholder="Search title, skill, category…" autocomplete="off"></label>
        <div class="filter-group" role="group" aria-label="Filter bounties"><button class="active" data-filter="all">All</button><button data-filter="live">Accepting</button><button data-filter="closed">Closed</button></div>
        <label class="sort"><span>Sort</span><select id="sort"><option value="deadline">Closing soon</option><option value="pot">Highest pot</option><option value="entries">Most entries</option></select></label>
      </div>
      <div class="cards" id="bounty-list">${cards}</div>
      <div class="no-results" id="no-results" hidden>No bounties match those filters.</div>
    </section>`;
}

export function bountyView(bounty) {
  const rewards = (bounty.rewardsNow || Object.entries(bounty.rewards || {}).map(([place, amount]) => ({ place, amountUsd: amount }))).slice(0, 20);
  const rewardRows = rewards.map((reward) => `<tr><td><span class="place">${Number(reward.place)}</span>${Number(reward.place) === 1 ? 'Winner' : `Place ${reward.place}`}</td><td>${money(reward.amountUsd)}</td></tr>`).join('');
  const skills = (bounty.skills || []).map((skill) => `<span class="skill">${esc(skill)}</span>`).join('');
  return `
    <div class="crumb"><a href="#/">Bounties</a><span>/</span><span>${esc(bounty.category || 'Brief')}</span></div>
    <section class="detail-hero">
      <div class="detail-copy"><div class="card-top"><span class="${categoryClass(bounty.category)}">${esc(bounty.category || 'Open call')}</span><span class="state ${accepting(bounty) ? 'live' : ''}"><i></i>${statusLabel(bounty)}</span></div><h1>${esc(bounty.title)}</h1><p>${esc(bounty.summary)}</p><div class="skills">${skills}</div></div>
      <aside class="prize-card"><p>LIVE REWARD POT</p><strong>${pot(bounty)}</strong>${bounty.entryFeesUsd && Number(bounty.entryFeesUsd) > 0 ? `<small>Includes ${money(bounty.entryFeesUsd)} in entry fees</small>` : '<small>Reward secured for this bounty</small>'}<div><span>Entry fee <b>${bounty.entryFeeUsd ? money(bounty.entryFeeUsd) : 'Free'}</b></span><span>Entries <b>${Number(bounty.submissionCount || 0).toLocaleString()}</b></span></div><a href="#/bounty/${encodeURIComponent(bounty.slug)}/leaderboard">View leaderboard <span>→</span></a></aside>
    </section>
    <nav class="tabs" aria-label="Bounty sections"><a class="active" href="#/bounty/${encodeURIComponent(bounty.slug)}">Brief</a><a href="#/bounty/${encodeURIComponent(bounty.slug)}/leaderboard">Leaderboard <span>${Number(bounty.submissionCount || 0).toLocaleString()}</span></a></nav>
    <div class="detail-grid">
      <article class="prose"><section><p class="eyebrow">THE ASSIGNMENT</p><h2>What to build</h2>${richText(bounty.description)}</section>${bounty.rules ? `<section><p class="eyebrow">GUIDELINES</p><h2>Rules & requirements</h2>${richText(bounty.rules)}</section>` : ''}</article>
      <aside class="side-stack"><section class="timeline"><p class="eyebrow">TIMELINE</p><dl><div><dt>Opened</dt><dd>${dateTime(bounty.opensAt || bounty.publishedAt)}</dd></div><div><dt>Deadline</dt><dd>${dateTime(bounty.deadline)}<strong>${timeLeft(bounty.deadline)}</strong></dd></div><div><dt>Status</dt><dd>${statusLabel(bounty)}</dd></div></dl></section><section class="reward-table"><p class="eyebrow">PAYOUTS NOW</p><table><thead><tr><th>Placement</th><th>Reward</th></tr></thead><tbody>${rewardRows}</tbody></table></section></aside>
    </div>`;
}

export function leaderboardView(board, slug, limit = 50) {
  const rows = [...(board.entries || []), ...(board.rest || [])];
  const visibleRows = rows.slice(0, limit);
  const key = board.rank_key || board.overall_key || 'score';
  const entries = visibleRows.map((entry, index) => {
    const rank = entry.rank ?? entry.ranks?.performance ?? index + 1;
    const value = entry.values?.[key] ?? entry.value;
    const display = entry.display?.[key] ?? entry.display;
    const shown = key === 'judge' ? score(value, key) : (display ?? score(value, key));
    const interval = entry.interval ? `${score(entry.interval.low, key)} – ${score(entry.interval.high, key)}` : '—';
    return `<tr><td><span class="rank ${rank < 4 ? 'medal' : ''}">${rank}</span></td><td><a class="builder" href="#/profile/${encodeURIComponent(entry.handle || 'unknown')}">${avatar(entry.image, entry.handle)}<span><strong>${esc(entry.title || 'Untitled entry')}</strong><small>@${esc(entry.handle || 'unknown')}${entry.house ? ' · House' : ''}</small></span></a></td><td><strong class="score">${esc(shown)}</strong></td><td class="interval">${esc(interval)}</td><td><span class="eligibility ${entry.prize_eligible === false ? 'muted' : ''}">${entry.prize_eligible === false ? 'Not eligible' : 'Eligible'}</span></td></tr>`;
  }).join('');
  const title = board.competition?.title || board.title || slug.replaceAll('-', ' ');
  return `
    <div class="crumb"><a href="#/">Bounties</a><span>/</span><a href="#/bounty/${encodeURIComponent(slug)}">${esc(title)}</a><span>/</span><span>Leaderboard</span></div>
    <section class="leader-hero"><div><p class="eyebrow">LIVE STANDINGS</p><h1>The field,<br><em>ranked.</em></h1><p>${esc(board.phase?.title || 'Current phase')} · ${plural(rows.length, 'ranked entry', 'ranked entries')}</p></div><aside><span>Scoring view</span><strong>${esc(board.view || 'Performance')}</strong><small>${board.phase?.scores_visible === false ? 'Scores are currently held' : 'Live public scores'}</small></aside></section>
    <nav class="tabs" aria-label="Bounty sections"><a href="#/bounty/${encodeURIComponent(slug)}">Brief</a><a class="active" href="#/bounty/${encodeURIComponent(slug)}/leaderboard">Leaderboard <span>${rows.length}</span></a></nav>
    <section class="standings"><div class="standings-head"><div><p class="eyebrow">${esc(board.phase?.title || 'CURRENT')}</p><h2>${esc(board.title || 'Standings')}</h2></div><div class="legend"><i></i>90% interval where available</div></div>${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Entry / builder</th><th>${esc((board.columns || []).find((column) => column.key === key)?.title || key)}</th><th>Confidence</th><th>Prize</th></tr></thead><tbody>${entries}</tbody></table></div>${limit < rows.length ? `<div class="pager"><span>Showing ${visibleRows.length.toLocaleString()} of ${rows.length.toLocaleString()}</span><button id="load-more">Show 50 more</button></div>` : ''}` : empty('Scores will appear when make.fun publishes this phase.')}</section>`;
}

export function profileView(profile) {
  const record = profile.record || {};
  const solutions = (profile.solutions || []).map((solution) => `<article class="solution"><div><span class="${categoryClass(solution.competition?.category)}">${esc(solution.competition?.category || 'Entry')}</span><small>${dateTime(solution.entered_at)}</small></div><h3><a href="#/bounty/${encodeURIComponent(solution.competition?.slug || '')}">${esc(solution.title)}</a></h3><p>${esc(solution.competition?.title || '')}</p><footer>${solution.placement ? `<strong>#${solution.placement} place</strong>` : '<span>Entered</span>'}${solution.score?.display ? `<span>${esc(solution.score.column?.title || 'Score')}: <b>${esc(solution.score.display)}</b></span>` : ''}</footer></article>`).join('');
  return `
    <div class="crumb"><a href="#/">Bounties</a><span>/</span><span>Builders</span><span>/</span><span>@${esc(profile.handle)}</span></div>
    <section class="profile-hero"><div class="profile-avatar">${avatar(profile.image || profile.avatar, profile.handle)}</div><div><p class="eyebrow">PUBLIC BUILDER PROFILE</p><h1>${esc(profile.display_name || profile.handle)}</h1><p class="handle">@${esc(profile.handle)}</p><p class="bio">${esc(profile.bio || 'Building in public on make.fun.')}</p></div></section>
    <section class="record" aria-label="Builder record"><div><strong>${record.competitions_entered || 0}</strong><span>Competitions</span></div><div><strong>${record.competitions_placed || 0}</strong><span>Placements</span></div><div><strong>${record.competitions_won || 0}</strong><span>Wins</span></div><div><strong>${money(record.prize_usd)}</strong><span>Prize money</span></div></section>
    <section class="work"><div class="section-title"><div><p class="eyebrow">SHIP LOG</p><h2>Public entries</h2></div><p>${plural(profile.solutions?.length || 0, 'solution')}</p></div><div class="solutions">${solutions || empty('This builder has no public entries yet.')}</div></section>`;
}
