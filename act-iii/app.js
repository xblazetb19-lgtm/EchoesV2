/* ═══════════════════════════════════════════════════
   ACT-III — app.js  v2.0
   Albums · Playlists · Upload MP3/Cover · Real Audio
   Supabase Realtime · Mobile-first
   ═══════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────
   ⚙️  CONFIGURATION SUPABASE
   ───────────────────────────────────────────────────── */
const SUPABASE_URL  = 'https://mbytanrqvqdimmpwmxng.supabase.co';
const SUPABASE_ANON = 'sb_publishable_IZAapYrvdnIlt6-8WZWgSw_dbR3KQOJ';

// Create client (supabase-js v2 is loaded via CDN as window.supabase)
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ─────────────────────────────────────────────────────
   📦  STATE
   ───────────────────────────────────────────────────── */
let allSongs      = [];   // all songs from DB
let allAlbums     = [];   // all albums from DB
let allPlaylists  = [];   // all playlists

let filteredSongs = [];
let currentTab    = 'home';

// Playback
let currentQueue  = [];   // songs in current context
let currentIndex  = -1;   // index in queue
let isPlaying     = false;

// Submit guards
let isSubmitting  = false;

// Song being targeted for "add to playlist"
let atpSongId     = null;

// Currently viewed album / playlist
let currentAlbumId    = null;
let currentPlaylistId = null;

let searchDebounceTimer = null;
let toastTimer          = null;

/* ─────────────────────────────────────────────────────
   🎵  AUDIO ELEMENT
   ───────────────────────────────────────────────────── */
const audioEl = document.getElementById('audioEl');

/* ─────────────────────────────────────────────────────
   🔗  DOM REFS
   ───────────────────────────────────────────────────── */
// Tabs
const tabBtns         = document.querySelectorAll('.tab-btn');
const tabSections     = document.querySelectorAll('.tab-section');
const searchWrapper   = document.getElementById('searchWrapper');

// Home
const songList        = document.getElementById('songList');
const emptyState      = document.getElementById('emptyState');
const noResults       = document.getElementById('noResults');
const songCount       = document.getElementById('songCount');
const searchInput     = document.getElementById('searchInput');
const searchClear     = document.getElementById('searchClear');

// Albums
const albumGrid       = document.getElementById('albumGrid');
const albumCount      = document.getElementById('albumCount');
const albumsEmpty     = document.getElementById('albumsEmpty');
const albumsGridView  = document.getElementById('albumsGridView');
const albumDetailView = document.getElementById('albumDetailView');
const albumHeroImg    = document.getElementById('albumHeroImg');
const albumHeroName   = document.getElementById('albumHeroName');
const albumHeroCount  = document.getElementById('albumHeroCount');
const albumSongList   = document.getElementById('albumSongList');
const albumEmptyState = document.getElementById('albumEmptyState');
const backFromAlbum   = document.getElementById('backFromAlbum');

// Playlists
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

// FAB
const fabBtn      = document.getElementById('fabBtn');
const fabMenu     = document.getElementById('fabMenu');
const fabAddSong  = document.getElementById('fabAddSong');
const fabAddAlbum = document.getElementById('fabAddAlbum');
const fabAddPlaylist = document.getElementById('fabAddPlaylist');

// Modal Song
const modalSong       = document.getElementById('modalSong');
const modalSongClose  = document.getElementById('modalSongClose');
const btnSongCancel   = document.getElementById('btnSongCancel');
const btnSongSubmit   = document.getElementById('btnSongSubmit');
const btnSongLabel    = document.getElementById('btnSongLabel');
const btnSongLoader   = document.getElementById('btnSongLoader');
const inputTitle      = document.getElementById('inputTitle');
const inputArtist     = document.getElementById('inputArtist');
const inputMp3        = document.getElementById('inputMp3');
const mp3Label        = document.getElementById('mp3Label');
const mp3Wrapper      = document.getElementById('mp3Wrapper');
const inputCover      = document.getElementById('inputCover');
const coverLabel      = document.getElementById('coverLabel');
const coverPreview    = document.getElementById('coverPreview');
const inputAlbumSel   = document.getElementById('inputAlbum');
const formSongError   = document.getElementById('formSongError');

