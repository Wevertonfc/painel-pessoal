// ============================================================
// PAINEL PESSOAL — App Logic
// Auth + CRUD Supabase + UI Interactions
// ============================================================

// ---- CONFIGURAÇÃO SUPABASE ----
// ⚠️ SUBSTITUA pelos valores do seu projeto Supabase:
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-ANON-KEY-AQUI';

// Inicializar cliente Supabase
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- STATE ----
let currentUser = null;
let currentTab = 'financeiro';
let transactionFilter = 'all';
let pendenciaFilter = 'all';
let ideaTagFilter = 'all';

// ---- DOM REFS ----
const $ = (id) => document.getElementById(id);
const loginScreen = $('loginScreen');
const appContainer = $('appContainer');
const loadingOverlay = $('loadingOverlay');
const toastContainer = $('toastContainer');

// ============================================================
// UTILS
// ============================================================

function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

const moodEmojis = {
    great: '😄',
    good: '🙂',
    neutral: '😐',
    bad: '😕',
    terrible: '😩'
};

// ============================================================
// AUTH
// ============================================================

async function handleLogin(e) {
    e.preventDefault();
    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;
    const errorEl = $('loginError');
    const loginBtn = $('loginBtn');

    if (!email || !password) {
        errorEl.textContent = 'Preencha e-mail e senha.';
        errorEl.style.display = 'block';
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';
    errorEl.style.display = 'none';

    try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUser = data.user;
        showApp();
    } catch (err) {
        console.error('Login error:', err);
        let msg = 'Erro ao fazer login.';
        if (err.message.includes('Invalid login')) msg = 'E-mail ou senha incorretos.';
        else if (err.message.includes('Email not confirmed')) msg = 'E-mail não confirmado.';
        else if (err.message.includes('fetch')) msg = 'Sem conexão com o servidor. Verifique sua internet.';
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Entrar';
    }
}

async function handleLogout() {
    try {
        await sb.auth.signOut();
    } catch (e) {
        console.error('Logout error:', e);
    }
    currentUser = null;
    loginScreen.style.display = '';
    appContainer.classList.remove('active');
    $('loginEmail').value = '';
    $('loginPassword').value = '';
    showToast('Sessão encerrada.', 'info');
}

async function checkSession() {
    showLoading();
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (session && session.user) {
            currentUser = session.user;
            showApp();
        }
    } catch (err) {
        console.error('Session check error:', err);
    } finally {
        hideLoading();
    }
}

function showApp() {
    loginScreen.style.display = 'none';
    appContainer.classList.add('active');
    $('userEmail').textContent = currentUser.email;
    hideLoading();
    loadAllData();
}

// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;

            document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('active'));
            const panel = $(`panel-${currentTab}`);
            if (panel) panel.classList.add('active');
        });
    });
}

// ============================================================
// DATA LOADING
// ============================================================

async function loadAllData() {
    showLoading();
    try {
        await Promise.all([
            loadTransactions(),
            loadAgendaItems(),
            loadPendencias(),
            loadIdeas(),
            loadCheckpoints()
        ]);
    } catch (err) {
        console.error('Error loading data:', err);
        showToast('Erro ao carregar dados. Tente recarregar.', 'error');
    } finally {
        hideLoading();
    }
}

// ============================================================
// FINANCEIRO — Transactions
// ============================================================

let transactions = [];

async function loadTransactions() {
    const { data, error } = await sb
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Load transactions error:', error);
        showToast('Erro ao carregar transações.', 'error');
        return;
    }
    transactions = data || [];
    renderTransactions();
    updateFinancialStats();
}

function renderTransactions() {
    const list = $('transactionList');
    const empty = $('txEmpty');

    let filtered = transactions;
    if (transactionFilter === 'income') filtered = transactions.filter(t => t.type === 'income');
    if (transactionFilter === 'expense') filtered = transactions.filter(t => t.type === 'expense');

    if (filtered.length === 0) {
        list.innerHTML = '';
        list.appendChild(empty);
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';

    list.innerHTML = filtered.map(t => `
        <div class="transaction-item" data-id="${t.id}">
            <div class="transaction-info">
                <div class="transaction-desc">${escapeHtml(t.description)}</div>
                <div class="transaction-meta">
                    <span>${t.category || 'Geral'}</span>
                    <span>•</span>
                    <span>${formatDate(t.date)}</span>
                </div>
            </div>
            <div class="transaction-value ${t.type}">
                ${t.type === 'expense' ? '-' : '+'}${formatCurrency(Math.abs(t.value))}
            </div>
            <button class="btn btn-ghost btn-icon delete-tx" data-id="${t.id}" title="Excluir">🗑️</button>
        </div>
    `).join('');

    // Bind delete buttons
    list.querySelectorAll('.delete-tx').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTransaction(btn.dataset.id);
        });
    });
}

