// Moj feed — osebni YouTube feed samo s temami, ki te zanimajo.
'use strict';

const $ = (s) => document.querySelector(s);
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 ur

const store = {
  get(k, d) {
    try { const v = localStorage.getItem('mf_' + k); return v ? JSON.parse(v) : d; } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem('mf_' + k, JSON.stringify(v)); } catch { /* poln ali blokiran */ }
  },
};

// ---------- Google prijava ----------
const CLIENT_ID = '525201547500-cnjne0rmlmfeh70ls7otcdb0crgb5cd5.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
const auth = {
  token: null,
  exp: 0,
  client: null,
  load() {
    try {
      const s = JSON.parse(sessionStorage.getItem('mf_token') || 'null');
      if (s && s.exp > Date.now() + 60000) { this.token = s.token; this.exp = s.exp; }
    } catch { /* ni shranjeno */ }
  },
  valid() { return !!this.token && this.exp > Date.now() + 60000; },
  wasSignedIn() { return store.get('signedIn', false); },
};
auth.load();

function initGoogle() {
  if (auth.client || !window.google?.accounts?.oauth2) return !!auth.client;
  auth.client = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      if (resp.error) { setStatus('Prijava ni uspela: ' + resp.error, true); return; }
      auth.token = resp.access_token;
      auth.exp = Date.now() + (+resp.expires_in || 3600) * 1000;
      try { sessionStorage.setItem('mf_token', JSON.stringify({ token: auth.token, exp: auth.exp })); } catch { /* */ }
      store.set('signedIn', true);
      updateLoginBtn();
      loadFeed();
    },
    error_callback: (err) => {
      if (err?.type !== 'popup_closed') setStatus('Prijavno okno se ni odprlo. Dovoli pojavna okna in poskusi znova.', true);
    },
  });
  return true;
}

function signIn() {
  if (!initGoogle()) { setStatus('Googlova prijava se še nalaga, poskusi čez trenutek.', true); return; }
  auth.client.requestAccessToken({ prompt: auth.wasSignedIn() ? '' : 'consent' });
}

function signOut() {
  if (auth.token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(auth.token, () => {});
  auth.token = null; auth.exp = 0;
  try { sessionStorage.removeItem('mf_token'); } catch { /* */ }
  store.set('signedIn', false);
  delete state.cache.__subs;
  store.set('cache', state.cache);
  if (state.active === 'subs') state.active = 'all';
  updateLoginBtn();
  loadFeed();
}

function updateLoginBtn() {
  const b = $('#btnLogin');
  const on = auth.valid();
  b.textContent = on ? 'Odjava' : (auth.wasSignedIn() ? 'Ponovno se prijavi' : 'Prijava z Googlom');
  b.classList.toggle('signed', on);
}

const LANGS = {
  sl: { label: 'SLO', rel: 'sl', codes: ['sl'] },
  sh: { label: 'SRB/HRV', rel: 'sr', codes: ['sr', 'hr', 'bs', 'sh', 'cnr'] },
  en: { label: 'ENG', rel: 'en', codes: ['en'] },
};

const DEFAULT_TOPICS = [
  { id: 't-rast', name: 'Osebnostna rast', terms: {
    sl: ['osebnostna rast', 'osebna rast', 'samorazvoj'],
    sh: ['lični razvoj', 'lični rast', 'samorazvoj'],
    en: ['personal growth', 'self improvement'] } },
  { id: 't-ai', name: 'AI', terms: {
    sl: ['umetna inteligenca'],
    sh: ['veštačka inteligencija', 'umjetna inteligencija'],
    en: ['artificial intelligence', 'AI tools', 'AI agents'] } },
  { id: 't-prodaja', name: 'Prodaja', terms: {
    sl: ['prodaja', 'prodajne tehnike'],
    sh: ['prodaja', 'tehnike prodaje'],
    en: ['sales techniques', 'sales training'] } },
  { id: 't-moska', name: 'Moška energija', terms: {
    sl: ['moška energija'],
    sh: ['muška energija'],
    en: ['masculine energy', 'masculinity'] } },
  { id: 't-tao', name: 'Taoizem', terms: {
    sl: ['taoizem', 'tao'],
    sh: ['taoizam', 'tao'],
    en: ['taoism', 'tao te ching'] } },
];

const state = {
  apiKey: store.get('apiKey', ''),
  topics: store.get('topics', DEFAULT_TOPICS),
  settings: Object.assign(
    { langs: ['sl', 'sh', 'en'], minMin: 4, period: 'year', order: 'relevance', hideWatched: false },
    store.get('settings', {})
  ),
  blocked: store.get('blocked', []), // [{id, name}]
  watched: new Set(store.get('watched', [])),
  cache: store.get('cache', {}),
  active: 'all',
  videos: [],
};

// ---------- YouTube API ----------
async function yt(endpoint, params) {
  const url = new URL('https://www.googleapis.com/youtube/v3/' + endpoint);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') url.searchParams.set(k, v);
  const headers = {};
  if (auth.valid()) headers.Authorization = 'Bearer ' + auth.token;
  else if (state.apiKey) url.searchParams.set('key', state.apiKey);
  const r = await fetch(url, { headers });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const reason = j.error?.errors?.[0]?.reason || '';
    if (reason === 'quotaExceeded') throw new Error('Dnevna kvota YouTube API je porabljena. Poskusi znova jutri (ponastavi se ob 9:00 po našem času).');
    if (reason === 'keyInvalid' || r.status === 400 && /API key/i.test(j.error?.message || '')) throw new Error('API ključ ni veljaven. Preveri ga v Nastavitvah.');
    if (r.status === 401) {
      auth.token = null; updateLoginBtn();
      throw new Error('Google prijava je potekla. Klikni "Ponovno se prijavi".');
    }
    throw new Error(j.error?.message || 'Napaka ' + r.status);
  }
  return j;
}