// Modal Album
const modalAlbum       = document.getElementById('modalAlbum');
const modalAlbumClose  = document.getElementById('modalAlbumClose');
const btnAlbumCancel   = document.getElementById('btnAlbumCancel');
const btnAlbumSubmit   = document.getElementById('btnAlbumSubmit');
const btnAlbumLabel    = document.getElementById('btnAlbumLabel');
const btnAlbumLoader   = document.getElementById('btnAlbumLoader');
const inputAlbumName   = document.getElementById('inputAlbumName');
const inputAlbumCover  = document.getElementById('inputAlbumCover');
const albumCoverLabel  = document.getElementById('albumCoverLabel');
const albumCoverPreview= document.getElementById('albumCoverPreview');
const albumCoverWrapper= document.getElementById('albumCoverWrapper');
const formAlbumError   = document.getElementById('formAlbumError');

// Modal Playlist
const modalPlaylist      = document.getElementById('modalPlaylist');
const modalPlaylistClose = document.getElementById('modalPlaylistClose');
const btnPlaylistCancel  = document.getElementById('btnPlaylistCancel');
const btnPlaylistSubmit  = document.getElementById('btnPlaylistSubmit');
const btnPlaylistLabel   = document.getElementById('btnPlaylistLabel');
const btnPlaylistLoader  = document.getElementById('btnPlaylistLoader');
const inputPlaylistName  = document.getElementById('inputPlaylistName');
const formPlaylistError  = document.getElementById('formPlaylistError');

// Modal Add to Playlist
const modalATP      = document.getElementById('modalAddToPlaylist');
const modalATPClose = document.getElementById('modalATPClose');
const atpSongName   = document.getElementById('atpSongName');
const playlistPickList = document.getElementById('playlistPickList');
const atpEmpty      = document.getElementById('atpEmpty');

// Player
const player         = document.getElementById('player');
const playerCover    = document.getElementById('playerCover');
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

/* ═══════════════════════════════════════════════════
   🚀  INIT
   ═══════════════════════════════════════════════════ */
async function init() {
  registerServiceWorker();
  bindEvents();
  setupAudio();

  // Load all data in parallel
  await Promise.all([loadAlbums(), loadPlaylists()]);
  await loadSongs();
  setupRealtime();
}

/* ═══════════════════════════════════════════════════
   📡  LOAD DATA
   ═══════════════════════════════════════════════════ */
async function loadSongs() {
  showSkeletons(songList, 4);
  try {
    const { data, error } = await db
      .from('songs')
      .select('*, albums(id, name, cover_url)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    allSongs = data || [];
    filteredSongs = [...allSongs];
    renderSongs(filteredSongs, songList, { showEmpty: true, useHome: true });
    updateCount(songCount, allSongs.length, 'titre');
  } catch (err) {
    console.error('[Act-III] loadSongs error:', err);
    showToast('Erreur de connexion');
    renderSongs([], songList, { showEmpty: true, useHome: true });
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
  } catch (err) {
    console.error('[Act-III] loadAlbums error:', err);
  }
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
  } catch (err) {
    console.error('[Act-III] loadPlaylists error:', err);
  }
}

/* ═══════════════════════════════════════════════════
   🎨  RENDER — SONGS
   ═══════════════════════════════════════════════════ */
function renderSongs(list, container, opts = {}) {
  container.innerHTML = '';

  const { showEmpty, useHome } = opts;

  if (useHome) {
    const isEmpty = allSongs.length === 0;
    const noMatch = !isEmpty && list.length === 0;
    emptyState.hidden = !isEmpty;
    noResults.hidden  = !noMatch;
    container.hidden  = isEmpty || noMatch;
    if (isEmpty || noMatch) return;
  } else {
    container.hidden = false;
  }

  const fragment = document.createDocumentFragment();
  list.forEach((song, index) => {
    fragment.appendChild(createSongElement(song, index, list));
  });
  container.appendChild(fragment);
}

function getCoverUrl(song) {
  // Priority: song's own cover → album cover → null
  if (song.cover_url) return song.cover_url;
  if (song.albums && song.albums.cover_url) return song.albums.cover_url;
  if (song.album_id) {
    const album = allAlbums.find(a => a.id === song.album_id);
    if (album && album.cover_url) return album.cover_url;
  }
  return null;
}