function updateFinancialStats() {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.value), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.value), 0);
    const balance = income - expense;

    $('totalIncome').textContent = formatCurrency(income);
    $('totalExpense').textContent = formatCurrency(expense);
    $('totalBalance').textContent = formatCurrency(balance);

    const balEl = $('totalBalance');
    balEl.className = 'stat-value';
    if (balance > 0) balEl.classList.add('positive');
    else if (balance < 0) balEl.classList.add('negative');
    else balEl.classList.add('neutral');
}

async function saveTransaction() {
    const desc = $('txDesc').value.trim();
    const value = parseFloat($('txValue').value);
    const type = $('txType').value;
    const category = $('txCategory').value;
    const date = $('txDate').value || todayISO();

    if (!desc || isNaN(value) || value <= 0) {
        showToast('Preencha descrição e valor válido.', 'error');
        return;
    }

    showLoading();
    const { error } = await sb.from('transactions').insert({
        description: desc,
        value: value,
        type: type,
        category: category,
        date: date
    });

    if (error) {
        console.error('Save transaction error:', error);
        showToast('Erro ao salvar transação.', 'error');
        hideLoading();
        return;
    }

    // Reset form
    $('txDesc').value = '';
    $('txValue').value = '';
    $('txDate').value = todayISO();
    $('transactionForm').classList.remove('active');

    showToast('Transação salva!', 'success');
    await loadTransactions();
    hideLoading();
}

async function deleteTransaction(id) {
    if (!confirm('Excluir esta transação?')) return;
    showLoading();
    const { error } = await sb.from('transactions').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir.', 'error');
        hideLoading();
        return;
    }
    showToast('Transação excluída.', 'success');
    await loadTransactions();
    hideLoading();
}

// ============================================================
// BRIEFING — Agenda Items
// ============================================================

let agendaItems = [];

async function loadAgendaItems() {
    const { data, error } = await sb
        .from('agenda_items')
        .select('*')
        .eq('date', todayISO())
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Load agenda error:', error);
        return;
    }
    agendaItems = data || [];
    renderAgendaItems();
}

function renderAgendaItems() {
    const list = $('agendaList');
    const empty = $('agendaEmpty');

    if (agendaItems.length === 0) {
        list.innerHTML = '';
        list.appendChild(empty);
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';

    list.innerHTML = agendaItems.map(item => `
        <div class="checklist-item ${item.done ? 'done' : ''}" data-id="${item.id}">
            <div class="checklist-check">${item.done ? '✓' : ''}</div>
            <span class="checklist-text">${escapeHtml(item.text)}</span>
            <div class="checklist-actions">
                <button class="btn btn-ghost btn-icon delete-agenda" data-id="${item.id}" title="Excluir">🗑️</button>
            </div>
        </div>
    `).join('');

    // Toggle done
    list.querySelectorAll('.checklist-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.delete-agenda')) return;
            toggleAgendaItem(el.dataset.id);
        });
    });

    // Delete
    list.querySelectorAll('.delete-agenda').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteAgendaItem(btn.dataset.id);
        });
    });
}

async function addAgendaItem() {
    const text = $('agendaInput').value.trim();
    if (!text) return;

    const { error } = await sb.from('agenda_items').insert({
        text: text,
        date: todayISO()
    });

    if (error) {
        showToast('Erro ao adicionar item.', 'error');
        return;
    }

    $('agendaInput').value = '';
    showToast('Item adicionado!', 'success');
    await loadAgendaItems();
}

async function toggleAgendaItem(id) {
    const item = agendaItems.find(i => i.id === id);
    if (!item) return;

    const { error } = await sb
        .from('agenda_items')
        .update({ done: !item.done })
        .eq('id', id);

    if (error) {
        showToast('Erro ao atualizar.', 'error');
        return;
    }
    await loadAgendaItems();
}

async function deleteAgendaItem(id) {
    const { error } = await sb.from('agenda_items').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir.', 'error');
        return;
    }
    showToast('Item removido.', 'success');
    await loadAgendaItems();
}

// ============================================================
// BRIEFING — Pendências
// ============================================================

let pendencias = [];

async function loadPendencias() {
    const { data, error } = await sb
        .from('pendencias')
        .select('*')
        .order('done', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Load pendencias error:', error);
        return;
    }
    pendencias = data || [];
    renderPendencias();
}

