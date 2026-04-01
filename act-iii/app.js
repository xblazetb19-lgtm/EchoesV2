/* ═══════════════════════════════════════════════════
   ACT-III — app.js
   Supabase + Realtime + PWA Logic
   ═══════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   ⚙️  CONFIGURATION SUPABASE
   Remplacez ces deux valeurs par les vôtres
   (Supabase → Project Settings → API)
   ───────────────────────────────────────────── */
const SUPABASE_URL  = 'https://mbytanrqvqdimmpwmxng.supabase.co';
const SUPABASE_ANON = 'sb_publishable_IZAapYrvdnIlt6-8WZWgSw_dbR3KQOJ';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
/* ───────────────────────────────────────────── */

// ── Init Supabase client ──
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── State ──
let allSongs     = [];     // master list from DB
let filteredSongs = [];    // currently displayed
let currentSong  = null;   // playing song object
let isPlaying    = false;
let isSubmitting = false;  // prevent double submit
let searchDebounceTimer = null;

// ── DOM refs ──
const songList      = document.getElementById('songList');
const emptyState    = document.getElementById('emptyState');
const noResults     = document.getElementById('noResults');
const songCount     = document.getElementById('songCount');
const searchInput   = document.getElementById('searchInput');
const searchClear   = document.getElementById('searchClear');
const fabBtn        = document.getElementById('fabBtn');
const modalOverlay  = document.getElementById('modalOverlay');
const modalClose    = document.getElementById('modalClose');
const btnCancel     = document.getElementById('btnCancel');
const btnSubmit     = document.getElementById('btnSubmit');
const btnSubmitLabel= document.getElementById('btnSubmitLabel');
const btnLoader     = document.getElementById('btnLoader');
const inputTitle    = document.getElementById('inputTitle');
const inputArtist   = document.getElementById('inputArtist');
const formError     = document.getElementById('formError');
const player        = document.getElementById('player');
const playerTitle   = document.getElementById('playerTitle');
const playerArtist  = document.getElementById('playerArtist');
const playerDisc    = document.getElementById('playerDisc');
const playBtn       = document.getElementById('playBtn');
const liveIndicator = document.getElementById('liveIndicator');
const toast         = document.getElementById('toast');

/* ═══════════════════════════════════════════════
   🚀 INITIALISATION
   ═══════════════════════════════════════════════ */
async function init() {
  registerServiceWorker();
  await loadSongs();
  setupRealtime();
  bindEvents();
}

/* ═══════════════════════════════════════════════
   📡 CHARGEMENT DES MUSIQUES (Supabase)
   ═══════════════════════════════════════════════ */
async function loadSongs() {
  // Afficher skeletons pendant le chargement
  showSkeletons(4);

  try {
    const { data, error } = await db
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allSongs = data || [];
    filteredSongs = [...allSongs];
    renderSongs(filteredSongs);

  } catch (err) {
    console.error('[Act-III] Erreur chargement:', err);
    showToast('Erreur de connexion à la base de données');
    renderSongs([]);
  }
}

/* ═══════════════════════════════════════════════
   ➕ AJOUT D'UNE MUSIQUE
   ═══════════════════════════════════════════════ */
async function addSong(title, artist) {
  if (isSubmitting) return;
  isSubmitting = true;

  // UI loading state
  btnSubmit.disabled = true;
  btnSubmitLabel.textContent = 'Ajout…';
  btnLoader.hidden = false;
  clearFieldErrors();

  try {
    const { data, error } = await db
      .from('songs')
      .insert([{ title: title.trim(), artist: artist.trim() }])
      .select()
      .single();

    if (error) throw error;

    // Succès → fermer modal
    closeModal();
    showToast(`♪ "${title}" ajouté !`);

    // La chanson apparaîtra via Realtime (setupRealtime)
    // mais on l'ajoute aussi localement pour réactivité immédiate
    if (!allSongs.find(s => s.id === data.id)) {
      allSongs.unshift(data);
      filteredSongs = applySearch(allSongs, searchInput.value);
      renderSongs(filteredSongs);
    }

  } catch (err) {
    console.error('[Act-III] Erreur insertion:', err);
    showFormError('Erreur lors de l\'ajout. Vérifiez votre connexion.');
  } finally {
    isSubmitting = false;
    btnSubmit.disabled = false;
    btnSubmitLabel.textContent = 'Ajouter';
    btnLoader.hidden = true;
  }
}

/* ═══════════════════════════════════════════════
   🔄 REALTIME — écoute des INSERT
   ═══════════════════════════════════════════════ */
function setupRealtime() {
  const channel = db
    .channel('songs-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'songs' },
      (payload) => {
        const newSong = payload.new;
        // Éviter les doublons (peut arriver si addSong local déjà ajouté)
        if (!allSongs.find(s => s.id === newSong.id)) {
          allSongs.unshift(newSong);
          filteredSongs = applySearch(allSongs, searchInput.value);
          renderSongs(filteredSongs);
          showToast(`♪ Nouveau titre ajouté !`);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        liveIndicator.classList.add('active');
        console.log('[Act-III] Realtime connecté ✓');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        liveIndicator.classList.remove('active');
        console.warn('[Act-III] Realtime déconnecté');
      }
    });
}