function createSongElement(song, index, queue) {
  const li = document.createElement('li');
  li.classList.add('song-item');
  li.setAttribute('data-id', song.id);
  li.setAttribute('role', 'listitem');
  li.style.animationDelay = `${Math.min(index * 40, 400)}ms`;

  const coverUrl = getCoverUrl(song);
  const initial  = (song.title[0] || '♪').toUpperCase();
  const isCurrentlyPlaying = currentQueue.length > 0 &&
    currentQueue[currentIndex]?.id === song.id && isPlaying;

  if (isCurrentlyPlaying) li.classList.add('playing');

  li.innerHTML = `
    <div class="song-avatar">
      ${coverUrl
        ? `<img class="song-cover-img" src="${escapeHtml(coverUrl)}" alt="" />`
        : `<span class="song-avatar-letter">${initial}</span>`
      }
      <div class="now-playing-bars" aria-hidden="true">
        <div class="bar"></div><div class="bar"></div><div class="bar"></div>
      </div>
    </div>
    <div class="song-info">
      <p class="song-title">${escapeHtml(song.title)}</p>
      <p class="song-artist">${escapeHtml(song.artist)}</p>
    </div>
    <button class="btn-more" data-id="${song.id}" aria-label="Options">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
      </svg>
    </button>
  `;

  // Play on click (not on button)
  li.addEventListener('click', (e) => {
    if (e.target.closest('.btn-more')) return;
    playSongInQueue(queue, index);
  });

  // Options menu → add to playlist
  li.querySelector('.btn-more').addEventListener('click', (e) => {
    e.stopPropagation();
    openAddToPlaylist(song);
  });

  return li;
}

/* ═══════════════════════════════════════════════════
   🎨  RENDER — ALBUMS
   ═══════════════════════════════════════════════════ */
function renderAlbumsGrid() {
  albumGrid.innerHTML = '';
  updateCount(albumCount, allAlbums.length, 'album');
  albumsEmpty.hidden = allAlbums.length > 0;

  allAlbums.forEach(album => {
    const card = document.createElement('div');
    card.classList.add('album-card');
    card.setAttribute('data-id', album.id);
    card.innerHTML = `
      <div class="album-card-cover">
        ${album.cover_url
          ? `<img src="${escapeHtml(album.cover_url)}" alt="${escapeHtml(album.name)}" />`
          : `<div class="album-card-placeholder">◉</div>`
        }
      </div>
      <p class="album-card-name">${escapeHtml(album.name)}</p>
    `;
    card.addEventListener('click', () => openAlbumDetail(album));
    albumGrid.appendChild(card);
  });
}

