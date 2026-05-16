// Main application logic - WITH PAYMENT HISTORY

let currentChart = null;
let selectedScreenshotFile = null;
let appInitialized = false;

// Payment History Variables
let allPayments = [];
let currentPaymentPage = 1;
const paymentsPerPage = 10;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');
    showLoading(true);
    
    try {
        await initDatabase();
        console.log('Database initialized successfully');
        setupEventListeners();
        initTheme();
        initFab();
        checkAuthState();
        appInitialized = true;
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize app: ' + error.message, 'error');
    } finally {
        setTimeout(() => {
            showLoading(false);
        }, 1500);
    }
});

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    
    if (show) {
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
    } else {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

function setupEventListeners() {
    // Auth toggles
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderAuthForm(btn.dataset.mode);
        });
    });
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
    });
    
    // Mobile menu
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }
    
    // Theme toggles
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    const mobileThemeToggle = document.getElementById('mobileThemeToggle');
    if (mobileThemeToggle) {
        mobileThemeToggle.addEventListener('click', toggleTheme);
    }
    
    // Quick actions
    const quickContribute = document.getElementById('quickContribute');
    if (quickContribute) {
        quickContribute.addEventListener('click', () => openModal('contribute'));
    }
    
    const quickWithdraw = document.getElementById('quickWithdraw');
    if (quickWithdraw) {
        quickWithdraw.addEventListener('click', () => openModal('withdraw'));
    }
    
    // FAB buttons
    const fabContribute = document.getElementById('fabContribute');
    if (fabContribute) {
        fabContribute.addEventListener('click', () => {
            const fabContainer = document.querySelector('.quick-actions-fab');
            if (fabContainer) fabContainer.classList.remove('open');
            openModal('contribute');
        });
    }
    
    const fabWithdraw = document.getElementById('fabWithdraw');
    if (fabWithdraw) {
        fabWithdraw.addEventListener('click', () => {
            const fabContainer = document.querySelector('.quick-actions-fab');
            if (fabContainer) fabContainer.classList.remove('open');
            openModal('withdraw');
        });
    }
    
    // Modal close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => closeAllModals());
    });
    
    // Upload area
    const uploadArea = document.getElementById('uploadArea');
    const uploadButton = document.getElementById('uploadButton');
    const fileInput = document.getElementById('paymentScreenshot');
    
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput?.click());
    }
    if (uploadButton) {
        uploadButton.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput?.click();
        });
    }
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Drag and drop
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#3b82f6';
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = 'rgba(59,130,246,0.5)';
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'rgba(59,130,246,0.5)';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect({ target: fileInput });
            } else {
                showToast('Please upload an image file', 'error');
            }
        });
    }
    
    // Confirm actions
    const confirmContribute = document.getElementById('confirmContribute');
    if (confirmContribute) {
        confirmContribute.addEventListener('click', handleContribute);
    }
    
    const confirmWithdraw = document.getElementById('confirmWithdraw');
    if (confirmWithdraw) {
        confirmWithdraw.addEventListener('click', handleWithdraw);
    }
    
    const saveBankDetails = document.getElementById('saveBankDetails');
    if (saveBankDetails) {
        saveBankDetails.addEventListener('click', handleSaveBankDetails);
    }
    
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', handleChangePassword);
    }
    
    const extendSessionBtn = document.getElementById('extendSessionBtn');
    if (extendSessionBtn) {
        extendSessionBtn.addEventListener('click', () => {
            if (typeof resetSessionTimer === 'function') {
                resetSessionTimer();
                showToast('Session extended by 30 minutes', 'success');
            }
        });
    }
    
    const exportAllDataBtn = document.getElementById('exportAllDataBtn');
    if (exportAllDataBtn) {
        exportAllDataBtn.addEventListener('click', handleExportAllData);
    }
    
    const exportContributionsBtn = document.getElementById('exportContributionsBtn');
    if (exportContributionsBtn) {
        exportContributionsBtn.addEventListener('click', handleExportContributions);
    }
    
    // Logout buttons
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    const logoutMobileBtn = document.getElementById('logoutMobileBtn');
    if (logoutMobileBtn) {
        logoutMobileBtn.addEventListener('click', handleLogout);
    }
    
    // Sync button
    const syncBtn = document.querySelector('.sync-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async function() {
            showToast('Syncing to cloud...', 'info');
            try {
                if (typeof syncAllToCloud === 'function') {
                    await syncAllToCloud();
                    showToast('Sync completed successfully!', 'success');
                } else {
                    showToast('Sync function not available', 'error');
                }
            } catch (error) {
                console.error('Sync error:', error);
                showToast('Sync failed: ' + error.message, 'error');
            }
        });
    }
    
    // Dismiss reminder
    const dismissReminder = document.getElementById('dismissReminder');
    if (dismissReminder) {
        dismissReminder.addEventListener('click', () => {
            const reminderCard = document.getElementById('reminderCard');
            if (reminderCard) reminderCard.style.display = 'none';
        });
    }
    
    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAllModals();
        });
    });
}