function renderPendencias() {
    const list = $('pendenciaList');
    const empty = $('pendenciaEmpty');

    let filtered = pendencias;
    if (pendenciaFilter === 'pending') filtered = pendencias.filter(p => !p.done);
    if (pendenciaFilter === 'done') filtered = pendencias.filter(p => p.done);

    if (filtered.length === 0) {
        list.innerHTML = '';
        list.appendChild(empty);
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';

    list.innerHTML = filtered.map(p => `
        <div class="checklist-item ${p.done ? 'done' : ''}" data-id="${p.id}">
            <div class="checklist-check">${p.done ? '✓' : ''}</div>
            <div style="flex: 1; display: flex; align-items: center; gap: var(--space-sm);">
                <span class="checklist-text">${escapeHtml(p.text)}</span>
                <span class="priority-badge ${p.priority || 'normal'}">${p.priority || 'normal'}</span>
            </div>
            <div class="checklist-actions">
                <button class="btn btn-ghost btn-icon delete-pendencia" data-id="${p.id}" title="Excluir">🗑️</button>
            </div>
        </div>
    `).join('');

    // Toggle done
    list.querySelectorAll('.checklist-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.delete-pendencia')) return;
            togglePendencia(el.dataset.id);
        });
    });

    // Delete
    list.querySelectorAll('.delete-pendencia').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePendencia(btn.dataset.id);
        });
    });
}

async function addPendencia() {
    const text = $('pendenciaInput').value.trim();
    const priority = $('pendenciaPriority').value;
    if (!text) return;

    const { error } = await sb.from('pendencias').insert({
        text: text,
        priority: priority
    });

    if (error) {
        showToast('Erro ao adicionar pendência.', 'error');
        return;
    }

    $('pendenciaInput').value = '';
    showToast('Pendência adicionada!', 'success');
    await loadPendencias();
}

async function togglePendencia(id) {
    const item = pendencias.find(p => p.id === id);
    if (!item) return;

    const { error } = await sb
        .from('pendencias')
        .update({ done: !item.done })
        .eq('id', id);

    if (error) {
        showToast('Erro ao atualizar.', 'error');
        return;
    }
    await loadPendencias();
}

async function deletePendencia(id) {
    const { error } = await sb.from('pendencias').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir.', 'error');
        return;
    }
    showToast('Pendência removida.', 'success');
    await loadPendencias();
}

// ============================================================
// IDEIAS
// ============================================================

let ideas = [];

async function loadIdeas() {
    const { data, error } = await sb
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Load ideas error:', error);
        return;
    }
    ideas = data || [];
    renderIdeas();
    updateIdeaFilters();
}

function renderIdeas() {
    const grid = $('ideasGrid');
    const empty = $('ideasEmpty');

    let filtered = ideas;
    if (ideaTagFilter !== 'all') filtered = ideas.filter(i => i.tag === ideaTagFilter);

    if (filtered.length === 0) {
        grid.innerHTML = '';
        grid.appendChild(empty);
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';

    grid.innerHTML = filtered.map(idea => `
        <div class="card idea-card" data-id="${idea.id}">
            <div class="idea-actions">
                <button class="btn btn-ghost btn-icon delete-idea" data-id="${idea.id}" title="Excluir">🗑️</button>
            </div>
            <span class="idea-tag">${escapeHtml(idea.tag || 'geral')}</span>
            <p class="idea-text">${escapeHtml(idea.text)}</p>
            <div class="idea-date">${formatDate(idea.created_at?.split('T')[0])}</div>
        </div>
    `).join('');

    grid.querySelectorAll('.delete-idea').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteIdea(btn.dataset.id);
        });
    });
}

function updateIdeaFilters() {
    const tags = [...new Set(ideas.map(i => i.tag || 'geral'))];
    const container = $('ideaFilters');
    container.innerHTML = `<button class="filter-chip ${ideaTagFilter === 'all' ? 'active' : ''}" data-filter="all">Todas</button>`;
    tags.forEach(tag => {
        container.innerHTML += `<button class="filter-chip ${ideaTagFilter === tag ? 'active' : ''}" data-filter="${tag}">${tag}</button>`;
    });

    container.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            ideaTagFilter = chip.dataset.filter;
            container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderIdeas();
        });
    });
}

async function saveIdea() {
    const tag = $('ideaTag').value;
    const text = $('ideaText').value.trim();

    if (!text) {
        showToast('Escreva sua ideia.', 'error');
        return;
    }

    showLoading();
    const { error } = await sb.from('ideas').insert({ tag, text });

    if (error) {
        showToast('Erro ao salvar ideia.', 'error');
        hideLoading();
        return;
    }

    $('ideaText').value = '';
    $('ideaForm').classList.remove('active');
    showToast('Ideia salva!', 'success');
    await loadIdeas();
    hideLoading();
}

async function deleteIdea(id) {
    if (!confirm('Excluir esta ideia?')) return;
    showLoading();
    const { error } = await sb.from('ideas').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir.', 'error');
        hideLoading();
        return;
    }
    showToast('Ideia excluída.', 'success');
    await loadIdeas();
    hideLoading();
}

