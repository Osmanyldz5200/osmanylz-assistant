// =====================================================
//  OsmanYLDZ İş Asistanı — Firebase + Full App JS
// =====================================================

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCAYX4QxSt2bb5qydKC_kJ2mf_0USkJ09M",
  authDomain: "osman-yldz.firebaseapp.com",
  projectId: "osman-yldz",
  storageBucket: "osman-yldz.firebasestorage.app",
  messagingSenderId: "38554991284",
  appId: "1:38554991284:web:e18f624e6329d00ae5b5e1"
};

// --- GLOBAL STATE ---
let db = null;
let state = {
  workData: [],
  workNotes: [],
  contacts: [],
  barcodeHistory: [],
  activeView: 'dashboard',
  dataFilter: 'Tümü',
  notesFilter: 'Tümü',
  contactFilter: 'Tümü',
  fileFilter: 'Tümü',
  scannerRunning: false,
  ocrStream: null,
  currentBarcodeText: '',
  editingDataId: null,
  editingNoteId: null,
  editingContactId: null,
  editingFileId: null,
  isAdmin: localStorage.getItem('osmanylz_admin') === 'true',
};

let confirmCallback = null;

// =====================================================
// ADMIN AUTHENTICATION
// =====================================================
function loginAdmin() {
  const user = document.getElementById('admin-user')?.value.trim();
  const pass = document.getElementById('admin-pass')?.value.trim();
  if (user === 'osman' && pass === '123456') {
    localStorage.setItem('osmanylz_admin', 'true');
    state.isAdmin = true;
    applyAdminState();
    document.getElementById('admin-user').value = '';
    document.getElementById('admin-pass').value = '';
    showToast('Admin girişi başarılı!', 'success');
  } else {
    showToast('Hatalı kullanıcı adı veya şifre.', 'error');
  }
}

function logoutAdmin() {
  localStorage.setItem('osmanylz_admin', 'false');
  state.isAdmin = false;
  applyAdminState();
  showToast('Çıkış yapıldı, görüntüleme modundasınız.', 'info');
}

function applyAdminState() {
  if (state.isAdmin) {
    document.body.classList.add('is-admin');
    document.getElementById('admin-login-section').style.display = 'none';
    document.getElementById('admin-logout-section').style.display = 'block';
  } else {
    document.body.classList.remove('is-admin');
    document.getElementById('admin-login-section').style.display = 'block';
    document.getElementById('admin-logout-section').style.display = 'none';
  }
}

// =====================================================
// FIREBASE INIT & REALTIME LISTENERS
// =====================================================
function initFirebase() {
  applyAdminState();
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    setFirebaseStatus('connected');

    // Realtime listeners
    db.collection('workData').orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        state.workData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderDataView();
        updateDashboard();
      }, err => {
        console.error('workData listener error:', err);
        setFirebaseStatus('error');
      });

    db.collection('contacts').orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        state.contacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderContactsView();
        updateDashboard();
      }, err => {
        console.error('contacts listener error:', err);
      });

    db.collection('barcodeHistory').orderBy('createdAt', 'desc').limit(50)
      .onSnapshot(snap => {
        state.barcodeHistory = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderBarcodeHistory();
      });

    db.collection('workNotes').orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        state.workNotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderNotesView();
        updateDashboard();
      }, err => {
        console.error('workNotes listener error:', err);
      });

    db.collection('workFiles').orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        state.workFiles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderFilesView();
      }, err => {
        console.error('workFiles listener error:', err);
      });

  } catch (e) {
    console.error('Firebase init error:', e);
    setFirebaseStatus('error');
  }
}

function setFirebaseStatus(status) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const badge = document.getElementById('settings-status-badge');
  if (status === 'connected') {
    dot?.classList.add('connected');
    dot?.classList.remove('error');
    if (text) text.textContent = 'Bağlı';
    if (badge) { badge.textContent = 'Bağlı'; badge.className = 'status-badge'; }
  } else if (status === 'error') {
    dot?.classList.add('error');
    dot?.classList.remove('connected');
    if (text) text.textContent = 'Bağlantı Hatası';
    if (badge) { badge.textContent = 'Bağlantı Hatası'; badge.className = 'status-badge error'; }
  }
}

// =====================================================
// LİGHTBOX — Resim Tam Ekran
// =====================================================
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  if (!lb || !img) return;
  img.src = src;
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.style.display = 'none';
  document.body.style.overflow = '';
}

// =====================================================
// DETAY MODALİ — IP & Not Tam Görünüm
// =====================================================
function openDataDetail(id) {
  const item = state.workData.find(d => d.id === id);
  if (!item) return;
  document.getElementById('detail-title').textContent = item.title;
  document.getElementById('detail-body').innerHTML = `
    ${item.category ? `<div class="detail-badge">${escHtml(item.category)}</div>` : ''}
    ${item.adslIp ? `<div class="detail-field"><div class="detail-field-label">ADSL IP</div><div class="detail-field-value">${escHtml(item.adslIp)}</div>${item.adslPort ? `<div class="detail-field-sub">Port: ${escHtml(item.adslPort)}</div>` : ''}</div>` : ''}
    ${item.mobilIp ? `<div class="detail-field"><div class="detail-field-label">Mobil IP</div><div class="detail-field-value">${escHtml(item.mobilIp)}</div>${item.mobilPort ? `<div class="detail-field-sub">Port: ${escHtml(item.mobilPort)}</div>` : ''}</div>` : ''}
    ${item.bankaApn ? `<div class="detail-field"><div class="detail-field-label">Banka APN</div><div class="detail-field-value">${escHtml(item.bankaApn)}</div></div>` : ''}
    ${item.cagriTel ? `<div class="detail-field"><div class="detail-field-label">Çağrı Merkezi</div><div class="detail-field-value" style="display:flex;align-items:center;gap:12px;">${escHtml(item.cagriTel)}<a href="tel:${escHtml(item.cagriTel.replace(/\s/g,''))}" class="btn btn-primary btn-sm" style="text-decoration:none;">📞 Ara</a></div></div>` : ''}
    ${item.body ? `<div class="detail-field"><div class="detail-field-label">Notlar</div><div class="detail-field-text">${escHtml(item.body)}</div></div>` : ''}
    <div class="detail-actions admin-only">
      <button class="btn btn-ghost" onclick="closeDetailModal();openEditDataModal('${item.id}')">✏️ Düzenle</button>
    </div>`;
  document.getElementById('detail-overlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function openNoteDetail(id) {
  const item = state.workNotes.find(n => n.id === id);
  if (!item) return;
  document.getElementById('detail-title').textContent = item.title;
  document.getElementById('detail-body').innerHTML = `
    <div class="detail-badge ${getNotesCatClass(item.category)}">${escHtml(item.category || 'Genel Notlar')}</div>
    ${item.imageData ? `
      <div class="detail-image-wrap" onclick="openLightbox('${item.imageData}')">
        <img src="${item.imageData}" alt="Resim Notu" class="detail-image">
        <div class="detail-image-hint">🔍 Büyütmek için tıkla</div>
      </div>` : ''}
    ${item.body ? `<div class="detail-field"><div class="detail-field-text" style="white-space:pre-wrap;font-size:16px;line-height:1.8;">${escHtml(item.body)}</div></div>` : ''}
    <div class="detail-actions admin-only">
      <button class="btn btn-ghost" onclick="closeDetailModal();openEditNoteModal('${item.id}')">✏️ Düzenle</button>
    </div>`;
  document.getElementById('detail-overlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
  const el = document.getElementById('detail-overlay');
  if (el) el.style.display = 'none';
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLightbox(); closeDetailModal(); }
});