function initTheme() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
    if (saved === 'light') {
        document.body.classList.add('light-mode');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, isLight ? 'light' : 'dark');
}

function initFab() {
    console.log('Initializing FAB...');
    const fabMain = document.getElementById('fabMain');
    const fabContainer = document.querySelector('.quick-actions-fab');
    
    if (fabMain) {
        fabMain.addEventListener('click', (e) => {
            e.stopPropagation();
            if (fabContainer) {
                fabContainer.classList.toggle('open');
            }
        });
    }
    
    document.addEventListener('click', (e) => {
        if (fabContainer && !fabContainer.contains(e.target)) {
            fabContainer.classList.remove('open');
        }
    });
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image (JPG, PNG)', 'error');
        return;
    }
    
    if (file.size > CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast(`File size must be less than ${CONFIG.MAX_FILE_SIZE_MB}MB`, 'error');
        return;
    }
    
    selectedScreenshotFile = file;
    
    const preview = document.getElementById('uploadPreview');
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = `
            <img src="${e.target.result}" alt="Preview" style="max-width:100%;max-height:150px;border-radius:8px">
            <div style="margin-top:5px;font-size:12px;color:#94a3b8">${file.name}</div>
        `;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function checkAuthState() {
    try {
        if (typeof isAuthenticated === 'function' && isAuthenticated()) {
            console.log('User is authenticated, showing dashboard');
            showDashboard();
            loadDashboardData();
        } else {
            console.log('User not authenticated, showing auth screen');
            showAuth();
            renderAuthForm('login');
        }
    } catch (error) {
        console.error('Auth state check error:', error);
        showAuth();
        renderAuthForm('login');
    }
}

function renderAuthForm(mode) {
    const container = document.getElementById('formContainer');
    if (!container) return;
    
    const isLogin = mode === 'login';
    container.innerHTML = `
        <div class="form-card">
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="authEmail" placeholder="you@example.com">
            </div>
            ${!isLogin ? `
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="authName" placeholder="Your name">
                </div>
            ` : ''}
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="authPassword" placeholder="••••••••">
            </div>
            ${!isLogin ? `
                <div class="form-group">
                    <label>Confirm Password</label>
                    <input type="password" id="authConfirmPassword" placeholder="Confirm password">
                </div>
                <div class="form-hint" style="margin-top:-0.5rem;margin-bottom:1rem;font-size:0.7rem;color:#64748b">
                    Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters
                </div>
            ` : ''}
            <button class="btn-primary" id="submitAuthBtn">
                ${isLogin ? 'Login →' : 'Create Account ✨'}
            </button>
            <div id="authMessage" style="margin-top:1rem;text-align:center"></div>
        </div>
    `;
    
    const submitBtn = document.getElementById('submitAuthBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value;
            
            if (isLogin) {
                showLoading(true);
                const result = await login(email, password);
                showLoading(false);
                if (result.success) {
                    showToast('Login successful!', 'success');
                    checkAuthState();
                } else {
                    showAuthMessage(result.error, 'error');
                }
            } else {
                const name = document.getElementById('authName').value.trim();
                const confirm = document.getElementById('authConfirmPassword').value;
                if (password !== confirm) {
                    showAuthMessage('Passwords do not match', 'error');
                    return;
                }
                showLoading(true);
                const result = await signup(email, password, name);
                showLoading(false);
                if (result.success) {
                    showToast('Account created!', 'success');
                    checkAuthState();
                } else {
                    showAuthMessage(result.error, 'error');
                }
            }
        });
    }
}

function showAuthMessage(msg, type) {
    const msgDiv = document.getElementById('authMessage');
    if (msgDiv) {
        msgDiv.innerHTML = `<span style="color: ${type === 'error' ? '#ef4444' : '#10b981'}">${msg}</span>`;
        setTimeout(() => { if(msgDiv) msgDiv.innerHTML = ''; }, 3000);
    }
}

function showDashboard() {
    const authSection = document.getElementById('authSection');
    const dashboard = document.getElementById('dashboard');
    if (authSection) authSection.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
}

