// =====================================================================
// USER AUTH
// =====================================================================
let users = JSON.parse(localStorage.getItem('budget_users')) || [];
let currentUser = JSON.parse(localStorage.getItem('budget_current_user')) || null;

function hashPw(pw) { let h = 0; for (let c of pw) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0; return h.toString(36); }

function saveUsers() { localStorage.setItem('budget_users', JSON.stringify(users)); }
function saveSession(u) { localStorage.setItem('budget_current_user', JSON.stringify(u)); currentUser = u; }
function clearSession() { localStorage.removeItem('budget_current_user'); currentUser = null; }

function showAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('form-login').classList.toggle('hidden', !isLogin);
  document.getElementById('form-register').classList.toggle('hidden', isLogin);

  const pill = document.getElementById('tab-pill');
  if (pill) {
    pill.style.transform = isLogin ? 'translateX(0)' : 'translateX(100%)';
  }

  const btnLogin = document.getElementById('tab-login');
  const btnReg = document.getElementById('tab-register');

  if (isLogin) {
    btnLogin.className = 'relative z-10 flex-1 py-2 rounded-lg text-sm font-bold transition-colors text-slate-900 dark:text-white';
    btnReg.className = 'relative z-10 flex-1 py-2 rounded-lg text-sm font-semibold transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300';
  } else {
    btnLogin.className = 'relative z-10 flex-1 py-2 rounded-lg text-sm font-semibold transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300';
    btnReg.className = 'relative z-10 flex-1 py-2 rounded-lg text-sm font-bold transition-colors text-slate-900 dark:text-white';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass = hashPw(document.getElementById('login-password').value);
  const errEl = document.getElementById('login-error');
  const span = errEl ? errEl.querySelector('span') : null;

  try {
    const res = await fetch('https://kanebuddy-bxvn.vercel.app/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();

    if (!res.ok) {
      if (errEl) errEl.classList.remove('hidden');
      if (span) span.textContent = data.error || 'Login gagal';
      return;
    }

    if (errEl) errEl.classList.add('hidden');
    loginUser(data.user); // Masuk dengan data dari MySQL
  } catch (err) { console.error(err); }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pass = document.getElementById('reg-password').value;
  const errEl = document.getElementById('reg-error');
  const span = errEl ? errEl.querySelector('span') : null;

  const userObj = { id: uid(), name, email, password: hashPw(pass) };

  try {
    const res = await fetch('https://kanebuddy-bxvn.vercel.app/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userObj)
    });
    const data = await res.json();

    if (!res.ok) {
      if (errEl) errEl.classList.remove('hidden');
      if (span) span.textContent = data.error || 'Registrasi gagal';
      return;
    }

    if (errEl) errEl.classList.add('hidden');
    loginUser(userObj); // Langsung login setelah sukses masuk database
  } catch (err) { console.error(err); }
}

function loginUser(user) {
  saveSession(user);
  loadUserData();
  document.getElementById('auth-screen').classList.add('hidden');
  updateUserUI(user);
  // Initial render
  updateDashboard(); renderPemasukan(); renderPengeluaran(); renderGoals(); renderBills(); renderShifts();
}

function logout() {
  if (!confirm('Yakin ingin keluar?')) return;
  clearSession();
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('form-login').reset();
  showToast('Sampai jumpa!', 'info');
}

function updateUserUI(user) {
  const avatarUrl = user.photo ? user.photo : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`;
  ['sidebar-avatar', 'topbar-avatar', 'settings-avatar'].forEach(id => { const el = document.getElementById(id); if (el) el.src = avatarUrl; });
  setEl('sidebar-name', user.name); setEl('topbar-name', user.name); setEl('settings-name', user.name);
  setEl('sidebar-email', user.email); setEl('topbar-email', user.email); setEl('settings-email', user.email);
}

// Settings functions
function saveProfileSettings() {
  if (!currentUser) return;
  const newName = document.getElementById('settings-new-name').value.trim();
  const newPass = document.getElementById('settings-new-password').value;
  const newPhotoInput = document.getElementById('settings-new-photo');
  let newPhoto = null;
  if (newPhotoInput && newPhotoInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      newPhoto = e.target.result;
      currentUser.photo = newPhoto;
      saveProfileSettingsContinue(newName, newPass);
    };
    reader.readAsDataURL(newPhotoInput.files[0]);
    return;
  }
  saveProfileSettingsContinue(newName, newPass);
}

async function saveProfileSettingsContinue(newName, newPass) {
  if (!newName && !newPass && !currentUser.photo) { showToast('Tidak ada perubahan', 'info'); return; }
  if (newName) currentUser.name = newName;
  if (newPass) {
    if (newPass.length < 6) { showToast('Password min. 6 karakter', 'error'); return; }
    currentUser.password = hashPw(newPass);
  }
  try {
    const res = await fetch(`https://kanebuddy-bxvn.vercel.app/api/auth/profile/${currentUser.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: currentUser.name, password: currentUser.password, photo: currentUser.photo })
    });

    if (!res.ok) throw new Error('Gagal update profile di server');

    saveSession(currentUser); updateUserUI(currentUser);
    document.getElementById('settings-new-name').value = '';
    document.getElementById('settings-new-password').value = '';
    showToast('Profil berhasil diperbarui!');
  } catch (err) { console.error(err); }
}