// =====================================================
// NAVIGATION
// =====================================================
const viewTitles = {
  dashboard: 'Panel',
  data: 'Banka İpleri',
  notes: 'İş Notları',
  barcode: 'Barkod Üretici',
  scanner: 'Kamera Tarayıcı',
  contacts: 'Rehber',
  settings: 'Ayarlar'
};

function navigateTo(view) {
  // Deactivate all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-item').forEach(n => n.classList.remove('active'));

  // Activate target view
  document.getElementById('view-' + view)?.classList.add('active');
  document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');
  document.querySelector(`.mobile-nav-item[data-view="${view}"]`)?.classList.add('active');

  // Update title
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = viewTitles[view] || view;

  state.activeView = view;
  closeSidebar();

  // Stop scanner if leaving scanner view
  if (view !== 'scanner' && state.scannerRunning) {
    stopScanner();
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar?.classList.toggle('open');
  overlay?.classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('active');
}

// =====================================================
// DASHBOARD
// =====================================================
function updateDashboard() {
  // Nav badges
  const bdData = document.getElementById('nav-badge-data');
  const bdNotes = document.getElementById('nav-badge-notes');
  const bdContacts = document.getElementById('nav-badge-contacts');
  if (bdData) bdData.textContent = state.workData.length;
  if (bdNotes) bdNotes.textContent = state.workNotes.length;
  if (bdContacts) bdContacts.textContent = state.contacts.length;

  // Stats strip
  const dsIp = document.getElementById('ds-ip');
  const dsNotes = document.getElementById('ds-notes');
  const dsContacts = document.getElementById('ds-contacts');
  const dsBarcode = document.getElementById('ds-barcode');
  if (dsIp) dsIp.textContent = state.workData.length;
  if (dsNotes) dsNotes.textContent = state.workNotes.length;
  if (dsContacts) dsContacts.textContent = state.contacts.length;
  if (dsBarcode) dsBarcode.textContent = state.barcodeHistory.length;

  // Aktivite akışı
  updateActivityFeed();
}

function updateActivityFeed() {
  const container = document.getElementById('activity-feed');
  if (!container) return;

  const activities = [];
  state.workData.forEach(item => activities.push({
    dot: 'blue', title: item.title || 'IP Kaydı', type: 'Banka İpleri',
    ts: item.createdAt?.toDate?.() || new Date(0)
  }));
  state.workNotes.forEach(item => activities.push({
    dot: 'purple', title: item.title || 'Not', type: item.category || 'İş Notları',
    ts: item.createdAt?.toDate?.() || new Date(0)
  }));
  state.contacts.forEach(item => activities.push({
    dot: 'orange', title: item.name || 'Kişi', type: item.role || 'Rehber',
    ts: item.createdAt?.toDate?.() || new Date(0)
  }));

  activities.sort((a, b) => b.ts - a.ts);
  const top = activities.slice(0, 10);

  if (top.length === 0) {
    container.innerHTML = '<div class="empty-state-sm"><p>Henüz aktivite yok</p></div>';
    return;
  }
  container.innerHTML = top.map(a => `
    <div class="activity-item">
      <div class="activity-dot activity-dot--${a.dot}"></div>
      <div>
        <div class="activity-title">${escHtml(a.title)}</div>
        <div class="activity-type">${escHtml(a.type)}</div>
      </div>
    </div>`).join('');
}

// =====================================================
// HIZLI NOT (Dashboard → İş Notları)
// =====================================================
async function saveQuickNote() {
  const title = document.getElementById('q-title')?.value.trim();
  const category = document.getElementById('q-category')?.value || 'Genel Notlar';
  const data = { title, category, body: '', imageData: '' };

  if (!title) { showToast('Başlık boş olamaz!', 'error'); return; }

  if (category === 'Resim Notu') {
    const fileInput = document.getElementById('q-image-file');
    if (fileInput?.files[0]) {
      showToast('Resim sıkıştırılıyor...', 'info');
      data.imageData = await compressImageToBase64(fileInput.files[0]);
    }
  } else {
    data.body = document.getElementById('q-body')?.value.trim() || '';
  }

  try {
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection('workNotes').add(data);
    // Formu temizle
    document.getElementById('q-title').value = '';
    document.getElementById('q-body').value = '';
    document.getElementById('q-category').selectedIndex = 0;
    const qimg = document.getElementById('q-image-file');
    if (qimg) qimg.value = '';
    const qprev = document.getElementById('q-image-preview');
    if (qprev) qprev.innerHTML = '<div class="image-upload-placeholder"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p>Resim seçin</p></div>';
    toggleQuickNoteType(0); // Formu başa döndür
    // Badge
    const badge = document.getElementById('quick-save-badge');
    if (badge) { badge.style.display = 'inline-block'; setTimeout(() => { badge.style.display = 'none'; }, 2500); }
    showToast('Not İş Notlarına kaydedildi!', 'success');
  } catch (e) {
    showToast('Hata: ' + e.message, 'error');
  }
}

function toggleQuickNoteType(reset) {
  const sel = document.getElementById('q-category');
  const val = reset === 0 ? 'Genel Notlar' : sel?.value;
  const textSec = document.getElementById('q-text-section');
  const imgSec  = document.getElementById('q-image-section');
  if (!textSec || !imgSec) return;
  if (val === 'Resim Notu') {
    textSec.style.display = 'none';
    imgSec.style.display  = 'block';
  } else {
    textSec.style.display = 'block';
    imgSec.style.display  = 'none';
  }
}

function previewQuickImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('q-image-preview').innerHTML =
      `<img src="${e.target.result}" style="max-width:100%;max-height:160px;border-radius:8px;">`;
  };
  reader.readAsDataURL(file);
}

// =====================================================
// BANNER SLIDER
// =====================================================
// Resimlerinizi osmanylz-assistant/images/ klasörüne atın
// Sonra dosya adlarını aşağıya ekleyin:
const BANNER_IMAGES = [
  'images/urun1.jpg',
  'images/urun2.jpg',
  'images/urun3.jpg',
  'images/urun4.jpg',
  'images/urun5.jpg',
];

let bannerIndex = 0;
let bannerTimer = null;
let bannerLoaded = [];

function initBanner() {
  const track = document.getElementById('banner-track');
  const dotsContainer = document.getElementById('banner-dots');
  const btnPrev = document.getElementById('banner-prev');
  const btnNext = document.getElementById('banner-next');
  if (!track) return;

  // Her resmi test et — sadece yüklenenleri göster
  let loaded = 0;
  const promises = BANNER_IMAGES.map(src => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  }));

  Promise.all(promises).then(results => {
    bannerLoaded = results.filter(Boolean);
    if (bannerLoaded.length === 0) return; // Resim yok, placeholder kalır

    // Slide'ları oluştur
    track.innerHTML = bannerLoaded.map(src => `
      <div class="banner-slide">
        <img src="${src}" alt="Ürün">
        <div class="banner-slide-overlay"></div>
      </div>`).join('');

    // Dots
    dotsContainer.innerHTML = bannerLoaded.map((_, i) =>
      `<button class="banner-dot ${i === 0 ? 'active' : ''}" onclick="bannerGo(${i})"></button>`
    ).join('');

    // Butonlar
    if (btnPrev) btnPrev.style.display = bannerLoaded.length > 1 ? 'flex' : 'none';
    if (btnNext) btnNext.style.display = bannerLoaded.length > 1 ? 'flex' : 'none';

    bannerIndex = 0;
    bannerStartAuto();
  });
}