function showAuth() {
    const authSection = document.getElementById('authSection');
    const dashboard = document.getElementById('dashboard');
    if (authSection) authSection.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
}

async function loadDashboardData() {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        // Update user info
        const userNameSpan = document.getElementById('userName');
        if (userNameSpan) userNameSpan.innerText = user.name.split(' ')[0];
        
        const userBalanceSpan = document.getElementById('userBalance');
        if (userBalanceSpan) userBalanceSpan.innerText = `$${user.balance.toFixed(2)}`;
        
        const contributions = await getUserContributions(user.id);
        const totalContributions = contributions.filter(c => c.amount > 0).length;
        const userContributionsSpan = document.getElementById('userContributions');
        if (userContributionsSpan) userContributionsSpan.innerText = totalContributions;
        
        const currentRound = await getCurrentRound();
        const currentRoundSpan = document.getElementById('currentRound');
        const totalRoundsSpan = document.getElementById('totalRounds');
        if (currentRoundSpan) currentRoundSpan.innerText = currentRound.roundNumber;
        if (totalRoundsSpan) totalRoundsSpan.innerText = CONFIG.TOTAL_ROUNDS;
        
        const nextRoundNum = currentRound.roundNumber + 1;
        const nextPayoutSpan = document.getElementById('nextPayout');
        if (nextPayoutSpan) {
            nextPayoutSpan.innerText = nextRoundNum <= CONFIG.TOTAL_ROUNDS ? `Round ${nextRoundNum}` : 'Complete';
        }
        
        const allMembers = await getMemberSummary();
        const activeCount = allMembers.filter(m => m.status === 'active').length;
        const activeMembersSpan = document.getElementById('activeMembers');
        if (activeMembersSpan) activeMembersSpan.innerText = `${activeCount}/${CONFIG.MAX_MEMBERS}`;
        
        // Update progress tracker
        const progressPercent = (currentRound.roundNumber / CONFIG.TOTAL_ROUNDS) * 100;
        const roundProgressFill = document.getElementById('roundProgressFill');
        if (roundProgressFill) roundProgressFill.style.width = `${progressPercent}%`;
        
        const progressStatsSpan = document.getElementById('progressStats');
        if (progressStatsSpan) progressStatsSpan.innerText = `Round ${currentRound.roundNumber} of ${CONFIG.TOTAL_ROUNDS}`;
        
        // Update milestones
        const milestonesContainer = document.getElementById('milestonesContainer');
        if (milestonesContainer) {
            milestonesContainer.innerHTML = '';
            for (let i = 1; i <= CONFIG.TOTAL_ROUNDS; i++) {
                const isAchieved = totalContributions >= i;
                milestonesContainer.innerHTML += `
                    <div class="milestone ${isAchieved ? 'achieved' : ''}">
                        ${i === CONFIG.TOTAL_ROUNDS ? '🏆' : '💰'} Round ${i}
                    </div>
                `;
            }
        }
        
        await loadRecentTransactions();
        await loadMembersView();
        await loadContributionsView();
        await loadRoundsView();
        await loadAnalyticsView();
        await loadBankDetailsView();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error loading data: ' + error.message, 'error');
    }
}

// ============================================
// PAYMENT HISTORY FUNCTIONS
// ============================================

async function loadPaymentHistory() {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        // Get all contributions and withdrawals
        const contributions = await getUserContributions(user.id);
        const withdrawals = getStorageData('equibhub_withdrawals') || [];
        const userWithdrawals = withdrawals.filter(w => w.userId === user.id);
        
        // Combine and format payments
        allPayments = [];
        
        // Add contributions
        contributions.forEach(c => {
            if (c.amount > 0) {
                allPayments.push({
                    id: c.id,
                    date: c.date,
                    round: c.round,
                    type: 'contribution',
                    amount: c.amount,
                    status: c.status,
                    transactionRef: c.transactionRef || '',
                    screenshotURL: c.screenshotURL
                });
            }
        });
        
        // Add withdrawals
        userWithdrawals.forEach(w => {
            allPayments.push({
                id: w.id,
                date: w.date,
                round: 'Withdrawal',
                type: 'withdrawal',
                amount: w.amount,
                status: w.status || 'processed',
                transactionRef: '',
                screenshotURL: null
            });
        });
        
        // Sort by date (newest first)
        allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Update summary cards
        updatePaymentSummary(allPayments);
        
        // Setup payment history event listeners
        setupPaymentHistoryListeners();
        
        // Apply filters and render
        applyPaymentFilters();
        
    } catch (error) {
        console.error('Error loading payment history:', error);
        const tbody = document.getElementById('paymentHistoryBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Error loading payment history</td></tr>';
    }
}