function parseDur(iso) {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '') || [];
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

function publishedAfter(period) {
  const days = { week: 7, month: 31, year: 365 }[period];
  return days ? new Date(Date.now() - days * 86400000).toISOString() : null;
}

function termsFor(topic, lang) {
  const t = (topic.terms?.[lang] || []).filter(Boolean);
  return t.length ? t : [topic.name];
}

async function fetchGroup(topic, lang) {
  const s = state.settings;
  const q = termsFor(topic, lang).join('|');
  const key = [topic.id, lang, q, s.order, s.period].join('§');
  const hit = state.cache[key];
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit.videos;

  const res = await yt('search', {
    part: 'snippet', type: 'video', maxResults: 25, q,
    relevanceLanguage: LANGS[lang].rel, order: s.order,
    publishedAfter: publishedAfter(s.period), videoEmbeddable: 'true',
  });
  const ids = (res.items || []).map((i) => i.id?.videoId).filter(Boolean);
  const videos = await videoDetails(ids);
  state.cache[key] = { t: Date.now(), videos };
  pruneCache();
  return videos;
}

async function videoDetails(ids) {
  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const det = await yt('videos', { part: 'snippet,contentDetails,statistics', id: ids.slice(i, i + 50).join(',') });
    videos.push(...(det.items || []).map((v) => ({
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      channelId: v.snippet.channelId,
      published: v.snippet.publishedAt,
      thumb: (v.snippet.thumbnails.medium || v.snippet.thumbnails.high || v.snippet.thumbnails.default || {}).url,
      dur: parseDur(v.contentDetails?.duration),
      lang: (v.snippet.defaultAudioLanguage || v.snippet.defaultLanguage || '').toLowerCase(),
      views: +(v.statistics?.viewCount || 0),
      live: v.snippet.liveBroadcastContent,
    })));
  }
  return videos;
}