/* ═══════════════════════════════════════════════
   🎨 RENDU DES MUSIQUES (DOM)
   ═══════════════════════════════════════════════ */
function renderSongs(list) {
  // Vider la liste
  songList.innerHTML = '';
  updateCount(list.length);

  // Gérer états vides
  const isEmpty   = allSongs.length === 0;
  const noMatch   = !isEmpty && list.length === 0;

  emptyState.hidden = !isEmpty;
  noResults.hidden  = !noMatch;
  songList.hidden   = isEmpty || noMatch;

  if (isEmpty || noMatch) return;

  // Construire les éléments
  const fragment = document.createDocumentFragment();

  list.forEach((song, index) => {
    const li = createSongElement(song, index);
    fragment.appendChild(li);
  });

  songList.appendChild(fragment);

  // Mettre à jour l'état "playing" si une chanson est en cours
  if (currentSong) {
    const playingEl = songList.querySelector(`[data-id="${currentSong.id}"]`);
    if (playingEl) playingEl.classList.toggle('playing', isPlaying);
  }
}

/* ── Créer un élément <li> pour une chanson ── */
function createSongElement(song, index) {
  const li = document.createElement('li');
  li.classList.add('song-item');
  li.setAttribute('data-id', song.id);
  li.setAttribute('role', 'listitem');
  li.style.animationDelay = `${Math.min(index * 40, 400)}ms`;

  // Initiales pour l'avatar
  const initial = (song.title[0] || '♪').toUpperCase();

  // État favori
  const isFav = isFavorite(song.id);

  li.innerHTML = `
    <div class="song-avatar">
      <span class="song-avatar-letter">${initial}</span>
      <div class="now-playing-bars" aria-hidden="true">
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
      </div>
    </div>
    <div class="song-info">
      <p class="song-title">${escapeHtml(song.title)}</p>
      <p class="song-artist">${escapeHtml(song.artist)}</p>
    </div>
    <button class="btn-fav ${isFav ? 'active' : ''}" data-id="${song.id}" aria-label="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
      ${isFav ? '♥' : '♡'}
    </button>
  `;

  // Click → lire la chanson
  li.addEventListener('click', (e) => {
    // Ne pas déclencher si on clique sur le bouton favori
    if (e.target.closest('.btn-fav')) return;
    playSong(song);
  });

  // Bouton favori
  li.querySelector('.btn-fav').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(song.id, li);
  });

  return li;
}

/* ═══════════════════════════════════════════════
   🔍 RECHERCHE
   ═══════════════════════════════════════════════ */
function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();

  // Afficher/masquer le bouton clear
  searchClear.classList.toggle('visible', query.length > 0);

  filteredSongs = applySearch(allSongs, query);
  renderSongs(filteredSongs);
}

function applySearch(songs, query) {
  if (!query || !query.trim()) return [...songs];
  const q = query.toLowerCase().trim();
  return songs.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.artist.toLowerCase().includes(q)
  );
}

/* ═══════════════════════════════════════════════
   ❤️  FAVORIS (localStorage)
   ═══════════════════════════════════════════════ */
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('act3_favorites') || '[]');
  } catch { return []; }
}

function isFavorite(id) {
  return getFavorites().includes(id);
}

function toggleFavorite(id, liElement) {
  const favs = getFavorites();
  const idx  = favs.indexOf(id);
  const btn  = liElement.querySelector('.btn-fav');

  if (idx === -1) {
    // Ajouter aux favoris
    favs.push(id);
    btn.classList.add('active');
    btn.innerHTML = '♥';
    btn.setAttribute('aria-label', 'Retirer des favoris');
    showToast('Ajouté aux favoris');
  } else {
    // Retirer
    favs.splice(idx, 1);
    btn.classList.remove('active');
    btn.innerHTML = '♡';
    btn.setAttribute('aria-label', 'Ajouter aux favoris');
    showToast('Retiré des favoris');
  }

  localStorage.setItem('act3_favorites', JSON.stringify(favs));
}

/* ═══════════════════════════════════════════════
   ▶️  PLAYER
   ═══════════════════════════════════════════════ */
function playSong(song) {
  const isSameSong = currentSong && currentSong.id === song.id;

  if (isSameSong) {
    // Toggle play/pause
    togglePlayPause();
    return;
  }

  // Nouvelle chanson
  currentSong = song;
  isPlaying   = true;

  // Mettre à jour l'UI du player
  updatePlayerUI();

  // Mettre à jour les cards
  updatePlayingCard();
}

function togglePlayPause() {
  if (!currentSong) return;
  isPlaying = !isPlaying;
  updatePlayerUI();
  updatePlayingCard();
}

