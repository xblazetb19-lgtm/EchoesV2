/* ═══════════════════════════════════════════════════
   ACT-III — app.js v3.0
   ─ Edit/Delete songs
   ─ Add songs to playlists
   ─ Album artist + rename album
   ─ Drag-to-reorder in album
   ─ Remove from playlist
   ═══════════════════════════════════════════════════ */
'use strict';

/* ── CONFIG ── */
const SUPABASE_URL  = 'https://mbytanrqvqdimmpwmxng.supabase.co';
const SUPABASE_ANON = 'sb_publishable_IZAapYrvdnIlt6-8WZWgSw_dbR3KQOJ';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ── STATE ── */
let allSongs      = [];
let allAlbums     = [];
let allPlaylists  = [];
let filteredSongs = [];
let currentTab    = 'home';

// Playback
let currentQueue = [];
let currentIndex = -1;
let isPlaying    = false;

// Editing
let editingSongId    = null;  // null = create mode
let editingAlbumId   = null;  // null = create mode
let editingPlaylistId= null;  // null = create mode

// Context menu target
let ctxSong = null;  // song object the context menu is about
let ctxInPlaylist = false; // whether menu was opened from playlist detail

// Currently viewed album / playlist
let currentAlbumId    = null;
let currentPlaylistId = null;

// Confirm callback
let confirmCallback = null;

// Drag-to-reorder state (album)
let dragSrc = null;

let isSubmitting        = false;
let searchDebounceTimer = null;
let toastTimer          = null;

/* ── AUDIO ── */
const audioEl = document.getElementById('audioEl');

/* ── DOM ── */
const tabBtns           = document.querySelectorAll('.tab-btn');
const tabSections       = document.querySelectorAll('.tab-section');
const searchWrapper     = document.getElementById('searchWrapper');
const songList          = document.getElementById('songList');
const emptyState        = document.getElementById('emptyState');
const noResults         = document.getElementById('noResults');
const songCount         = document.getElementById('songCount');
const searchInput       = document.getElementById('searchInput');
const searchClear       = document.getElementById('searchClear');
// Album
const albumGrid         = document.getElementById('albumGrid');
const albumCount        = document.getElementById('albumCount');
const albumsEmpty       = document.getElementById('albumsEmpty');
const albumsGridView    = document.getElementById('albumsGridView');
const albumDetailView   = document.getElementById('albumDetailView');
const albumHeroImg      = document.getElementById('albumHeroImg');
const albumHeroName     = document.getElementById('albumHeroName');
const albumHeroArtist   = document.getElementById('albumHeroArtist');
const albumHeroCount    = document.getElementById('albumHeroCount');
const albumSongList     = document.getElementById('albumSongList');
const albumEmptyState   = document.getElementById('albumEmptyState');
const backFromAlbum     = document.getElementById('backFromAlbum');
const btnEditAlbum      = document.getElementById('btnEditAlbum');
const btnAddSongToAlbum = document.getElementById('btnAddSongToAlbum');
const btnAddExistingToAlbum = document.getElementById('btnAddExistingToAlbum');
const reorderHint       = document.getElementById('reorderHint');
// Playlist
const playlistList      = document.getElementById('playlistList');
const playlistCount     = document.getElementById('playlistCount');
const playlistsEmpty    = document.getElementById('playlistsEmpty');
const playlistsListView = document.getElementById('playlistsListView');
const playlistDetailView= document.getElementById('playlistDetailView');
const playlistHeroName  = document.getElementById('playlistHeroName');
const playlistHeroCount = document.getElementById('playlistHeroCount');
const playlistSongList  = document.getElementById('playlistSongList');
const playlistEmptyState= document.getElementById('playlistEmptyState');
const backFromPlaylist  = document.getElementById('backFromPlaylist');
const btnRenamePlaylist = document.getElementById('btnRenamePlaylist');
// FAB
const fabBtn         = document.getElementById('fabBtn');
const fabMenu        = document.getElementById('fabMenu');
const fabAddSong     = document.getElementById('fabAddSong');
const fabAddAlbum    = document.getElementById('fabAddAlbum');
const fabAddPlaylist = document.getElementById('fabAddPlaylist');
// Context menu
const ctxOverlay           = document.getElementById('ctxOverlay');
const ctxMenu              = document.getElementById('ctxMenu');
const ctxTitle             = document.getElementById('ctxTitle');
const ctxArtist            = document.getElementById('ctxArtist');
const ctxAddToPlaylist     = document.getElementById('ctxAddToPlaylist');
const ctxEdit              = document.getElementById('ctxEdit');
const ctxRemoveFromPlaylist= document.getElementById('ctxRemoveFromPlaylist');
const ctxDelete            = document.getElementById('ctxDelete');
// Modal Song
const modalSong       = document.getElementById('modalSong');
const modalSongTitle  = document.getElementById('modalSongTitle');
const modalSongClose  = document.getElementById('modalSongClose');
const btnSongCancel   = document.getElementById('btnSongCancel');
const btnSongSubmit   = document.getElementById('btnSongSubmit');
const btnSongLabel    = document.getElementById('btnSongLabel');
const btnSongLoader   = document.getElementById('btnSongLoader');
const inputTitle      = document.getElementById('inputTitle');
const inputArtist     = document.getElementById('inputArtist');
const mp3FieldGroup   = document.getElementById('mp3FieldGroup');
const mp3Wrapper      = document.getElementById('mp3Wrapper');
const inputMp3        = document.getElementById('inputMp3');
const mp3Label        = document.getElementById('mp3Label');
const inputCover      = document.getElementById('inputCover');
const coverLabel      = document.getElementById('coverLabel');
const coverPreview    = document.getElementById('coverPreview');
const inputAlbumSel   = document.getElementById('inputAlbum');
const formSongError   = document.getElementById('formSongError');
// Modal Album
const modalAlbum          = document.getElementById('modalAlbum');
const modalAlbumTitle     = document.getElementById('modalAlbumTitle');
const modalAlbumClose     = document.getElementById('modalAlbumClose');
const btnAlbumCancel      = document.getElementById('btnAlbumCancel');
const btnAlbumSubmit      = document.getElementById('btnAlbumSubmit');
const btnAlbumLabel       = document.getElementById('btnAlbumLabel');
const btnAlbumLoader      = document.getElementById('btnAlbumLoader');
const inputAlbumName      = document.getElementById('inputAlbumName');
const inputAlbumArtist    = document.getElementById('inputAlbumArtist');
const inputAlbumCover     = document.getElementById('inputAlbumCover');
const albumCoverLabel     = document.getElementById('albumCoverLabel');
const albumCoverWrapper   = document.getElementById('albumCoverWrapper');
const albumCoverPreview   = document.getElementById('albumCoverPreview');
const albumCoverRequired  = document.getElementById('albumCoverRequired');
const formAlbumError      = document.getElementById('formAlbumError');
// Modal Playlist
const modalPlaylist       = document.getElementById('modalPlaylist');
const modalPlaylistTitle  = document.getElementById('modalPlaylistTitle');
const modalPlaylistClose  = document.getElementById('modalPlaylistClose');
const btnPlaylistCancel   = document.getElementById('btnPlaylistCancel');
const btnPlaylistSubmit   = document.getElementById('btnPlaylistSubmit');
const btnPlaylistLabel    = document.getElementById('btnPlaylistLabel');
const btnPlaylistLoader   = document.getElementById('btnPlaylistLoader');
const inputPlaylistName   = document.getElementById('inputPlaylistName');
const formPlaylistError   = document.getElementById('formPlaylistError');
// Modal ATP
const modalATP        = document.getElementById('modalAddToPlaylist');
const modalATPClose   = document.getElementById('modalATPClose');
const atpSongName     = document.getElementById('atpSongName');
const playlistPickList= document.getElementById('playlistPickList');
const atpEmpty        = document.getElementById('atpEmpty');
// Modal Add Existing
const modalAddExisting      = document.getElementById('modalAddExisting');
const modalAddExistingClose = document.getElementById('modalAddExistingClose');
const addExistingAlbumName  = document.getElementById('addExistingAlbumName');
const existingSongSearch    = document.getElementById('existingSongSearch');
const existingSongList      = document.getElementById('existingSongList');
const existingSongEmpty     = document.getElementById('existingSongEmpty');
// Modal Confirm
const modalConfirm     = document.getElementById('modalConfirm');
const modalConfirmClose= document.getElementById('modalConfirmClose');
const confirmMsg       = document.getElementById('confirmMsg');
const btnConfirmNo     = document.getElementById('btnConfirmNo');
const btnConfirmYes    = document.getElementById('btnConfirmYes');
// Player
const player         = document.getElementById('player');
const playerCoverImg = document.getElementById('playerCoverImg');
const playerDiscInner= document.getElementById('playerDiscInner');
const playerTitle    = document.getElementById('playerTitle');
const playerArtist   = document.getElementById('playerArtist');
const playBtn        = document.getElementById('playBtn');
const prevBtn        = document.getElementById('prevBtn');
const nextBtn        = document.getElementById('nextBtn');
const progressBar    = document.getElementById('progressBar');
const progressFill   = document.getElementById('progressFill');
const currentTimeEl  = document.getElementById('currentTime');
const totalTimeEl    = document.getElementById('totalTime');
const liveIndicator  = document.getElementById('liveIndicator');
const toast          = document.getElementById('toast');