// Najnovejši videi kanalov, na katere si naročen (zahteva prijavo).
async function fetchSubscriptions() {
  const hit = state.cache.__subs;
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit.videos;

  const channels = [];
  let pageToken;
  do {
    const r = await yt('subscriptions', { part: 'snippet', mine: 'true', maxResults: 50, order: 'relevance', pageToken });
    for (const it of r.items || []) {
      const id = it.snippet?.resourceId?.channelId;
      if (id) channels.push(id);
    }
    pageToken = r.nextPageToken;
  } while (pageToken && channels.length < 300);

  const ids = [];
  let next = 0;
  async function worker() {
    while (next < channels.length) {
      const ch = channels[next++];
      try {
        const r = await yt('playlistItems', { part: 'contentDetails', playlistId: 'UU' + ch.slice(2), maxResults: 4 });
        for (const it of r.items || []) if (it.contentDetails?.videoId) ids.push(it.contentDetails.videoId);
      } catch { /* kanal brez javnih videov */ }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));

  const videos = (await videoDetails(ids)).sort((a, b) => b.published.localeCompare(a.published));
  state.cache.__subs = { t: Date.now(), videos };
  pruneCache();
  return videos;
}

function pruneCache() {
  const now = Date.now();
  for (const [k, v] of Object.entries(state.cache)) if (now - v.t > CACHE_TTL * 4) delete state.cache[k];
  store.set('cache', state.cache);
}

// ---------- Nalaganje feeda ----------
async function loadFeed(force = false) {
  if (!state.apiKey && !auth.valid()) {
    state.videos = [];
    render();
    if (auth.wasSignedIn()) {
      setStatus('Klikni "Ponovno se prijavi" ali vnesi API ključ v Nastavitvah.', true);
    } else {
      setStatus('Za začetek se prijavi z Googlom ali vnesi YouTube API ključ v Nastavitvah.', true);
    }
    return;
  }
  if (force) state.cache = {};
  const langs = state.settings.langs;
  const groups = [];
  for (const t of state.topics) for (const l of langs) groups.push({ t, l });
  if (!groups.length) { setStatus('Ni izbranih tem ali jezikov.', true); state.videos = []; render(); return; }

  setStatus('Nalagam videe …');
  const results = [];
  const errors = [];
  for (const g of groups) {
    try {
      results.push({ ...g, videos: await fetchGroup(g.t, g.l) });
    } catch (e) {
      errors.push(e.message);
      if (/kvota|ključ/.test(e.message)) break;
    }
  }

  // Združi: vsak video enkrat, z vsemi temami, v katerih se pojavi; teme se izmenjujejo.
  const byId = new Map();
  if (auth.valid()) {
    try {
      results.push({ t: { id: 'subs' }, videos: await fetchSubscriptions() });
    } catch (e) {
      errors.push('Naročnin ni bilo mogoče naložiti: ' + e.message);
    }
  }
  const queues = results.map((r) => r.videos.map((v) => ({ v, topicId: r.t.id })));
  let added = true;
  for (let i = 0; added; i++) {
    added = false;
    for (const q of queues) {
      if (i >= q.length) continue;
      added = true;
      const { v, topicId } = q[i];
      const ex = byId.get(v.id);
      if (ex) ex.topics.add(topicId);
      else byId.set(v.id, { ...v, topics: new Set([topicId]) });
    }
  }
  state.videos = [...byId.values()];
  if (state.settings.order === 'date') state.videos.sort((a, b) => b.published.localeCompare(a.published));
  if (state.settings.order === 'viewCount') state.videos.sort((a, b) => b.views - a.views);

  render();
  if (errors.length) setStatus([...new Set(errors)].join(' '), true);
}

function langAllowed(v) {
  if (!v.lang) return true;
  const allowed = state.settings.langs.flatMap((l) => LANGS[l].codes);
  return allowed.some((c) => v.lang === c || v.lang.startsWith(c + '-'));
}

function visibleVideos() {
  const s = state.settings;
  const blocked = new Set(state.blocked.map((b) => b.id));
  return state.videos.filter((v) =>
    (state.active === 'all' ? [...v.topics].some((t) => t !== 'subs') : v.topics.has(state.active)) &&
    v.live !== 'live' && v.live !== 'upcoming' &&
    v.dur >= s.minMin * 60 &&
    !blocked.has(v.channelId) &&
    langAllowed(v) &&
    !(s.hideWatched && state.watched.has(v.id))
  );
}

