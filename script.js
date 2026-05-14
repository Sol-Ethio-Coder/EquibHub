// Main application logic with all enhanced features
let currentChart = null;
let currentView = 'overview';
let selectedScreenshotFile = null;
let initComplete = false;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    showLoading(true);
    
    try {
        await initDatabase();
        setupEventListeners();
        initTheme();
        initFab();
        checkAuthState();
        initComplete = true;
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize app. Please refresh the page.', 'error');
    } finally {
        // Hide loading after initialization
        setTimeout(() => {
            showLoading(false);
        }, 500);
    }
});

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    
    if (show) {
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
        // Safety timeout - force hide after 5 seconds
        setTimeout(() => {
            if (overlay.style.display === 'flex') {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 500);
            }
        }, 5000);
    } else {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
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
    document.getElementById('menuToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    // Theme toggles
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('mobileThemeToggle')?.addEventListener('click', toggleTheme);
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutMobileBtn')?.addEventListener('click', handleLogout);
    
    // Quick actions
    document.getElementById('quickContribute')?.addEventListener('click', () => openModal('contribute'));
    document.getElementById('quickWithdraw')?.addEventListener('click', () => openModal('withdraw'));
    
    // FAB actions
    document.getElementById('fabContribute')?.addEventListener('click', () => {
        closeFab();
        openModal('contribute');
    });
    document.getElementById('fabWithdraw')?.addEventListener('click', () => {
        closeFab();
        openModal('withdraw');
    });
    
    // Modal close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => closeAllModals());
    });
    
    // Upload area click
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
            if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect({ target: fileInput });
            } else {
                showToast('Please upload an image or PDF file', 'error');
            }
        });
    }
    
    // Confirm actions
    document.getElementById('confirmContribute')?.addEventListener('click', handleContribute);
    document.getElementById('confirmWithdraw')?.addEventListener('click', handleWithdraw);
    document.getElementById('saveBankDetails')?.addEventListener('click', handleSaveBankDetails);
    document.getElementById('changePasswordBtn')?.addEventListener('click', handleChangePassword);
    document.getElementById('extendSessionBtn')?.addEventListener('click', handleExtendSession);
    document.getElementById('exportAllDataBtn')?.addEventListener('click', handleExportAllData);
    document.getElementById('exportContributionsBtn')?.addEventListener('click', handleExportContributions);
    document.getElementById('dismissReminder')?.addEventListener('click', () => {
        document.getElementById('reminderCard').style.display = 'none';
    });
    
    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAllModals();
        });
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        updateThemeIcons('light');
    } else {
        updateThemeIcons('dark');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, isLight ? 'light' : 'dark');
    updateThemeIcons(isLight ? 'light' : 'dark');
}

function updateThemeIcons(mode) {
    const icons = document.querySelectorAll('.theme-toggle i, .theme-toggle-mobile i');
    icons.forEach(icon => {
        icon.className = mode === 'light' ? 'fas fa-sun' : 'fas fa-moon';
    });
}

function initFab() {
    const fabMain = document.getElementById('fabMain');
    if (fabMain) {
        fabMain.addEventListener('click', () => {
            document.querySelector('.quick-actions-fab').classList.toggle('open');
        });
    }
}