function bannerGo(idx) {
  bannerIndex = (idx + bannerLoaded.length) % bannerLoaded.length;
  const track = document.getElementById('banner-track');
  if (track) track.style.transform = `translateX(-${bannerIndex * 100}%)`;
  document.querySelectorAll('.banner-dot').forEach((d, i) =>
    d.classList.toggle('active', i === bannerIndex));
  bannerRestartAuto();
}
function bannerNext() { bannerGo(bannerIndex + 1); }
function bannerPrev() { bannerGo(bannerIndex - 1); }
function bannerStartAuto() {
  bannerTimer = setInterval(() => bannerGo(bannerIndex + 1), 4000);
}
function bannerRestartAuto() {
  clearInterval(bannerTimer);
  if (bannerLoaded.length > 1) bannerStartAuto();
}



function avatarLetter(name) {
  const letter = (name || '?')[0].toUpperCase();
  return `<span style="font-family:'Outfit',sans-serif;font-size:16px;font-weight:700;">${letter}</span>`;
}

// =====================================================
// CLOCK
// =====================================================
function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();

  // Saat
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const clockEl = document.getElementById('time-clock');
  if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;

  // Tarih
  const dateStr = now.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const dateEl = document.getElementById('time-date');
  if (dateEl) dateEl.textContent = dateStr;

  // Yılın kaçıncı günü
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const dayNumEl = document.getElementById('time-day-num');
  if (dayNumEl) dayNumEl.textContent = dayOfYear;
}

// =====================================================
// DATA VIEW
// =====================================================
const DATA_CATEGORIES = ['Tümü', 'Banka IP Listesi', 'Genel Notlar', 'Teknik', 'Finans', 'Diğer'];

function renderDataView() {
  renderDataFilters();
  filterData();
}

function renderDataFilters() {
  const container = document.getElementById('data-category-filters');
  if (!container) return;

  const categories = ['Tümü', ...new Set(state.workData.map(d => d.category).filter(Boolean)), ...DATA_CATEGORIES.slice(1)];
  const unique = [...new Set(categories)];

  container.innerHTML = unique.map(cat => `
    <button class="filter-chip ${state.dataFilter === cat ? 'active' : ''}" onclick="setDataFilter('${escHtml(cat)}')">${escHtml(cat)}</button>
  `).join('');
}

function setDataFilter(cat) {
  state.dataFilter = cat;
  renderDataFilters();
  filterData();
}

function filterData() {
  const search = (document.getElementById('data-search')?.value || '').toLowerCase();
  const filtered = state.workData.filter(item => {
    const matchCat = state.dataFilter === 'Tümü' || item.category === state.dataFilter;
    const matchSearch = !search ||
      item.title?.toLowerCase().includes(search) ||
      item.body?.toLowerCase().includes(search) ||
      item.adslIp?.toLowerCase().includes(search) ||
      item.mobilIp?.toLowerCase().includes(search) ||
      (item.tags || []).some(t => t.toLowerCase().includes(search));
    return matchCat && matchSearch;
  });
  renderDataList(filtered);
}

function getCatClass(cat) {
  if (!cat) return 'cat-diger';
  const lower = cat.toLowerCase();
  if (lower.includes('banka') || lower.includes('ip')) return 'cat-banka';
  if (lower.includes('genel') || lower.includes('not')) return 'cat-genel';
  return 'cat-diger';
}