// ---------- Prikaz ----------
function setStatus(msg, err = false) {
  const el = $('#status');
  el.textContent = msg;
  el.classList.toggle('err', err);
}

function fmtDur(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
function fmtViews(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' mio';
  if (n >= 1e3) return Math.round(n / 1e3) + ' tis.';
  return String(n);
}
function fmtAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 86400000;
  if (d < 1) return 'danes';
  if (d < 31) return `pred ${Math.floor(d)} d`;
  if (d < 365) return `pred ${Math.floor(d / 30)} mes.`;
  return `pred ${Math.floor(d / 365)} l.`;
}
function langLabel(code) {
  for (const l of Object.values(LANGS)) if (l.codes.some((c) => code === c || code.startsWith(c + '-'))) return l.label;
  return '';
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function renderChips() {
  const box = $('#chips');
  box.replaceChildren();
  const all = [{ id: 'all', name: 'Vse' }, ...state.topics];
  if (auth.valid()) all.splice(1, 0, { id: 'subs', name: '★ Moje naročnine' });
  for (const t of all) {
    const c = el('button', 'chip' + (t.id === 'subs' ? ' subs' : '') + (state.active === t.id ? ' active' : ''), t.name);
    c.onclick = () => { state.active = t.id; render(); };
    box.append(c);
  }
}

function render() {
  renderChips();
  const grid = $('#grid');
  grid.replaceChildren();
  const list = visibleVideos();
  const topicName = Object.fromEntries(state.topics.map((t) => [t.id, t.name]));

  for (const v of list) {
    const card = el('article', 'card' + (state.watched.has(v.id) ? ' watched' : ''));
    const th = el('div', 'thumb');
    const img = el('img');
    img.src = v.thumb; img.alt = ''; img.loading = 'lazy';
    th.append(img, el('span', 'dur', fmtDur(v.dur)));
    th.onclick = () => play(v);

    const body = el('div', 'body');
    const title = el('div', 'title', v.title);
    title.onclick = () => play(v);
    const meta = el('div', 'meta', `${v.channel} · ${fmtViews(v.views)} ogledov · ${fmtAgo(v.published)}`);
    const tags = el('div', 'tags');
    for (const id of v.topics) if (topicName[id]) tags.append(el('span', 'tag', topicName[id]));
    const ll = v.lang && langLabel(v.lang);
    if (ll) tags.append(el('span', 'tag', ll));
    const hide = el('button', 'btn tiny', 'Skrij kanal');
    hide.title = 'Nikoli več ne prikaži videov tega kanala';
    hide.onclick = () => blockChannel(v.channelId, v.channel);
    tags.append(hide);

    body.append(title, meta, tags);
    card.append(th, body);
    grid.append(card);
  }
  const ready = state.apiKey || auth.valid();
  if (ready && state.videos.length) setStatus(`${list.length} videov`);
  else if (ready && !list.length) setStatus('Ni videov za izbrane filtre.');
}

// ---------- Predvajalnik ----------
function play(v) {
  $('#playerTitle').textContent = v.title;
  $('#playerFrame').src = `https://www.youtube.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0`;
  $('#player').showModal();
  state.watched.add(v.id);
  store.set('watched', [...state.watched].slice(-2000));
}
$('#player').addEventListener('close', () => { $('#playerFrame').src = 'about:blank'; render(); });

function blockChannel(id, name) {
  if (!state.blocked.some((b) => b.id === id)) state.blocked.push({ id, name });
  store.set('blocked', state.blocked);
  render();
}

// ---------- Teme ----------
function renderTopicList() {
  const ul = $('#topicList');
  ul.replaceChildren();
  for (const t of state.topics) {
    const li = el('li');
    const name = el('span', 'name', t.name);
    const sub = el('span', 'sub', ['sl', 'sh', 'en'].map((l) => `${LANGS[l].label}: ${termsFor(t, l).join(', ')}`).join(' · '));
    name.append(sub);
    const edit = el('button', 'btn tiny', 'Uredi');
    edit.onclick = () => editTopic(t);
    const del = el('button', 'btn tiny danger', 'Izbriši');
    del.onclick = () => {
      if (!confirm(`Izbrišem temo "${t.name}"?`)) return;
      state.topics = state.topics.filter((x) => x.id !== t.id);
      if (state.active === t.id) state.active = 'all';
      saveTopics();
    };
    li.append(name, edit, del);
    ul.append(li);
  }
}

function editTopic(t) {
  const f = $('#topicForm');
  f.tid.value = t.id;
  f.tname.value = t.name;
  for (const l of ['sl', 'sh', 'en']) f[l].value = (t.terms?.[l] || []).join(', ');
  $('#topicFormTitle').textContent = 'Uredi temo';
  f.tname.focus();
}

function resetTopicForm() {
  $('#topicForm').reset();
  $("#topicForm").tid.value = '';
  $('#topicFormTitle').textContent = 'Dodaj novo temo';
}

function saveTopics() {
  store.set('topics', state.topics);
  renderTopicList();
  loadFeed();
}

$('#topicForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const topic = {
    id: f.tid.value || 't-' + Date.now().toString(36),
    name: f.tname.value.trim(),
    terms: { sl: split(f.sl.value), sh: split(f.sh.value), en: split(f.en.value) },
  };
  if (!topic.name) return;
  const i = state.topics.findIndex((t) => t.id === topic.id);
  if (i >= 0) state.topics[i] = topic; else state.topics.push(topic);
  resetTopicForm();
  saveTopics();
});
$('#topicCancel').onclick = resetTopicForm;