async function openAlbumDetail(album) {
  currentAlbumId = album.id;

  albumHeroImg.src = album.cover_url || '';
  albumHeroImg.hidden = !album.cover_url;
  albumHeroName.textContent = album.name;

  albumsGridView.hidden  = true;
  albumDetailView.hidden = false;

  // Load songs for this album
  showSkeletons(albumSongList, 3);
  try {
    const { data, error } = await db
      .from('songs')
      .select('*, albums(id, name, cover_url)')
      .eq('album_id', album.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const songs = data || [];
    albumHeroCount.textContent = `${songs.length} titre${songs.length !== 1 ? 's' : ''}`;

    if (songs.length === 0) {
      albumSongList.innerHTML = '';
      albumSongList.hidden = true;
      albumEmptyState.hidden = false;
    } else {
      albumEmptyState.hidden = true;
      albumSongList.hidden = false;
      renderSongs(songs, albumSongList);
    }
  } catch (err) {
    console.error('[Act-III] openAlbumDetail error:', err);
  }
}

/* ═══════════════════════════════════════════════════
   🎨  RENDER — PLAYLISTS
   ═══════════════════════════════════════════════════ */
function renderPlaylistsList() {
  playlistList.innerHTML = '';
  updateCount(playlistCount, allPlaylists.length, 'playlist');
  playlistsEmpty.hidden = allPlaylists.length > 0;

  allPlaylists.forEach(pl => {
    const item = document.createElement('div');
    item.classList.add('playlist-item');
    item.setAttribute('data-id', pl.id);
    item.innerHTML = `
      <div class="playlist-item-icon">♫</div>
      <div class="song-info">
        <p class="song-title">${escapeHtml(pl.name)}</p>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" class="chevron">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    `;
    item.addEventListener('click', () => openPlaylistDetail(pl));
    playlistList.appendChild(item);
  });
}

async function openPlaylistDetail(playlist) {
  currentPlaylistId = playlist.id;
  playlistHeroName.textContent = playlist.name;

  playlistsListView.hidden   = true;
  playlistDetailView.hidden  = false;

  showSkeletons(playlistSongList, 3);
  try {
    const { data, error } = await db
      .from('playlist_songs')
      .select('songs(*, albums(id, name, cover_url))')
      .eq('playlist_id', playlist.id);
    if (error) throw error;

    const songs = (data || []).map(row => row.songs).filter(Boolean);
    playlistHeroCount.textContent = `${songs.length} titre${songs.length !== 1 ? 's' : ''}`;

    if (songs.length === 0) {
      playlistSongList.innerHTML = '';
      playlistSongList.hidden = true;
      playlistEmptyState.hidden = false;
    } else {
      playlistEmptyState.hidden = true;
      playlistSongList.hidden = false;
      renderSongs(songs, playlistSongList);
    }
  } catch (err) {
    console.error('[Act-III] openPlaylistDetail error:', err);
  }
}

/* ═══════════════════════════════════════════════════
   ➕  ADD SONG
   ═══════════════════════════════════════════════════ */
async function addSong() {
  if (isSubmitting) return;

  const title  = inputTitle.value.trim();
  const artist = inputArtist.value.trim();
  const mp3    = inputMp3.files[0];
  const cover  = inputCover.files[0] || null;
  const albumId= inputAlbumSel.value ? parseInt(inputAlbumSel.value) : null;

  // Validate
  let valid = true;
  clearError(formSongError);
  if (!title)  { inputTitle.classList.add('error');  valid = false; }
  if (!artist) { inputArtist.classList.add('error'); valid = false; }
  if (!mp3)    { mp3Wrapper.classList.add('error');  valid = false; }
  if (!valid)  { showError(formSongError, 'Remplissez tous les champs obligatoires.'); return; }

  isSubmitting = true;
  setLoading(btnSongSubmit, btnSongLabel, btnSongLoader, true, 'Upload…');

  try {
    // 1. Upload MP3
    const mp3Path = `${Date.now()}-${sanitizeFilename(mp3.name)}`;
    const { error: mp3Err } = await db.storage
      .from('songs')
      .upload(mp3Path, mp3, { contentType: 'audio/mpeg', upsert: false });
    if (mp3Err) throw mp3Err;

    const { data: mp3Data } = db.storage.from('songs').getPublicUrl(mp3Path);
    const audioUrl = mp3Data.publicUrl;

    // 2. Upload cover (if provided)
    let coverUrl = null;
    if (cover) {
      const coverPath = `${Date.now()}-${sanitizeFilename(cover.name)}`;
      const { error: covErr } = await db.storage
        .from('covers')
        .upload(coverPath, cover, { contentType: cover.type, upsert: false });
      if (covErr) throw covErr;
      const { data: covData } = db.storage.from('covers').getPublicUrl(coverPath);
      coverUrl = covData.publicUrl;
    }

    // 3. Insert into songs table
    const payload = {
      title,
      artist,
      audio_url: audioUrl,
      cover_url: coverUrl,
      album_id:  albumId
    };

    const { data: songData, error: dbErr } = await db
      .from('songs')
      .insert([payload])
      .select('*, albums(id, name, cover_url)')
      .single();
    if (dbErr) throw dbErr;

    closeSongModal();
    showToast(`♪ "${title}" ajouté !`);

    // Optimistic local insert
    if (!allSongs.find(s => s.id === songData.id)) {
      allSongs.unshift(songData);
      filteredSongs = applySearch(allSongs, searchInput.value);
      renderSongs(filteredSongs, songList, { showEmpty: true, useHome: true });
      updateCount(songCount, allSongs.length, 'titre');
    }

  } catch (err) {
    console.error('[Act-III] addSong error:', err);
    showError(formSongError, 'Erreur lors de l\'upload. Vérifiez votre connexion.');
  } finally {
    isSubmitting = false;
    setLoading(btnSongSubmit, btnSongLabel, btnSongLoader, false, 'Ajouter');
  }
}

/* ═══════════════════════════════════════════════════
   ➕  CREATE ALBUM
   ═══════════════════════════════════════════════════ */
async function createAlbum() {
  if (isSubmitting) return;

  const name  = inputAlbumName.value.trim();
  const cover = inputAlbumCover.files[0];

  clearError(formAlbumError);
  let valid = true;
  if (!name)  { inputAlbumName.classList.add('error');  valid = false; }
  if (!cover) { albumCoverWrapper.classList.add('error'); valid = false; }
  if (!valid) { showError(formAlbumError, 'Nom et cover obligatoires.'); return; }

  isSubmitting = true;
  setLoading(btnAlbumSubmit, btnAlbumLabel, btnAlbumLoader, true, 'Création…');

  try {
    // Upload cover
    const coverPath = `${Date.now()}-${sanitizeFilename(cover.name)}`;
    const { error: covErr } = await db.storage
      .from('covers')
      .upload(coverPath, cover, { contentType: cover.type, upsert: false });
    if (covErr) throw covErr;

    const { data: covData } = db.storage.from('covers').getPublicUrl(coverPath);
    const coverUrl = covData.publicUrl;

    // Insert album
    const { data: albumData, error: dbErr } = await db
      .from('albums')
      .insert([{ name, cover_url: coverUrl }])
      .select()
      .single();
    if (dbErr) throw dbErr;

    closeAlbumModal();
    showToast(`◉ Album "${name}" créé !`);

    allAlbums.unshift(albumData);
    renderAlbumsGrid();
    populateAlbumSelect();

  } catch (err) {
    console.error('[Act-III] createAlbum error:', err);
    showError(formAlbumError, 'Erreur lors de la création.');
  } finally {
    isSubmitting = false;
    setLoading(btnAlbumSubmit, btnAlbumLabel, btnAlbumLoader, false, 'Créer');
  }
}

/* ═══════════════════════════════════════════════════
   ➕  CREATE PLAYLIST
   ═══════════════════════════════════════════════════ */
async function createPlaylist() {
  if (isSubmitting) return;

  const name = inputPlaylistName.value.trim();
  clearError(formPlaylistError);
  if (!name) {
    inputPlaylistName.classList.add('error');
    showError(formPlaylistError, 'Entrez un nom de playlist.');
    return;
  }

  isSubmitting = true;
  setLoading(btnPlaylistSubmit, btnPlaylistLabel, btnPlaylistLoader, true, 'Création…');

  try {
    const { data, error } = await db
      .from('playlists')
      .insert([{ name }])
      .select()
      .single();
    if (error) throw error;

    closePlaylistModal();
    showToast(`≡ Playlist "${name}" créée !`);
    allPlaylists.unshift(data);
    renderPlaylistsList();

  } catch (err) {
    console.error('[Act-III] createPlaylist error:', err);
    showError(formPlaylistError, 'Erreur lors de la création.');
  } finally {
    isSubmitting = false;
    setLoading(btnPlaylistSubmit, btnPlaylistLabel, btnPlaylistLoader, false, 'Créer');
  }
}

/* ═══════════════════════════════════════════════════
   ➕  ADD SONG TO PLAYLIST
   ═══════════════════════════════════════════════════ */
function openAddToPlaylist(song) {
  atpSongId = song.id;
  atpSongName.textContent = `"${song.title}"`;

  playlistPickList.innerHTML = '';
  atpEmpty.hidden = allPlaylists.length > 0;

  allPlaylists.forEach(pl => {
    const btn = document.createElement('button');
    btn.classList.add('playlist-pick-btn');
    btn.innerHTML = `<span class="playlist-item-icon">♫</span> ${escapeHtml(pl.name)}`;
    btn.addEventListener('click', () => addSongToPlaylist(pl));
    playlistPickList.appendChild(btn);
  });

  modalATP.hidden = false;
  document.body.style.overflow = 'hidden';
}

async function addSongToPlaylist(playlist) {
  try {
    // Check for duplicate
    const { data: existing } = await db
      .from('playlist_songs')
      .select('id')
      .eq('playlist_id', playlist.id)
      .eq('song_id', atpSongId)
      .maybeSingle();

    if (existing) {
      showToast('Déjà dans cette playlist');
      closeModalATP();
      return;
    }

    const { error } = await db
      .from('playlist_songs')
      .insert([{ playlist_id: playlist.id, song_id: atpSongId }]);
    if (error) throw error;

    showToast(`Ajouté à "${playlist.name}" !`);
    closeModalATP();
  } catch (err) {
    console.error('[Act-III] addSongToPlaylist error:', err);
    showToast('Erreur lors de l\'ajout');
  }
}

/* ═══════════════════════════════════════════════════
   🔄  REALTIME
   ═══════════════════════════════════════════════════ */
function setupRealtime() {
  // Songs
  db.channel('songs-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'songs' }, (payload) => {
      const song = payload.new;
      if (!allSongs.find(s => s.id === song.id)) {
        // Attach album info if available
        if (song.album_id) {
          song.albums = allAlbums.find(a => a.id === song.album_id) || null;
        }
        allSongs.unshift(song);
        filteredSongs = applySearch(allSongs, searchInput.value);
        renderSongs(filteredSongs, songList, { showEmpty: true, useHome: true });
        updateCount(songCount, allSongs.length, 'titre');
        showToast('♪ Nouveau titre ajouté !');
      }
    })
    .subscribe((status) => {
      liveIndicator.classList.toggle('active', status === 'SUBSCRIBED');
    });

  // Albums
  db.channel('albums-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'albums' }, (payload) => {
      const album = payload.new;
      if (!allAlbums.find(a => a.id === album.id)) {
        allAlbums.unshift(album);
        renderAlbumsGrid();
        populateAlbumSelect();
        showToast('◉ Nouvel album ajouté !');
      }
    })
    .subscribe();

  // Playlists
  db.channel('playlists-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'playlists' }, (payload) => {
      const pl = payload.new;
      if (!allPlaylists.find(p => p.id === pl.id)) {
        allPlaylists.unshift(pl);
        renderPlaylistsList();
        showToast('≡ Nouvelle playlist créée !');
      }
    })
    .subscribe();
}