function renderDataList(items) {
  const container = document.getElementById('data-list');
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <h3>Kayıt Bulunamadı</h3>
        <p>Yeni kayıt eklemek için "Yeni IP Kaydı" butonuna basın.</p>
      </div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const hasIp = item.adslIp || item.mobilIp;
    const preview = item.adslIp || item.mobilIp || 'IP bilgisi yok';
    return `
      <div class="data-card accordion-card" id="dc-${item.id}" onclick="toggleCard('${item.id}','data',event)">
        <div class="card-head">
          <div class="card-head-left">
            <div class="data-card-title">${escHtml(item.title)}</div>
            <div class="card-preview">${escHtml(preview)}</div>
          </div>
          <div class="card-head-right">
            <span class="data-card-category ${getCatClass(item.category)}">${escHtml(item.category || '')}</span>
            <svg class="card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <div class="card-body-expand">
          ${hasIp ? `<div class="ip-grid">
            ${item.adslIp ? `<div class="ip-item"><div class="ip-label">ADSL IP</div><div class="ip-value">${escHtml(item.adslIp)}</div>${item.adslPort ? `<div class="ip-port">Port: ${escHtml(item.adslPort)}</div>` : ''}</div>` : ''}
            ${item.mobilIp ? `<div class="ip-item"><div class="ip-label">Mobil IP</div><div class="ip-value">${escHtml(item.mobilIp)}</div>${item.mobilPort ? `<div class="ip-port">Port: ${escHtml(item.mobilPort)}</div>` : ''}</div>` : ''}
          </div>` : ''}
          ${item.bankaApn ? `<div class="ip-grid"><div class="ip-item"><div class="ip-label">Banka APN</div><div class="ip-value">${escHtml(item.bankaApn)}</div></div></div>` : ''}
          ${item.cagriTel ? `<div class="ip-grid"><div class="ip-item"><div class="ip-label">Çağrı Merkezi</div><div class="ip-value" style="display:flex;align-items:center;gap:8px;">${escHtml(item.cagriTel)}<a href="tel:${escHtml(item.cagriTel.replace(/\s/g,''))}" class="btn btn-primary btn-sm" style="padding:4px 10px;font-size:12px;text-decoration:none;" onclick="event.stopPropagation()">📞 Ara</a></div></div></div>` : ''}
          ${item.body ? `<div class="data-card-body">${escHtml(item.body)}</div>` : ''}
          <div class="data-card-actions" onclick="event.stopPropagation()">
            <button class="btn btn-primary btn-sm" onclick="openDataDetail('${item.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              Detay
            </button>
            <button class="btn btn-ghost btn-sm admin-only" onclick="openEditDataModal('${item.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Düzenle
            </button>
            <button class="btn btn-danger btn-sm admin-only" onclick="confirmDeleteData('${item.id}', '${escHtml(item.title).replace(/'/g,"\\'")}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              Sil
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}


// --- ADD / EDIT DATA MODAL ---
function openAddDataModal() {
  state.editingDataId = null;
  document.getElementById('modal-title').textContent = 'Yeni IP Kaydı';
  document.getElementById('modal-body').innerHTML = dataFormHTML({});
  openModal();
}

function openEditDataModal(id) {
  const item = state.workData.find(d => d.id === id);
  if (!item) return;
  state.editingDataId = id;
  document.getElementById('modal-title').textContent = 'Kaydı Düzenle';
  document.getElementById('modal-body').innerHTML = dataFormHTML(item);
  openModal();
}

function dataFormHTML(item) {
  return `
    <div class="form-group">
      <label class="form-label">Başlık *</label>
      <input type="text" id="f-title" class="form-control" placeholder="örn: Garanti Bankası İP..." value="${escHtml(item.title||'')}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">ADSL IP</label>
        <input type="text" id="f-adsl-ip" class="form-control" placeholder="192.168.x.x" value="${escHtml(item.adslIp||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">ADSL Port</label>
        <input type="text" id="f-adsl-port" class="form-control" placeholder="8080" value="${escHtml(item.adslPort||'')}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Mobil IP</label>
        <input type="text" id="f-mobil-ip" class="form-control" placeholder="10.x.x.x" value="${escHtml(item.mobilIp||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">Mobil Port</label>
        <input type="text" id="f-mobil-port" class="form-control" placeholder="9090" value="${escHtml(item.mobilPort||'')}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Banka APN</label>
      <input type="text" id="f-banka-apn" class="form-control" placeholder="örn: internet, mobile.banka.com" value="${escHtml(item.bankaApn||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Çağrı Merkezi Tel</label>
      <div class="input-with-btn">
        <input type="tel" id="f-cagri-tel" class="form-control" placeholder="örn: 444 0 123" value="${escHtml(item.cagriTel||'')}">
        <button type="button" class="btn btn-primary" onclick="quickCall()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
          Ara
        </button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveData()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Kaydet
      </button>
    </div>`;
}

async function saveData() {
  const title = document.getElementById('f-title')?.value.trim();
  if (!title) { showToast('Başlık boş olamaz!', 'error'); return; }

  const data = {
    title,
    adslIp: document.getElementById('f-adsl-ip')?.value.trim() || '',
    adslPort: document.getElementById('f-adsl-port')?.value.trim() || '',
    mobilIp: document.getElementById('f-mobil-ip')?.value.trim() || '',
    mobilPort: document.getElementById('f-mobil-port')?.value.trim() || '',
    bankaApn: document.getElementById('f-banka-apn')?.value.trim() || '',
    cagriTel: document.getElementById('f-cagri-tel')?.value.trim() || '',
  };

  try {
    if (state.editingDataId) {
      await db.collection('workData').doc(state.editingDataId).update(data);
      showToast('Kayıt güncellendi!', 'success');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('workData').add(data);
      showToast('Kayıt eklendi!', 'success');
    }
    closeModal();
  } catch (e) {
    console.error(e);
    showToast('Hata: ' + e.message, 'error');
  }
}

async function deleteData(id) {
  try {
    await db.collection('workData').doc(id).delete();
    showToast('Kayıt silindi.', 'info');
  } catch (e) {
    showToast('Silme hatası: ' + e.message, 'error');
  }
}

function confirmDeleteData(id, title) {
  showConfirm(`"${title}" kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`, () => deleteData(id));
}

function quickCall() {
  const tel = document.getElementById('f-cagri-tel')?.value.trim();
  if (tel) {
    window.open('tel:' + tel.replace(/\s/g, ''));
  } else {
    showToast('Telefon numarası girilmedi!', 'error');
  }
}

// =====================================================
// İŞ NOTLARI VIEW
// =====================================================
const NOTE_CATEGORIES = ['Tümü', 'Genel Notlar', 'Teknik', 'Finans', 'Resim Notu'];

function renderNotesView() {
  renderNoteFilters();
  filterNotes();
}

function renderNoteFilters() {
  const container = document.getElementById('notes-category-filters');
  if (!container) return;
  container.innerHTML = NOTE_CATEGORIES.map(cat => `
    <button class="filter-chip ${state.notesFilter === cat ? 'active' : ''}"
      onclick="setNotesFilter('${cat}')">${cat}</button>
  `).join('');
}

function setNotesFilter(cat) {
  state.notesFilter = cat;
  renderNoteFilters();
  filterNotes();
}

function filterNotes() {
  const search = document.getElementById('notes-search')?.value.toLowerCase() || '';
  const filtered = state.workNotes.filter(item => {
    const matchCat = state.notesFilter === 'Tümü' || item.category === state.notesFilter;
    const matchSearch = !search ||
      item.title?.toLowerCase().includes(search) ||
      item.body?.toLowerCase().includes(search) ||
      item.category?.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });
  renderNotesList(filtered);
}

function renderNotesList(items) {
  const container = document.getElementById('notes-list');
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <h3>Not Bulunamadı</h3>
        <p>Yeni not eklemek için "Yeni Not" butonuna basın.</p>
      </div>`;
    return;
  }
  container.innerHTML = items.map(item => {
    const preview = item.category === 'Resim Notu'
      ? '🖼️ Görsel Not'
      : (item.body ? item.body.substring(0, 60) + (item.body.length > 60 ? '...' : '') : 'Not yok');
    return `
    <div class="data-card accordion-card" id="nc-${item.id}" onclick="toggleCard('${item.id}','note',event)">

      <!-- KAPALI HEAD -->
      <div class="card-head">
        <div class="card-head-left">
          <div class="data-card-title">${escHtml(item.title)}</div>
          <div class="card-preview">${escHtml(preview)}</div>
        </div>
        <div class="card-head-right">
          <span class="data-card-category ${getNotesCatClass(item.category)}">${escHtml(item.category || 'Genel Notlar')}</span>
          <svg class="card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>

      <!-- GENLİŞİLEN İÇERİK -->
      <div class="card-body-expand">
        ${item.imageData ? `<div class="note-image-wrap"><img src="${item.imageData}" alt="Resim Notu" class="note-image"></div>` : ''}
        ${item.body ? `<div class="data-card-body" style="white-space:pre-wrap;">${escHtml(item.body)}</div>` : ''}
        <div class="data-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-primary btn-sm" onclick="openNoteDetail('${item.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            Detay
          </button>
          <button class="btn btn-ghost btn-sm admin-only" onclick="openEditNoteModal('${item.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Düzenle
          </button>
          <button class="btn btn-danger btn-sm admin-only" onclick="confirmDeleteNote('${item.id}', '${escHtml(item.title).replace(/'/g,"\\'")}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            Sil
          </button>
        </div>
      </div>

    </div>`;
  }).join('');
}

function getNotesCatClass(cat) {
  if (!cat) return 'cat-diger';
  const l = cat.toLowerCase();
  if (l.includes('teknik')) return 'cat-banka';
  if (l.includes('finans')) return 'cat-genel';
  if (l.includes('resim')) return 'cat-resim';
  return 'cat-diger';
}

// Accordion toggle
function toggleCard(id, type, event) {
  const prefix = type === 'data' ? 'dc-' : 'nc-';
  const card = document.getElementById(prefix + id);
  if (!card) return;
  const isOpen = card.classList.contains('expanded');
  // Aynı listedeki tüm kartları kapat
  const container = card.closest('[id$="-list"], [id$="-container"]') || card.parentElement;
  container.querySelectorAll('.accordion-card.expanded').forEach(c => c.classList.remove('expanded'));
  // Bu kartı aç veya kapat
  if (!isOpen) card.classList.add('expanded');
}

function openAddNoteModal() {
  state.editingNoteId = null;
  document.getElementById('modal-title').textContent = 'Yeni Not';
  document.getElementById('modal-body').innerHTML = noteFormHTML({});
  openModal();
}

function openEditNoteModal(id) {
  const item = state.workNotes.find(n => n.id === id);
  if (!item) return;
  state.editingNoteId = id;
  document.getElementById('modal-title').textContent = 'Notu Düzenle';
  document.getElementById('modal-body').innerHTML = noteFormHTML(item);
  openModal();
}

function noteFormHTML(item) {
  const isImage = item.category === 'Resim Notu';
  return `
    <div class="form-group">
      <label class="form-label">Başlık *</label>
      <input type="text" id="n-title" class="form-control" placeholder="Not başlığı..." value="${escHtml(item.title||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Kategori</label>
      <select id="n-category" class="form-control" onchange="toggleNoteType(this.value)">
        ${['Genel Notlar','Teknik','Finans','Resim Notu'].map(c =>
          `<option value="${c}" ${item.category===c?'selected':''}>${c}</option>`
        ).join('')}
      </select>
    </div>

    <!-- Metin alanı -->
    <div class="form-group" id="note-text-section" style="display:${isImage ? 'none' : 'block'}">
      <label class="form-label">Not / Açıklama</label>
      <textarea id="n-body" class="form-control" placeholder="Notunuzu buraya yazın..." style="min-height:140px;">${escHtml(item.body||'')}</textarea>
    </div>

    <!-- Resim yükleme alanı -->
    <div class="form-group" id="note-image-section" style="display:${isImage ? 'block' : 'none'}">
      <label class="form-label">Görsel</label>
      <div class="image-upload-area" onclick="document.getElementById('n-image-file').click()">
        <input type="file" id="n-image-file" accept="image/*" style="display:none" onchange="previewNoteImage(this)">
        <div id="note-image-preview">
          ${item.imageData
            ? `<img src="${item.imageData}" style="max-width:100%;max-height:220px;border-radius:8px;">`
            : `<div class="image-upload-placeholder">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <p>Resim seçmek için tıklayın</p>
                <span>JPG, PNG, WEBP desteklenir</span>
              </div>`
          }
        </div>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveNote()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Kaydet
      </button>
    </div>`;
}