async function resetUserData() {
  if (!confirm('Yakin reset semua data di database? Aksi ini akan menghapus data permanen!')) return;

  try {
    // 1. Tembak API Reset di backend untuk mengosongkan MySQL
    const response = await fetch('https://kanebuddy-bxvn.vercel.app/api/reset', {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Gagal mereset database server');

    // 2. Kosongkan juga array dan memori lokal (localStorage backup)
    transactions = []; goals = []; bills = []; shifts = []; tasks = [];
    saveAll();

    // 3. Render ulang semua UI agar layarnya kembali kosong
    updateDashboard();
    renderPemasukan();
    renderPengeluaran();
    renderGoals();
    renderBills();
    renderShifts();
    renderTasks();

    showToast('Semua data berhasil direset permanen!');
  } catch (error) {
    console.error('Error saat reset data:', error);
    showToast('Gagal mereset data', 'error');
  }
}

async function deleteAccount() {
  if (!confirm(`Yakin hapus akun "${currentUser.name}"? SEMUA data akan hilang permanen!`)) return;

  try {
    await fetch(`https://kanebuddy-bxvn.vercel.app/api/auth/${currentUser.id}`, { method: 'DELETE' });
    await fetch('https://kanebuddy-bxvn.vercel.app/api/reset', { method: 'DELETE' }); // Opsional: Kosongkan transaksi juga

    ['budget_transactions', 'budget_goals', 'budget_bills', 'budget_shifts'].forEach(k => localStorage.removeItem(userKey(k)));
    clearSession();
    document.getElementById('auth-screen').classList.remove('hidden');
    showToast('Akun berhasil dihapus dari database', 'info');
  } catch (err) { console.error(err); }
}

function toggleTheme() {
  const htmlEl = document.documentElement;
  htmlEl.classList.toggle('dark');
  const isDark = htmlEl.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  const themeText = document.querySelector('.theme-text');
  if (themeText) themeText.textContent = isDark ? 'Light' : 'Dark';
}

// =====================================================================
// DATA LAYER — per-user localStorage keys
// =====================================================================
let transactions = [], goals = [], bills = [], shifts = [], tasks = [], categories = [], recurring = [];

function userKey(k) { return currentUser ? `u_${currentUser.id}_${k}` : k; }

let currentShiftViewDate = new Date();

function loadUserData() {
  transactions = JSON.parse(localStorage.getItem(userKey('budget_transactions'))) || [];
  goals = JSON.parse(localStorage.getItem(userKey('budget_goals'))) || [];
  bills = JSON.parse(localStorage.getItem(userKey('budget_bills'))) || [];
  shifts = JSON.parse(localStorage.getItem(userKey('budget_shifts'))) || [];
  tasks = JSON.parse(localStorage.getItem(userKey('budget_tasks'))) || [];
  categories = JSON.parse(localStorage.getItem(userKey('budget_categories'))) || [
    { name: 'Makanan & Minuman', color: '#f97316' },
    { name: 'Transportasi', color: '#0ea5e9' },
    { name: 'Keperluan Kucing', color: '#eab308' },
    { name: 'Belanja', color: '#ec4899' },
    { name: 'Hiburan', color: '#a855f7' },
    { name: 'Tagihan', color: '#f43f5e' },
    { name: 'Gaji', color: '#6366f1' },
    { name: 'Bonus', color: '#f59e0b' },
    { name: 'Investasi', color: '#10b981' }
  ];
  recurring = JSON.parse(localStorage.getItem(userKey('budget_recurring'))) || [];

  // User explicitly wants it to default to the current real world month
  currentShiftViewDate = new Date();
}

function saveAll() {
  localStorage.setItem(userKey('budget_transactions'), JSON.stringify(transactions));
  localStorage.setItem(userKey('budget_goals'), JSON.stringify(goals));
  localStorage.setItem(userKey('budget_bills'), JSON.stringify(bills));
  localStorage.setItem(userKey('budget_shifts'), JSON.stringify(shifts));
  localStorage.setItem(userKey('budget_tasks'), JSON.stringify(tasks));
  localStorage.setItem(userKey('budget_categories'), JSON.stringify(categories));
  localStorage.setItem(userKey('budget_recurring'), JSON.stringify(recurring));
}

// =====================================================================
// UTILITIES
// =====================================================================
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function formatCurrency(num) {
  if (isNaN(num)) return '¥0';
  return '¥' + Math.round(Number(num)).toLocaleString('ja-JP');
}
function formatCurrencyShort(n) {
  return formatCurrency(n);
}

function formatDate(s) {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getCategoryBadge(cat, theme = 'indigo') {
  const customCat = categories.find(c => c.name === cat);
  if (customCat) {
    return `<span style="background-color: ${customCat.color}20; color: ${customCat.color};" class="px-2.5 py-1 rounded-md text-xs font-semibold">${cat}</span>`;
  }
  const colors = { 'Gaji': 'indigo', 'Bonus': 'amber', 'Investasi': 'emerald', 'Lain-lain': 'slate', 'Makanan & Minuman': 'orange', 'Transportasi': 'sky', 'Belanja': 'pink', 'Hiburan': 'purple', 'Tagihan': 'rose' };
  const c = colors[cat] || theme;
  return `<span class="bg-${c}-100 text-${c}-700 dark:bg-${c}-500/20 dark:text-${c}-300 px-2.5 py-1 rounded-md text-xs font-semibold">${cat}</span>`;
}

function emptyState(msg) {
  return `<tr><td colspan="5" class="py-12 text-center text-slate-400 dark:text-slate-600"><i class="ph ph-ghost text-4xl block mb-2 opacity-50"></i><span class="text-sm">${msg}</span></td></tr>`;
}
// =====================================================================
// RECURRING TRANSACTIONS LOGIC
// =====================================================================
function checkRecurringTransactions() {
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${today.getMonth()}`;
  const currentDate = today.getDate();
  let hasChanges = false;

  recurring.forEach(req => {
    if (req.lastProcessedMonth !== currentMonthKey && currentDate >= req.date) {
      transactions.push({
        id: uid(),
        title: req.name + ' (Otomatis)',
        amount: req.amount,
        type: req.type,
        category: req.category,
        date: new Date(today.getFullYear(), today.getMonth(), req.date).toISOString()
      });
      req.lastProcessedMonth = currentMonthKey;
      hasChanges = true;
    }
  });

  if (hasChanges) {
    saveAll();
    showToast('Langganan rutin ditambahkan ke transaksi bulan ini!', 'info');
  }
}

function renderRecurringList() {
  const list = document.getElementById('recurring-list');
  if (!list) return;
  if (!recurring.length) {
    list.innerHTML = `<div class="text-xs text-slate-500 text-center py-4">Belum ada tagihan rutin</div>`;
    return;
  }

  list.innerHTML = recurring.map(req => `
     <div class="flex items-center justify-between p-2 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800">
        <div>
           <p class="text-sm font-semibold text-slate-900 dark:text-white">${req.name}</p>
           <p class="text-xs text-slate-500">Tgl ${req.date} &bull; ${req.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</p>
        </div>
        <div class="flex items-center gap-2">
           <span class="text-xs font-bold ${req.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}">${formatCurrency(req.amount)}</span>
           <button onclick="deleteRecurring('${req.id}')" class="text-rose-500 hover:text-rose-700 p-1"><i class="ph ph-trash flex-shrink-0"></i></button>
        </div>
     </div>
  `).join('');
}

function deleteRecurring(id) {
  if (!confirm('Hapus tagihan rutin ini?')) return;
  recurring = recurring.filter(r => r.id !== id);
  saveAll();
  renderRecurringList();
  showToast('Tagihan rutin dihapus');
}

window.showRecurringModal = () => {
  const m = document.getElementById('modal-recurring');
  if (m) {
    m.classList.remove('hidden');
    renderCategoriesDropdown();
  }
};
window.closeRecurringModal = () => {
  const m = document.getElementById('modal-recurring');
  if (m) m.classList.add('hidden');
};

window.showCategoryModal = () => {
  const m = document.getElementById('modal-categories');
  if (m) {
    m.classList.remove('hidden');
    renderCategoriesDropdown();
  }
};
window.closeCategoryModal = () => {
  const m = document.getElementById('modal-categories');
  if (m) m.classList.add('hidden');
};

function setEl(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
// =====================================================================
// TOAST
// =====================================================================
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: 'ph-check-circle', error: 'ph-x-circle', info: 'ph-info' };
  const colors = { success: 'bg-emerald-500', error: 'bg-rose-500', info: 'bg-indigo-500' };
  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 ${colors[type]} text-white px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium max-w-xs translate-x-full transition-transform duration-300`;
  toast.innerHTML = `<i class="${icons[type]} text-xl flex-shrink-0"></i><span>${msg}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.remove('translate-x-full')));
  setTimeout(() => { toast.classList.add('translate-x-full'); toast.addEventListener('transitionend', () => toast.remove()); }, 3000);
}

// =====================================================================
// DASHBOARD
// =====================================================================
let isBalanceHidden = localStorage.getItem('budget_balance_hidden') === 'true';

function toggleBalanceVisibility() {
  isBalanceHidden = !isBalanceHidden;
  localStorage.setItem('budget_balance_hidden', isBalanceHidden);
  updateDashboard();
}

function updateDashboard() {
  const now = new Date(); const m = now.getMonth(); const y = now.getFullYear();
  const lastM = m === 0 ? 11 : m - 1;
  const lastY = m === 0 ? y - 1 : y;

  const mInc = transactions.filter(t => t.type === 'income' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0);
  const mExp = transactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0);

  const lmInc = transactions.filter(t => t.type === 'income' && new Date(t.date).getMonth() === lastM && new Date(t.date).getFullYear() === lastY).reduce((s, t) => s + t.amount, 0);
  const lmExp = transactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === lastM && new Date(t.date).getFullYear() === lastY).reduce((s, t) => s + t.amount, 0);

  const tInc = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const tExp = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const balanceEl = document.getElementById('total-balance');
  const iconEl = document.getElementById('toggle-balance-icon');
  if (isBalanceHidden) {
    if (balanceEl) balanceEl.textContent = '••••••••';
    if (iconEl) iconEl.className = 'ph ph-eye-slash text-xl';
  } else {
    if (balanceEl) balanceEl.textContent = formatCurrency(tInc - tExp);
    if (iconEl) iconEl.className = 'ph ph-eye text-xl';
  }

  setEl('dashboard-income', formatCurrency(mInc));
  setEl('dashboard-expense', formatCurrency(mExp));

  const incPct = lmInc === 0 ? (mInc > 0 ? 100 : 0) : Math.round(((mInc - lmInc) / lmInc) * 100);
  const expPct = lmExp === 0 ? (mExp > 0 ? 100 : 0) : Math.round(((mExp - lmExp) / lmExp) * 100);

  const incPctEl = document.getElementById('dashboard-income-pct');
  if (incPctEl) {
    incPctEl.textContent = `${incPct >= 0 ? '+' : ''}${incPct}%`;
    incPctEl.className = `ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${incPct >= 0 ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'text-rose-500 bg-rose-50 dark:bg-rose-500/10'}`;
  }
  const expPctEl = document.getElementById('dashboard-expense-pct');
  if (expPctEl) {
    expPctEl.textContent = `${expPct >= 0 ? '+' : ''}${expPct}%`;
    expPctEl.className = `ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${expPct <= 0 ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'text-rose-500 bg-rose-50 dark:bg-rose-500/10'}`;
  }

  renderDashboardTransactions(); renderDashboardGoals(); renderDashboardBills(); renderSpendingFlowChart(); renderOvertimeCard(); renderCategoryPieChart();
}

function renderDashboardTransactions() {
  const el = document.getElementById('recent-transactions-list'); if (!el) return;
  const latest = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  if (!latest.length) { el.innerHTML = `<div class="py-10 text-center text-slate-400"><i class="ph ph-receipt text-4xl block mb-2 opacity-50"></i><span class="text-sm">Belum ada transaksi</span></div>`; return; }
  const icons = { income: 'ph-arrow-down-left', expense: 'ph-arrow-up-right' };
  const colors = { income: 'emerald', expense: 'rose' };
  el.innerHTML = latest.map(tx => {
    const c = colors[tx.type]; const sign = tx.type === 'income' ? '+' : '-';
    return `<div class="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors cursor-pointer group">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-${c}-100 dark:bg-${c}-500/20 flex items-center justify-center text-${c}-500 group-hover:scale-110 transition-transform">
                    <i class="ph ${icons[tx.type]} text-xl"></i>
                </div>
                <div><h4 class="font-semibold text-slate-900 dark:text-white mb-0.5">${tx.title}</h4><p class="text-xs text-slate-500">${formatDate(tx.date)} • ${tx.category}</p></div>
            </div>
            <p class="font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}">${sign} ${formatCurrency(tx.amount)}</p>
        </div>`;
  }).join('');
}

function renderDashboardGoals() {
  const el = document.getElementById('dashboard-goals-list'); if (!el) return;
  const top = goals.slice(0, 3);
  if (!top.length) { el.innerHTML = `<div class="py-6 text-center text-slate-400 text-sm">Belum ada goal</div>`; return; }
  el.innerHTML = top.map(g => {
    const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
    return `<div class="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-5 shadow-sm hover-scale cursor-pointer">
            <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-${g.color}-100 dark:bg-${g.color}-500/20 flex items-center justify-center text-${g.color}-500"><i class="ph ph-${g.icon}"></i></div>
                    <h4 class="font-semibold text-slate-900 dark:text-white text-sm">${g.name}</h4>
                </div>
                <span class="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">${pct}%</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
                <div class="bg-gradient-to-r from-${g.color}-400 to-primary h-2 rounded-full transition-all duration-500" style="width:${pct}%"></div>
            </div>
            <div class="flex justify-between text-xs text-slate-500"><span>${formatCurrency(g.saved)}</span><span>${formatCurrency(g.target)}</span></div>
        </div>`;
  }).join('');
}

let spendingFlowPeriod = 'monthly';
let spendingFlowCustomStart = '';
let spendingFlowCustomEnd = '';

let spendingFlowChartInstance = null;
function renderSpendingFlowChart() {
  const canvas = document.getElementById('spending-flow-chart-canvas');
  const totalEl = document.getElementById('spending-flow-total');
  if (!canvas || typeof Chart === 'undefined') return;

  const type = spendingFlowPeriod;
  const today = new Date();

  let labels = [];
  let data = [];
  let periodTotal = 0;

  if (type === 'weekly') {
    // 7 hari terakhir (Daily)
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - 6 + i); return d; });
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    labels = days.map(d => dayNames[d.getDay()]);
    data = days.map(d => {
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(dStr)).reduce((s, t) => s + t.amount, 0);
    });
  } else if (type === 'monthly') {
    // 4 minggu terakhir (dibagi berdasarkan tanggal)
    labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
    data = [0, 0, 0, 0];
    const m = today.getMonth(); const y = today.getFullYear();
    transactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).forEach(t => {
      const date = new Date(t.date).getDate();
      if (date <= 7) data[0] += t.amount;
      else if (date <= 14) data[1] += t.amount;
      else if (date <= 21) data[2] += t.amount;
      else data[3] += t.amount;
    });
  } else if (type === 'yearly') {
    // 12 bulan
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    data = Array(12).fill(0);
    const y = today.getFullYear();
    transactions.filter(t => t.type === 'expense' && new Date(t.date).getFullYear() === y).forEach(t => {
      data[new Date(t.date).getMonth()] += t.amount;
    });
  } else if (type === 'custom') {
    if (!spendingFlowCustomStart || !spendingFlowCustomEnd) return;
    const start = new Date(spendingFlowCustomStart);
    const end = new Date(spendingFlowCustomEnd);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 0 && diffDays <= 31) {
      const days = Array.from({ length: diffDays }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
      labels = days.map(d => `${d.getDate()}/${d.getMonth() + 1}`);
      data = days.map(d => {
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(dStr)).reduce((s, t) => s + t.amount, 0);
      });
    } else {
      labels = ['Custom Range'];
      data = [0];
      transactions.filter(t => t.type === 'expense').forEach(t => {
        const d = new Date(t.date);
        if (d >= start && d <= end) data[0] += t.amount;
      });
    }
  }

  periodTotal = data.reduce((a, b) => a + b, 0);
  if (totalEl) totalEl.textContent = formatCurrency(periodTotal);

  if (spendingFlowChartInstance) {
    spendingFlowChartInstance.data.labels = labels;
    spendingFlowChartInstance.data.datasets[0].data = data;
    spendingFlowChartInstance.update();
  } else {
    spendingFlowChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Pengeluaran',
          data,
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(244, 63, 94, 0.9)'); // rose-500
            gradient.addColorStop(1, 'rgba(244, 63, 94, 0.2)');
            return gradient;
          },
          hoverBackgroundColor: '#e11d48', // rose-600
          borderWidth: 0,
          borderRadius: 6,
          barPercentage: 0.6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: { size: 13, family: "'Google Sans', 'Open Sans', sans-serif" },
            bodyFont: { size: 12, family: "'Google Sans', 'Open Sans', sans-serif" },
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (ctx) => ' ' + formatCurrency(ctx.raw)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: 'rgba(226, 232, 240, 0.4)', drawTicks: false },
            ticks: { color: '#64748b', font: { size: 11 }, padding: 10 }
          },
          x: {
            border: { display: false },
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          }
        }
      }
    });
  }
}

let categoryChartInstance = null;
let catFlowPeriod = 'monthly';
let catFlowCustomStart = '';
let catFlowCustomEnd = '';

function renderCategoryPieChart() {
  const canvas = document.getElementById('category-pie-chart');
  const legendsEl = document.getElementById('category-legends');
  if (!canvas || typeof Chart === 'undefined') return;

  const today = new Date();
  let exps = transactions.filter(t => t.type === 'expense');

  if (catFlowPeriod === 'daily') {
    const todayStr = today.toISOString().split('T')[0];
    exps = exps.filter(t => t.date && t.date.startsWith(todayStr));
  } else if (catFlowPeriod === 'weekly') {
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    exps = exps.filter(t => new Date(t.date) >= weekAgo);
  } else if (catFlowPeriod === 'monthly') {
    const m = today.getMonth(); const y = today.getFullYear();
    exps = exps.filter(t => new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y);
  } else if (catFlowPeriod === 'yearly') {
    const y = today.getFullYear();
    exps = exps.filter(t => new Date(t.date).getFullYear() === y);
  } else if (catFlowPeriod === 'custom') {
    if (!catFlowCustomStart || !catFlowCustomEnd) { exps = []; }
    else {
      const start = new Date(catFlowCustomStart);
      const end = new Date(catFlowCustomEnd + 'T23:59:59');
      exps = exps.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    }
  }

  if (!exps.length) {
    if (categoryChartInstance) { categoryChartInstance.destroy(); categoryChartInstance = null; }
    legendsEl.innerHTML = '<p class="text-sm text-slate-400 w-full text-center">Belum ada pengeluaran di periode ini</p>';
    return;
  }

  const grouped = exps.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const labels = Object.keys(grouped); const data = Object.values(grouped);
  const baseColors = [
    { start: '#f43f5e', end: '#e11d48' }, // rose
    { start: '#ec4899', end: '#be185d' }, // pink
    { start: '#a855f7', end: '#7e22ce' }, // purple
    { start: '#6366f1', end: '#4338ca' }, // indigo
    { start: '#3b82f6', end: '#1d4ed8' }, // blue
    { start: '#0ea5e9', end: '#0369a1' }, // sky
    { start: '#14b8a6', end: '#0f766e' }, // teal
    { start: '#10b981', end: '#047857' }, // emerald
    { start: '#f59e0b', end: '#b45309' }, // amber
    { start: '#f97316', end: '#c2410c' }  // orange
  ];

  const ctx = canvas.getContext('2d');
  const bgGradients = labels.map((_, i) => {
    const g = ctx.createLinearGradient(0, 0, 0, 200);
    const colorPair = baseColors[i % baseColors.length];
    g.addColorStop(0, colorPair.start);
    g.addColorStop(1, colorPair.end);
    return g;
  });

  if (categoryChartInstance) {
    categoryChartInstance.data.labels = labels;
    categoryChartInstance.data.datasets[0].data = data;
    categoryChartInstance.data.datasets[0].backgroundColor = bgGradients;
    categoryChartInstance.update();
  } else {
    categoryChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: bgGradients, borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 13, family: "'Google Sans', 'Open Sans', sans-serif" }, bodyFont: { size: 12, family: "'Google Sans', 'Open Sans', sans-serif" }, padding: 12, cornerRadius: 8, displayColors: true, callbacks: { label: (ctx) => ' ' + formatCurrency(ctx.raw) } } }, cutout: '70%' }
    });
  }

  legendsEl.innerHTML = labels.map((lb, i) => `
    <div class="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm border border-light-border dark:border-dark-border">
      <span class="w-3 h-3 rounded-full block shadow-inner" style="background: linear-gradient(to bottom, ${baseColors[i % baseColors.length].start}, ${baseColors[i % baseColors.length].end})"></span>
      <span class="text-xs font-semibold text-slate-700 dark:text-slate-300"> ${lb}</span>
    </div>
  `).join('');
}

function renderOvertimeCard() {
  const hoursEl = document.getElementById('dashboard-overtime-hours');
  const earningsEl = document.getElementById('dashboard-overtime-earnings');
  const countEl = document.getElementById('dashboard-shift-count');
  if (!hoursEl) return;
  const totalOT = shifts.reduce((s, sh) => s + (sh.overtimeHours || 0), 0);
  const totalEar = shifts.reduce((s, sh) => s + sh.earnings, 0);
  hoursEl.textContent = totalOT.toFixed(1) + ' Jam';
  if (earningsEl) earningsEl.textContent = formatCurrency(totalEar);
  if (countEl) countEl.textContent = shifts.length + ' shift';
}

// =====================================================================
// FILTER & SORT Helpers
// =====================================================================
function applyFilterAndSort(list, searchInputId, sortSelectId, catSelectId = null) {
  const search = document.getElementById(searchInputId)?.value.toLowerCase() || '';
  const sort = document.getElementById(sortSelectId)?.value || 'newest';
  const cat = catSelectId ? (document.getElementById(catSelectId)?.value || 'all') : 'all';

  let result = list.filter(t => t.title.toLowerCase().includes(search));
  if (cat !== 'all') result = result.filter(t => t.category === cat);

  result.sort((a, b) => {
    if (sort === 'newest') return new Date(b.date) - new Date(a.date);
    if (sort === 'oldest') return new Date(a.date) - new Date(b.date);
    if (sort === 'highest') return b.amount - a.amount;
    if (sort === 'lowest') return a.amount - b.amount;
    return 0;
  });
  return result;
}

function updatePaginationUI(idPrefix, totalPages, currentPage, setPageCallback) {
  const pagi = document.getElementById(`${idPrefix}-pagination`);
  if (!pagi) return;

  if (totalPages > 1) {
    pagi.classList.remove('hidden');
    document.getElementById(`${idPrefix}-page-info`).textContent = `Hal ${currentPage} dari ${totalPages}`;
    const btnPrev = document.getElementById(`btn-${idPrefix}-prev`);
    const btnNext = document.getElementById(`btn-${idPrefix}-next`);

    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage === totalPages;

    btnPrev.className = `px-3 py-1.5 rounded-lg border text-sm transition-colors ${currentPage === 1 ? 'border-transparent text-slate-400 cursor-not-allowed hidden sm:block opacity-50' : 'border-light-border dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`;
    btnNext.className = `px-3 py-1.5 rounded-lg border text-sm transition-colors ${currentPage === totalPages ? 'border-transparent text-slate-400 cursor-not-allowed hidden sm:block opacity-50' : 'border-light-border dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`;

    btnPrev.onclick = () => { if (currentPage > 1) { setPageCallback(currentPage - 1); } };
    btnNext.onclick = () => { if (currentPage < totalPages) { setPageCallback(currentPage + 1); } };
  } else {
    pagi.classList.add('hidden');
  }
}

// =====================================================================
// PEMASUKAN
// =====================================================================
let currentPemasukanPage = 1;
const TX_PER_PAGE = 10;

function renderPemasukan() {
  const tbody = document.getElementById('pemasukan-history'); if (!tbody) return;
  const pagi = document.getElementById('pemasukan-pagination');
  let list = transactions.filter(t => t.type === 'income');
  list = applyFilterAndSort(list, 'filter-pemasukan-search', 'filter-pemasukan-sort');

  if (!list.length) {
    tbody.innerHTML = emptyState('Belum ada data pemasukan');
    if (pagi) pagi.classList.add('hidden');
    return;
  }

  const totalPages = Math.ceil(list.length / TX_PER_PAGE);
  if (currentPemasukanPage > totalPages) currentPemasukanPage = totalPages;
  if (currentPemasukanPage < 1) currentPemasukanPage = 1;

  const startIdx = (currentPemasukanPage - 1) * TX_PER_PAGE;
  const paginated = list.slice(startIdx, startIdx + TX_PER_PAGE);

  tbody.innerHTML = paginated.map(tx => `<tr class="border-b border-light-border dark:border-dark-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <td class="py-3 text-sm text-slate-500">${formatDate(tx.date)}</td>
        <td class="py-3 font-medium text-slate-900 dark:text-white">${tx.title}</td>
        <td class="py-3">${getCategoryBadge(tx.category)}</td>
        <td class="py-3 text-right font-bold text-emerald-500">${formatCurrency(tx.amount)}</td>
        <td class="py-3 text-right"><button onclick="deleteTransaction('${tx.id}')" class="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500"><i class="ph ph-trash text-base"></i></button></td>
    </tr>`).join('');

  if (pagi) updatePaginationUI('pemasukan', totalPages, currentPemasukanPage, (newPage) => {
    currentPemasukanPage = newPage;
    renderPemasukan();
  });
}

// =====================================================================
// CATEGORIES
// =====================================================================
function renderCategoriesDropdown() {
  const expSelect = document.getElementById('input-pengeluaran-kategori');
  const filterSelect = document.getElementById('filter-pengeluaran-cat');
  const reqSelect = document.getElementById('input-req-category');

  const optsHtml = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

  if (expSelect) expSelect.innerHTML = optsHtml;
  if (filterSelect) filterSelect.innerHTML = `<option value="all">Semua Kategori</option>` + optsHtml;
  if (reqSelect) reqSelect.innerHTML = optsHtml;

  const listContainer = document.getElementById('custom-categories-list');
  if (listContainer) {
    if (categories.length === 0) {
      listContainer.innerHTML = `<p class="text-xs text-slate-500 text-center py-2">Belum ada kategori</p>`;
    } else {
      listContainer.innerHTML = categories.map(c => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-light-border dark:border-dark-border shadow-sm">
          <div class="flex items-center gap-2">
             <span class="w-4 h-4 rounded-full block border border-black/10 dark:border-white/10 shrink-0" style="background-color: ${c.color}"></span>
             <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">${c.name}</span>
          </div>
          <button onclick="deleteCustomCategory('${c.name}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0">
            <i class="ph ph-trash max-w-none"></i>
          </button>
        </div>`).join('');
    }
  }
}

window.deleteCustomCategory = (name) => {
  if (!confirm(`Hapus kategori "${name}"?`)) return;
  categories = categories.filter(c => c.name !== name);
  saveAll();
  renderCategoriesDropdown();
  showToast(`Kategori "${name}" dihapus`);
};

window.addCustomCategory = () => {
  const nameInput = document.getElementById('input-new-category-name');
  const colorInput = document.getElementById('input-new-category-color');
  if (!nameInput || !colorInput) return;

  const name = nameInput.value.trim();
  const color = colorInput.value;

  if (!name) {
    showToast('Nama kategori tidak boleh kosong', 'error');
    return;
  }

  if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
    showToast('Kategori sudah ada', 'error');
    return;
  }

  categories.push({ name, color });
  saveAll();
  renderCategoriesDropdown();
  nameInput.value = '';
  showToast(`Kategori "${name}" ditambahkan`);
};

window.showCategoryModal = () => {
  const modal = document.getElementById('modal-categories');
  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.children[1].classList.remove('scale-95', 'opacity-0');
    }, 10);
    renderCategoriesDropdown();
  }
};

window.closeCategoryModal = () => {
  const modal = document.getElementById('modal-categories');
  if (modal) {
    modal.children[1].classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }
};

// =====================================================================
// PENGELUARAN
// =====================================================================
let currentPengeluaranPage = 1;

function renderPengeluaran() {
  const tbody = document.getElementById('pengeluaran-history'); if (!tbody) return;
  const pagi = document.getElementById('pengeluaran-pagination');
  let list = transactions.filter(t => t.type === 'expense');
  list = applyFilterAndSort(list, 'filter-pengeluaran-search', 'filter-pengeluaran-sort', 'filter-pengeluaran-cat');

  if (!list.length) {
    tbody.innerHTML = emptyState('Belum ada data pengeluaran');
    if (pagi) pagi.classList.add('hidden');
    return;
  }

  const totalPages = Math.ceil(list.length / TX_PER_PAGE);
  if (currentPengeluaranPage > totalPages) currentPengeluaranPage = totalPages;
  if (currentPengeluaranPage < 1) currentPengeluaranPage = 1;
  const startIdx = (currentPengeluaranPage - 1) * TX_PER_PAGE;
  const paginated = list.slice(startIdx, startIdx + TX_PER_PAGE);

  tbody.innerHTML = paginated.map(tx => `<tr class="border-b border-light-border dark:border-dark-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <td class="py-3 text-sm text-slate-500">${formatDate(tx.date)}</td>
        <td class="py-3 font-medium text-slate-900 dark:text-white">${tx.title}</td>
        <td class="py-3">${getCategoryBadge(tx.category, 'orange')}</td>
        <td class="py-3 text-right font-bold text-rose-500">- ${formatCurrency(tx.amount)}</td>
        <td class="py-3 text-right"><button onclick="deleteTransaction('${tx.id}')" class="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500"><i class="ph ph-trash text-base"></i></button></td>
    </tr>`).join('');

  if (pagi) updatePaginationUI('pengeluaran', totalPages, currentPengeluaranPage, (newPage) => {
    currentPengeluaranPage = newPage;
    renderPengeluaran();
  });
}

// Fungsi MENGHAPUS data dari Database
async function deleteTransaction(id) {
  // Tampilkan konfirmasi ke pengguna
  if (!confirm('Yakin ingin menghapus transaksi ini dari database?')) return;

  try {
    // Tembak rute DELETE di server.js beserta ID transaksinya
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Gagal menghapus data di server');
    }

    const result = await response.json();
    console.log("Respon server:", result.message);

    // Tampilkan notifikasi sukses di layar
    showToast('Transaksi berhasil dihapus');

    // Panggil ulang data dari database agar UI otomatis ter-update (hilang dari layar)
    getTransactionsFromDB();

  } catch (error) {
    console.error('Ups, error saat menghapus:', error);
    showToast('Gagal menghapus transaksi', 'error');
  }
}

// =====================================================================
// GOALS
// =====================================================================
function renderGoals() {
  const el = document.getElementById('goals-list'); if (!el) return;
  let html = goals.map(g => {
    const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
    return `<div class="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm group hover-scale">
            <div class="flex justify-between items-center mb-4">
                <div class="w-12 h-12 rounded-2xl bg-${g.color}-100 dark:bg-${g.color}-500/20 flex items-center justify-center text-${g.color}-500 group-hover:bg-${g.color}-500 group-hover:text-white transition-colors">
                    <i class="ph ph-${g.icon} text-xl"></i>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="showAddSavingModal('${g.id}')" class="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-500 transition-colors"><i class="ph ph-plus-circle text-lg"></i></button>
                    <button onclick="deleteGoal('${g.id}')" class="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500 transition-colors"><i class="ph ph-trash text-lg"></i></button>
                </div>
            </div>
            <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-1">${g.name}</h3>
            <p class="text-sm text-slate-500 mb-6">Target: ${g.deadline || 'Tanpa batas waktu'}</p>
            <div class="mb-2 flex justify-between items-end">
                <h4 class="text-2xl font-bold text-slate-900 dark:text-white">${formatCurrency(g.saved)}</h4>
                <span class="text-sm text-slate-500">/ ${formatCurrency(g.target)}</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
                <div class="bg-${g.color}-500 h-2 rounded-full transition-all duration-500" style="width:${pct}%"></div>
            </div>
            <p class="text-xs font-medium text-${g.color}-500 bg-${g.color}-50 dark:bg-${g.color}-500/10 w-max px-2 py-1 rounded-md">${pct}% Tercapai</p>
        </div>`;
  }).join('');
  html += `<div onclick="showGoalForm()" class="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group hover-scale min-h-[260px]">
        <div class="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors mb-4"><i class="ph ph-plus text-2xl"></i></div>
        <p class="font-medium">Buat Goal Baru</p>
    </div>`;
  el.innerHTML = html;
}

function deleteGoal(id) {
  if (!confirm('Yakin hapus goal ini?')) return;
  goals = goals.filter(g => g.id !== id); saveAll(); renderGoals(); renderDashboardGoals(); showToast('Goal dihapus');
}
function showGoalForm() {
  const s = document.getElementById('goal-form-section'); if (!s) return;
  s.classList.toggle('hidden');
  if (!s.classList.contains('hidden')) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
// Fungsi MENAMBAH tabungan ke Goal (MySQL Update)
async function showAddSavingModal(goalId) {
  // Gunakan == (bukan ===) agar String dari HTML bisa cocok dengan Number dari MySQL
  const g = goals.find(g => g.id == goalId);
  if (!g) {
    console.error("Goal tidak ditemukan dengan ID:", goalId);
    return;
  }

  // Munculkan pop-up minta input angka
  const amt = prompt(`Tambah tabungan untuk "${g.name}" (¥):`);
  if (!amt || isNaN(parseInt(amt))) return; // Batal jika kosong/bukan angka

  // Hitung total tabungan baru (jangan sampai melebihi target)
  const newSaved = Math.min(g.target, g.saved + parseInt(amt));

  try {
    // Kirim perintah UPDATE ke backend
    const response = await fetch(`${GOALS_API}/${g.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved: newSaved })
    });

    if (!response.ok) throw new Error('Gagal update ke database');

    showToast(`Tabungan untuk "${g.name}" berhasil ditambahkan!`);

    // Tarik data terbaru dari DB agar UI ter-update
    getGoalsFromDB();

  } catch (error) {
    console.error("🚨 Error:", error);
    showToast('Gagal menambah tabungan ke server', 'error');
  }
}

// =====================================================================
// BILLS
// =====================================================================
function renderBills() {
  const el = document.getElementById('bills-list'); if (!el) return;
  const month = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  const totalUnpaid = bills.filter(b => !b.paid).reduce((s, b) => s + b.amount, 0);
  setEl('bills-month-label', `Bulan Ini (${month})`);
  setEl('bills-total-label', `Belum Bayar: ${formatCurrency(totalUnpaid)}`);
  if (!bills.length) { el.innerHTML = `<div class="p-12 text-center text-slate-400"><i class="ph ph-receipt text-5xl block mb-3 opacity-40"></i><p class="text-sm">Belum ada tagihan</p></div>`; return; }
  const billIcons = { Internet: 'wifi-high', Listrik: 'lightning', Air: 'drop', Rumah: 'house', Kendaraan: 'car', Langganan: 'play-circle', Lainnya: 'receipt' };
  const billColors = { Internet: 'blue', Listrik: 'amber', Air: 'sky', Rumah: 'indigo', Kendaraan: 'emerald', Langganan: 'purple', Lainnya: 'slate' };
  el.innerHTML = bills.map(b => {
    const icon = billIcons[b.category] || 'receipt'; const color = billColors[b.category] || 'slate';
    return `<div class="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${b.paid ? 'opacity-70' : ''}">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-${color}-100 dark:bg-${color}-500/20 flex items-center justify-center text-${color}-500 border border-${color}-200 dark:border-${color}-500/30">
                    <i class="ph ph-${icon} text-xl"></i>
                </div>
                <div>
                    <h4 class="font-bold text-slate-900 dark:text-white text-lg ${b.paid ? 'line-through text-slate-500' : ''}">${b.name}</h4>
                    <p class="text-sm pt-1 flex items-center gap-1 ${b.paid ? 'text-emerald-500' : 'text-slate-500'}">
                        <i class="ph ph-${b.paid ? 'check-circle' : 'calendar-blank'}"></i>
                        ${b.paid ? `Sudah Dibayar (${formatDate(b.paidDate)})` : formatDate(b.dueDate)}
                    </p>
                </div>
            </div>
            <div class="flex items-center justify-between sm:justify-end gap-4 sm:w-auto w-full">
                <span class="text-xl font-bold ${b.paid ? 'text-slate-500' : 'text-slate-900 dark:text-white'}">${formatCurrency(b.amount)}</span>
                <div class="flex items-center gap-2">
                    ${!b.paid ? `<button onclick="markBillPaid('${b.id}')" class="px-4 py-2 text-sm font-medium text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-lg hover:bg-rose-500 hover:text-white transition-colors">Bayar</button>` : `<span class="px-4 py-2 text-sm font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">Lunas</span>`}
                    <button onclick="deleteBill('${b.id}')" class="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-colors"><i class="ph ph-trash text-base"></i></button>
                </div>
            </div>
        </div>`;
  }).join('');
}

function renderDashboardBills() {
  const el = document.getElementById('dashboard-bills-list'); if (!el) return;
  const upcoming = bills.filter(b => !b.paid).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 3);

  if (!upcoming.length) {
    el.innerHTML = `<div class="p-3 text-center text-sm text-slate-500 border border-dashed border-light-border dark:border-dark-border rounded-2xl">Belum ada tagihan terdekat.</div>`;
    return;
  }

  const billIcons = { Internet: 'wifi-high', Listrik: 'lightning', Air: 'drop', Rumah: 'house', Kendaraan: 'car', Langganan: 'play-circle', Lainnya: 'receipt' };
  const billColors = { Internet: 'blue', Listrik: 'amber', Air: 'sky', Rumah: 'indigo', Kendaraan: 'emerald', Langganan: 'purple', Lainnya: 'slate' };

  el.innerHTML = upcoming.map(b => {
    const icon = billIcons[b.category] || 'receipt';
    const color = billColors[b.category] || 'slate';
    const dDate = new Date(b.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isLate = dDate < today;

    return `<div class="flex items-center gap-3 p-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group" onclick="document.querySelector('[data-view=bills]').click()">
      <div class="w-10 h-10 rounded-xl bg-${color}-100 dark:bg-${color}-500/20 flex items-center justify-center text-${color}-500 shrink-0 group-hover:scale-110 transition-transform">
        <i class="ph ph-${icon} text-lg"></i>
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-semibold text-slate-900 dark:text-white truncate" title="${b.name}">${b.name}</h4>
        <p class="text-xs ${isLate ? 'text-rose-500 font-medium' : 'text-slate-500'} flex items-center gap-1 mt-0.5">
          <i class="ph ph-calendar-blank"></i> ${formatDate(b.dueDate)}
        </p>
      </div>
      <div class="text-right shrink-0">
        <p class="text-sm font-bold text-slate-900 dark:text-white">${formatCurrency(b.amount)}</p>
      </div>
    </div>`;
  }).join('');
}

function markBillPaid(id) {
  const b = bills.find(b => b.id === id); if (!b) return;
  b.paid = true; b.paidDate = new Date().toISOString();
  transactions.push({ id: uid(), title: b.name + ' (Tagihan)', amount: b.amount, category: 'Tagihan', type: 'expense', date: new Date().toISOString() });
  saveAll(); renderBills(); updateDashboard(); renderPengeluaran();
  showToast(`Tagihan "${b.name}" berhasil dibayar!`);
}
function deleteBill(id) {
  if (!confirm('Yakin hapus tagihan ini?')) return;
  bills = bills.filter(b => b.id !== id); saveAll(); renderBills(); showToast('Tagihan dihapus');
}

// =====================================================================
// SHIFT KERJA
// =====================================================================
const SHIFT_TYPES = {
  Morning: { label: 'Morning Shift', color: 'emerald', startDefault: '08:00', endDefault: '16:00', normalHours: 8 },
  Afternoon: { label: 'Afternoon Shift', color: 'amber', startDefault: '13:00', endDefault: '21:00', normalHours: 8 },
  Night: { label: 'Night Shift', color: 'indigo', startDefault: '20:00', endDefault: '04:00', normalHours: 8 },
  Full: { label: 'Full Day', color: 'rose', startDefault: '08:00', endDefault: '20:00', normalHours: 12 },
  Lembur: { label: 'Lembur', color: 'purple', startDefault: '17:00', endDefault: '21:00', normalHours: 0 },
  OffDay: { label: 'Off Day', color: 'slate', startDefault: '00:00', endDefault: '00:00', normalHours: 0 },
};

function calcShiftHours(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let h = (eh * 60 + em - sh * 60 - sm) / 60;
  if (h < 0) h += 24;
  return Math.round(h * 100) / 100;
}

let currentShiftPage = 1;
const SHIFTS_PER_PAGE = 5;

function renderShifts() {
  const el = document.getElementById('shifts-list'); if (!el) return;
  const pagi = document.getElementById('shift-pagination');

  if (!shifts.length) {
    el.innerHTML = `<div class="py-12 text-center text-slate-400"><i class="ph ph-calendar-blank text-5xl block mb-3 opacity-40"></i><p class="text-sm">Belum ada shift terjadwal</p></div>`;
    if (pagi) pagi.classList.add('hidden');
    updateShiftSummary(); renderShiftCalendar(); return;
  }

  const sorted = [...shifts].sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalPages = Math.ceil(sorted.length / SHIFTS_PER_PAGE);
  if (currentShiftPage > totalPages) currentShiftPage = totalPages;
  if (currentShiftPage < 1) currentShiftPage = 1;
  const startIdx = (currentShiftPage - 1) * SHIFTS_PER_PAGE;
  const paginated = sorted.slice(startIdx, startIdx + SHIFTS_PER_PAGE);

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  el.innerHTML = paginated.map(s => {
    const d = new Date(s.date);
    const type = SHIFT_TYPES[s.type] || SHIFT_TYPES.Morning;
    const isOff = s.type === 'OffDay';
    const otHrs = s.overtimeHours || 0;
    const normalHrs = s.normalHoursWorked || 0;
    return `<div class="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div class="w-16 flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-700 pr-4 flex-shrink-0">
                <span class="text-sm text-slate-500 font-medium">${dayNames[d.getDay()]}</span>
                <span class="text-2xl font-bold text-slate-900 dark:text-white">${d.getDate()}</span>
            </div>
            <div class="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="w-2 h-2 rounded-full bg-${type.color}-500"></span>
                        <h4 class="font-bold text-slate-900 dark:text-white">${type.label}</h4>
                        ${isOff ? '<span class="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">Libur</span>' : ''}
                    </div>
                    ${isOff ? '<p class="text-sm text-slate-400">Hari Libur</p>' : `
                    <p class="text-sm text-slate-500"><i class="ph ph-clock"></i> ${s.startTime} – ${s.endTime} (${s.hours}j total)</p>
                    <div class="flex gap-3 mt-1 text-xs">
                        <span class="text-emerald-600 font-medium">✓ ${normalHrs}j normal</span>
                        ${otHrs > 0 ? `<span class="text-purple-500 font-medium">⚡ ${otHrs}j lembur</span>` : ''}
                    </div>`}
                </div>
                <div class="flex items-center gap-3">
                    ${!isOff ? `<div class="text-left sm:text-right"><p class="text-xs text-slate-500 mb-1">Estimasi:</p><p class="font-bold text-emerald-500">+ ${formatCurrency(s.earnings)}</p></div>` : ''}
                    ${s.recorded ? `<span class="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-xs font-bold">Tercatat</span>` : ''}
                    <button onclick="deleteShift('${s.id}')" class="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-colors"><i class="ph ph-trash text-base"></i></button>
                </div>
            </div>
        </div>`;
  }).join('');

  if (pagi) {
    if (totalPages > 1) {
      pagi.classList.remove('hidden');
      document.getElementById('shift-page-info').textContent = `Hal ${currentShiftPage} dari ${totalPages}`;
      const btnPrev = document.getElementById('btn-shift-prev');
      const btnNext = document.getElementById('btn-shift-next');

      btnPrev.disabled = currentShiftPage === 1;
      btnNext.disabled = currentShiftPage === totalPages;
      btnPrev.className = `px-3 py-1.5 rounded-lg border text-sm transition-colors ${currentShiftPage === 1 ? 'border-transparent text-slate-400 cursor-not-allowed' : 'border-light-border dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`;
      btnNext.className = `px-3 py-1.5 rounded-lg border text-sm transition-colors ${currentShiftPage === totalPages ? 'border-transparent text-slate-400 cursor-not-allowed' : 'border-light-border dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`;

      btnPrev.onclick = () => { if (currentShiftPage > 1) { currentShiftPage--; renderShifts(); } };
      btnNext.onclick = () => { if (currentShiftPage < totalPages) { currentShiftPage++; renderShifts(); } };
    } else {
      pagi.classList.add('hidden');
    }
  }

  updateShiftSummary();
  renderShiftCalendar();
}
function renderShiftCalendar() {
  const grid = document.getElementById('shift-calendar-grid');
  const monthLabel = document.getElementById('shift-calendar-month-label');
  const picker = document.getElementById('shift-calendar-picker');
  if (!grid) return;

  const year = currentShiftViewDate.getFullYear();
  const month = currentShiftViewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  if (monthLabel) monthLabel.textContent = `${monthNames[month]} ${year}`;

  const pickerVal = `${year}-${String(month + 1).padStart(2, '0')}`;
  if (picker && !picker.value) {
    picker.value = pickerVal;
  }

  let html = '';
  // Empty blocks for offset
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="p-2"></div>`;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const shiftOnDate = shifts.find(s => s.date === dateStr);
    let isToday = (dateStr === todayStr ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-slate-900 bg-primary/10 font-bold' : '');
    let shiftClass = isToday ? isToday : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300';
    let dotHtml = '';
    let tooltipText = '';

    if (shiftOnDate) {
      if (shiftOnDate.type === 'OffDay') {
        shiftClass = 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 font-medium';
        tooltipText = 'Libur (Off Day)';
        dotHtml = `<span class="w-1.5 h-1.5 rounded-full bg-rose-500 mx-auto mt-1 block"></span>`;
      } else {
        const typeInfo = SHIFT_TYPES[shiftOnDate.type] || SHIFT_TYPES.Morning;
        dotHtml = `<span class="w-1.5 h-1.5 rounded-full bg-${typeInfo.color}-500 mx-auto mt-1 block"></span>`;
        if (!isToday) shiftClass = 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-light-border dark:border-dark-border font-medium';
        tooltipText = `${typeInfo.label} (${shiftOnDate.startTime} - ${shiftOnDate.endTime})`;
        if (shiftOnDate.overtimeHours > 0) tooltipText += ` + Lembur ${shiftOnDate.overtimeHours}j`;
      }
    }

    html += `<div class="p-2 rounded-xl flex flex-col items-center justify-center cursor-default transition-colors ${shiftClass}" ${tooltipText ? `title="${tooltipText}"` : ''}>
        <span>${d}</span>
        ${dotHtml}
     </div>`;
  }
  grid.innerHTML = html;
}
function updateShiftSummary() {
  const year = currentShiftViewDate.getFullYear();
  const month = currentShiftViewDate.getMonth();

  const mShifts = shifts.filter(sh => {
    const shDate = new Date(sh.date);
    return shDate.getFullYear() === year && shDate.getMonth() === month;
  });

  const totalHours = mShifts.reduce((s, sh) => s + sh.hours, 0);
  const totalNormal = mShifts.reduce((s, sh) => s + (sh.normalHoursWorked || 0), 0);
  const totalOT = mShifts.reduce((s, sh) => s + (sh.overtimeHours || 0), 0);
  const totalEarnings = mShifts.reduce((s, sh) => s + sh.earnings, 0);
  const unrecordedTotal = mShifts.filter(sh => !sh.recorded).reduce((s, sh) => s + sh.earnings, 0);
  const totalOTPay = mShifts.reduce((s, sh) => s + (sh.overtimeHours * (sh.earnings - (sh.normalHoursWorked * sh.hourlyRate)) / (sh.overtimeHours || 1) || 0), 0);
  const avg = mShifts.length ? Math.round(totalEarnings / mShifts.length) : 0;

  setEl('shift-total-earnings', formatCurrency(unrecordedTotal));
  setEl('shift-total-ot-pay', formatCurrency(totalOTPay));
  setEl('shift-total-hours', `${totalHours.toFixed(1)} Jam`);
  setEl('shift-normal-hours', `${totalNormal.toFixed(1)} Jam`);
  setEl('shift-overtime-hours', `${totalOT.toFixed(1)} Jam`);
  setEl('shift-avg-per-shift', formatCurrency(avg));
  renderShiftLineChart();
}

let shiftChartInstance = null;

function renderShiftLineChart() {
  const canvas = document.getElementById('shift-line-chart');
  const monthLabel = document.getElementById('shift-line-chart-month-label');
  const picker = document.getElementById('shift-line-chart-picker');
  if (!canvas || typeof Chart === 'undefined') return;

  const year = currentShiftViewDate.getFullYear();
  const month = currentShiftViewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  const labels = days.map(d => String(d.getDate()));

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  if (monthLabel) monthLabel.textContent = `${monthNames[month]} ${year}`;

  const pickerVal = `${year}-${String(month + 1).padStart(2, '0')}`;
  if (picker) {
    picker.value = pickerVal;
  }

  const dataNormal = days.map(d => {
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return shifts.filter(s => s.date === dStr).reduce((acc, s) => acc + (s.normalHoursWorked || 0), 0);
  });

  const dataLembur = days.map(d => {
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return shifts.filter(s => s.date === dStr).reduce((acc, s) => acc + (s.overtimeHours || 0), 0);
  });

  if (shiftChartInstance) {
    shiftChartInstance.destroy();
    shiftChartInstance = null;
  }

  shiftChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Jam Normal',
          data: dataNormal,
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.9)'); // emerald-500
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
            return gradient;
          },
          hoverBackgroundColor: '#059669', // emerald-600
          borderRadius: 6,
          borderWidth: 0,
          barPercentage: 0.6,
        },
        {
          label: 'Jam Lembur',
          data: dataLembur,
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(139, 92, 246, 0.9)'); // purple-500
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0.2)');
            return gradient;
          },
          hoverBackgroundColor: '#7c3aed', // purple-600
          borderRadius: 6,
          borderWidth: 0,
          barPercentage: 0.6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            usePointStyle: true,
            pointStyle: 'rectRounded',
            font: { size: 12, family: "'Google Sans', 'Open Sans', sans-serif" },
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 13, family: "'Google Sans', 'Open Sans', sans-serif" },
          bodyFont: { size: 12, family: "'Google Sans', 'Open Sans', sans-serif" },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} Jam`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: {
            color: 'rgba(226, 232, 240, 0.5)',
            drawTicks: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 11 },
            padding: 10
          }
        },
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            maxRotation: 0
          }
        }
      }
    }
  });
}