/* ═══════════════════════════════════════════════════
   ▶️  AUDIO PLAYER
   ═══════════════════════════════════════════════════ */
function setupAudio() {
  audioEl.addEventListener('timeupdate', onTimeUpdate);
  audioEl.addEventListener('ended', () => playNext());
  audioEl.addEventListener('loadedmetadata', () => {
    totalTimeEl.textContent = formatTime(audioEl.duration);
  });
  audioEl.addEventListener('play', () => {
    isPlaying = true;
    updatePlayBtn();
    player.classList.add('playing');
  });
  audioEl.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayBtn();
    player.classList.remove('playing');
  });

  // Progress bar scrubbing
  progressBar.addEventListener('click', (e) => {
    if (!audioEl.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioEl.currentTime = ratio * audioEl.duration;
  });
}

function playSongInQueue(queue, index) {
  currentQueue = queue;
  currentIndex = index;
  loadAndPlay(queue[index]);
}

function loadAndPlay(song) {
  if (!song) return;

  // Check if it has an audio URL
  if (!song.audio_url) {
    showToast('Pas de fichier audio pour ce titre');
    return;
  }

  audioEl.src = song.audio_url;
  audioEl.load();
  audioEl.play().catch(err => console.warn('[Act-III] play error:', err));

  // Update player UI
  playerTitle.textContent  = song.title;
  playerArtist.textContent = song.artist;

  // Cover in player
  const coverUrl = getCoverUrl(song);
  if (coverUrl) {
    playerCoverImg.src    = coverUrl;
    playerCoverImg.hidden = false;
    playerDiscInner.hidden = true;
  } else {
    playerCoverImg.hidden = true;
    playerDiscInner.hidden = false;
  }

  // Highlight in lists
  updatePlayingHighlights();
}