function closeFab() {
    document.querySelector('.quick-actions-fab')?.classList.remove('open');
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
        showToast('Please upload an image (JPG, PNG) or PDF file', 'error');
        return;
    }
    
    if (file.size > CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast(`File size must be less than ${CONFIG.MAX_FILE_SIZE_MB}MB`, 'error');
        return;
    }
    
    selectedScreenshotFile = file;
    
    // Show preview
    const preview = document.getElementById('uploadPreview');
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <div class="file-name">${file.name}</div>
            `;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = `
            <div class="file-name"><i class="fas fa-file-pdf"></i> ${file.name}</div>
        `;
        preview.style.display = 'block';
    }
}

function checkAuthState() {
    if (isAuthenticated()) {
        showDashboard();
        loadDashboardData();
        checkContributionReminder();
    } else {
        showAuth();
        renderAuthForm('login');
    }
}

async function checkContributionReminder() {
    const user = getCurrentUser();
    if (!user) return;
    
    const contributions = await getUserContributions(user.id);
    const currentRound = await getCurrentRound();
    const hasContributedThisRound = contributions.some(c => c.round === currentRound.roundNumber && c.amount > 0);
    
    if (!hasContributedThisRound && currentRound.status === 'active') {
        const reminderCard = document.getElementById('reminderCard');
        const reminderText = document.getElementById('reminderText');
        reminderText.textContent = `Round ${currentRound.roundNumber} is active. Please contribute $${CONFIG.DEFAULT_CONTRIBUTION} with payment proof.`;
        reminderCard.style.display = 'flex';
        
        if (CONFIG.ENABLE_NOTIFICATIONS && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
}

function renderAuthForm(mode) {
    const container = document.getElementById('formContainer');
    const isLogin = mode === 'login';
    
    container.innerHTML = `
        <div class="form-card">
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="authEmail" placeholder="you@example.com" autocomplete="email">
            </div>
            ${!isLogin ? `
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="authName" placeholder="Your name" autocomplete="name">
                </div>
            ` : ''}
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="authPassword" placeholder="••••••••" autocomplete="current-password">
            </div>
            ${!isLogin ? `
                <div class="form-group">
                    <label>Confirm Password</label>
                    <input type="password" id="authConfirmPassword" placeholder="Confirm password" autocomplete="new-password">
                </div>
                <div class="form-hint" style="margin-top: -0.5rem; margin-bottom: 1rem;">
                    Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters
                </div>
            ` : ''}
            <button class="btn-primary" id="submitAuthBtn">
                ${isLogin ? 'Login →' : 'Create Account ✨'}
            </button>
            <div id="authMessage" style="margin-top: 1rem; text-align: center;"></div>
        </div>
    `;
    
    document.getElementById('submitAuthBtn').addEventListener('click', async () => {
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
                showToast('Account created! Please add your bank details.', 'success');
                checkAuthState();
            } else {
                showAuthMessage(result.error, 'error');
            }
        }
    });
}

function showAuthMessage(msg, type) {
    const msgDiv = document.getElementById('authMessage');
    msgDiv.innerHTML = `<span style="color: ${type === 'error' ? '#ef4444' : '#10b981'}">${msg}</span>`;
    setTimeout(() => { if(msgDiv) msgDiv.innerHTML = ''; }, 3000);
}

function showDashboard() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
}

function showAuth() {
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

async function loadDashboardData() {
    const user = getCurrentUser();
    if (!user) return;
    
    document.getElementById('userName').innerText = user.name.split(' ')[0];
    document.getElementById('userBalance').innerText = `$${user.balance.toFixed(2)}`;
    
    const contributions = await getUserContributions(user.id);
    const totalContributions = contributions.filter(c => c.amount > 0).length;
    document.getElementById('userContributions').innerText = totalContributions;
    
    const currentRound = await getCurrentRound();
    document.getElementById('currentRound').innerText = currentRound.roundNumber;
    document.getElementById('totalRounds').innerText = CONFIG.TOTAL_ROUNDS;
    
    const nextRoundNum = currentRound.roundNumber + 1;
    document.getElementById('nextPayout').innerText = nextRoundNum <= CONFIG.TOTAL_ROUNDS ? `Round ${nextRoundNum}` : 'Complete';
    
    const allMembers = await getMemberSummary();
    const activeCount = allMembers.filter(m => m.status === 'active').length;
    document.getElementById('activeMembers').innerText = `${activeCount}/${CONFIG.MAX_MEMBERS}`;
    
    const progressPercent = (currentRound.roundNumber / CONFIG.TOTAL_ROUNDS) * 100;
    document.getElementById('roundProgressFill').style.width = `${progressPercent}%`;
    document.getElementById('progressStats').innerText = `Round ${currentRound.roundNumber} of ${CONFIG.TOTAL_ROUNDS}`;
    
    const milestonesContainer = document.getElementById('milestonesContainer');
    milestonesContainer.innerHTML = '';
    for (let i = 1; i <= CONFIG.TOTAL_ROUNDS; i++) {
        const isAchieved = totalContributions >= i;
        milestonesContainer.innerHTML += `
            <div class="milestone ${isAchieved ? 'achieved' : ''}">
                ${i === CONFIG.TOTAL_ROUNDS ? '🏆' : '💰'} Round ${i}
            </div>
        `;
    }
    
    await loadRecentTransactions();
    await loadMembersView();
    await loadContributionsView();
    await loadRoundsView();
    await loadAnalyticsView();
    await loadBankDetailsView();
}

async function loadRecentTransactions() {
    const user = getCurrentUser();
    const contributions = await getUserContributions(user.id);
    const recent = contributions.slice(-5).reverse();
    const container = document.getElementById('recentTransactions');
    
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
}

async function loadMembersView() {
    const members = await getMemberSummary();
    const container = document.getElementById('membersGrid');
    
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
}

async function loadContributionsView() {
    const contributions = await getAllContributions();
    const users = await getAllUsers();
    const userMap = {};
    users.forEach(u => userMap[u.id] = u.name);
    
    const sorted = contributions.filter(c => c.amount > 0).sort((a,b) => new Date(b.date) - new Date(a.date));
    const container = document.getElementById('contributionsTableBody');
    
    container.innerHTML = sorted.map(cont => `
        <tr>
            <td>${userMap[cont.userId] || 'Unknown'}</td>
            <td>$${cont.amount.toFixed(2)}</td>
            <td>${new Date(cont.date).toLocaleDateString()}</td>
            <td>Round ${cont.round}</td>
            <td>
                ${cont.screenshot ? 
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
}