/* ══════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════ */
async function init() {
  registerSW();
  bindEvents();
  setupAudio();
  await Promise.all([loadAlbums(), loadPlaylists()]);
  await loadSongs();
  setupRealtime();
}

/* ══════════════════════════════════════════════════
   LOAD DATA
   ══════════════════════════════════════════════════ */
async function loadSongs() {
  showSkeletons(songList, 4);
  try {
    const { data, error } = await db
      .from('songs')
      .select('*, albums(id, name, cover_url, artist)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    allSongs = data || [];
    filteredSongs = [...allSongs];
    renderSongs(filteredSongs, songList, { useHome: true });
    updateCount(songCount, allSongs.length, 'titre');
  } catch (e) {
    console.error(e);
    showToast('Erreur de connexion');
    renderSongs([], songList, { useHome: true });
  }
}

async function loadAlbums() {
  try {
    const { data, error } = await db
      .from('albums')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    allAlbums = data || [];
    renderAlbumsGrid();
    populateAlbumSelect();
  } catch (e) { console.error(e); }
}

async function loadPlaylists() {
  try {
    const { data, error } = await db
      .from('playlists')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    allPlaylists = data || [];
    renderPlaylistsList();
  } catch (e) { console.error(e); }
}

/* ══════════════════════════════════════════════════
   RENDER — SONGS
   ══════════════════════════════════════════════════ */
function renderSongs(list, container, opts = {}) {
  container.innerHTML = '';
  if (opts.useHome) {
    const isEmpty = allSongs.length === 0;
    const noMatch = !isEmpty && list.length === 0;
    emptyState.hidden = !isEmpty;
    noResults.hidden  = !noMatch;
    container.hidden  = isEmpty || noMatch;
    if (isEmpty || noMatch) return;
  } else {
    container.hidden = false;
  }
  const frag = document.createDocumentFragment();
  list.forEach((song, i) => frag.appendChild(createSongEl(song, i, list, opts)));
  container.appendChild(frag);
}

function getCoverUrl(song) {
  if (song.cover_url) return song.cover_url;
  if (song.albums?.cover_url) return song.albums.cover_url;
  const album = allAlbums.find(a => a.id === song.album_id);
  return album?.cover_url || null;
}

function createSongEl(song, index, queue, opts = {}) {
  const li = document.createElement('li');
  li.classList.add('song-item');
  li.dataset.id = song.id;
  li.style.animationDelay = `${Math.min(index * 40, 400)}ms`;

  const coverUrl = getCoverUrl(song);
  const initial  = (song.title[0] || '♪').toUpperCase();
  const isCurrent = currentQueue[currentIndex]?.id === song.id;
  if (isCurrent && isPlaying) li.classList.add('playing');

  // Drag handle only in album view
  const dragHandle = opts.sortable
    ? `<div class="drag-handle" draggable="true" title="Réorganiser">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M8 6h8M8 12h8M8 18h8"/></svg>
       </div>`
    : '';

  li.innerHTML = `
    ${dragHandle}
    <div class="song-avatar">
      ${coverUrl ? `<img class="song-cover-img" src="${esc(coverUrl)}" alt="" />` : `<span class="song-avatar-letter">${initial}</span>`}
      <div class="now-playing-bars" aria-hidden="true"><div class="bar"></div><div class="bar"></div><div class="bar"></div></div>
    </div>
    <div class="song-info">
      <p class="song-title">${esc(song.title)}</p>
      <p class="song-artist">${esc(song.artist)}</p>
    </div>
    <button class="btn-more" data-id="${song.id}" aria-label="Options">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
      </svg>
    </button>
  `;

  // Play
  li.addEventListener('click', e => {
    if (e.target.closest('.btn-more') || e.target.closest('.drag-handle')) return;
    playSongInQueue(queue, index);
  });

  // Context menu
  li.querySelector('.btn-more').addEventListener('click', e => {
    e.stopPropagation();
    openCtxMenu(song, opts.inPlaylist ?? false);
  });

  // Drag-to-reorder (album only)
  if (opts.sortable) {
    const handle = li.querySelector('.drag-handle');
    li.setAttribute('draggable', 'false');
    handle.addEventListener('mousedown', () => { li.setAttribute('draggable', 'true'); });
    handle.addEventListener('touchstart', () => { li.setAttribute('draggable', 'true'); }, { passive: true });
    li.addEventListener('dragstart', e => {
      dragSrc = li;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => li.classList.add('dragging'), 0);
    });
    li.addEventListener('dragend', () => {
      li.setAttribute('draggable', 'false');
      li.classList.remove('dragging');
      document.querySelectorAll('.song-item.drag-over').forEach(el => el.classList.remove('drag-over'));
      saveAlbumOrder();
    });
    li.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragSrc && dragSrc !== li) {
        document.querySelectorAll('.song-item.drag-over').forEach(el => el.classList.remove('drag-over'));
        li.classList.add('drag-over');
      }
    });
    li.addEventListener('drop', e => {
      e.preventDefault();
      if (dragSrc && dragSrc !== li) {
        const parent = li.parentNode;
        const allItems = [...parent.querySelectorAll('.song-item')];
        const srcIdx = allItems.indexOf(dragSrc);
        const tgtIdx = allItems.indexOf(li);
        if (srcIdx < tgtIdx) parent.insertBefore(dragSrc, li.nextSibling);
        else parent.insertBefore(dragSrc, li);
        li.classList.remove('drag-over');
      }
    });
  }

  return li;
}