function togglePlayPause() {
  if (!audioEl.src) return;
  if (isPlaying) {
    audioEl.pause();
  } else {
    audioEl.play().catch(err => console.warn('[Act-III] play error:', err));
  }
}

function playNext() {
  if (currentQueue.length === 0) return;
  currentIndex = (currentIndex + 1) % currentQueue.length;
  loadAndPlay(currentQueue[currentIndex]);
}

function playPrev() {
  if (currentQueue.length === 0) return;
  if (audioEl.currentTime > 3) {
    audioEl.currentTime = 0;
    return;
  }
  currentIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
  loadAndPlay(currentQueue[currentIndex]);
}

function onTimeUpdate() {
  if (!audioEl.duration) return;
  const ratio = audioEl.currentTime / audioEl.duration;
  progressFill.style.width = `${ratio * 100}%`;
  currentTimeEl.textContent = formatTime(audioEl.currentTime);
}

function updatePlayBtn() {
  const iconPlay  = playBtn.querySelector('.icon-play');
  const iconPause = playBtn.querySelector('.icon-pause');
  iconPlay.style.display  = isPlaying ? 'none'  : 'block';
  iconPause.style.display = isPlaying ? 'block' : 'none';
}

function updatePlayingHighlights() {
  document.querySelectorAll('.song-item').forEach(el => el.classList.remove('playing'));
  if (currentQueue[currentIndex]) {
    document.querySelectorAll(`[data-id="${currentQueue[currentIndex].id}"]`)
      .forEach(el => el.classList.add('playing'));
  }
}

function formatTime(secs) {
  if (isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ═══════════════════════════════════════════════════
   🔍  SEARCH
   ═══════════════════════════════════════════════════ */
function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();
  searchClear.classList.toggle('visible', query.length > 0);
  filteredSongs = applySearch(allSongs, query);
  renderSongs(filteredSongs, songList, { showEmpty: true, useHome: true });
}

function applySearch(songs, query) {
  if (!query) return [...songs];
  const q = query.toLowerCase().trim();
  return songs.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.artist.toLowerCase().includes(q)
  );
}