function updatePaymentSummary(payments) {
    const totalPaid = payments.filter(p => p.type === 'contribution' && p.status === 'verified')
        .reduce((sum, p) => sum + p.amount, 0);
    
    const totalWithdrawn = payments.filter(p => p.type === 'withdrawal')
        .reduce((sum, p) => sum + p.amount, 0);
    
    const netBalance = totalPaid - totalWithdrawn;
    
    const verifiedCount = payments.filter(p => p.type === 'contribution' && p.status === 'verified').length;
    const totalContributions = payments.filter(p => p.type === 'contribution').length;
    const successRate = totalContributions > 0 ? (verifiedCount / totalContributions) * 100 : 0;
    
    const totalPaidEl = document.getElementById('totalPaidAmount');
    const totalWithdrawnEl = document.getElementById('totalWithdrawnAmount');
    const netBalanceEl = document.getElementById('netBalanceAmount');
    const successRateEl = document.getElementById('successRate');
    
    if (totalPaidEl) totalPaidEl.innerText = `$${totalPaid.toFixed(2)}`;
    if (totalWithdrawnEl) totalWithdrawnEl.innerText = `$${totalWithdrawn.toFixed(2)}`;
    if (netBalanceEl) netBalanceEl.innerText = `$${netBalance.toFixed(2)}`;
    if (successRateEl) successRateEl.innerText = `${successRate.toFixed(0)}%`;
}

function applyPaymentFilters() {
    const filterRound = document.getElementById('filterRound')?.value || 'all';
    const filterStatus = document.getElementById('filterStatus')?.value || 'all';
    const searchTerm = document.getElementById('searchTransaction')?.value.toLowerCase() || '';
    
    let filtered = [...allPayments];
    
    // Filter by round
    if (filterRound !== 'all') {
        filtered = filtered.filter(p => p.round == filterRound);
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
        filtered = filtered.filter(p => p.status === filterStatus);
    }
    
    // Search by transaction ref
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.transactionRef?.toLowerCase().includes(searchTerm)
        );
    }
    
    // Reset to first page when filters change
    currentPaymentPage = 1;
    
    // Render current page
    renderPaymentTable(filtered);
    updatePagination(filtered.length);
}

function renderPaymentTable(payments) {
    const tbody = document.getElementById('paymentHistoryBody');
    if (!tbody) return;
    
    const startIndex = (currentPaymentPage - 1) * paymentsPerPage;
    const endIndex = startIndex + paymentsPerPage;
    const pagePayments = payments.slice(startIndex, endIndex);
    
    if (pagePayments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No payment records found</td></tr>';
        return;
    }
    
    tbody.innerHTML = pagePayments.map(p => `
        <tr>
            <td>${new Date(p.date).toLocaleDateString()}<br><small>${new Date(p.date).toLocaleTimeString()}</small></td>
            <td>${p.round}</td>
            <td>
                <span class="payment-type ${p.type}">
                    <i class="fas ${p.type === 'contribution' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                    ${p.type === 'contribution' ? 'Contribution' : 'Withdrawal'}
                </span>
            </td>
            <td style="color: ${p.type === 'contribution' ? 'var(--success)' : 'var(--warning)'}; font-weight:600;">
                ${p.type === 'contribution' ? '+' : '-'}$${p.amount.toFixed(2)}
            </td>
            <td>
                <span class="payment-status ${p.status}">
                    <i class="fas ${p.status === 'verified' ? 'fa-check-circle' : p.status === 'pending' ? 'fa-clock' : 'fa-times-circle'}"></i>
                    ${p.status === 'verified' ? 'Verified' : p.status === 'pending' ? 'Pending' : p.status === 'processed' ? 'Processed' : 'Rejected'}
                </span>
            </td>
            <td>${p.transactionRef || '-'}</td>
            <td>
                ${p.screenshotURL ? 
                    `<a class="payment-proof-link" onclick="viewProof('${p.id}')">📷 View Proof</a>` : 
                    p.type === 'withdrawal' ? '✓ Processed' : '-'}
            </td>
        </tr>
    `).join('');
}

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / paymentsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (pageInfo) pageInfo.innerText = `Page ${currentPaymentPage} of ${totalPages || 1}`;
    if (prevBtn) prevBtn.disabled = currentPaymentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPaymentPage === totalPages || totalPages === 0;
}