function deleteShift(id) {
  if (!confirm('Yakin hapus shift ini?')) return;
  shifts = shifts.filter(s => s.id !== id); saveAll(); renderShifts(); renderOvertimeCard(); showToast('Shift dihapus');
}

// Fungsi Mencatat Shift Menjadi Pemasukan (MySQL)
async function recordShiftAsIncome() {
  const unrecordedShifts = shifts.filter(sh => !sh.recorded);
  const total = unrecordedShifts.reduce((s, sh) => s + sh.earnings, 0);

  if (total <= 0) {
    showToast('Tidak ada pendapatan shift baru yang bisa dicatat', 'error');
    return;
  }

  // 1. Tembak data pendapatan ini ke fungsi saveTransactionToDB (masuk ke tabel transactions)
  const dateToday = new Date().toISOString().split('T')[0];
  saveTransactionToDB('income', total, 'Gaji', dateToday, 'Pendapatan Shift Kerja');

  try {
    // 2. Loop semua shift yang belum tercatat, lalu tembak API untuk ubah statusnya di DB
    for (const sh of unrecordedShifts) {
      await fetch(`${SHIFTS_API}/${sh.id}/record`, { method: 'PUT' });
    }

    // 3. Tarik ulang data terbaru dari database agar UI berubah menjadi "Tercatat"
    getShiftsFromDB();

    showToast(`${formatCurrency(total)} berhasil dicatat sebagai pemasukan!`);

  } catch (error) {
    console.error("Gagal update status shift:", error);
    showToast("Terjadi kesalahan saat mencatat shift", "error");
  }
}