/* ═══════════════════════════════════════════════════
   🧭  TABS
   ═══════════════════════════════════════════════════ */
function switchTab(tabId) {
  currentTab = tabId;

  tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  tabSections.forEach(sec => sec.classList.toggle('active', sec.id === `tab-${tabId}`));

  // Show search only on home
  searchWrapper.hidden = tabId !== 'home';

  // Update FAB label / options based on tab
  updateFabForTab(tabId);
}

function updateFabForTab(tabId) {
  // All FAB items always visible; we just use the menu
}

/* ═══════════════════════════════════════════════════
   🧮  HELPERS — SELECTS / COUNTS
   ═══════════════════════════════════════════════════ */
function populateAlbumSelect() {
  inputAlbumSel.innerHTML = '<option value="">— Aucun album —</option>';
  allAlbums.forEach(album => {
    const opt = document.createElement('option');
    opt.value = album.id;
    opt.textContent = album.name;
    inputAlbumSel.appendChild(opt);
  });
}

function updateCount(el, count, unit) {
  if (count === 0) { el.textContent = `— ${unit}s`; return; }
  el.textContent = `${count} ${unit}${count > 1 ? 's' : ''}`;
}

/* ═══════════════════════════════════════════════════
   🪟  MODALS
   ═══════════════════════════════════════════════════ */
function openSongModal() {
  closeFabMenu();
  resetSongForm();
  modalSong.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => inputTitle.focus(), 350);
}

function closeSongModal() {
  modalSong.hidden = true;
  document.body.style.overflow = '';
  resetSongForm();
}

function resetSongForm() {
  inputTitle.value  = '';
  inputArtist.value = '';
  inputMp3.value    = '';
  inputCover.value  = '';
  mp3Label.textContent    = 'Choisir un fichier MP3';
  coverLabel.textContent  = 'Choisir une image';
  coverPreview.hidden     = true;
  coverPreview.src        = '';
  mp3Wrapper.classList.remove('error');
  inputTitle.classList.remove('error');
  inputArtist.classList.remove('error');
  clearError(formSongError);
}

function openAlbumModal() {
  closeFabMenu();
  resetAlbumForm();
  modalAlbum.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => inputAlbumName.focus(), 350);
}

function closeAlbumModal() {
  modalAlbum.hidden = true;
  document.body.style.overflow = '';
  resetAlbumForm();
}

function resetAlbumForm() {
  inputAlbumName.value    = '';
  inputAlbumCover.value   = '';
  albumCoverLabel.textContent = 'Choisir une image';
  albumCoverPreview.hidden = true;
  albumCoverPreview.src   = '';
  albumCoverWrapper.classList.remove('error');
  inputAlbumName.classList.remove('error');
  clearError(formAlbumError);
}

function openPlaylistModal() {
  closeFabMenu();
  resetPlaylistForm();
  modalPlaylist.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => inputPlaylistName.focus(), 350);
}

function closePlaylistModal() {
  modalPlaylist.hidden = true;
  document.body.style.overflow = '';
  resetPlaylistForm();
}

function resetPlaylistForm() {
  inputPlaylistName.value = '';
  inputPlaylistName.classList.remove('error');
  clearError(formPlaylistError);
}

function closeModalATP() {
  modalATP.hidden = true;
  document.body.style.overflow = '';
  atpSongId = null;
}

function openFabMenu() {
  fabMenu.hidden = false;
  fabBtn.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeFabMenu() {
  fabMenu.hidden = true;
  fabBtn.classList.remove('open');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════════
   📢  TOAST
   ═══════════════════════════════════════════════════ */
function showToast(message, duration = 2500) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toast.offsetHeight; // reflow
  toast.classList.add('show');
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.hidden = true; }, 300);
  }, duration);
}

/* ═══════════════════════════════════════════════════
   🦴  SKELETONS
   ═══════════════════════════════════════════════════ */
function showSkeletons(container, count) {
  container.innerHTML = '';
  container.hidden = false;
  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.classList.add('skeleton');
    div.style.animationDelay = `${i * 0.1}s`;
    container.appendChild(div);
  }
}

/* ═══════════════════════════════════════════════════
   🔒  UTILS
   ═══════════════════════════════════════════════════ */
function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

function setLoading(btn, labelEl, loaderEl, loading, text) {
  btn.disabled        = loading;
  labelEl.textContent = text;
  loaderEl.hidden     = !loading;
}

function showError(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}

function clearError(el) {
  el.textContent = '';
  el.hidden = true;
}