// ---------- Nastavitve ----------
function renderBlocked() {
  const ul = $('#blockedList');
  ul.replaceChildren();
  if (!state.blocked.length) { ul.append(el('li', null, 'Ni blokiranih kanalov.')); return; }
  for (const b of state.blocked) {
    const li = el('li');
    const un = el('button', 'btn tiny', 'Odblokiraj');
    un.onclick = () => {
      state.blocked = state.blocked.filter((x) => x.id !== b.id);
      store.set('blocked', state.blocked);
      renderBlocked();
      render();
    };
    li.append(el('span', 'name', b.name), un);
    ul.append(li);
  }
}

function openSettings() {
  const f = $('#settingsForm');
  const s = state.settings;
  f.apiKey.value = state.apiKey;
  for (const cb of f.querySelectorAll('input[name=lang]')) cb.checked = s.langs.includes(cb.value);
  f.minMin.value = s.minMin;
  f.period.value = s.period;
  f.order.value = s.order;
  f.hideWatched.checked = s.hideWatched;
  renderBlocked();
  if (!$('#settingsDlg').open) $('#settingsDlg').showModal();
}

$('#settingsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  state.apiKey = f.apiKey.value.trim();
  state.settings = {
    langs: [...f.querySelectorAll('input[name=lang]:checked')].map((c) => c.value),
    minMin: Math.max(0, +f.minMin.value || 0),
    period: f.period.value,
    order: f.order.value,
    hideWatched: f.hideWatched.checked,
  };
  store.set('apiKey', state.apiKey);
  store.set('settings', state.settings);
  $('#settingsDlg').close();
  loadFeed();
});

// ---------- Splošno ----------
for (const b of document.querySelectorAll('[data-close]')) b.onclick = () => b.closest('dialog').close();
$('#btnSettings').onclick = openSettings;
$('#btnTopics').onclick = () => { resetTopicForm(); renderTopicList(); $('#topicsDlg').showModal(); };
$('#btnRefresh').onclick = () => loadFeed(true);
$('#btnLogin').onclick = () => (auth.valid() ? signOut() : signIn());

updateLoginBtn();
loadFeed();