/* ══════════════════════════════════════════════════
   RENDER — ALBUMS
   ══════════════════════════════════════════════════ */
function renderAlbumsGrid() {
  albumGrid.innerHTML = '';
  updateCount(albumCount, allAlbums.length, 'album');
  albumsEmpty.hidden = allAlbums.length > 0;
  allAlbums.forEach(album => {
    const card = document.createElement('div');
    card.classList.add('album-card');
    card.dataset.id = album.id;
    card.innerHTML = `
      <div class="album-card-cover">
        ${album.cover_url
          ? `<img src="${esc(album.cover_url)}" alt="${esc(album.name)}" />`
          : `<div class="album-card-placeholder">◉</div>`}
      </div>
      <div class="album-card-info">
        <p class="album-card-name">${esc(album.name)}</p>
        ${album.artist ? `<p class="album-card-artist">${esc(album.artist)}</p>` : ''}
      </div>
    `;
    card.addEventListener('click', () => openAlbumDetail(album));
    albumGrid.appendChild(card);
  });
}

async function openAlbumDetail(album) {
  currentAlbumId = album.id;
  albumHeroImg.src    = album.cover_url || '';
  albumHeroImg.hidden = !album.cover_url;
  albumHeroName.textContent   = album.name;
  albumHeroArtist.textContent = album.artist || '';
  albumHeroArtist.hidden      = !album.artist;
  albumsGridView.hidden  = true;
  albumDetailView.hidden = false;
  await refreshAlbumSongs();
}