window.changeShiftMonth = (val) => {
  if (!val) return;
  currentShiftViewDate = new Date(val + '-01');
  updateShiftSummary();
  renderShiftCalendar();
};

// Add shift bindings moved to main DOMContentLoaded

// =====================================================================
// EXPORT
// =====================================================================
let exportPeriod = 'weekly';

function exportModal() { document.getElementById('export-modal').classList.remove('hidden'); }
function closeExportModal() { document.getElementById('export-modal').classList.add('hidden'); }

function setExportPeriod(p) {
  exportPeriod = p;
  const customRange = document.getElementById('custom-date-range');
  if (customRange) customRange.classList.toggle('hidden', p !== 'custom');
  ['weekly', 'monthly', 'yearly', 'custom'].forEach(k => {
    const btn = document.getElementById(`exp-btn-${k}`);
    if (btn) btn.className = `export-period-btn px-4 py-2 rounded-full text-sm font-medium transition-all ${k === p ? 'bg-white text-primary' : 'bg-white/20 text-white'}`;
  });
}

function filterByPeriod(data, period) {
  if (period === 'custom') {
    const from = document.getElementById('export-date-from')?.value;
    const to = document.getElementById('export-date-to')?.value;
    if (!from && !to) return data;
    return data.filter(item => {
      const d = new Date(item.date || item.dueDate || item.paidDate || Date.now());
      if (from && d < new Date(from)) return false;
      if (to && d > new Date(to + 'T23:59:59')) return false;
      return true;
    });
  }
  const now = new Date();
  return data.filter(item => {
    const d = new Date(item.date || item.dueDate || item.paidDate || now);
    if (period === 'weekly') { const w = new Date(now); w.setDate(now.getDate() - 6); return d >= w; }
    if (period === 'monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'yearly') return d.getFullYear() === now.getFullYear();
    return true;
  });
}

function getPeriodLabel() {
  const now = new Date();
  if (exportPeriod === 'weekly') return `Minggu_${now.toISOString().split('T')[0]}`;
  if (exportPeriod === 'monthly') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (exportPeriod === 'yearly') return `${now.getFullYear()}`;
  if (exportPeriod === 'custom') {
    const from = document.getElementById('export-date-from')?.value;
    const to = document.getElementById('export-date-to')?.value;
    return `Custom_${from || 'start'}_${to || 'end'}`;
  }
  return 'all';
}

function exportExcel() {
  if (typeof XLSX === 'undefined') { showToast('Library Excel belum termuat', 'error'); return; }
  const tx = filterByPeriod(transactions, exportPeriod);
  const bl = filterByPeriod(bills, exportPeriod);
  const sh = filterByPeriod(shifts, exportPeriod);
  const inc = tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const wb = XLSX.utils.book_new();

  // Sheet 1 — Ringkasan
  const summary = [
    ['Laporan Keuangan BudgetApp'],
    ['Periode', exportPeriod === 'weekly' ? 'Mingguan' : exportPeriod === 'monthly' ? 'Bulanan' : exportPeriod === 'yearly' ? 'Tahunan' : 'Kustom'],
    ['Dibuat', new Date().toLocaleString('id-ID')],
    ['Pengguna', currentUser?.name || '-'],
    [],
    ['Total Pemasukan', inc],
    ['Total Pengeluaran', exp],
    ['Saldo', inc - exp],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Ringkasan');

  // Sheet 2 — Transaksi
  const txRows = [['Tanggal', 'Judul', 'Jenis', 'Kategori', 'Jumlah']];
  tx.forEach(t => txRows.push([formatDate(t.date), t.title, t.type === 'income' ? 'Pemasukan' : 'Pengeluaran', t.category, t.amount]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txRows), 'Transaksi');

  // Sheet 3 — Bills
  const billRows = [['Nama', 'Jumlah', 'Jatuh Tempo', 'Kategori', 'Status']];
  bl.forEach(b => billRows.push([b.name, b.amount, formatDate(b.dueDate), b.category, b.paid ? 'Lunas' : 'Belum']));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(billRows), 'Bills');

  // Sheet 4 — Shifts
  const shiftRows = [['Tanggal', 'Tipe', 'Jam', 'Jam Normal', 'Jam Lembur', 'Tarif Normal', 'Estimasi']];
  sh.forEach(s => shiftRows.push([formatDate(s.date), s.type, s.hours, s.normalHoursWorked || 0, s.overtimeHours || 0, s.hourlyRate, s.earnings]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(shiftRows), 'Shift');

  XLSX.writeFile(wb, `laporan_${exportPeriod}_${getPeriodLabel()}.xlsx`);
  showToast('Excel berhasil diunduh!');
  closeExportModal();
}

function exportPDF() {
  if (typeof window.jspdf === 'undefined') { showToast('Library PDF belum termuat', 'error'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const tx = filterByPeriod(transactions, exportPeriod);
  const inc = tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const periodLabel = exportPeriod === 'weekly' ? 'Mingguan' : exportPeriod === 'monthly' ? 'Bulanan' : exportPeriod === 'yearly' ? 'Tahunan' : 'Kustom';

  // Header
  doc.setFontSize(20); doc.setTextColor(99, 102, 241);
  doc.text('Laporan Keuangan BudgetApp', 14, 20);
  doc.setFontSize(10); doc.setTextColor(100, 116, 139);
  doc.text(`Periode: ${periodLabel} | Dibuat: ${new Date().toLocaleString('id-ID')} | User: ${currentUser?.name || '-'}`, 14, 28);

  // Summary boxes
  doc.setFontSize(11); doc.setTextColor(0);
  doc.setFillColor(240, 253, 244); doc.roundedRect(14, 35, 57, 22, 3, 3, 'F');
  doc.setTextColor(22, 163, 74); doc.text('Total Pemasukan', 43, 44, { align: 'center' });
  doc.setFontSize(12); doc.text(formatCurrency(inc), 43, 51, { align: 'center' });

  doc.setFillColor(255, 241, 242); doc.roundedRect(76, 35, 57, 22, 3, 3, 'F');
  doc.setTextColor(225, 29, 72); doc.text('Total Pengeluaran', 104.5, 44, { align: 'center' });
  doc.setFontSize(12); doc.text(formatCurrency(exp), 104.5, 51, { align: 'center' });

  doc.setFillColor(238, 242, 255); doc.roundedRect(138, 35, 57, 22, 3, 3, 'F');
  doc.setTextColor(79, 70, 229); doc.text('Saldo', 166.5, 44, { align: 'center' });
  doc.setFontSize(12); doc.text(formatCurrency(inc - exp), 166.5, 51, { align: 'center' });

  // Transactions table
  doc.setFontSize(13); doc.setTextColor(30, 41, 59);
  doc.text('Riwayat Transaksi', 14, 68);

  doc.autoTable({
    startY: 72,
    head: [['Tanggal', 'Judul', 'Jenis', 'Kategori', 'Jumlah']],
    body: tx.map(t => [formatDate(t.date), t.title, t.type === 'income' ? 'Pemasukan' : 'Pengeluaran', t.category, formatCurrency(t.amount)]),
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // Shifts table
  const sh = filterByPeriod(shifts, exportPeriod);
  if (sh.length) {
    const y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(13); doc.setTextColor(30, 41, 59);
    doc.text('Riwayat Shift Kerja', 14, y);
    doc.autoTable({
      startY: y + 4,
      head: [['Tanggal', 'Tipe', 'Total Jam', 'Jam Normal', 'Jam Lembur', 'Estimasi']],
      body: sh.map(s => [formatDate(s.date), s.type, s.hours + 'j', `${s.normalHoursWorked || 0}j`, `${s.overtimeHours || 0}j`, formatCurrency(s.earnings)]),
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }

  doc.save(`laporan_${exportPeriod}_${getPeriodLabel()}.pdf`);
  showToast('PDF berhasil diunduh!');
  closeExportModal();
}

// =====================================================================
// MAIN DOMContentLoaded
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {

  // Check session
  if (currentUser) {
    loadUserData();
    document.getElementById('auth-screen').classList.add('hidden');
    updateUserUI(currentUser);
  }

  // Date
  const dateEl = document.getElementById('page-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const themeBtn = document.getElementById('theme-toggle');
  const htmlEl = document.documentElement;
  const themeText = themeBtn ? themeBtn.querySelector('.theme-text') : null;
  if (localStorage.getItem('theme') === 'dark') { htmlEl.classList.add('dark'); if (themeText) themeText.textContent = 'Light'; }
  themeBtn && themeBtn.addEventListener('click', toggleTheme);

  // Spending Flow Chart Dropdown
  const spendingFlowDropdown = document.getElementById('spending-flow-dropdown');
  if (spendingFlowDropdown) {
    spendingFlowDropdown.addEventListener('change', renderSpendingFlowChart);
  }

  // Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');
  const pageTitle = document.getElementById('page-title');
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navItems.forEach(n => { n.classList.remove('active'); n.classList.add('text-slate-500'); });
      item.classList.add('active'); item.classList.remove('text-slate-500');
      viewSections.forEach(v => { v.classList.remove('active'); v.classList.add('hidden'); });
      const viewName = item.getAttribute('data-view');
      const sel = document.getElementById(`view-${viewName}`);
      if (sel) { sel.classList.remove('hidden'); sel.classList.add('active'); sel.classList.remove('animate-fade-in'); void sel.offsetWidth; sel.classList.add('animate-fade-in'); }
      if (pageTitle) pageTitle.textContent = item.querySelector('span').textContent;
      const ca = document.getElementById('content-area');
      if (ca) ca.scrollTop = 0;
      // close mobile menu
      const sidebar = document.querySelector('aside');
      if (window.innerWidth < 768 && sidebar && !sidebar.classList.contains('hidden')) toggleMobileMenu(false);
    });
  });

  // Mobile Menu
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const desktopBtn = document.getElementById('desktop-menu-btn');
  const sidebar = document.querySelector('aside');
  const overlay = document.getElementById('mobile-overlay');

  function toggleMobileMenu(show) {
    if (!sidebar || !overlay) return;
    if (show) { sidebar.classList.remove('hidden'); sidebar.classList.add('fixed', 'inset-y-0', 'left-0', 'z-50', 'w-64'); overlay.classList.remove('hidden'); requestAnimationFrame(() => { overlay.classList.remove('opacity-0'); overlay.classList.add('opacity-100'); }); }
    else { overlay.classList.remove('opacity-100'); overlay.classList.add('opacity-0'); setTimeout(() => { sidebar.classList.add('hidden'); sidebar.classList.remove('fixed', 'inset-y-0', 'left-0', 'z-50', 'w-64'); overlay.classList.add('hidden'); }, 300); }
  }
  if (mobileBtn) mobileBtn.addEventListener('click', () => toggleMobileMenu(true));
  if (overlay) overlay.addEventListener('click', () => toggleMobileMenu(false));
  if (desktopBtn) desktopBtn.addEventListener('click', () => {
    if (sidebar) {
      sidebar.classList.toggle('w-64');
      sidebar.classList.toggle('w-20');
      document.querySelectorAll('.sidebar-text').forEach(el => el.classList.toggle('hidden'));

      document.querySelectorAll('#sidebar-desktop .nav-item').forEach(el => {
        el.classList.toggle('px-4');
        el.classList.toggle('justify-center');
      });

      const exportBtn = document.querySelector('#sidebar-desktop button');
      if (exportBtn) {
        exportBtn.classList.toggle('px-4');
        exportBtn.classList.toggle('justify-center');
      }

      const logoDiv = document.querySelector('#sidebar-desktop .h-16');
      if (logoDiv) {
        logoDiv.classList.toggle('px-6');
        logoDiv.classList.toggle('justify-center');
      }
    }
  });

  // Form Pemasukan
  const formPemasukan = document.getElementById('form-pemasukan');
  if (formPemasukan) formPemasukan.addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('input-pemasukan-judul').value.trim();
    const amount = parseInt(document.getElementById('input-pemasukan-jumlah').value);
    const category = document.getElementById('input-pemasukan-kategori').value;
    const dateVal = document.getElementById('input-pemasukan-tanggal').value;

    if (!title) { showToast('Judul tidak boleh kosong', 'error'); return; }
    if (!amount || amount <= 0) { showToast('Jumlah harus > 0', 'error'); return; }

    // 1. Kirim data ke MySQL (Tidak pakai transactions.push lagi)
    saveTransactionToDB('income', amount, category, dateVal || new Date().toISOString(), title);

    // 2. Bersihkan form
    formPemasukan.reset();
    document.getElementById('input-pemasukan-tanggal').value = new Date().toISOString().split('T')[0];
    showToast('Menyimpan ke database...');
    // CATATAN: updateDashboard() dan renderPemasukan() sudah dipindah ke dalam fungsi saveTransactionToDB
  });

  // Form Pengeluaran
  const formPengeluaran = document.getElementById('form-pengeluaran');
  if (formPengeluaran) formPengeluaran.addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('input-pengeluaran-judul').value.trim();
    const amount = parseInt(document.getElementById('input-pengeluaran-jumlah').value);
    const category = document.getElementById('input-pengeluaran-kategori').value;
    const dateVal = document.getElementById('input-pengeluaran-tanggal').value;

    if (!title) { showToast('Judul tidak boleh kosong', 'error'); return; }
    if (!amount || amount <= 0) { showToast('Jumlah harus > 0', 'error'); return; }

    // 1. Kirim data ke MySQL
    saveTransactionToDB('expense', amount, category, dateVal || new Date().toISOString(), title);

    // 2. Bersihkan form
    formPengeluaran.reset();
    document.getElementById('input-pengeluaran-tanggal').value = new Date().toISOString().split('T')[0];
    showToast('Pengeluaran berhasil disimpan!');
  });

  // Form Goal
  const formGoal = document.getElementById('form-goal');
  if (formGoal) formGoal.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('input-goal-name').value.trim();
    const target = parseInt(document.getElementById('input-goal-target').value);
    const saved = parseInt(document.getElementById('input-goal-saved').value) || 0;
    const deadline = document.getElementById('input-goal-deadline').value;
    const color = document.getElementById('input-goal-color').value;
    const icon = document.getElementById('input-goal-icon').value;

    if (!name) { showToast('Nama goal tidak boleh kosong', 'error'); return; }
    if (!target || target <= 0) { showToast('Target harus > 0', 'error'); return; }

    // Kirim ke MySQL
    saveGoalToDB(name, target, saved, deadline, color, icon);

    formGoal.reset();
    document.getElementById('goal-form-section').classList.add('hidden');
    showToast('Goal berhasil ditambahkan ke database!');
  });

  // Form Bill
  const formBill = document.getElementById('form-bill');
  if (formBill) formBill.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('input-bill-name').value.trim();
    const amount = parseInt(document.getElementById('input-bill-amount').value);
    const dueDate = document.getElementById('input-bill-duedate').value;
    const category = document.getElementById('input-bill-category').value;

    if (!name) { showToast('Nama tagihan tidak boleh kosong', 'error'); return; }
    if (!amount || amount <= 0) { showToast('Jumlah harus > 0', 'error'); return; }
    if (!dueDate) { showToast('Tanggal jatuh tempo WAJIB diisi!', 'error'); return; }

    // Kirim ke MySQL (status paid default false/0)
    saveBillToDB(name, amount, dueDate, category, false);

    formBill.reset();
    document.getElementById('bill-form-section').classList.add('hidden');
    showToast('Tagihan berhasil ditambahkan ke database!');
  });

  // Form Shift
  const formShift = document.getElementById('form-shift');
  if (formShift) {
    const shiftTypeSelect = document.getElementById('input-shift-type');
    shiftTypeSelect && shiftTypeSelect.addEventListener('change', () => {
      const t = SHIFT_TYPES[shiftTypeSelect.value];
      if (!t) return;
      document.getElementById('input-shift-start').value = t.startDefault;
      document.getElementById('input-shift-end').value = t.endDefault;
      const nhEl = document.getElementById('input-shift-normal-hours');
      if (nhEl) nhEl.value = t.normalHours;
      const isOff = shiftTypeSelect.value === 'OffDay';
      ['input-shift-start', 'input-shift-end', 'input-shift-rate', 'input-shift-normal-hours'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = isOff;
      });
    });

    // KODE YANG SEBELUMNYA TIDAK SENGAJA TERHAPUS ADA DI SINI
    formShift.addEventListener('submit', e => {
      e.preventDefault();
      const date = document.getElementById('input-shift-date').value;
      const type = document.getElementById('input-shift-type').value;
      const startTime = document.getElementById('input-shift-start').value;
      const endTime = document.getElementById('input-shift-end').value;
      const normalHrsInput = parseFloat(document.getElementById('input-shift-normal-hours').value) || 0;
      const hourlyRate = parseInt(document.getElementById('input-shift-rate').value) || 0;
      const otRateInput = parseInt(document.getElementById('input-shift-ot-rate').value) || 0;

      const isOff = type === 'OffDay';
      const isLembur = type === 'Lembur';
      let hours = 0, normalHoursWorked = 0, overtimeHours = 0, earnings = 0;

      if (!isOff) {
        hours = calcShiftHours(startTime, endTime);
        if (isLembur) {
          normalHoursWorked = 0;
          overtimeHours = hours;
        } else {
          normalHoursWorked = Math.min(hours, normalHrsInput);
          overtimeHours = Math.max(0, hours - normalHrsInput);
        }
        const otRate = otRateInput > 0 ? otRateInput : Math.round(hourlyRate * 1.5);
        earnings = Math.round(normalHoursWorked * hourlyRate + overtimeHours * otRate);
      }

      // Kirim data ke MySQL
      saveShiftToDB({
        date, type, startTime, endTime, hours, normalHoursWorked, overtimeHours, hourlyRate, earnings
      });

      formShift.reset();
      document.getElementById('shift-form-section').classList.add('hidden');
      document.getElementById('input-shift-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('input-shift-start').value = '08:00';
      document.getElementById('input-shift-end').value = '16:00';
      const nhEl2 = document.getElementById('input-shift-normal-hours'); if (nhEl2) nhEl2.value = '8';

      ['input-shift-start', 'input-shift-end', 'input-shift-rate', 'input-shift-normal-hours'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });

      showToast('Menyimpan Shift ke database...');
    });
  }
  const btnAddShiftTop = document.getElementById('btn-add-shift-top');
  // Tombol Toggle Form Bills (Tagihan)
  const btnAddBillTop = document.getElementById('btn-add-bill-top');
  if (btnAddBillTop) btnAddBillTop.addEventListener('click', () => {
    const s = document.getElementById('bill-form-section');
    s.classList.toggle('hidden');
    if (!s.classList.contains('hidden')) s.scrollIntoView({ behavior: 'smooth' });
  });
  const btnCancelBill = document.getElementById('btn-cancel-bill');
  if (btnCancelBill) btnCancelBill.addEventListener('click', () => document.getElementById('bill-form-section').classList.add('hidden'));

  // Tombol Toggle Form Goals (Target)
  const btnAddGoalTop = document.getElementById('btn-add-goal-top');
  if (btnAddGoalTop) btnAddGoalTop.addEventListener('click', () => {
    const s = document.getElementById('goal-form-section');
    s.classList.toggle('hidden');
    if (!s.classList.contains('hidden')) s.scrollIntoView({ behavior: 'smooth' });
  });
  const btnCancelGoal = document.getElementById('btn-cancel-goal');
  if (btnCancelGoal) btnCancelGoal.addEventListener('click', () => document.getElementById('goal-form-section').classList.add('hidden'));
  if (btnAddShiftTop) btnAddShiftTop.addEventListener('click', () => { const s = document.getElementById('shift-form-section'); s.classList.toggle('hidden'); if (!s.classList.contains('hidden')) s.scrollIntoView({ behavior: 'smooth' }); });
  const btnCancelShift = document.getElementById('btn-cancel-shift');
  if (btnCancelShift) btnCancelShift.addEventListener('click', () => document.getElementById('shift-form-section').classList.add('hidden'));
  const btnRecordShift = document.getElementById('btn-record-shift-income');
  if (btnRecordShift) btnRecordShift.addEventListener('click', recordShiftAsIncome);

  // Quick Actions
  const quickIncome = document.getElementById('quick-income');
  const quickExpense = document.getElementById('quick-expense');
  if (quickIncome) quickIncome.addEventListener('click', () => document.querySelector('[data-view="pemasukan"]').click());
  if (quickExpense) quickExpense.addEventListener('click', () => document.querySelector('[data-view="pengeluaran"]').click());

  // FAB
  const fab = document.getElementById('fab-add');
  if (fab) fab.addEventListener('click', () => document.querySelector('[data-view="pemasukan"]').click());

  // Default dates
  const todayStr = new Date().toISOString().split('T')[0];
  ['input-pemasukan-tanggal', 'input-pengeluaran-tanggal', 'input-shift-date'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = todayStr;
  });

  // Filters (reset page to 1 when filters change)
  const fpSearch = document.getElementById('filter-pemasukan-search');
  if (fpSearch) fpSearch.addEventListener('input', () => { currentPemasukanPage = 1; renderPemasukan(); });

  const fpSort = document.getElementById('filter-pemasukan-sort');
  if (fpSort) fpSort.addEventListener('change', () => { currentPemasukanPage = 1; renderPemasukan(); });

  const feSearch = document.getElementById('filter-pengeluaran-search');
  if (feSearch) feSearch.addEventListener('input', () => { currentPengeluaranPage = 1; renderPengeluaran(); });

  const feSort = document.getElementById('filter-pengeluaran-sort');
  if (feSort) feSort.addEventListener('change', () => { currentPengeluaranPage = 1; renderPengeluaran(); });

  const feCat = document.getElementById('filter-pengeluaran-cat');
  if (feCat) feCat.addEventListener('change', () => { currentPengeluaranPage = 1; renderPengeluaran(); });
  // Custom Category Add Event
  const btnAddCat = document.getElementById('btn-add-category');
  if (btnAddCat) {
    btnAddCat.addEventListener('click', () => {
      const nameInput = document.getElementById('input-new-category-name');
      const colorInput = document.getElementById('input-new-category-color');
      const name = nameInput.value.trim();
      if (!name) { showToast('Nama kategori tidak boleh kosong', 'error'); return; }
      if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
        showToast('Kategori sudah ada', 'error'); return;
      }
      categories.push({ name, color: colorInput.value });
      saveAll();
      renderCategoriesDropdown();
      nameInput.value = '';
      showToast('Kategori berhasil ditambahkan!');
    });
  }

  // Unified Shift Pickers Logic
  function handleShiftMonthChange(e) {
    if (e.target.value) {
      currentShiftViewDate = new Date(e.target.value + '-01T00:00:00');
      updateShiftSummary(); // Recalculates summary, re-renders chart, and calendar can be called here too
      renderShiftCalendar();
    }
  }

  const shiftLinePicker = document.getElementById('shift-line-chart-picker');
  if (shiftLinePicker) shiftLinePicker.addEventListener('change', handleShiftMonthChange);

  const shiftCalendarPicker = document.getElementById('shift-calendar-picker');
  if (shiftCalendarPicker) shiftCalendarPicker.addEventListener('change', handleShiftMonthChange);

  // Initial render (only if logged in)
  if (currentUser) {
    renderCategoriesDropdown();
    checkRecurringTransactions();
    updateDashboard(); renderPemasukan(); renderPengeluaran(); renderGoals(); renderBills(); renderShifts(); renderTasks(); renderRecurringList();
  }

  // --- Recurring Transactions Setup --- //
  const formReq = document.getElementById('form-recurring');
  if (formReq) {
    formReq.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('input-req-name').value.trim();
      const amount = parseInt(document.getElementById('input-req-amount').value);
      const type = document.getElementById('input-req-type').value;
      const category = document.getElementById('input-req-category').value;
      const date = parseInt(document.getElementById('input-req-date').value);

      if (!name) { showToast('Nama tagihan rutin harus diisi', 'error'); return; }
      if (!amount || amount <= 0) { showToast('Jumlah harus > 0', 'error'); return; }
      if (!date || date < 1 || date > 31) { showToast('Tanggal jatuh tempo (1-31) tidak valid', 'error'); return; }

      recurring.push({ id: uid(), name, amount, type, category, date, lastProcessedMonth: null });
      saveAll();
      formReq.reset();
      closeRecurringModal();
      renderRecurringList();
      showToast('Tagihan rutin berhasil dibuat!');
    });
  }

  // Spending Flow Tabs Logic
  document.querySelectorAll('.spending-flow-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.spending-flow-tab').forEach(b => {
        b.classList.remove('active', 'bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white');
        b.classList.add('text-slate-500', 'dark:text-slate-400');
      });
      const t = e.target;
      t.classList.add('active', 'bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white');
      t.classList.remove('text-slate-500', 'dark:text-slate-400');

      const period = t.getAttribute('data-period');
      spendingFlowPeriod = period;

      const customDateEl = document.getElementById('spending-flow-custom-date');
      if (period === 'custom') {
        customDateEl.classList.remove('hidden');
      } else {
        customDateEl.classList.add('hidden');
        renderSpendingFlowChart();
      }
    });
  });

  const flowApplyBtn = document.getElementById('flow-custom-apply');
  if (flowApplyBtn) flowApplyBtn.addEventListener('click', () => {
    spendingFlowCustomStart = document.getElementById('flow-start-date').value;
    spendingFlowCustomEnd = document.getElementById('flow-end-date').value;
    if (spendingFlowCustomStart && spendingFlowCustomEnd) renderSpendingFlowChart();
    else showToast('Pilih range tanggal terlebih dahulu', 'error');
  });

  // Category Flow Tabs Logic
  document.querySelectorAll('.cat-flow-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.cat-flow-tab').forEach(b => {
        b.classList.remove('active', 'bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white');
        b.classList.add('text-slate-500', 'dark:text-slate-400');
      });
      const t = e.target;
      t.classList.add('active', 'bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white');
      t.classList.remove('text-slate-500', 'dark:text-slate-400');

      const period = t.getAttribute('data-period');
      catFlowPeriod = period;

      const customDateEl = document.getElementById('cat-custom-date');
      if (period === 'custom') {
        customDateEl.classList.remove('hidden');
      } else {
        customDateEl.classList.add('hidden');
        renderCategoryPieChart();
      }
    });
  });

  const catApplyBtn = document.getElementById('cat-custom-apply');
  if (catApplyBtn) catApplyBtn.addEventListener('click', () => {
    catFlowCustomStart = document.getElementById('cat-start-date').value;
    catFlowCustomEnd = document.getElementById('cat-end-date').value;
    if (catFlowCustomStart && catFlowCustomEnd) renderCategoryPieChart();
    else showToast('Pilih range tanggal terlebih dahulu', 'error');
  });

  // (Removed duplicate shift calendar picker logic)

});