function toggleNoteType(val) {
  const textSection = document.getElementById('note-text-section');
  const imageSection = document.getElementById('note-image-section');
  if (!textSection || !imageSection) return;
  if (val === 'Resim Notu') {
    textSection.style.display = 'none';
    imageSection.style.display = 'block';
  } else {
    textSection.style.display = 'block';
    imageSection.style.display = 'none';
  }
}

function previewNoteImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('note-image-preview').innerHTML =
      `<img src="${e.target.result}" style="max-width:100%;max-height:220px;border-radius:8px;">`;
  };
  reader.readAsDataURL(file);
}

async function compressImageToBase64(file, maxW = 900, quality = 0.75) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function saveNote() {
  const title = document.getElementById('n-title')?.value.trim();
  if (!title) { showToast('Başlık boş olamaz!', 'error'); return; }
  const category = document.getElementById('n-category')?.value || 'Genel Notlar';

  const data = { title, category, body: '', imageData: '' };

  if (category === 'Resim Notu') {
    const fileInput = document.getElementById('n-image-file');
    if (fileInput?.files[0]) {
      showToast('Resim sıkıştırılıyor...', 'info');
      data.imageData = await compressImageToBase64(fileInput.files[0]);
    } else {
      // Düzenlemede mevcut resmi koru
      const existing = state.workNotes.find(n => n.id === state.editingNoteId);
      data.imageData = existing?.imageData || '';
    }
  } else {
    data.body = document.getElementById('n-body')?.value.trim() || '';
  }

  try {
    if (state.editingNoteId) {
      await db.collection('workNotes').doc(state.editingNoteId).update(data);
      showToast('Not güncellendi!', 'success');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('workNotes').add(data);
      showToast('Not eklendi!', 'success');
    }
    closeModal();
  } catch (e) {
    console.error(e);
    showToast('Hata: ' + e.message, 'error');
  }
}

async function deleteNote(id) {
  try {
    await db.collection('workNotes').doc(id).delete();
    showToast('Not silindi.', 'info');
  } catch (e) {
    showToast('Silme hatası: ' + e.message, 'error');
  }
}

function confirmDeleteNote(id, title) {
  showConfirm(`"${title}" notunu silmek istediğinize emin misiniz?`, () => deleteNote(id));
}


function renderContactsView() {
  renderContactFilters();
  filterContacts();
}

function renderContactFilters() {
  const container = document.getElementById('contact-category-filters');
  if (!container) return;
  const categories = ['Tümü', ...new Set(state.contacts.map(c => c.category).filter(Boolean))];
  container.innerHTML = categories.map(cat => `
    <button class="filter-chip ${state.contactFilter === cat ? 'active' : ''}" onclick="setContactFilter('${escHtml(cat)}')">${escHtml(cat)}</button>
  `).join('');
}

function setContactFilter(cat) {
  state.contactFilter = cat;
  renderContactFilters();
  filterContacts();
}

function filterContacts() {
  const search = (document.getElementById('contact-search')?.value || '').toLowerCase();
  const filtered = state.contacts.filter(c => {
    const matchCat = state.contactFilter === 'Tümü' || c.category === state.contactFilter;
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(search) ||
      c.role?.toLowerCase().includes(search) ||
      c.phone?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });
  renderContactsList(filtered);
}