async function refreshAlbumSongs() {
  showSkeletons(albumSongList, 3);
  try {
    const { data, error } = await db
      .from('songs')
      .select('*, albums(id, name, cover_url, artist)')
      .eq('album_id', currentAlbumId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    const songs = data || [];
    albumHeroCount.textContent = `${songs.length} titre${songs.length !== 1 ? 's' : ''}`;
    reorderHint.hidden = songs.length < 2;
    if (songs.length === 0) {
      albumSongList.innerHTML = '';
      albumSongList.hidden = true;
      albumEmptyState.hidden = false;
    } else {
      albumEmptyState.hidden = true;
      albumSongList.hidden = false;
      renderSongs(songs, albumSongList, { sortable: true });
    }
  } catch (e) { console.error(e); }
}

/* Save drag order to DB — stores sort_order as row index */
async function saveAlbumOrder() {
  const items = [...albumSongList.querySelectorAll('.song-item')];
  const updates = items.map((el, i) => db.from('songs').update({ sort_order: i }).eq('id', el.dataset.id));
  await Promise.all(updates);
  showToast('Ordre sauvegardé ✓');
}

/* ══════════════════════════════════════════════════
   RENDER — PLAYLISTS
   ══════════════════════════════════════════════════ */
function renderPlaylistsList() {
  playlistList.innerHTML = '';
  updateCount(playlistCount, allPlaylists.length, 'playlist');
  playlistsEmpty.hidden = allPlaylists.length > 0;
  allPlaylists.forEach(pl => {
    const item = document.createElement('div');
    item.classList.add('playlist-item');
    item.dataset.id = pl.id;
    item.innerHTML = `
      <div class="playlist-item-icon">♫</div>
      <div class="song-info"><p class="song-title">${esc(pl.name)}</p></div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" class="chevron"><path d="M9 18l6-6-6-6"/></svg>
    `;
    item.addEventListener('click', () => openPlaylistDetail(pl));
    playlistList.appendChild(item);
  });
}

async function openPlaylistDetail(playlist) {
  currentPlaylistId = playlist.id;
  playlistHeroName.textContent = playlist.name;
  playlistsListView.hidden    = true;
  playlistDetailView.hidden   = false;
  showSkeletons(playlistSongList, 3);
  try {
    const { data, error } = await db
      .from('playlist_songs')
      .select('songs(*, albums(id, name, cover_url, artist))')
      .eq('playlist_id', playlist.id);
    if (error) throw error;
    const songs = (data || []).map(r => r.songs).filter(Boolean);
    playlistHeroCount.textContent = `${songs.length} titre${songs.length !== 1 ? 's' : ''}`;
    if (songs.length === 0) {
      playlistSongList.innerHTML = '';
      playlistSongList.hidden = true;
      playlistEmptyState.hidden = false;
    } else {
      playlistEmptyState.hidden = true;
      playlistSongList.hidden = false;
      renderSongs(songs, playlistSongList, { inPlaylist: true });
    }
  } catch (e) { console.error(e); }
}

/* ══════════════════════════════════════════════════
   CONTEXT MENU
   ══════════════════════════════════════════════════ */
function openCtxMenu(song, inPlaylist) {
  ctxSong = song;
  ctxInPlaylist = inPlaylist;
  ctxTitle.textContent  = song.title;
  ctxArtist.textContent = song.artist;
  ctxRemoveFromPlaylist.hidden = !inPlaylist;
  ctxOverlay.hidden = false;
  ctxMenu.hidden    = false;
  document.body.style.overflow = 'hidden';
}

function closeCtxMenu() {
  ctxOverlay.hidden = true;
  ctxMenu.hidden    = true;
  document.body.style.overflow = '';
  ctxSong = null;
}

/* ══════════════════════════════════════════════════
   ADD SONG
   ══════════════════════════════════════════════════ */
async function submitSong() {
  if (isSubmitting) return;
  const title   = inputTitle.value.trim();
  const artist  = inputArtist.value.trim();
  const mp3     = inputMp3.files[0];
  const cover   = inputCover.files[0] || null;
  const albumId = inputAlbumSel.value ? parseInt(inputAlbumSel.value) : null;

  clearError(formSongError);
  let valid = true;
  if (!title)                        { inputTitle.classList.add('error');  valid = false; }
  if (!artist)                       { inputArtist.classList.add('error'); valid = false; }
  if (!editingSongId && !mp3)        { mp3Wrapper.classList.add('error');  valid = false; }
  if (!valid) { showError(formSongError, 'Remplissez les champs obligatoires.'); return; }

  isSubmitting = true;
  setLoading(btnSongSubmit, btnSongLabel, btnSongLoader, true, editingSongId ? 'Sauvegarde…' : 'Upload…');

  try {
    let audioUrl = null;
    let coverUrl = null;

    if (mp3) {
      const path = `${Date.now()}-${sanitize(mp3.name)}`;
      const { error: e1 } = await db.storage.from('songs').upload(path, mp3, { contentType: 'audio/mpeg' });
      if (e1) throw e1;
      audioUrl = db.storage.from('songs').getPublicUrl(path).data.publicUrl;
    }

    if (cover) {
      const path = `${Date.now()}-${sanitize(cover.name)}`;
      const { error: e2 } = await db.storage.from('covers').upload(path, cover, { contentType: cover.type });
      if (e2) throw e2;
      coverUrl = db.storage.from('covers').getPublicUrl(path).data.publicUrl;
    }

    if (editingSongId) {
      // UPDATE
      const payload = { title, artist, album_id: albumId };
      if (audioUrl) payload.audio_url = audioUrl;
      if (coverUrl) payload.cover_url = coverUrl;
      const { error } = await db.from('songs').update(payload).eq('id', editingSongId);
      if (error) throw error;
      // Update local
      const local = allSongs.find(s => s.id === editingSongId);
      if (local) {
        Object.assign(local, { title, artist, album_id: albumId });
        if (audioUrl) local.audio_url = audioUrl;
        if (coverUrl) local.cover_url = coverUrl;
        local.albums = allAlbums.find(a => a.id === albumId) || null;
      }
      showToast(`✓ "${title}" modifié`);
    } else {
      // INSERT
      const payload = { title, artist, audio_url: audioUrl, cover_url: coverUrl, album_id: albumId };
      const { data, error } = await db.from('songs').insert([payload]).select('*, albums(id,name,cover_url,artist)').single();
      if (error) throw error;
      if (!allSongs.find(s => s.id === data.id)) allSongs.unshift(data);
      showToast(`♪ "${title}" ajouté !`);
    }

    closeSongModal();
    filteredSongs = applySearch(allSongs, searchInput.value);
    renderSongs(filteredSongs, songList, { useHome: true });
    updateCount(songCount, allSongs.length, 'titre');
    if (currentAlbumId && !albumDetailView.hidden) await refreshAlbumSongs();

  } catch (err) {
    console.error(err);
    showError(formSongError, 'Erreur lors de l\'upload. Vérifiez la connexion.');
  } finally {
    isSubmitting = false;
    setLoading(btnSongSubmit, btnSongLabel, btnSongLoader, false, editingSongId ? 'Sauvegarder' : 'Ajouter');
  }
}

/* ══════════════════════════════════════════════════
   DELETE SONG
   ══════════════════════════════════════════════════ */
function confirmDeleteSong(song) {
  confirmMsg.textContent = `Supprimer définitivement "${song.title}" ?`;
  confirmCallback = async () => {
    try {
      const { error } = await db.from('songs').delete().eq('id', song.id);
      if (error) throw error;
      allSongs = allSongs.filter(s => s.id !== song.id);
      filteredSongs = applySearch(allSongs, searchInput.value);
      renderSongs(filteredSongs, songList, { useHome: true });
      updateCount(songCount, allSongs.length, 'titre');
      if (!albumDetailView.hidden) await refreshAlbumSongs();
      if (!playlistDetailView.hidden) {
        const pl = allPlaylists.find(p => p.id === currentPlaylistId);
        if (pl) await openPlaylistDetail(pl);
      }
      showToast(`🗑 "${song.title}" supprimé`);
    } catch (e) { console.error(e); showToast('Erreur lors de la suppression'); }
  };
  modalConfirm.hidden = false;
  document.body.style.overflow = 'hidden';
}

/* ══════════════════════════════════════════════════
   CREATE / EDIT ALBUM
   ══════════════════════════════════════════════════ */
async function submitAlbum() {
  if (isSubmitting) return;
  const name   = inputAlbumName.value.trim();
  const artist = inputAlbumArtist.value.trim();
  const cover  = inputAlbumCover.files[0] || null;

  clearError(formAlbumError);
  let valid = true;
  if (!name)                      { inputAlbumName.classList.add('error'); valid = false; }
  if (!editingAlbumId && !cover)  { albumCoverWrapper.classList.add('error'); valid = false; }
  if (!valid) { showError(formAlbumError, 'Remplissez les champs obligatoires.'); return; }

  isSubmitting = true;
  setLoading(btnAlbumSubmit, btnAlbumLabel, btnAlbumLoader, true, editingAlbumId ? 'Sauvegarde…' : 'Création…');

  try {
    let coverUrl = null;
    if (cover) {
      const path = `${Date.now()}-${sanitize(cover.name)}`;
      const { error: e } = await db.storage.from('covers').upload(path, cover, { contentType: cover.type });
      if (e) throw e;
      coverUrl = db.storage.from('covers').getPublicUrl(path).data.publicUrl;
    }

    if (editingAlbumId) {
      const payload = { name, artist: artist || null };
      if (coverUrl) payload.cover_url = coverUrl;
      const { error } = await db.from('albums').update(payload).eq('id', editingAlbumId);
      if (error) throw error;
      const local = allAlbums.find(a => a.id === editingAlbumId);
      if (local) { local.name = name; local.artist = artist || null; if (coverUrl) local.cover_url = coverUrl; }
      // Update hero if we're in that album's detail
      if (currentAlbumId === editingAlbumId) {
        albumHeroName.textContent   = name;
        albumHeroArtist.textContent = artist || '';
        albumHeroArtist.hidden      = !artist;
        if (coverUrl) albumHeroImg.src = coverUrl;
      }
      showToast(`✓ Album modifié`);
    } else {
      const { data, error } = await db.from('albums').insert([{ name, artist: artist || null, cover_url: coverUrl }]).select().single();
      if (error) throw error;
      allAlbums.unshift(data);
      showToast(`◉ Album "${name}" créé !`);
    }

    closeAlbumModal();
    renderAlbumsGrid();
    populateAlbumSelect();

  } catch (err) {
    console.error(err);
    showError(formAlbumError, 'Erreur lors de la création.');
  } finally {
    isSubmitting = false;
    setLoading(btnAlbumSubmit, btnAlbumLabel, btnAlbumLoader, false, editingAlbumId ? 'Sauvegarder' : 'Créer');
  }
}

/* ══════════════════════════════════════════════════
   CREATE / RENAME PLAYLIST
   ══════════════════════════════════════════════════ */
async function submitPlaylist() {
  if (isSubmitting) return;
  const name = inputPlaylistName.value.trim();
  clearError(formPlaylistError);
  if (!name) { inputPlaylistName.classList.add('error'); showError(formPlaylistError, 'Entrez un nom.'); return; }

  isSubmitting = true;
  setLoading(btnPlaylistSubmit, btnPlaylistLabel, btnPlaylistLoader, true, editingPlaylistId ? 'Sauvegarde…' : 'Création…');

  try {
    if (editingPlaylistId) {
      const { error } = await db.from('playlists').update({ name }).eq('id', editingPlaylistId);
      if (error) throw error;
      const local = allPlaylists.find(p => p.id === editingPlaylistId);
      if (local) local.name = name;
      playlistHeroName.textContent = name;
      showToast(`✓ Playlist renommée`);
    } else {
      const { data, error } = await db.from('playlists').insert([{ name }]).select().single();
      if (error) throw error;
      allPlaylists.unshift(data);
      showToast(`≡ Playlist "${name}" créée !`);
    }
    closePlaylistModal();
    renderPlaylistsList();
  } catch (err) {
    console.error(err);
    showError(formPlaylistError, 'Erreur lors de la création.');
  } finally {
    isSubmitting = false;
    setLoading(btnPlaylistSubmit, btnPlaylistLabel, btnPlaylistLoader, false, editingPlaylistId ? 'Sauvegarder' : 'Créer');
  }
}

/* ══════════════════════════════════════════════════
   ADD SONG TO PLAYLIST
   ══════════════════════════════════════════════════ */
function openATPModal(song) {
  atpSongName.textContent = `"${song.title}"`;
  playlistPickList.innerHTML = '';
  atpEmpty.hidden = allPlaylists.length > 0;
  allPlaylists.forEach(pl => {
    const btn = document.createElement('button');
    btn.classList.add('playlist-pick-btn');
    btn.innerHTML = `<span class="playlist-item-icon">♫</span> ${esc(pl.name)}`;
    btn.addEventListener('click', () => addSongToPlaylist(song, pl));
    playlistPickList.appendChild(btn);
  });
  modalATP.hidden = false;
  document.body.style.overflow = 'hidden';
}

async function addSongToPlaylist(song, playlist) {
  try {
    const { data: existing } = await db
      .from('playlist_songs').select('id')
      .eq('playlist_id', playlist.id).eq('song_id', song.id).maybeSingle();
    if (existing) { showToast('Déjà dans cette playlist'); }
    else {
      const { error } = await db.from('playlist_songs').insert([{ playlist_id: playlist.id, song_id: song.id }]);
      if (error) throw error;
      showToast(`Ajouté à "${playlist.name}" !`);
    }
  } catch (e) { console.error(e); showToast('Erreur lors de l\'ajout'); }
  closeModal(modalATP);
}

/* ══════════════════════════════════════════════════
   REMOVE SONG FROM PLAYLIST
   ══════════════════════════════════════════════════ */
async function removeSongFromPlaylist(song) {
  try {
    const { error } = await db.from('playlist_songs')
      .delete().eq('playlist_id', currentPlaylistId).eq('song_id', song.id);
    if (error) throw error;
    showToast('Retiré de la playlist');
    const pl = allPlaylists.find(p => p.id === currentPlaylistId);
    if (pl) await openPlaylistDetail(pl);
  } catch (e) { console.error(e); showToast('Erreur'); }
}

/* ══════════════════════════════════════════════════
   ADD EXISTING SONG TO ALBUM
   ══════════════════════════════════════════════════ */
function openAddExistingModal() {
  const album = allAlbums.find(a => a.id === currentAlbumId);
  addExistingAlbumName.textContent = album ? `Album : "${album.name}"` : '';
  existingSongSearch.value = '';
  renderExistingList('');
  modalAddExisting.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => existingSongSearch.focus(), 300);
}