// =====================================================================
// TASK & POMODORO
// =====================================================================
let pomoTimer = null;
let pomoTimeLeft = 25 * 60;
let isPomoRunning = false;
let currentPomoMode = 'work'; // work, shortBreak, longBreak

const pomoModes = {
  work: { time: 25 * 60, label: 'Work Time', color: 'rose' },
  shortBreak: { time: 5 * 60, label: 'Short Break', color: 'sky' },
  longBreak: { time: 15 * 60, label: 'Long Break', color: 'indigo' }
};

function formatPomoTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updatePomoUI() {
  setEl('pomodoro-time', formatPomoTime(pomoTimeLeft));
  setEl('pomodoro-status', pomoModes[currentPomoMode].label);
  const btn = document.getElementById('pomodoro-toggle');
  if (btn) btn.textContent = isPomoRunning ? 'PAUSE' : 'START';

  // Update buttons styling
  ['work', 'shortBreak', 'longBreak'].forEach(m => {
    const btnId = m === 'work' ? 'pomo-btn-work' : m === 'shortBreak' ? 'pomo-btn-short' : 'pomo-btn-long';
    const b = document.getElementById(btnId);
    if (b) {
      if (currentPomoMode === m) {
        b.className = 'bg-white/20 hover:bg-white/30 text-xs font-semibold py-2 rounded-xl transition-colors backdrop-blur-sm ring-2 ring-white/50';
      } else {
        b.className = 'bg-white/10 hover:bg-white/30 text-xs font-semibold py-2 rounded-xl transition-colors backdrop-blur-sm';
      }
    }
  });
}