/* ═══════════════════════════════════════════════════
   🎛️  EVENTS
   ═══════════════════════════════════════════════════ */
function bindEvents() {

  /* ── TABS ── */
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  /* ── SEARCH ── */
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(handleSearch, 220);
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    filteredSongs = [...allSongs];
    renderSongs(filteredSongs, songList, { showEmpty: true, useHome: true });
    searchInput.focus();
  });

  /* ── FAB ── */
  fabBtn.addEventListener('click', () => {
    if (fabMenu.hidden) openFabMenu();
    else closeFabMenu();
  });
  fabAddSong.addEventListener('click', openSongModal);
  fabAddAlbum.addEventListener('click', openAlbumModal);
  fabAddPlaylist.addEventListener('click', openPlaylistModal);

  // Close FAB menu on outside click
  document.addEventListener('click', (e) => {
    if (!fabMenu.hidden && !fabBtn.contains(e.target) && !fabMenu.contains(e.target)) {
      closeFabMenu();
    }
  });

  /* ── MODAL SONG ── */
  modalSongClose.addEventListener('click', closeSongModal);
  btnSongCancel.addEventListener('click', closeSongModal);
  btnSongSubmit.addEventListener('click', addSong);
  modalSong.addEventListener('click', (e) => { if (e.target === modalSong) closeSongModal(); });

  inputMp3.addEventListener('change', () => {
    const f = inputMp3.files[0];
    mp3Label.textContent = f ? f.name : 'Choisir un fichier MP3';
    mp3Wrapper.classList.remove('error');
  });

  inputCover.addEventListener('change', () => {
    const f = inputCover.files[0];
    if (!f) { coverPreview.hidden = true; return; }
    coverLabel.textContent = f.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      coverPreview.src = e.target.result;
      coverPreview.hidden = false;
    };
    reader.readAsDataURL(f);
  });

  /* ── MODAL ALBUM ── */
  modalAlbumClose.addEventListener('click', closeAlbumModal);
  btnAlbumCancel.addEventListener('click', closeAlbumModal);
  btnAlbumSubmit.addEventListener('click', createAlbum);
  modalAlbum.addEventListener('click', (e) => { if (e.target === modalAlbum) closeAlbumModal(); });

  inputAlbumCover.addEventListener('change', () => {
    const f = inputAlbumCover.files[0];
    if (!f) { albumCoverPreview.hidden = true; return; }
    albumCoverLabel.textContent = f.name;
    albumCoverWrapper.classList.remove('error');
    const reader = new FileReader();
    reader.onload = (e) => {
      albumCoverPreview.src = e.target.result;
      albumCoverPreview.hidden = false;
    };
    reader.readAsDataURL(f);
  });

  /* ── MODAL PLAYLIST ── */
  modalPlaylistClose.addEventListener('click', closePlaylistModal);
  btnPlaylistCancel.addEventListener('click', closePlaylistModal);
  btnPlaylistSubmit.addEventListener('click', createPlaylist);
  modalPlaylist.addEventListener('click', (e) => { if (e.target === modalPlaylist) closePlaylistModal(); });

  /* ── MODAL ADD TO PLAYLIST ── */
  modalATPClose.addEventListener('click', closeModalATP);
  modalATP.addEventListener('click', (e) => { if (e.target === modalATP) closeModalATP(); });

  /* ── BACK BUTTONS ── */
  backFromAlbum.addEventListener('click', () => {
    albumDetailView.hidden = true;
    albumsGridView.hidden  = false;
    currentAlbumId = null;
  });
  backFromPlaylist.addEventListener('click', () => {
    playlistDetailView.hidden = true;
    playlistsListView.hidden  = false;
    currentPlaylistId = null;
  });

  /* ── PLAYER ── */
  playBtn.addEventListener('click', togglePlayPause);
  nextBtn.addEventListener('click', playNext);
  prevBtn.addEventListener('click', playPrev);

  /* ── ESCAPE ── */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modalSong.hidden) closeSongModal();
    else if (!modalAlbum.hidden) closeAlbumModal();
    else if (!modalPlaylist.hidden) closePlaylistModal();
    else if (!modalATP.hidden) closeModalATP();
    else if (!fabMenu.hidden) closeFabMenu();
  });
}

/* ═══════════════════════════════════════════════════
   📦  SERVICE WORKER
   ═══════════════════════════════════════════════════ */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('[Act-III] SW enregistré ✓'))
      .catch(err => console.warn('[Act-III] SW non enregistré:', err));
  }
}

/* ═══════════════════════════════════════════════════
   🏁  START
   ═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', init);