function renderExistingList(q) {
  existingSongList.innerHTML = '';
  let list = allSongs.filter(s => s.album_id !== currentAlbumId);
  if (q) {
    const lq = q.toLowerCase();
    list = list.filter(s => s.title.toLowerCase().includes(lq) || s.artist.toLowerCase().includes(lq));
  }
  existingSongEmpty.hidden = list.length > 0;
  list.forEach(song => {
    const btn = document.createElement('button');
    btn.classList.add('playlist-pick-btn');
    const cover = getCoverUrl(song);
    btn.innerHTML = `
      ${cover ? `<img src="${esc(cover)}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;flex-shrink:0" />` : `<span class="playlist-item-icon" style="width:36px;height:36px;font-size:14px">♪</span>`}
      <span style="flex:1;min-width:0;text-align:left">
        <span style="display:block;font-size:14px;font-weight:500">${esc(song.title)}</span>
        <span style="display:block;font-size:12px;color:var(--text-2)">${esc(song.artist)}</span>
      </span>
    `;
    btn.addEventListener('click', () => assignToAlbum(song));
    existingSongList.appendChild(btn);
  });
}

async function assignToAlbum(song) {
  try {
    const { error } = await db.from('songs').update({ album_id: currentAlbumId }).eq('id', song.id);
    if (error) throw error;
    const local = allSongs.find(s => s.id === song.id);
    if (local) { local.album_id = currentAlbumId; local.albums = allAlbums.find(a => a.id === currentAlbumId) || null; }
    showToast(`"${song.title}" ajouté à l'album !`);
    closeModal(modalAddExisting);
    filteredSongs = applySearch(allSongs, searchInput.value);
    renderSongs(filteredSongs, songList, { useHome: true });
    await refreshAlbumSongs();
  } catch (e) { console.error(e); showToast('Erreur'); }
}