function setPomodoroMode(mode) {
  if (isPomoRunning) togglePomodoro();
  currentPomoMode = mode;
  pomoTimeLeft = pomoModes[mode].time;
  updatePomoUI();
}


function playPomodoroAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Loop 6 times, each cycle is 0.5s (Total 3 seconds of alarm)
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + (i * 0.5);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, startTime);
      osc.frequency.setValueAtTime(0, startTime + 0.1);
      osc.frequency.setValueAtTime(880, startTime + 0.2);

      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    }
  } catch (e) {
    console.error("Audio block", e);
  }
}

function togglePomodoro() {
  if (isPomoRunning) {
    clearInterval(pomoTimer);
    isPomoRunning = false;
  } else {
    isPomoRunning = true;
    pomoTimer = setInterval(() => {
      if (pomoTimeLeft > 0) {
        pomoTimeLeft--;
        updatePomoUI();
      } else {
        clearInterval(pomoTimer);
        isPomoRunning = false;
        playPomodoroAlarm();
        showToast('Waktu habis!', 'info');
        if (currentPomoMode === 'work') setPomodoroMode('shortBreak');
        else setPomodoroMode('work');
      }
    }, 1000);
  }
  updatePomoUI();
}

function resetPomodoro() {
  if (isPomoRunning) togglePomodoro();
  pomoTimeLeft = pomoModes[currentPomoMode].time;
  updatePomoUI();
}