function setupPaymentHistoryListeners() {
    const filterRound = document.getElementById('filterRound');
    const filterStatus = document.getElementById('filterStatus');
    const searchTransaction = document.getElementById('searchTransaction');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const exportBtn = document.getElementById('exportPaymentHistoryBtn');
    
    if (filterRound) {
        filterRound.removeEventListener('change', applyPaymentFilters);
        filterRound.addEventListener('change', () => {
            currentPaymentPage = 1;
            applyPaymentFilters();
        });
    }
    
    if (filterStatus) {
        filterStatus.removeEventListener('change', applyPaymentFilters);
        filterStatus.addEventListener('change', () => {
            currentPaymentPage = 1;
            applyPaymentFilters();
        });
    }
    
    if (searchTransaction) {
        searchTransaction.removeEventListener('input', applyPaymentFilters);
        searchTransaction.addEventListener('input', () => {
            currentPaymentPage = 1;
            applyPaymentFilters();
        });
    }
    
    if (prevPage) {
        prevPage.removeEventListener('click', handlePrevPage);
        prevPage.addEventListener('click', handlePrevPage);
    }
    
    if (nextPage) {
        nextPage.removeEventListener('click', handleNextPage);
        nextPage.addEventListener('click', handleNextPage);
    }
    
    if (exportBtn) {
        exportBtn.removeEventListener('click', exportPaymentHistory);
        exportBtn.addEventListener('click', exportPaymentHistory);
    }
}

function handlePrevPage() {
    if (currentPaymentPage > 1) {
        currentPaymentPage--;
        applyPaymentFilters();
    }
}

function handleNextPage() {
    currentPaymentPage++;
    applyPaymentFilters();
}