/* ══════════════════════════════════════════════════
   REALTIME
   ══════════════════════════════════════════════════ */
function setupRealtime() {
  db.channel('songs-rt').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'songs' }, p => {
    const s = p.new;
    if (allSongs.find(x => x.id === s.id)) return;
    if (s.album_id) s.albums = allAlbums.find(a => a.id === s.album_id) || null;
    allSongs.unshift(s);
    filteredSongs = applySearch(allSongs, searchInput.value);
    renderSongs(filteredSongs, songList, { useHome: true });
    updateCount(songCount, allSongs.length, 'titre');
    showToast('♪ Nouveau titre !');
  }).subscribe(status => liveIndicator.classList.toggle('active', status === 'SUBSCRIBED'));

  db.channel('albums-rt').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'albums' }, p => {
    const a = p.new;
    if (allAlbums.find(x => x.id === a.id)) return;
    allAlbums.unshift(a);
    renderAlbumsGrid();
    populateAlbumSelect();
    showToast('◉ Nouvel album !');
  }).subscribe();

  db.channel('playlists-rt').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'playlists' }, p => {
    const pl = p.new;
    if (allPlaylists.find(x => x.id === pl.id)) return;
    allPlaylists.unshift(pl);
    renderPlaylistsList();
    showToast('≡ Nouvelle playlist !');
  }).subscribe();
}

/* ══════════════════════════════════════════════════
   AUDIO PLAYER
   ══════════════════════════════════════════════════ */
function setupAudio() {
  audioEl.addEventListener('timeupdate', () => {
    if (!audioEl.duration) return;
    const r = audioEl.currentTime / audioEl.duration;
    progressFill.style.width = `${r * 100}%`;
    currentTimeEl.textContent = fmt(audioEl.currentTime);
  });
  audioEl.addEventListener('loadedmetadata', () => { totalTimeEl.textContent = fmt(audioEl.duration); });
  audioEl.addEventListener('ended', playNext);
  audioEl.addEventListener('play',  () => { isPlaying = true;  updatePlayBtn(); player.classList.add('playing');    updateHighlights(); });
  audioEl.addEventListener('pause', () => { isPlaying = false; updatePlayBtn(); player.classList.remove('playing'); updateHighlights(); });
  progressBar.addEventListener('click', e => {
    if (!audioEl.duration) return;
    const r = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
    audioEl.currentTime = r * audioEl.duration;
  });
}

function playSongInQueue(queue, index) {
  currentQueue = queue;
  currentIndex = index;
  loadAndPlay(queue[index]);
}

function loadAndPlay(song) {
  if (!song?.audio_url) { showToast('Pas de fichier audio'); return; }
  audioEl.src = song.audio_url;
  audioEl.load();
  audioEl.play().catch(console.warn);
  playerTitle.textContent  = song.title;
  playerArtist.textContent = song.artist;
  const cover = getCoverUrl(song);
  if (cover) { playerCoverImg.src = cover; playerCoverImg.hidden = false; playerDiscInner.hidden = true; }
  else        { playerCoverImg.hidden = true; playerDiscInner.hidden = false; }
  updateHighlights();
}

function togglePlayPause() { if (!audioEl.src) return; isPlaying ? audioEl.pause() : audioEl.play().catch(console.warn); }
function playNext() { if (!currentQueue.length) return; currentIndex = (currentIndex + 1) % currentQueue.length; loadAndPlay(currentQueue[currentIndex]); }
function playPrev() {
  if (!currentQueue.length) return;
  if (audioEl.currentTime > 3) { audioEl.currentTime = 0; return; }
  currentIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
  loadAndPlay(currentQueue[currentIndex]);
}

function updatePlayBtn() {
  playBtn.querySelector('.icon-play').style.display  = isPlaying ? 'none'  : 'block';
  playBtn.querySelector('.icon-pause').style.display = isPlaying ? 'block' : 'none';
}

function updateHighlights() {
  document.querySelectorAll('.song-item').forEach(el => el.classList.remove('playing'));
  if (currentQueue[currentIndex]) {
    document.querySelectorAll(`.song-item[data-id="${currentQueue[currentIndex].id}"]`).forEach(el => el.classList.add('playing'));
  }
}