let taskChartInstance = null;
function renderTaskChart() {
  const canvas = document.getElementById('task-progress-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const comp = tasks.filter(t => t.status === 'completed').length;
  const prog = tasks.filter(t => t.status === 'progress').length;
  const pend = tasks.filter(t => t.status === 'pending').length;

  if (comp === 0 && prog === 0 && pend === 0) {
    if (taskChartInstance) taskChartInstance.destroy();
    taskChartInstance = null;
    return;
  }

  const data = [comp, prog, pend];
  const labels = ['Completed', 'In Progress', 'Pending'];
  const bgColors = ['#10b981', '#0ea5e9', '#f59e0b']; // emerald, sky, amber

  if (taskChartInstance) {
    taskChartInstance.data.datasets[0].data = data;
    taskChartInstance.update();
  } else {
    taskChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 4 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.label || '';
                if (label) label += ': ';
                const total = context.chart._metasets[context.datasetIndex].total;
                const value = context.parsed;
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return label + value + ' (' + percentage + '%)';
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  }
}

function renderTasks() {
  const statTotal = document.getElementById('task-stat-total');
  const statComp = document.getElementById('task-stat-completed');
  const statProg = document.getElementById('task-stat-progress');
  const statPend = document.getElementById('task-stat-pending');
  const list = document.getElementById('task-list');

  if (statTotal) statTotal.textContent = tasks.length;
  if (statComp) statComp.textContent = tasks.filter(t => t.status === 'completed').length;
  if (statProg) statProg.textContent = tasks.filter(t => t.status === 'progress').length;
  if (statPend) statPend.textContent = tasks.filter(t => t.status === 'pending').length;

  renderTaskChart();

  if (list) {
    if (!tasks.length) {
      list.innerHTML = `<div class="p-4 flex flex-col items-center justify-center border border-dashed border-light-border dark:border-dark-border rounded-2xl text-slate-500 text-sm"><p>Belum ada task yang berjalan.</p></div>`;
    } else {
      const sorted = [...tasks].sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        return b.id < a.id ? -1 : 1;
      });
      list.innerHTML = sorted.map(t => {
        const icons = { completed: 'check-circle', progress: 'spinner-gap', pending: 'clock' };
        const colors = { completed: 'emerald', progress: 'sky', pending: 'amber' };

        const changeStatusHtml = t.status === 'completed' ? `<button onclick="updateTaskStatus('${t.id}', 'progress')" title="Pindah ke Progress" class="p-1.5 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-500 rounded-lg transition-colors"><i class="ph ph-arrow-u-up-left text-lg"></i></button>` : `<button onclick="updateTaskStatus('${t.id}', '${t.status === 'pending' ? 'progress' : 'completed'}')" title="Ubah status" class="p-1.5 hover:bg-${colors[t.status === 'pending' ? 'progress' : 'completed']}-100 dark:hover:bg-${colors[t.status === 'pending' ? 'progress' : 'completed']}-500/20 text-${colors[t.status === 'pending' ? 'progress' : 'completed']}-500 rounded-lg transition-colors"><i class="ph ph-check text-lg"></i></button>`;

        return `<div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-light-border dark:border-dark-border rounded-2xl bg-slate-50 dark:bg-slate-800/50 group">
          <div class="flex items-center gap-3">
            <i class="ph ph-${icons[t.status]} text-2xl text-${colors[t.status]}-500"></i>
            <span class="font-medium text-slate-900 dark:text-white ${t.status === 'completed' ? 'line-through text-slate-500' : ''}">${t.title}</span>
          </div>
          <div class="flex items-center justify-end sm:justify-start mt-2 sm:mt-0 gap-3">
            <span class="text-xs font-semibold px-2.5 py-1 rounded-md bg-${colors[t.status]}-100 dark:bg-${colors[t.status]}-500/20 text-${colors[t.status]}-600 dark:text-${colors[t.status]}-400 capitalize">${t.status}</span>
            <div class="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
               ${changeStatusHtml}
               <button onclick="deleteTask('${t.id}')" title="Hapus" class="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500 rounded-lg transition-colors"><i class="ph ph-trash text-lg"></i></button>
            </div>
          </div>
        </div>`;
      }).join('');
    }
  }
}