function exportPaymentHistory() {
    const filterRound = document.getElementById('filterRound')?.value || 'all';
    const filterStatus = document.getElementById('filterStatus')?.value || 'all';
    const searchTerm = document.getElementById('searchTransaction')?.value.toLowerCase() || '';
    
    let filtered = [...allPayments];
    
    if (filterRound !== 'all') {
        filtered = filtered.filter(p => p.round == filterRound);
    }
    if (filterStatus !== 'all') {
        filtered = filtered.filter(p => p.status === filterStatus);
    }
    if (searchTerm) {
        filtered = filtered.filter(p => p.transactionRef?.toLowerCase().includes(searchTerm));
    }
    
    // Create CSV
    let csv = 'Date,Round,Type,Amount,Status,Transaction Reference\n';
    filtered.forEach(p => {
        csv += `"${new Date(p.date).toLocaleString()}","${p.round}","${p.type}","${p.type === 'contribution' ? '+' : '-'}$${p.amount}","${p.status}","${p.transactionRef || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Payment history exported!', 'success');
}

// ============================================
// END PAYMENT HISTORY FUNCTIONS
// ============================================

async function loadRecentTransactions() {
    try {
        const user = getCurrentUser();
        const contributions = await getUserContributions(user.id);
        const recent = contributions.slice(-5).reverse();
        const container = document.getElementById('recentTransactions');
        
        if (!container) return;
        
        if (recent.length === 0) {
            container.innerHTML = '<div class="activity-item">No transactions yet</div>';
            return;
        }
        
        container.innerHTML = recent.map(tx => `
            <div class="activity-item">
                <div class="activity-type ${tx.amount > 0 ? 'contribute' : 'withdraw'}">
                    <i class="fas ${tx.amount > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                    <span>${tx.amount > 0 ? 'Contributed' : 'Withdrew'}</span>
                </div>
                <div>$${Math.abs(tx.amount).toFixed(2)}</div>
                <div>${new Date(tx.date).toLocaleDateString()}</div>
                ${tx.status === 'pending' ? '<span class="status-badge pending">Pending</span>' : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent transactions:', error);
    }
}

async function loadMembersView() {
    try {
        const members = await getMemberSummary();
        const container = document.getElementById('membersGrid');
        if (!container) return;
        
        container.innerHTML = members.map(member => `
            <div class="member-card">
                <div class="member-avatar">${member.name.charAt(0).toUpperCase()}</div>
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-stats">
                        <span>💰 $${member.totalPaid}</span>
                        <span>📦 ${member.roundsPaid}/${CONFIG.TOTAL_ROUNDS} rounds</span>
                        ${member.pendingContributions > 0 ? `<span>⏳ ${member.pendingContributions} pending</span>` : ''}
                    </div>
                </div>
                <div class="member-status">${member.status === 'active' ? 'Active' : 'Complete'}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading members view:', error);
    }
}

async function loadContributionsView() {
    try {
        const contributions = await getAllContributions();
        const users = await getAllUsers();
        const userMap = {};
        users.forEach(u => userMap[u.id] = u.name);
        
        const sorted = contributions.filter(c => c.amount > 0).sort((a,b) => new Date(b.date) - new Date(a.date));
        const container = document.getElementById('contributionsTableBody');
        if (!container) return;
        
        container.innerHTML = sorted.map(cont => `
            <tr>
                <td>${userMap[cont.userId] || 'Unknown'}</td>
                <td>$${cont.amount.toFixed(2)}</td>
                <td>${new Date(cont.date).toLocaleDateString()}</td>
                <td>Round ${cont.round}</td>
                <td>
                    ${cont.screenshotURL ? 
                        `<a class="proof-link" onclick="viewProof('${cont.id}')"><i class="fas fa-image"></i> View Proof</a>` : 
                        'No proof'}
                </td>
                <td>
                    <span class="status-badge ${cont.status === 'verified' ? 'verified' : 'pending'}">
                        ${cont.status === 'verified' ? '✓ Verified' : '⏳ Pending'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading contributions view:', error);
    }
}

window.viewProof = async function(contributionId) {
    try {
        const contribution = await getContributionById(contributionId);
        if (!contribution) return;
        
        const modal = document.getElementById('proofModal');
        const proofImage = document.getElementById('proofImage');
        const proofDetails = document.getElementById('proofDetails');
        
        if (!modal || !proofImage || !proofDetails) return;
        
        if (contribution.screenshotURL) {
            proofImage.innerHTML = `<img src="${contribution.screenshotURL}" alt="Payment Proof" style="max-width:100%;max-height:300px;border-radius:8px">`;
        } else {
            proofImage.innerHTML = '<p>No proof available</p>';
        }
        
        proofDetails.innerHTML = `
            <p><strong>Amount:</strong> $${contribution.amount}</p>
            <p><strong>Date:</strong> ${new Date(contribution.date).toLocaleString()}</p>
            <p><strong>Transaction Ref:</strong> ${contribution.transactionRef || 'N/A'}</p>
            <p><strong>Status:</strong> ${contribution.status}</p>
        `;
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Error viewing proof:', error);
        showToast('Error loading proof', 'error');
    }
};

async function loadRoundsView() {
    try {
        const rounds = await getAllRounds();
        const container = document.getElementById('roundsTimeline');
        if (!container) return;
        
        const contributions = await getAllContributions();
        const roundTotals = {};
        contributions.forEach(c => {
            if (c.amount > 0 && c.status === 'verified') {
                roundTotals[c.round] = (roundTotals[c.round] || 0) + c.amount;
            }
        });
        
        container.innerHTML = rounds.map(round => `
            <div class="round-item">
                <div class="round-number">Round ${round.roundNumber}</div>
                <div>Total: $${(roundTotals[round.roundNumber] || 0).toFixed(2)}</div>
                <div class="round-status ${round.status}">${round.status.toUpperCase()}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading rounds view:', error);
    }
}

async function loadAnalyticsView() {
    try {
        const chartData = await getChartData();
        const ctx = document.getElementById('savingsChart')?.getContext('2d');
        
        if (ctx) {
            if (currentChart) currentChart.destroy();
            
            currentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: 'Verified Contributions ($)',
                        data: chartData.data,
                        backgroundColor: 'rgba(59, 130, 246, 0.6)',
                        borderRadius: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { labels: { color: '#cbd5e1' } }
                    },
                    scales: {
                        y: { 
                            grid: { color: 'rgba(255,255,255,0.1)' }, 
                            ticks: { color: '#94a3b8' } 
                        },
                        x: { 
                            ticks: { color: '#94a3b8' } 
                        }
                    }
                }
            });
        }
        
        const contributions = await getAllContributions();
        const totalCollected = contributions.filter(c => c.amount > 0 && c.status === 'verified').reduce((sum, c) => sum + c.amount, 0);
        const pendingAmount = contributions.filter(c => c.amount > 0 && c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
        const members = await getMemberSummary();
        const avgPerMember = members.length > 0 ? totalCollected / members.length : 0;
        
        const statsSummary = document.getElementById('statsSummary');
        if (statsSummary) {
            statsSummary.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-info">
                            <span class="stat-label">Total Verified Pool</span>
                            <span class="stat-value">$${totalCollected.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info">
                            <span class="stat-label">Pending Verification</span>
                            <span class="stat-value">$${pendingAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info">
                            <span class="stat-label">Average per Member</span>
                            <span class="stat-value">$${avgPerMember.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading analytics view:', error);
    }
}

async function loadBankDetailsView() {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        const accountNameInput = document.getElementById('bankAccountName');
        const bankNameInput = document.getElementById('bankName');
        const accountNumberInput = document.getElementById('bankAccountNumber');
        const routingNumberInput = document.getElementById('bankRoutingNumber');
        const mobileMoneyInput = document.getElementById('mobileMoneyId');
        
        if (accountNameInput) accountNameInput.value = user.bankDetails?.accountName || '';
        if (bankNameInput) bankNameInput.value = user.bankDetails?.bankName || '';
        if (accountNumberInput) accountNumberInput.value = user.bankDetails?.accountNumber || '';
        if (routingNumberInput) routingNumberInput.value = user.bankDetails?.routingNumber || '';
        if (mobileMoneyInput) mobileMoneyInput.value = user.bankDetails?.mobileMoneyId || '';
    } catch (error) {
        console.error('Error loading bank details:', error);
    }
}

async function handleSaveBankDetails() {
    try {
        const user = getCurrentUser();
        const bankDetails = {
            accountName: document.getElementById('bankAccountName')?.value || '',
            bankName: document.getElementById('bankName')?.value || '',
            accountNumber: document.getElementById('bankAccountNumber')?.value || '',
            routingNumber: document.getElementById('bankRoutingNumber')?.value || '',
            mobileMoneyId: document.getElementById('mobileMoneyId')?.value || ''
        };
        
        if (!bankDetails.accountNumber && !bankDetails.mobileMoneyId) {
            showToast('Please provide either a bank account number or mobile money ID', 'error');
            return;
        }
        
        showLoading(true);
        const updatedUser = await updateBankDetails(user.id, bankDetails);
        setCurrentUser(updatedUser);
        showToast('Bank details saved successfully!', 'success');
        
        const bankStatus = document.getElementById('bankStatus');
        if (bankStatus) {
            bankStatus.innerHTML = '<span style="color:#10b981">✓ Bank details saved</span>';
            setTimeout(() => bankStatus.innerHTML = '', 3000);
        }
        showLoading(false);
    } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
    }
}

async function handleChangePassword() {
    try {
        const currentPassword = document.getElementById('currentPassword')?.value || '';
        const newPassword = document.getElementById('newPassword')?.value || '';
        const confirmPassword = document.getElementById('confirmNewPassword')?.value || '';
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Please fill all fields', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < CONFIG.MIN_PASSWORD_LENGTH) {
            showToast(`Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`, 'error');
            return;
        }
        
        showLoading(true);
        const result = await changeUserPassword(currentPassword, newPassword);
        showLoading(false);
        
        if (result.success) {
            showToast('Password changed successfully!', 'success');
            const currentPwdInput = document.getElementById('currentPassword');
            const newPwdInput = document.getElementById('newPassword');
            const confirmPwdInput = document.getElementById('confirmNewPassword');
            if (currentPwdInput) currentPwdInput.value = '';
            if (newPwdInput) newPwdInput.value = '';
            if (confirmPwdInput) confirmPwdInput.value = '';
        } else {
            showToast(result.error, 'error');
        }
    } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
    }
}

async function handleExportAllData() {
    try {
        const user = getCurrentUser();
        showLoading(true);
        const data = await exportUserData(user.id);
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `equibhub_my_data_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showLoading(false);
        showToast('Data exported successfully!', 'success');
    } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
    }
}

async function handleExportContributions() {
    try {
        showLoading(true);
        const contributions = await getAllContributions();
        const users = await getAllUsers();
        const userMap = {};
        users.forEach(u => userMap[u.id] = u.name);
        
        let csv = 'Date,Member,Amount,Round,Status,Transaction Reference\n';
        contributions.forEach(c => {
            if (c.amount > 0) {
                csv += `${new Date(c.date).toISOString()},${userMap[c.userId] || 'Unknown'},${c.amount},${c.round},${c.status},${c.transactionRef || ''}\n`;
            }
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `equibhub_contributions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        showLoading(false);
        showToast('Contributions exported!', 'success');
    } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
    }
}

// ============================================
// MAIN SWITCH VIEW FUNCTION - UPDATED
// ============================================

function switchView(view) {
    console.log('Switching to view:', view);
    
    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Show selected view
    const targetPanel = document.getElementById(`${view}View`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    } else {
        console.warn('View panel not found:', `${view}View`);
        // Fallback to overview
        const overviewPanel = document.getElementById('overviewView');
        if (overviewPanel) overviewPanel.classList.add('active');
    }
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.view === view) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Load view-specific data
    if (view === 'paymentHistory') {
        console.log('Loading payment history...');
        setTimeout(() => {
            loadPaymentHistory();
        }, 100);
    }
}

// ============================================
// END OF SWITCH VIEW FUNCTION
// ============================================

function openModal(type) {
    if (type === 'contribute') {
        selectedScreenshotFile = null;
        const fileInput = document.getElementById('paymentScreenshot');
        const preview = document.getElementById('uploadPreview');
        const amountInput = document.getElementById('contributeAmount');
        const refInput = document.getElementById('transactionRef');
        
        if (fileInput) fileInput.value = '';
        if (preview) {
            preview.style.display = 'none';
            preview.innerHTML = '';
        }
        if (amountInput) amountInput.value = CONFIG.DEFAULT_CONTRIBUTION;
        if (refInput) refInput.value = '';
    } else if (type === 'withdraw') {
        const user = getCurrentUser();
        const withdrawBalance = document.getElementById('withdrawBalance');
        const withdrawAmount = document.getElementById('withdrawAmount');
        if (withdrawBalance) withdrawBalance.innerText = `$${user.balance.toFixed(2)}`;
        if (withdrawAmount) withdrawAmount.value = user.balance;
    }
    
    const modal = document.getElementById(`${type}Modal`);
    if (modal) modal.classList.add('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
}

async function handleContribute() {
    try {
        const amount = parseFloat(document.getElementById('contributeAmount')?.value || 0);
        const transactionRef = document.getElementById('transactionRef')?.value || '';
        
        if (isNaN(amount) || amount < 10) {
            showToast('Please enter a valid amount (minimum $10)', 'error');
            return;
        }
        
        if (!selectedScreenshotFile) {
            showToast('Please upload a payment screenshot (mandatory)', 'error');
            return;
        }
        
        const user = getCurrentUser();
        const currentRound = await getCurrentRound();
        
        showLoading(true);
        await addContribution(user.id, amount, currentRound.roundNumber, selectedScreenshotFile, transactionRef);
        showToast(`Contribution of $${amount} submitted! Awaiting verification.`, 'success');
        closeAllModals();
        await loadDashboardData();
        showLoading(false);
        
        selectedScreenshotFile = null;
        const fileInput = document.getElementById('paymentScreenshot');
        const preview = document.getElementById('uploadPreview');
        if (fileInput) fileInput.value = '';
        if (preview) {
            preview.style.display = 'none';
            preview.innerHTML = '';
        }
    } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
    }
}

async function handleWithdraw() {
    try {
        const amount = parseFloat(document.getElementById('withdrawAmount')?.value || 0);
        const user = getCurrentUser();
        
        if (isNaN(amount) || amount < 10) {
            showToast('Please enter a valid amount', 'error');
            return;
        }
        
        if (amount > user.balance) {
            showToast('Insufficient balance', 'error');
            return;
        }
        
        if (!hasBankDetails(user)) {
            showToast('Please add your bank account details before withdrawing', 'error');
            closeAllModals();
            switchView('bankDetails');
            return;
        }
        
        showLoading(true);
        await withdrawFunds(user.id, amount);
        showToast(`Withdrawal of $${amount} initiated! Funds will be sent to your bank account.`, 'success');
        closeAllModals();
        await loadDashboardData();
        showLoading(false);
    } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
    }
}

// FIXED LOGOUT
async function handleLogout() {
    showLoading(true);
    try {
        if (typeof logout === 'function') {
            logout();
        }
        if (typeof clearCurrentUser === 'function') {
            clearCurrentUser();
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        showToast('Logged out successfully!', 'success');
        showLoading(false);
        location.reload();
    } catch (error) {
        console.error('Logout error:', error);
        showLoading(false);
        showToast('Error during logout. Please refresh the page.', 'error');
        setTimeout(() => location.reload(), 1000);
    }
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Make functions global
window.handleLogout = handleLogout;
window.viewProof = viewProof;
window.manualSync = manualSync;
window.switchView = switchView;

// Add to script.js - Session heartbeat to prevent unexpected logout

let heartbeatInterval = null;

function startSessionHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    
    heartbeatInterval = setInterval(() => {
        if (isAuthenticated()) {
            // Send heartbeat to keep session alive
            const user = getCurrentUser();
            if (user && typeof resetSessionTimer === 'function') {
                resetSessionTimer();
                console.log('💓 Session heartbeat sent');
            }
        }
    }, 5 * 60 * 1000); // Every 5 minutes
}

function stopSessionHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// Call this after login
function onUserLoggedIn() {
    startSessionHeartbeat();
}

// Call this after logout
function onUserLoggedOut() {
    stopSessionHeartbeat();
}

// Modify your existing checkAuthState or login success handler
// Add this line where user successfully logs in:
// onUserLoggedIn();