function fmt(s) {
  if (isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/* ══════════════════════════════════════════════════
   SEARCH
   ══════════════════════════════════════════════════ */
function handleSearch() {
  const q = searchInput.value.trim();
  searchClear.classList.toggle('visible', q.length > 0);
  filteredSongs = applySearch(allSongs, q);
  renderSongs(filteredSongs, songList, { useHome: true });
}

function applySearch(songs, q) {
  if (!q) return [...songs];
  const lq = q.toLowerCase();
  return songs.filter(s => s.title.toLowerCase().includes(lq) || s.artist.toLowerCase().includes(lq));
}

/* ══════════════════════════════════════════════════
   TABS
   ══════════════════════════════════════════════════ */
function switchTab(id) {
  currentTab = id;
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  tabSections.forEach(s => s.classList.toggle('active', s.id === `tab-${id}`));
  searchWrapper.hidden = id !== 'home';
}

/* ══════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════ */
function populateAlbumSelect() {
  inputAlbumSel.innerHTML = '<option value="">— Aucun album —</option>';
  allAlbums.forEach(a => {
    const o = document.createElement('option');
    o.value = a.id; o.textContent = a.name;
    inputAlbumSel.appendChild(o);
  });
}

function updateCount(el, count, unit) {
  el.textContent = count === 0 ? `— ${unit}s` : `${count} ${unit}${count > 1 ? 's' : ''}`;
}

function showSkeletons(container, n) {
  container.innerHTML = '';
  container.hidden = false;
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.classList.add('skeleton');
    d.style.animationDelay = `${i * 0.1}s`;
    container.appendChild(d);
  }
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

function sanitize(n) { return n.replace(/[^a-zA-Z0-9.\-_]/g, '_'); }

function setLoading(btn, lbl, loader, on, text) {
  btn.disabled = on; lbl.textContent = text; loader.hidden = !on;
}

function showError(el, msg) { el.textContent = msg; el.hidden = false; }
function clearError(el) { el.textContent = ''; el.hidden = true; }

function showToast(msg, dur = 2500) {
  clearTimeout(toastTimer);
  toast.textContent = msg; toast.hidden = false; toast.offsetHeight;
  toast.classList.add('show');
  toastTimer = setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { toast.hidden = true; }, 300); }, dur);
}

/* ══════════════════════════════════════════════════
   MODALS OPEN/CLOSE HELPERS
   ══════════════════════════════════════════════════ */
function closeModal(el) { el.hidden = true; document.body.style.overflow = ''; }

function openSongModal(mode = 'create', song = null) {
  closeFabMenu();
  editingSongId = mode === 'edit' ? song.id : null;
  modalSongTitle.textContent = mode === 'edit' ? 'Modifier la musique' : 'Nouvelle musique';
  btnSongLabel.textContent   = mode === 'edit' ? 'Sauvegarder' : 'Ajouter';
  mp3FieldGroup.hidden = mode === 'edit'; // MP3 re-upload optional on edit

  // Reset
  inputTitle.value  = mode === 'edit' ? song.title  : '';
  inputArtist.value = mode === 'edit' ? song.artist : '';
  inputMp3.value    = '';
  inputCover.value  = '';
  mp3Label.textContent   = 'Choisir un fichier MP3';
  coverLabel.textContent = 'Choisir une image';
  coverPreview.hidden    = true;
  mp3Wrapper.classList.remove('error');
  inputTitle.classList.remove('error');
  inputArtist.classList.remove('error');
  clearError(formSongError);
  populateAlbumSelect();
  inputAlbumSel.value = mode === 'edit' ? (song.album_id || '') : (currentAlbumId || '');

  modalSong.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => inputTitle.focus(), 350);
}

function closeSongModal() { closeModal(modalSong); editingSongId = null; }

function openAlbumModal(mode = 'create', album = null) {
  closeFabMenu();
  editingAlbumId = mode === 'edit' ? album.id : null;
  modalAlbumTitle.textContent = mode === 'edit' ? 'Modifier l\'album' : 'Nouvel album';
  btnAlbumLabel.textContent   = mode === 'edit' ? 'Sauvegarder' : 'Créer';
  albumCoverRequired.textContent = mode === 'edit' ? '(optionnelle)' : '*';

  inputAlbumName.value   = mode === 'edit' ? album.name   : '';
  inputAlbumArtist.value = mode === 'edit' ? (album.artist || '') : '';
  inputAlbumCover.value  = '';
  albumCoverLabel.textContent = 'Choisir une image';
  albumCoverPreview.src   = mode === 'edit' && album.cover_url ? album.cover_url : '';
  albumCoverPreview.hidden = !(mode === 'edit' && album.cover_url);
  albumCoverWrapper.classList.remove('error');
  inputAlbumName.classList.remove('error');
  clearError(formAlbumError);

  modalAlbum.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => inputAlbumName.focus(), 350);
}

function closeAlbumModal() { closeModal(modalAlbum); editingAlbumId = null; }

function openPlaylistModal(mode = 'create', playlist = null) {
  closeFabMenu();
  editingPlaylistId = mode === 'rename' ? playlist.id : null;
  modalPlaylistTitle.textContent = mode === 'rename' ? 'Renommer la playlist' : 'Nouvelle playlist';
  btnPlaylistLabel.textContent   = mode === 'rename' ? 'Sauvegarder' : 'Créer';
  inputPlaylistName.value = mode === 'rename' ? playlist.name : '';
  inputPlaylistName.classList.remove('error');
  clearError(formPlaylistError);
  modalPlaylist.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => inputPlaylistName.focus(), 350);
}

function closePlaylistModal() { closeModal(modalPlaylist); editingPlaylistId = null; }

function openFabMenu() { fabMenu.hidden = false; fabBtn.classList.add('open'); }
function closeFabMenu() { fabMenu.hidden = true; fabBtn.classList.remove('open'); }

/* ══════════════════════════════════════════════════
   EVENTS
   ══════════════════════════════════════════════════ */