window.viewProof = async function(contributionId) {
    const contribution = await getContributionById(contributionId);
    if (!contribution) return;
    
    const modal = document.getElementById('proofModal');
    const proofImage = document.getElementById('proofImage');
    const proofDetails = document.getElementById('proofDetails');
    
    if (contribution.screenshot && contribution.screenshot.startsWith('data:image')) {
        proofImage.innerHTML = `<img src="${contribution.screenshot}" alt="Payment Proof">`;
    } else if (contribution.screenshot) {
        proofImage.innerHTML = `<div><i class="fas fa-file-pdf" style="font-size: 3rem;"></i><p>PDF Document</p><a href="${contribution.screenshot}" download="payment_proof.pdf" class="btn-small">Download PDF</a></div>`;
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
};

async function loadRoundsView() {
    const rounds = await getAllRounds();
    const container = document.getElementById('roundsTimeline');
    const users = await getAllUsers();
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
            <div class="round-recipient">
                ${round.recipientId ? `Recipient: ${users.find(u => u.id === round.recipientId)?.name || 'TBD'}` : 'Awaiting distribution'}
            </div>
            <div>Total: $${(roundTotals[round.roundNumber] || 0).toFixed(2)}</div>
            <div class="round-status ${round.status}">${round.status.toUpperCase()}</div>
        </div>
    `).join('');
}

async function loadAnalyticsView() {
    const chartData = await getChartData();
    const ctx = document.getElementById('savingsChart').getContext('2d');
    
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
                legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') } }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') } },
                x: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') } }
            }
        }
    });
    
    const contributions = await getAllContributions();
    const totalCollected = contributions.filter(c => c.amount > 0 && c.status === 'verified').reduce((sum, c) => sum + c.amount, 0);
    const pendingAmount = contributions.filter(c => c.amount > 0 && c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
    const members = await getMemberSummary();
    const avgPerMember = totalCollected / members.length;
    const completionRate = (members.filter(m => m.roundsPaid === CONFIG.TOTAL_ROUNDS).length / members.length) * 100;
    
    document.getElementById('statsSummary').innerHTML = `
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
            <div class="stat-card">
                <div class="stat-info">
                    <span class="stat-label">Completion Rate</span>
                    <span class="stat-value">${completionRate.toFixed(0)}%</span>
                </div>
            </div>
        </div>
    `;
}

async function loadBankDetailsView() {
    const user = getCurrentUser();
    if (!user) return;
    
    document.getElementById('bankAccountName').value = user.bankDetails?.accountName || '';
    document.getElementById('bankName').value = user.bankDetails?.bankName || '';
    document.getElementById('bankAccountNumber').value = user.bankDetails?.accountNumber ? '••••' + user.bankDetails.accountNumber.slice(-4) : '';
    document.getElementById('bankRoutingNumber').value = user.bankDetails?.routingNumber ? '••••' : '';
    document.getElementById('mobileMoneyId').value = user.bankDetails?.mobileMoneyId || '';
}

async function handleSaveBankDetails() {
    const user = getCurrentUser();
    const bankDetails = {
        accountName: document.getElementById('bankAccountName').value,
        bankName: document.getElementById('bankName').value,
        accountNumber: document.getElementById('bankAccountNumber').value,
        routingNumber: document.getElementById('bankRoutingNumber').value,
        mobileMoneyId: document.getElementById('mobileMoneyId').value
    };
    
    if (!bankDetails.accountNumber && !bankDetails.mobileMoneyId) {
        showToast('Please provide either a bank account number or mobile money ID', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const updatedUser = await updateBankDetails(user.id, bankDetails);
        setCurrentUser(updatedUser);
        showToast('Bank details saved securely!', 'success');
        
        const statusDiv = document.getElementById('bankStatus');
        statusDiv.innerHTML = '<span class="success">✓ Bank details saved securely</span>';
        setTimeout(() => statusDiv.innerHTML = '', 3000);
        showLoading(false);
    } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
    }
}

async function handleChangePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
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
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
    } else {
        showToast(result.error, 'error');
    }
}

function handleExtendSession() {
    resetSessionTimer();
    showToast('Session extended by 30 minutes', 'success');
}

async function handleExportAllData() {
    const user = getCurrentUser();
    showLoading(true);
    const data = await exportUserData(user.id);
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equib_my_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showLoading(false);
    showToast('Data exported successfully!', 'success');
}

async function handleExportContributions() {
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
    a.download = `equib_contributions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showLoading(false);
    showToast('Contributions exported!', 'success');
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`${view}View`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.view === view) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function openModal(type) {
    if (type === 'contribute') {
        selectedScreenshotFile = null;
        document.getElementById('paymentScreenshot').value = '';
        document.getElementById('uploadPreview').style.display = 'none';
        document.getElementById('contributeAmount').value = CONFIG.DEFAULT_CONTRIBUTION;
        document.getElementById('transactionRef').value = '';
        document.getElementById('uploadPreview').innerHTML = '';
    } else if (type === 'withdraw') {
        const user = getCurrentUser();
        document.getElementById('withdrawBalance').innerText = `$${user.balance.toFixed(2)}`;
        document.getElementById('withdrawAmount').value = user.balance;
    }
    
    const modalId = type === 'contribute' ? 'contributeModal' : 'withdrawModal';
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
}

async function handleContribute() {
    const amount = parseFloat(document.getElementById('contributeAmount').value);
    const transactionRef = document.getElementById('transactionRef').value;
    
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
    
    try {
        showLoading(true);
        const screenshotBase64 = await fileToBase64(selectedScreenshotFile);
        await addContribution(user.id, amount, currentRound.roundNumber, screenshotBase64, transactionRef);
        showToast(`Contribution of $${amount} submitted! Awaiting verification.`, 'success');
        closeAllModals();
        await loadDashboardData();
        showLoading(false);
        
        selectedScreenshotFile = null;
        document.getElementById('paymentScreenshot').value = '';
        document.getElementById('uploadPreview').style.display = 'none';
        document.getElementById('contributeAmount').value = CONFIG.DEFAULT_CONTRIBUTION;
        document.getElementById('transactionRef').value = '';
    } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
    }
}