function renderContactsList(items) {
  const container = document.getElementById('contacts-list');
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        </svg>
        <h3>Kişi Bulunamadı</h3>
        <p>Yeni kişi eklemek için "Kişi Ekle" butonuna basın.</p>
      </div>`;
    return;
  }
  container.innerHTML = items.map(c => `
    <div class="contact-card">
      <div class="contact-header">
        <div class="contact-avatar">${(c.name||'?')[0].toUpperCase()}</div>
        <div>
          <div class="contact-name">${escHtml(c.name)}</div>
          ${c.role ? `<div class="contact-role">${escHtml(c.role)}</div>` : ''}
        </div>
      </div>
      ${c.category ? `<span class="contact-category">${escHtml(c.category)}</span>` : ''}
      <div class="contact-info">
        ${c.phone ? `<div class="contact-info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
          </svg>
          <span>${escHtml(c.phone)}</span>
        </div>` : ''}
        ${c.email ? `<div class="contact-info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <a href="mailto:${escHtml(c.email)}">${escHtml(c.email)}</a>
        </div>` : ''}
        ${c.notes ? `<div class="contact-info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          </svg>
          <span>${escHtml(c.notes)}</span>
        </div>` : ''}
      </div>
      <div class="contact-card-actions">
        ${c.phone ? `<a href="tel:${escHtml(c.phone).replace(/\\s/g,'')}" class="btn btn-primary btn-sm" style="text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          Ara
        </a>` : ''}
        <button class="btn btn-ghost btn-sm admin-only" onclick="openEditContactModal('${c.id}')">Düzenle</button>
        <button class="btn btn-danger btn-sm admin-only" onclick="confirmDeleteContact('${c.id}', '${escHtml(c.name).replace(/'/g,"\\'")}')">Sil</button>
      </div>
    </div>`).join('');
}

function openAddContactModal() {
  state.editingContactId = null;
  document.getElementById('modal-title').textContent = 'Yeni Kişi Ekle';
  document.getElementById('modal-body').innerHTML = contactFormHTML({});
  openModal();
}

function openEditContactModal(id) {
  const item = state.contacts.find(c => c.id === id);
  if (!item) return;
  state.editingContactId = id;
  document.getElementById('modal-title').textContent = 'Kişiyi Düzenle';
  document.getElementById('modal-body').innerHTML = contactFormHTML(item);
  openModal();
}

function contactFormHTML(c) {
  return `
    <div class="form-group">
      <label class="form-label">Ad Soyad *</label>
      <input type="text" id="c-name" class="form-control" placeholder="Ad Soyad" value="${escHtml(c.name||'')}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Unvan / Görev</label>
        <input type="text" id="c-role" class="form-control" placeholder="IT Uzmanı..." value="${escHtml(c.role||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select id="c-category" class="form-control">
          ${['Şirket İçi','Tedarikçi','Müşteri','Banka','Diğer'].map(cat =>
            `<option value="${cat}" ${c.category===cat?'selected':''}>${cat}</option>`
          ).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Telefon</label>
        <input type="tel" id="c-phone" class="form-control" placeholder="0555 123 4567" value="${escHtml(c.phone||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">E-posta</label>
        <input type="email" id="c-email" class="form-control" placeholder="ornek@sirket.com" value="${escHtml(c.email||'')}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notlar</label>
      <textarea id="c-notes" class="form-control" placeholder="Kişi hakkında notlar...">${escHtml(c.notes||'')}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveContact()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Kaydet
      </button>
    </div>`;
}

async function saveContact() {
  const name = document.getElementById('c-name')?.value.trim();
  if (!name) { showToast('Ad boş olamaz!', 'error'); return; }

  const data = {
    name,
    role: document.getElementById('c-role')?.value.trim() || '',
    category: document.getElementById('c-category')?.value || 'Diğer',
    phone: document.getElementById('c-phone')?.value.trim() || '',
    email: document.getElementById('c-email')?.value.trim() || '',
    notes: document.getElementById('c-notes')?.value.trim() || '',
  };

  try {
    if (state.editingContactId) {
      await db.collection('contacts').doc(state.editingContactId).update(data);
      showToast('Kişi güncellendi!', 'success');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('contacts').add(data);
      showToast('Kişi eklendi!', 'success');
    }
    closeModal();
  } catch (e) {
    showToast('Hata: ' + e.message, 'error');
  }
}

async function deleteContact(id) {
  try {
    await db.collection('contacts').doc(id).delete();
    showToast('Kişi silindi.', 'info');
  } catch (e) {
    showToast('Silme hatası: ' + e.message, 'error');
  }
}

function confirmDeleteContact(id, name) {
  showConfirm(`"${name}" kişisini silmek istediğinize emin misiniz?`, () => deleteContact(id));
}

// =====================================================
// BARCODE GENERATOR (Code128)
// =====================================================
const CODE128_PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112"
];

function generateCode128(text) {
  let clean = '';
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 32 && c <= 126) clean += text[i];
  }
  if (!clean) return null;

  let symbols = [104]; // Start B
  let checksum = 104;
  for (let i = 0; i < clean.length; i++) {
    const val = clean.charCodeAt(i) - 32;
    symbols.push(val);
    checksum += val * (i + 1);
  }
  symbols.push(checksum % 103);
  symbols.push(106); // Stop

  let x = 0;
  let path = '';
  const h = 80;
  for (const sym of symbols) {
    const pat = CODE128_PATTERNS[sym];
    for (let p = 0; p < pat.length; p++) {
      const w = parseInt(pat[p]);
      if (p % 2 === 0) path += `M${x} 0h${w}v${h}h-${w}Z `;
      x += w;
    }
  }
  return { path, width: x };
}

function previewBarcode() {
  const text = document.getElementById('barcode-input')?.value.trim() || '';
  const label = document.getElementById('barcode-label')?.value.trim() || '';
  const preview = document.getElementById('barcode-preview');
  const btnSvg = document.getElementById('btn-download-svg');
  const btnPng = document.getElementById('btn-download-png');
  const btnSave = document.getElementById('btn-save-barcode');

  if (!text) {
    preview.innerHTML = `<div class="barcode-placeholder">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
        <line x1="3" y1="5" x2="3" y2="19"/><line x1="8" y1="5" x2="8" y2="19"/>
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="17" y1="5" x2="17" y2="19"/>
        <line x1="21" y1="5" x2="21" y2="19"/>
      </svg>
      <p>Yukarıya metin girin</p>
    </div>`;
    [btnSvg, btnPng, btnSave].forEach(b => b && (b.disabled = true));
    return;
  }

  const bc = generateCode128(text);
  if (!bc) {
    preview.innerHTML = '<div class="barcode-placeholder"><p>Geçersiz metin</p></div>';
    return;
  }

  state.currentBarcodeText = text;

  const QUIET = 24;   // Lazer ve kamera için sessiz bölge (her iki yanda)
  const BAR_H = 120;  // Uzun çubuklar = kolay tarama
  const PAD_TOP = 12;
  const PAD_BOT = label ? 32 : 20;
  const TOTAL_W = bc.width + QUIET * 2;
  const TOTAL_H = PAD_TOP + BAR_H + PAD_BOT;
  const displayW = Math.min(TOTAL_W * 1.6, 520);

  const svgContent = `<svg id="barcode-svg-el" xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 ${TOTAL_W} ${TOTAL_H}"
    width="${displayW}">
    <rect width="${TOTAL_W}" height="${TOTAL_H}" fill="white"/>
    <g transform="translate(${QUIET}, ${PAD_TOP})">
      <path d="${bc.path}" fill="black"/>
    </g>
    <text x="${TOTAL_W / 2}" y="${PAD_TOP + BAR_H + (label ? 22 : 14)}"
      text-anchor="middle"
      font-family="'Courier New', Courier, monospace"
      font-size="${label ? 13 : 11}"
      letter-spacing="${label ? 1.5 : 0.8}"
      fill="black">
      ${escHtml(label || text)}
    </text>
  </svg>`;

  preview.innerHTML = `<div class="barcode-output-frame">${svgContent}</div>`;
  [btnSvg, btnPng, btnSave].forEach(b => b && (b.disabled = false));
}

function downloadBarcodeSVG() {
  const svg = document.getElementById('barcode-svg-el');
  if (!svg) return;
  const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `barkod_${state.currentBarcodeText}.svg`;
  a.click(); URL.revokeObjectURL(url);
}

function downloadBarcodePNG() {
  const svg = document.getElementById('barcode-svg-el');
  if (!svg) return;
  const canvas = document.createElement('canvas');
  const scale = 4; // Yüksek çözünürlük — lazer ve kamera için net
  const vb = svg.viewBox.baseVal;
  canvas.width = vb.width * scale;
  canvas.height = vb.height * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const img = new Image();
  const svgBlob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const a = document.createElement('a');
    a.download = `barkod_${state.currentBarcodeText}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  img.src = url;
}


async function saveBarcodeToHistory() {

  const text = state.currentBarcodeText;
  if (!text) return;
  try {
    await db.collection('barcodeHistory').add({
      text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Barkod geçmişe kaydedildi!', 'success');
  } catch (e) {
    showToast('Kaydetme hatası: ' + e.message, 'error');
  }
}

function renderBarcodeHistory() {
  const container = document.getElementById('barcode-history-list');
  if (!container) return;
  if (state.barcodeHistory.length === 0) {
    container.innerHTML = '<div class="empty-state-sm"><p>Henüz barkod geçmişi yok</p></div>';
    return;
  }
  document.getElementById('stat-barcode').textContent = state.barcodeHistory.length;
  container.innerHTML = state.barcodeHistory.map(item => `
    <div class="barcode-history-item" onclick="loadBarcodeFromHistory('${escHtml(item.text).replace(/'/g,"\\'")}')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent-blue);flex-shrink:0;">
        <line x1="3" y1="5" x2="3" y2="19"/><line x1="8" y1="5" x2="8" y2="19"/>
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="17" y1="5" x2="17" y2="19"/>
        <line x1="21" y1="5" x2="21" y2="19"/>
      </svg>
      <span class="barcode-history-text">${escHtml(item.text)}</span>
      <span class="barcode-history-date">${formatDate(item.createdAt)}</span>
    </div>
  `).join('');
}

function loadBarcodeFromHistory(text) {
  const input = document.getElementById('barcode-input');
  if (input) { input.value = text; previewBarcode(); }
  navigateTo('barcode');
}

// =====================================================
// SCANNER (OCR)
// =====================================================
function startScanner() {
  const placeholder = document.getElementById('scanner-placeholder');
  const videoWrapper = document.getElementById('ocr-video-wrapper');
  const video = document.getElementById('ocr-video');
  const btnStart = document.getElementById('btn-start-scanner');
  const btnCapture = document.getElementById('btn-capture-ocr');
  const btnStop = document.getElementById('btn-stop-scanner');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Tarayıcınız kamerayı desteklemiyor!', 'error');
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      state.ocrStream = stream;
      state.scannerRunning = true;
      if (video) video.srcObject = stream;
      if (placeholder) placeholder.style.display = 'none';
      if (videoWrapper) videoWrapper.style.display = 'block';
      if (btnStart) btnStart.style.display = 'none';
      if (btnCapture) btnCapture.style.display = 'flex';
      if (btnStop) btnStop.style.display = 'flex';
      showToast('Kamera başlatıldı!', 'success');
    })
    .catch(err => {
      showToast('Kamera açılamadı: ' + err.message, 'error');
    });
}