function bindEvents() {

  /* Tabs */
  tabBtns.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  /* Search */
  searchInput.addEventListener('input', () => { clearTimeout(searchDebounceTimer); searchDebounceTimer = setTimeout(handleSearch, 220); });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    filteredSongs = [...allSongs];
    renderSongs(filteredSongs, songList, { useHome: true });
    searchInput.focus();
  });

  /* FAB */
  fabBtn.addEventListener('click', () => { fabMenu.hidden ? openFabMenu() : closeFabMenu(); });
  fabAddSong.addEventListener('click', () => openSongModal('create'));
  fabAddAlbum.addEventListener('click', () => openAlbumModal('create'));
  fabAddPlaylist.addEventListener('click', () => openPlaylistModal('create'));
  document.addEventListener('click', e => {
    if (!fabMenu.hidden && !fabBtn.contains(e.target) && !fabMenu.contains(e.target)) closeFabMenu();
  });

  /* Context menu */
  ctxOverlay.addEventListener('click', closeCtxMenu);
  ctxAddToPlaylist.addEventListener('click', () => { const s = ctxSong; closeCtxMenu(); openATPModal(s); });
  ctxEdit.addEventListener('click', () => { const s = ctxSong; closeCtxMenu(); openSongModal('edit', s); });
  ctxRemoveFromPlaylist.addEventListener('click', () => { const s = ctxSong; closeCtxMenu(); removeSongFromPlaylist(s); });
  ctxDelete.addEventListener('click', () => { const s = ctxSong; closeCtxMenu(); confirmDeleteSong(s); });

  /* Modal song */
  modalSongClose.addEventListener('click', closeSongModal);
  btnSongCancel.addEventListener('click', closeSongModal);
  btnSongSubmit.addEventListener('click', submitSong);
  modalSong.addEventListener('click', e => { if (e.target === modalSong) closeSongModal(); });
  inputMp3.addEventListener('change', () => { mp3Label.textContent = inputMp3.files[0]?.name || 'Choisir un fichier MP3'; mp3Wrapper.classList.remove('error'); });
  inputCover.addEventListener('change', () => {
    const f = inputCover.files[0];
    coverLabel.textContent = f?.name || 'Choisir une image';
    if (f) { const r = new FileReader(); r.onload = e => { coverPreview.src = e.target.result; coverPreview.hidden = false; }; r.readAsDataURL(f); }
    else coverPreview.hidden = true;
  });

  /* Modal album */
  modalAlbumClose.addEventListener('click', closeAlbumModal);
  btnAlbumCancel.addEventListener('click', closeAlbumModal);
  btnAlbumSubmit.addEventListener('click', submitAlbum);
  modalAlbum.addEventListener('click', e => { if (e.target === modalAlbum) closeAlbumModal(); });
  inputAlbumCover.addEventListener('change', () => {
    const f = inputAlbumCover.files[0];
    albumCoverLabel.textContent = f?.name || 'Choisir une image';
    albumCoverWrapper.classList.remove('error');
    if (f) { const r = new FileReader(); r.onload = e => { albumCoverPreview.src = e.target.result; albumCoverPreview.hidden = false; }; r.readAsDataURL(f); }
    else albumCoverPreview.hidden = true;
  });

  /* Modal playlist */
  modalPlaylistClose.addEventListener('click', closePlaylistModal);
  btnPlaylistCancel.addEventListener('click', closePlaylistModal);
  btnPlaylistSubmit.addEventListener('click', submitPlaylist);
  modalPlaylist.addEventListener('click', e => { if (e.target === modalPlaylist) closePlaylistModal(); });

  /* Modal ATP */
  modalATPClose.addEventListener('click', () => closeModal(modalATP));
  modalATP.addEventListener('click', e => { if (e.target === modalATP) closeModal(modalATP); });

  /* Modal Add Existing */
  modalAddExistingClose.addEventListener('click', () => closeModal(modalAddExisting));
  modalAddExisting.addEventListener('click', e => { if (e.target === modalAddExisting) closeModal(modalAddExisting); });
  existingSongSearch.addEventListener('input', () => renderExistingList(existingSongSearch.value.trim()));

  /* Modal Confirm */
  modalConfirmClose.addEventListener('click', () => closeModal(modalConfirm));
  btnConfirmNo.addEventListener('click', () => closeModal(modalConfirm));
  btnConfirmYes.addEventListener('click', async () => {
    closeModal(modalConfirm);
    if (confirmCallback) { await confirmCallback(); confirmCallback = null; }
  });
  modalConfirm.addEventListener('click', e => { if (e.target === modalConfirm) closeModal(modalConfirm); });

  /* Album detail buttons */
  backFromAlbum.addEventListener('click', () => {
    albumDetailView.hidden = true;
    albumsGridView.hidden  = false;
    currentAlbumId = null;
  });
  btnEditAlbum.addEventListener('click', () => {
    const album = allAlbums.find(a => a.id === currentAlbumId);
    if (album) openAlbumModal('edit', album);
  });
  btnAddSongToAlbum.addEventListener('click', () => openSongModal('create'));
  btnAddExistingToAlbum.addEventListener('click', openAddExistingModal);

  /* Playlist detail buttons */
  backFromPlaylist.addEventListener('click', () => {
    playlistDetailView.hidden = true;
    playlistsListView.hidden  = false;
    currentPlaylistId = null;
  });
  btnRenamePlaylist.addEventListener('click', () => {
    const pl = allPlaylists.find(p => p.id === currentPlaylistId);
    if (pl) openPlaylistModal('rename', pl);
  });

  /* Player */
  playBtn.addEventListener('click', togglePlayPause);
  nextBtn.addEventListener('click', playNext);
  prevBtn.addEventListener('click', playPrev);

  /* Escape */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!ctxMenu.hidden)            closeCtxMenu();
    else if (!modalSong.hidden)     closeSongModal();
    else if (!modalAlbum.hidden)    closeAlbumModal();
    else if (!modalPlaylist.hidden) closePlaylistModal();
    else if (!modalATP.hidden)      closeModal(modalATP);
    else if (!modalAddExisting.hidden) closeModal(modalAddExisting);
    else if (!modalConfirm.hidden)  closeModal(modalConfirm);
    else if (!fabMenu.hidden)       closeFabMenu();
  });
}

/* ══════════════════════════════════════════════════
   SERVICE WORKER
   ══════════════════════════════════════════════════ */
function registerSW() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(console.warn);
}

document.addEventListener('DOMContentLoaded', init);