async function handleWithdraw() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
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
    
    try {
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

async function handleLogout() {
    showLoading(true);
    logout();
    showToast('Logged out securely', 'info');
    setTimeout(() => {
        showLoading(false);
        checkAuthState();
    }, 500);
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Add this to your existing script.js file

// Ripple effect for all buttons
function addRippleEffect() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .toggle-btn, .action-card, .nav-item, .stat-card, .member-card');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255,255,255,0.5);
                width: 10px;
                height: 10px;
                left: ${x}px;
                top: ${y}px;
                transform: scale(0);
                animation: rippleAnim 0.6s linear;
                pointer-events: none;
            `;
            
            // Add animation keyframes if not exists
            if (!document.querySelector('#ripple-style')) {
                const style = document.createElement('style');
                style.id = 'ripple-style';
                style.textContent = `
                    @keyframes rippleAnim {
                        to {
                            transform: scale(20);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Initialize ripple effect
document.addEventListener('DOMContentLoaded', addRippleEffect);

// Add to script.js - Ensure switchView handles admin view
const originalSwitchView = switchView;
window.switchView = function(view) {
    if (view === 'admin') {
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        let adminView = document.getElementById('adminView');
        if (!adminView) {
            adminView = document.createElement('div');
            adminView.id = 'adminView';
            adminView.className = 'view-panel';
            document.querySelector('.main-content').appendChild(adminView);
        }
        adminView.classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === 'admin') {
                item.classList.add('active');
            }
        });
        
        adminManager.renderAdminPanel();
    } else if (originalSwitchView) {
        originalSwitchView(view);
    }
};

// Add this to script.js for footer dynamic content
function updateFooterYear() {
    const yearElement = document.querySelector('.footer-bottom p');
    if (yearElement) {
        const currentYear = new Date().getFullYear();
        yearElement.innerHTML = yearElement.innerHTML.replace(/\d{4}/, currentYear);
    }
}

// Call this when DOM is loaded
document.addEventListener('DOMContentLoaded', updateFooterYear);