function stopScanner() {
  if (state.ocrStream) {
    state.ocrStream.getTracks().forEach(t => t.stop());
    state.ocrStream = null;
  }
  state.scannerRunning = false;
  resetScanner();
}

function resetScanner() {
  state.scannerRunning = false;
  const placeholder = document.getElementById('scanner-placeholder');
  const videoWrapper = document.getElementById('ocr-video-wrapper');
  const video = document.getElementById('ocr-video');
  const btnStart = document.getElementById('btn-start-scanner');
  const btnCapture = document.getElementById('btn-capture-ocr');
  const btnStop = document.getElementById('btn-stop-scanner');
  const progress = document.getElementById('ocr-progress');
  if (placeholder) placeholder.style.display = 'block';
  if (videoWrapper) videoWrapper.style.display = 'none';
  if (video) video.srcObject = null;
  if (btnStart) btnStart.style.display = 'flex';
  if (btnCapture) btnCapture.style.display = 'none';
  if (btnStop) btnStop.style.display = 'none';
  if (progress) progress.style.display = 'none';
}

async function captureOCR() {
  const video = document.getElementById('ocr-video');
  if (!video || !state.scannerRunning) return;

  const btnCapture = document.getElementById('btn-capture-ocr');
  const progress = document.getElementById('ocr-progress');
  const progressFill = document.getElementById('ocr-progress-fill');
  const progressText = document.getElementById('ocr-progress-text');

  // Viewfinder alanını hesapla
  const viewfinder = document.getElementById('ocr-viewfinder');
  const videoWrapper = document.getElementById('ocr-video-wrapper');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (viewfinder && videoWrapper && video.videoWidth > 0) {
    const vfRect = viewfinder.getBoundingClientRect();
    const wrapRect = videoWrapper.getBoundingClientRect();

    // Viewfinder'ın video piksel koordinatlarına map'lenmesi
    const scaleX = video.videoWidth / wrapRect.width;
    const scaleY = video.videoHeight / wrapRect.height;

    const srcX = Math.max(0, Math.round((vfRect.left - wrapRect.left) * scaleX));
    const srcY = Math.max(0, Math.round((vfRect.top - wrapRect.top) * scaleY));
    const srcW = Math.min(video.videoWidth - srcX, Math.round(vfRect.width * scaleX));
    const srcH = Math.min(video.videoHeight - srcY, Math.round(vfRect.height * scaleY));

    canvas.width = srcW;
    canvas.height = srcH;
    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
  } else {
    // Viewfinder bulunamazsa tüm görüntüyü al
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);
  }

  // UI: işleniyor
  if (btnCapture) { btnCapture.disabled = true; btnCapture.textContent = 'Okunuyor...'; }
  if (progress) progress.style.display = 'flex';
  if (progressFill) progressFill.style.width = '0%';

  try {
    const result = await Tesseract.recognize(canvas, 'tur+eng', {
      logger: msg => {
        if (msg.status === 'recognizing text' && progressFill && progressText) {
          const pct = Math.round(msg.progress * 100);
          progressFill.style.width = pct + '%';
          progressText.textContent = `Okunuyor... %${pct}`;
        }
      }
    });

    const text = result.data.text.trim();
    if (progress) progress.style.display = 'none';

    if (text && text.length > 1) {
      addScanResult(text);
      showToast('Metin başarıyla okundu!', 'success');
    } else {
      showToast('Metin bulunamadı. Kamerayı yazıya yakın tutun.', 'info');
    }
  } catch (e) {
    if (progress) progress.style.display = 'none';
    showToast('OCR hatası: ' + e.message, 'error');
  }

  if (btnCapture) {
    btnCapture.disabled = false;
    btnCapture.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Metni Oku`;
  }
}

function addScanResult(text) {
  const container = document.getElementById('scan-results');
  if (!container) return;
  const emptyState = container.querySelector('.empty-state-sm');
  if (emptyState) emptyState.remove();

  const time = new Date().toLocaleTimeString('tr-TR');
  const item = document.createElement('div');
  item.className = 'scan-result-item';
  item.innerHTML = `
    <div class="scan-result-header">
      <span class="scan-result-time">${time}</span>
      <button class="btn btn-ghost btn-sm" onclick="copyText(this)" data-text="${escHtml(text)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        Kopyala
      </button>
    </div>
    <div class="scan-result-text">${escHtml(text)}</div>`;
  container.insertBefore(item, container.firstChild);
}

function copyText(btn) {
  const text = btn.getAttribute('data-text');
  navigator.clipboard.writeText(text).then(() => {
    showToast('Metin kopyalandı!', 'success');
  }).catch(() => {
    showToast('Kopyalama başarısız.', 'error');
  });
}

function clearScanResults() {
  const container = document.getElementById('scan-results');
  if (container) {
    container.innerHTML = '<div class="empty-state-sm"><p>Henüz tarama yok</p></div>';
  }
}

// =====================================================
// SETTINGS
// =====================================================
function exportData() {
  const data = {
    exportDate: new Date().toISOString(),
    workData: state.workData,
    contacts: state.contacts,
    barcodeHistory: state.barcodeHistory
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `osmanylz_yedek_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Yedek başarıyla indirildi!', 'success');
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    let imported = 0;

    if (data.workData && Array.isArray(data.workData)) {
      for (const item of data.workData) {
        const { id, ...rest } = item;
        rest.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('workData').add(rest);
        imported++;
      }
    }
    if (data.contacts && Array.isArray(data.contacts)) {
      for (const item of data.contacts) {
        const { id, ...rest } = item;
        rest.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('contacts').add(rest);
        imported++;
      }
    }
    showToast(`${imported} kayıt içe aktarıldı!`, 'success');
  } catch (e) {
    showToast('Geçersiz yedek dosyası!', 'error');
  }
  event.target.value = '';
}

function confirmClearAllData() {
  showConfirm('TÜM verileri (iş kayıtları, kişiler, barkodlar) silmek istediğinize emin misiniz? Bu işlem GERİ ALINAMAZ!', clearAllData, 'Evet, Hepsini Sil');
}

async function clearAllData() {
  try {
    const batch = db.batch();
    const collections = ['workData', 'contacts', 'barcodeHistory'];
    for (const col of collections) {
      const snap = await db.collection(col).get();
      snap.forEach(doc => batch.delete(doc.ref));
    }
    await batch.commit();
    showToast('Tüm veriler silindi.', 'info');
  } catch (e) {
    showToast('Silme hatası: ' + e.message, 'error');
  }
}

// =====================================================
// MODAL SYSTEM
// =====================================================
function openModal() {
  document.getElementById('modal-overlay')?.classList.add('active');
  document.getElementById('modal')?.classList.add('active');
}
function closeModal() {
  document.getElementById('modal-overlay')?.classList.remove('active');
  document.getElementById('modal')?.classList.remove('active');
}

function showConfirm(message, callback, okText = 'Sil') {
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-ok-btn').textContent = okText;
  document.getElementById('confirm-overlay')?.classList.add('active');
  document.getElementById('confirm-modal')?.classList.add('active');
  confirmCallback = callback;
}
function okConfirm() {
  document.getElementById('confirm-overlay')?.classList.remove('active');
  document.getElementById('confirm-modal')?.classList.remove('active');
  if (confirmCallback) confirmCallback();
  confirmCallback = null;
}
function cancelConfirm() {
  document.getElementById('confirm-overlay')?.classList.remove('active');
  document.getElementById('confirm-modal')?.classList.remove('active');
  confirmCallback = null;
}