// ============================================================
// CHECKPOINTS
// ============================================================

let checkpoints = [];

async function loadCheckpoints() {
    const { data, error } = await sb
        .from('checkpoints')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Load checkpoints error:', error);
        return;
    }
    checkpoints = data || [];
    renderCheckpoints();
}

function renderCheckpoints() {
    const list = $('checkpointList');
    const empty = $('checkpointEmpty');

    if (checkpoints.length === 0) {
        list.innerHTML = '';
        list.appendChild(empty);
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';

    list.innerHTML = checkpoints.map(cp => `
        <div class="card checkpoint-card" data-id="${cp.id}">
            <div class="checkpoint-header">
                <span class="checkpoint-date">${formatDate(cp.date)}</span>
                <div style="display: flex; align-items: center; gap: var(--space-sm);">
                    <span class="checkpoint-mood">${moodEmojis[cp.mood] || '😐'}</span>
                    <button class="btn btn-ghost btn-icon delete-checkpoint" data-id="${cp.id}" title="Excluir">🗑️</button>
                </div>
            </div>
            <p class="checkpoint-text">${escapeHtml(cp.text)}</p>
        </div>
    `).join('');

    list.querySelectorAll('.delete-checkpoint').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteCheckpoint(btn.dataset.id);
        });
    });
}

async function saveCheckpoint() {
    const date = $('cpDate').value || todayISO();
    const mood = $('cpMood').value;
    const text = $('cpText').value.trim();

    if (!text) {
        showToast('Escreva o que aconteceu.', 'error');
        return;
    }

    showLoading();
    const { error } = await sb.from('checkpoints').insert({ date, mood, text });

    if (error) {
        showToast('Erro ao salvar checkpoint.', 'error');
        hideLoading();
        return;
    }

    $('cpText').value = '';
    $('checkpointForm').classList.remove('active');
    showToast('Checkpoint salvo!', 'success');
    await loadCheckpoints();
    hideLoading();
}

async function deleteCheckpoint(id) {
    if (!confirm('Excluir este checkpoint?')) return;
    showLoading();
    const { error } = await sb.from('checkpoints').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir.', 'error');
        hideLoading();
        return;
    }
    showToast('Checkpoint excluído.', 'success');
    await loadCheckpoints();
    hideLoading();
}

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    // Login
    $('loginForm').addEventListener('submit', handleLogin);
    $('logoutBtn').addEventListener('click', handleLogout);

    // Navigation
    setupNavigation();

    // ---- Financeiro ----
    $('toggleTransactionForm').addEventListener('click', () => {
        const form = $('transactionForm');
        form.classList.toggle('active');
        if (form.classList.contains('active')) {
            $('txDate').value = todayISO();
            $('txDesc').focus();
        }
    });
    $('cancelTransaction').addEventListener('click', () => {
        $('transactionForm').classList.remove('active');
    });
    $('saveTransaction').addEventListener('click', saveTransaction);

    // Transaction filters
    $('txFilters').addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        $('txFilters').querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        transactionFilter = chip.dataset.filter;
        renderTransactions();
    });

    // ---- Briefing: Agenda ----
    $('addAgendaBtn').addEventListener('click', addAgendaItem);
    $('agendaInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addAgendaItem();
    });

    // ---- Briefing: Pendências ----
    $('addPendenciaBtn').addEventListener('click', addPendencia);
    $('pendenciaInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPendencia();
    });

    // Pendencia filters
    $('pendenciaFilters').addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        $('pendenciaFilters').querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        pendenciaFilter = chip.dataset.filter;
        renderPendencias();
    });

    // ---- Ideias ----
    $('toggleIdeaForm').addEventListener('click', () => {
        const form = $('ideaForm');
        form.classList.toggle('active');
        if (form.classList.contains('active')) $('ideaText').focus();
    });
    $('cancelIdea').addEventListener('click', () => {
        $('ideaForm').classList.remove('active');
    });
    $('saveIdea').addEventListener('click', saveIdea);

    // ---- Checkpoint ----
    $('toggleCheckpointForm').addEventListener('click', () => {
        const form = $('checkpointForm');
        form.classList.toggle('active');
        if (form.classList.contains('active')) {
            $('cpDate').value = todayISO();
            $('cpText').focus();
        }
    });
    $('cancelCheckpoint').addEventListener('click', () => {
        $('checkpointForm').classList.remove('active');
    });
    $('saveCheckpoint').addEventListener('click', saveCheckpoint);

    // ---- Auth state change listener ----
    sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            currentUser = null;
            loginScreen.style.display = '';
            appContainer.classList.remove('active');
        } else if (event === 'TOKEN_REFRESHED' && session) {
            currentUser = session.user;
        }
    });
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkSession();
});