function updateTaskStatus(id, newStatus) {
  const t = tasks.find(x => x.id === id);
  if (t) {
    t.status = newStatus;
    saveAll(); renderTasks();
    if (newStatus === 'completed') showToast(`Task "${t.title}" selesai! 🎉`);
  }
}

function deleteTask(id) {
  if (!confirm('Yakin ingin menghapus task ini?')) return;
  tasks = tasks.filter(t => t.id !== id);
  saveAll(); renderTasks(); showToast('Task dihapus');
}

// Ensure Pomodoro UI is updated on load even if not fully logged in yet
document.addEventListener('DOMContentLoaded', () => {
  updatePomoUI();

  // Add task logic
  const formTask = document.getElementById('form-task');
  if (formTask) {
    formTask.addEventListener('submit', e => {
      e.preventDefault();
      const title = document.getElementById('input-task-title').value.trim();
      const status = document.getElementById('input-task-status').value;
      if (!title) return;

      // Kirim data ke MySQL (bukan lagi tasks.push)
      saveTaskToDB(title, status);

      formTask.reset();
      document.getElementById('task-form-section').classList.add('hidden');
      showToast('Task sedang ditambahkan ke database...');
    });
  }

  const btnAddTaskTop = document.getElementById('btn-add-task-top');
  if (btnAddTaskTop) btnAddTaskTop.addEventListener('click', () => { const s = document.getElementById('task-form-section'); s.classList.toggle('hidden'); if (!s.classList.contains('hidden')) s.scrollIntoView({ behavior: 'smooth' }); });
  const btnCancelTask = document.getElementById('btn-cancel-task');
  if (btnCancelTask) btnCancelTask.addEventListener('click', () => document.getElementById('task-form-section').classList.add('hidden'));

  // Bind to btn-add-category automatically
  const btnAddCat = document.getElementById('btn-add-category');
  if (btnAddCat) {
    btnAddCat.addEventListener('click', window.addCustomCategory);
  }
});
// =====================================================================
// NODE.JS BACKEND INTEGRATION
// =====================================================================
const API_URL = 'https://https://kanebuddy-bxvn.vercel.app/api/transactions';

// 1. Fungsi MENGAMBIL data dari MySQL
async function getTransactionsFromDB() {
  try {
    const response = await fetch(API_URL);
    const dbTransactions = await response.json();

    // Sesuaikan nama kolom DB (description) dengan yang dipakai UI (title)
    transactions = dbTransactions.map(tx => ({
      id: tx.id,
      title: tx.description,
      amount: Number(tx.amount),
      category: tx.category,
      type: tx.type,
      date: tx.date
    }));

    saveAll(); // 👈 BARIS INI (Backup data terbaru ke memori browser)

    console.log("Data sukses diambil dari MySQL:", transactions);

    // Render ulang semua tampilan UI agar data dari DB muncul
    updateDashboard();
    renderPemasukan();
    renderPengeluaran();

  } catch (error) {
    console.error("Ups, gagal mengambil data dari server:", error);
  }
}

// 2. Fungsi MENYIMPAN data ke MySQL
async function saveTransactionToDB(type, amount, category, date, description) {
  const newTransaction = { type, amount, category, date, description };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTransaction)
    });

    const result = await response.json();
    console.log("Sukses menyimpan ke DB:", result);

    // Panggil data terbaru dari DB setelah berhasil menyimpan
    getTransactionsFromDB();

  } catch (error) {
    console.error("Ups, gagal menyimpan data:", error);
  }
}

// Tarik data saat website pertama kali dimuat
document.addEventListener('DOMContentLoaded', () => {
  getTransactionsFromDB();
  getGoalsFromDB();
  getBillsFromDB();
  getShiftsFromDB();
  getTasksFromDB();
});

// ==========================================
// API UNTUK GOALS & BILLS
// ==========================================
const GOALS_API = 'https://https://kanebuddy-bxvn.vercel.app/api/goals';
const BILLS_API = 'https://https://kanebuddy-bxvn.vercel.app/api/bills';

// --- FUNGSI GOALS ---
async function getGoalsFromDB() {
  try {
    const res = await fetch(GOALS_API);
    const data = await res.json();
    goals = data.map(g => ({
      id: g.id, name: g.name, target: Number(g.target),
      saved: Number(g.saved), deadline: g.deadline, color: g.color, icon: g.icon
    }));
    saveAll(); // 👈 BARIS INI (Backup data terbaru ke memori browser)
    renderGoals();
    renderDashboardGoals();
  } catch (err) { console.error(err); }
}

async function saveGoalToDB(name, target, saved, deadline, color, icon) {
  try {
    await fetch(GOALS_API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, target, saved, deadline, color, icon })
    });
    getGoalsFromDB();
  } catch (err) { console.error(err); }
}

// Menimpa fungsi deleteGoal lama
async function deleteGoal(id) {
  if (!confirm('Yakin hapus goal ini dari database?')) return;
  try {
    await fetch(`${GOALS_API}/${id}`, { method: 'DELETE' });
    showToast('Goal dihapus');
    getGoalsFromDB();
  } catch (err) { console.error(err); }
}

// --- FUNGSI BILLS ---
async function getBillsFromDB() {
  try {
    const res = await fetch(BILLS_API);
    const data = await res.json();
    bills = data.map(b => ({
      id: b.id, name: b.name, amount: Number(b.amount),
      dueDate: b.due_date, category: b.category,
      paid: b.paid === 1 || b.paid === true, paidDate: b.paid_date
    }));

    saveAll(); // 👈 BARIS INI (Backup data terbaru ke memori browser)

    renderBills();
    renderDashboardBills();
  } catch (err) { console.error(err); }
}

async function saveBillToDB(name, amount, due_date, category, paid) {
  try {
    const response = await fetch(BILLS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount, due_date, category, paid })
    });

    const result = await response.json();

    // Hentikan proses jika ditolak oleh MySQL
    if (!response.ok) {
      console.error("🚨 Ditolak oleh MySQL:", result.error);
      showToast("Gagal: Tanggal wajib diisi!", "error");
      return;
    }

    getBillsFromDB();
  } catch (err) {
    console.error("🚨 Error Fetch:", err);
  }
}
// Menimpa fungsi deleteBill lama
async function deleteBill(id) {
  if (!confirm('Yakin hapus tagihan ini dari database?')) return;
  try {
    await fetch(`${BILLS_API}/${id}`, { method: 'DELETE' });
    showToast('Tagihan dihapus');
    getBillsFromDB();
  } catch (err) { console.error(err); }
}

// ==========================================
// API UNTUK SHIFT KERJA
// ==========================================
const SHIFTS_API = 'https://https://kanebuddy-bxvn.vercel.app/api/shifts';

// 1. Ambil data Shift dari Database
async function getShiftsFromDB() {
  try {
    const res = await fetch(SHIFTS_API);
    const data = await res.json();

    // Sesuaikan format snake_case dari DB ke camelCase untuk UI
    shifts = data.map(s => ({
      id: s.id,
      date: s.date.split('T')[0], // Ambil format YYYY-MM-DD
      type: s.type,
      startTime: s.start_time,
      endTime: s.end_time,
      hours: Number(s.hours),
      normalHoursWorked: Number(s.normal_hours),
      overtimeHours: Number(s.overtime_hours),
      hourlyRate: Number(s.hourly_rate),
      earnings: Number(s.earnings),
      recorded: s.recorded === 1 || s.recorded === true
    }));

    saveAll(); // 👈 BARIS INI (Backup data terbaru ke memori browser)

    renderShifts();
    renderOvertimeCard();
  } catch (err) {
    console.error("Gagal load shifts:", err);
  }
}

// 2. Simpan Shift ke Database
async function saveShiftToDB(shiftData) {
  try {
    const response = await fetch(SHIFTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: shiftData.date,
        type: shiftData.type,
        start_time: shiftData.startTime,
        end_time: shiftData.endTime,
        hours: shiftData.hours,
        normal_hours: shiftData.normalHoursWorked,
        overtime_hours: shiftData.overtimeHours,
        hourly_rate: shiftData.hourlyRate,
        earnings: shiftData.earnings
      })
    });

    if (!response.ok) throw new Error('Gagal menyimpan shift');

    getShiftsFromDB(); // Update UI
  } catch (err) {
    console.error("Error save shift:", err);
  }
}

// 3. Menimpa fungsi deleteShift lama
async function deleteShift(id) {
  if (!confirm('Yakin hapus shift ini dari database?')) return;
  try {
    await fetch(`${SHIFTS_API}/${id}`, { method: 'DELETE' });
    showToast('Shift dihapus');
    getShiftsFromDB();
  } catch (err) {
    console.error(err);
    showToast('Gagal menghapus shift', 'error');
  }
}

// ==========================================
// API UNTUK TASKS & PROJECT
// ==========================================
const TASKS_API = 'https://https://kanebuddy-bxvn.vercel.app/api/tasks';

// 1. Ambil data Task dari Database
async function getTasksFromDB() {
  try {
    const res = await fetch(TASKS_API);
    const data = await res.json();

    tasks = data.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status
    }));

    saveAll(); // 👈 BARIS INI (Backup data terbaru ke memori browser)

    renderTasks();
  } catch (err) {
    console.error("Gagal load tasks:", err);
  }
}

// 2. Simpan Task baru ke Database
async function saveTaskToDB(title, status) {
  try {
    const response = await fetch(TASKS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, status })
    });
    if (!response.ok) throw new Error('Gagal menyimpan task');

    getTasksFromDB(); // Update UI
  } catch (err) {
    console.error(err);
  }
}

// 3. Menimpa fungsi updateTaskStatus lama
async function updateTaskStatus(id, newStatus) {
  try {
    const response = await fetch(`${TASKS_API}/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) throw new Error('Gagal update status server');

    if (newStatus === 'completed') showToast(`Task selesai! 🎉`);
    getTasksFromDB(); // Update UI
  } catch (err) {
    console.error("Error update status:", err);
  }
}

// 4. Menimpa fungsi deleteTask lama
async function deleteTask(id) {
  if (!confirm('Yakin ingin menghapus task ini dari database?')) return;
  try {
    await fetch(`${TASKS_API}/${id}`, { method: 'DELETE' });
    showToast('Task dihapus');
    getTasksFromDB();
  } catch (err) {
    console.error(err);
    showToast('Gagal menghapus task', 'error');
  }
}