// =====================================================
// TOAST SYSTEM
// =====================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<div class="toast-icon"></div><span class="toast-msg">${escHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// =====================================================
// UTILITIES
// =====================================================
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'2-digit' });
}

// =====================================================
// APP INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  // Init Firebase
  initFirebase();

  // Start Clock
  startClock();

  // Init Banner
  initBanner();


  // Hide loading screen
  setTimeout(() => {
    document.getElementById('loading-screen')?.classList.add('hidden');
  }, 1800);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      cancelConfirm();
    }
  });
});

// PWA: Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// =====================================================
// FILES VIEW (GEREKLİ DOSYALAR)
// =====================================================
function renderFilesView() {
  if (state.activeView === 'files') {
    filterFiles();
  }
}

function filterFiles() {
  const q = document.getElementById('file-search')?.value.toLowerCase() || '';
  let filtered = state.workFiles || [];
  if (q) {
    filtered = filtered.filter(f => 
      (f.title || '').toLowerCase().includes(q) || 
      (f.category || '').toLowerCase().includes(q)
    );
  }
  renderFilesList(filtered);
}

function renderFilesList(items) {
  const container = document.getElementById('files-list');
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <h3>Dosya Bulunamadı</h3>
        <p>Henüz eklenmiş bir dosya yok.</p>
      </div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const hasLink = !!item.fileLink;
    const isBase64 = !!item.fileData;
    let downloadHref = '#';
    let downloadAttr = '';
    
    if (hasLink) {
      downloadHref = item.fileLink;
      downloadAttr = 'target="_blank" rel="noopener noreferrer"';
    } else if (isBase64) {
      downloadHref = item.fileData;
      downloadAttr = `download="${item.fileName || 'dosya'}"`;
    }

    return `
      <div class="data-card" style="display:flex; flex-direction:column; padding-bottom:12px;">
        <div class="card-head" style="cursor:default; border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:12px;">
          <div class="card-head-left">
            <div class="data-card-title">${escHtml(item.title)}</div>
            <div class="card-preview">${escHtml(item.category || 'Belge')}</div>
          </div>
        </div>
        <div class="card-body-expand" style="display:flex; flex-direction:column; max-height:none; opacity:1;">
          ${item.description ? `<div class="data-card-body" style="margin-bottom:12px;">${escHtml(item.description)}</div>` : ''}
          <div style="display:flex; gap:8px;">
            <a href="${downloadHref}" ${downloadAttr} class="btn btn-primary btn-sm" style="flex:1; justify-content:center; text-decoration:none;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              ${hasLink ? 'Bağlantıyı Aç' : 'Dosyayı İndir'}
            </a>
          </div>
          <div class="data-card-actions admin-only" onclick="event.stopPropagation()" style="margin-top:8px;">
            <button class="btn btn-danger btn-sm w-full" onclick="confirmDeleteFile('${item.id}', '${escHtml(item.title).replace(/'/g,"\\'")}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              Sil
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function openAddFileModal() {
  state.editingFileId = null;
  document.getElementById('modal-title').textContent = 'Yeni Dosya Ekle';
  document.getElementById('modal-body').innerHTML = fileFormHTML({});
  openModal();
}

function fileFormHTML(f) {
  return `
    <div class="form-group">
      <label class="form-label">Başlık *</label>
      <input type="text" id="f-title" class="form-control" placeholder="Örn: İzin Formu" value="${escHtml(f.title||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Kategori</label>
      <input type="text" id="f-category" class="form-control" placeholder="Örn: Form, Dilekçe..." value="${escHtml(f.category||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Açıklama</label>
      <textarea id="f-desc" class="form-control" placeholder="Dosya hakkında kısa bilgi...">${escHtml(f.description||'')}</textarea>
    </div>
    
    <div class="card" style="margin-bottom:15px; padding:15px; background:var(--bg-primary); border:1px solid var(--border);">
      <div style="font-weight:600; margin-bottom:10px; font-size:14px; color:var(--text-secondary);">Yükleme Yöntemi Seçin:</div>
      
      <!-- DOSYA YÜKLEME (Max 1MB) -->
      <div class="form-group" style="margin-bottom:15px;">
        <label class="form-label" style="display:flex; justify-content:space-between;">
          <span>1. Doğrudan Dosya Seç</span>
          <span style="font-size:11px; color:var(--text-muted);">(Max 1.5MB)</span>
        </label>
        <input type="file" id="f-upload" class="form-control" style="padding: 6px 12px;" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onchange="handleFileUploadChange(this)">
        <div id="f-upload-status" style="font-size:12px; margin-top:6px; color:var(--text-muted);"></div>
        <input type="hidden" id="f-base64" value="${f.fileData || ''}">
        <input type="hidden" id="f-filename" value="${escHtml(f.fileName || '')}">
      </div>

      <div style="text-align:center; margin:10px 0; font-size:12px; color:var(--text-muted);">— VEYA —</div>

      <!-- LİNK YÜKLEME -->
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">2. İndirme Linki (Google Drive vb.)</label>
        <input type="url" id="f-link" class="form-control" placeholder="https://..." value="${escHtml(f.fileLink||'')}">
      </div>
    </div>
    
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveFile()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Kaydet
      </button>
    </div>
  `;
}

async function handleFileUploadChange(input) {
  const file = input.files[0];
  const statusEl = document.getElementById('f-upload-status');
  if (!file) {
    statusEl.textContent = '';
    document.getElementById('f-base64').value = '';
    document.getElementById('f-filename').value = '';
    return;
  }
  
  if (file.size > 1024 * 1024 * 1.5) { // 1.5 MB limit
    statusEl.innerHTML = '<span style="color:var(--danger)">Dosya çok büyük. Lütfen küçültün veya link kullanın.</span>';
    input.value = ''; // Reset file input
    document.getElementById('f-base64').value = '';
    return;
  }

  statusEl.textContent = 'Dosya işleniyor...';
  
  try {
    const base64 = await toBase64(file);
    document.getElementById('f-base64').value = base64;
    document.getElementById('f-filename').value = file.name;
    statusEl.innerHTML = `<span style="color:var(--success)">✅ Hazır: ${file.name}</span>`;
  } catch (err) {
    statusEl.innerHTML = '<span style="color:var(--danger)">Dosya okunamadı.</span>';
  }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

async function saveFile() {
  const title = document.getElementById('f-title')?.value.trim();
  if (!title) { showToast('Başlık zorunludur!', 'error'); return; }

  const fileData = document.getElementById('f-base64')?.value;
  const fileName = document.getElementById('f-filename')?.value;
  const fileLink = document.getElementById('f-link')?.value.trim();

  if (!fileData && !fileLink) {
    showToast('Lütfen ya bir dosya seçin ya da link ekleyin!', 'error');
    return;
  }

  const data = {
    title,
    category: document.getElementById('f-category')?.value.trim() || 'Belge',
    description: document.getElementById('f-desc')?.value.trim() || '',
    fileData: fileData || null,
    fileName: fileName || null,
    fileLink: fileLink || null
  };

  try {
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection('workFiles').add(data);
    showToast('Dosya eklendi!', 'success');
    closeModal();
  } catch (e) {
    showToast('Hata: ' + e.message, 'error');
  }
}

async function deleteFile(id) {
  try {
    await db.collection('workFiles').doc(id).delete();
    showToast('Dosya silindi.', 'info');
  } catch (e) {
    showToast('Silme hatası: ' + e.message, 'error');
  }
}

function confirmDeleteFile(id, title) {
  showConfirm(`"${title}" dosyasını silmek istediğinize emin misiniz?`, () => deleteFile(id));
}