function updatePlayerUI() {
  playerTitle.textContent  = currentSong ? currentSong.title : 'Aucune piste sélectionnée';
  playerArtist.textContent = currentSong ? currentSong.artist : '—';

  player.classList.toggle('playing', isPlaying);

  // Icônes play / pause
  const iconPlay  = playBtn.querySelector('.icon-play');
  const iconPause = playBtn.querySelector('.icon-pause');

  if (isPlaying) {
    iconPlay.style.display  = 'none';
    iconPause.style.display = 'block';
  } else {
    iconPlay.style.display  = 'block';
    iconPause.style.display = 'none';
  }
}

function updatePlayingCard() {
  // Retirer "playing" de toutes les cards
  songList.querySelectorAll('.song-item').forEach(el => {
    el.classList.remove('playing');
  });

  // Ajouter sur la bonne
  if (currentSong && isPlaying) {
    const el = songList.querySelector(`[data-id="${currentSong.id}"]`);
    if (el) el.classList.add('playing');
  }
}

/* ═══════════════════════════════════════════════
   🪟 MODAL
   ═══════════════════════════════════════════════ */
function openModal() {
  modalOverlay.hidden = false;
  fabBtn.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Focus sur le premier champ après animation
  setTimeout(() => inputTitle.focus(), 350);
}

function closeModal() {
  modalOverlay.hidden = true;
  fabBtn.classList.remove('open');
  document.body.style.overflow = '';
  resetForm();
}

function resetForm() {
  inputTitle.value  = '';
  inputArtist.value = '';
  clearFieldErrors();
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}

function clearFieldErrors() {
  formError.hidden = true;
  formError.textContent = '';
  inputTitle.classList.remove('error');
  inputArtist.classList.remove('error');
}

function validateForm() {
  const title  = inputTitle.value.trim();
  const artist = inputArtist.value.trim();
  let valid = true;

  clearFieldErrors();

  if (!title) {
    inputTitle.classList.add('error');
    valid = false;
  }
  if (!artist) {
    inputArtist.classList.add('error');
    valid = false;
  }
  if (!valid) {
    showFormError('Veuillez remplir tous les champs obligatoires.');
  }
  return valid;
}

/* ═══════════════════════════════════════════════
   📢 TOAST NOTIFICATION
   ═══════════════════════════════════════════════ */
let toastTimer = null;

function showToast(message, duration = 2500) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;

  // Force reflow pour l'animation
  toast.offsetHeight;
  toast.classList.add('show');

  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.hidden = true; }, 300);
  }, duration);
}

/* ═══════════════════════════════════════════════
   🦴 SKELETONS (état de chargement)
   ═══════════════════════════════════════════════ */
function showSkeletons(count) {
  songList.innerHTML = '';
  songList.hidden = false;
  emptyState.hidden = true;
  noResults.hidden  = true;

  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.classList.add('skeleton');
    div.style.animationDelay = `${i * 0.1}s`;
    songList.appendChild(div);
  }
}

/* ═══════════════════════════════════════════════
   📊 COMPTEUR
   ═══════════════════════════════════════════════ */
function updateCount(count) {
  if (count === 0) {
    songCount.textContent = '—';
    return;
  }
  songCount.textContent = `${count} titre${count > 1 ? 's' : ''}`;
}

/* ═══════════════════════════════════════════════
   🔒 UTILS
   ═══════════════════════════════════════════════ */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ═══════════════════════════════════════════════
   🎛️  EVENT LISTENERS
   ═══════════════════════════════════════════════ */
function bindEvents() {

  // ── Recherche (avec debounce) ──
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(handleSearch, 220);
  });

  // Clear search
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    filteredSongs = [...allSongs];
    renderSongs(filteredSongs);
    searchInput.focus();
  });

  // ── FAB → ouvrir modal ──
  fabBtn.addEventListener('click', openModal);

  // ── Fermer modal ──
  modalClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  // Clic sur overlay pour fermer
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Escape pour fermer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
  });

  // ── Soumettre le formulaire ──
  btnSubmit.addEventListener('click', async () => {
    if (!validateForm()) return;
    await addSong(inputTitle.value, inputArtist.value);
  });

  // Soumettre avec Enter
  [inputTitle, inputArtist].forEach(input => {
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!validateForm()) return;
        await addSong(inputTitle.value, inputArtist.value);
      }
    });
  });

  // ── Player controls ──
  playBtn.addEventListener('click', togglePlayPause);
}

/* ═══════════════════════════════════════════════
   📦 SERVICE WORKER
   ═══════════════════════════════════════════════ */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
      console.log('[Act-III] Service Worker enregistré ✓');
    }).catch(err => {
      console.warn('[Act-III] SW non enregistré:', err);
    });
  }
}

/* ═══════════════════════════════════════════════
   🏁 DÉMARRAGE
   ═══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', init);
