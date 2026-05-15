// database.js - Cloud-synced database with localStorage fallback

let syncInProgress = false;

// ============================================
// CLOUD SYNC FUNCTIONS - FIXED
// ============================================

async function syncToJSONBin(data) {
    if (syncInProgress) return false;
    syncInProgress = true;
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': CONFIG.JSONBIN_API_KEY
            },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            console.log('✅ Data synced to cloud');
            return true;
        } else {
            const errorText = await response.text();
            console.error('Sync failed:', errorText);
            throw new Error(`Sync failed: ${response.status}`);
        }
    } catch (error) {
        console.error('Sync error:', error);
        throw error;
    } finally {
        syncInProgress = false;
    }
}

async function loadFromJSONBin() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.JSONBIN_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': CONFIG.JSONBIN_API_KEY }
        });
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Data loaded from cloud');
            return data.record;
        } else {
            console.error('Load failed:', response.status);
            return null;
        }
    } catch (error) {
        console.error('Load error:', error);
        return null;
    }
}

async function syncAllToCloud() {
    console.log('Starting cloud sync...');
    const users = getStorageData(CONFIG.STORAGE_KEYS.USERS);
    const contributions = getStorageData('equibhub_contributions');
    const rounds = getStorageData('equibhub_rounds');
    const withdrawals = getStorageData('equibhub_withdrawals') || [];
    
    const data = { users, contributions, rounds, withdrawals };
    const result = await syncToJSONBin(data);
    if (result) {
        console.log('Sync completed successfully');
    }
    return result;
}

// Make sync function globally available
window.syncAllToCloud = syncAllToCloud;

// ============================================
// HELPER FUNCTIONS
// ============================================

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

function getStorageData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function setStorageData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    // Auto-sync important changes to cloud (with debounce)
    if (key === CONFIG.STORAGE_KEYS.USERS || key === 'equibhub_contributions') {
        clearTimeout(window._syncTimeout);
        window._syncTimeout = setTimeout(() => {
            syncAllToCloud().catch(console.error);
        }, 2000);
    }
}

// ============================================
// INITIALIZATION
// ============================================

async function initDatabase() {
    console.log('Initializing database...');
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.USERS)) {
        setStorageData(CONFIG.STORAGE_KEYS.USERS, []);
    }
    if (!localStorage.getItem('equibhub_contributions')) {
        setStorageData('equibhub_contributions', []);
    }
    if (!localStorage.getItem('equibhub_rounds')) {
        await initRounds();
    }
    if (!localStorage.getItem('equibhub_withdrawals')) {
        setStorageData('equibhub_withdrawals', []);
    }
    
    // Try to load from cloud
    try {
        const cloudData = await loadFromJSONBin();
        if (cloudData) {
            if (cloudData.users && cloudData.users.length) {
                setStorageData(CONFIG.STORAGE_KEYS.USERS, cloudData.users);
            }
            if (cloudData.contributions && cloudData.contributions.length) {
                setStorageData('equibhub_contributions', cloudData.contributions);
            }
            if (cloudData.rounds && cloudData.rounds.length) {
                setStorageData('equibhub_rounds', cloudData.rounds);
            }
            if (cloudData.withdrawals && cloudData.withdrawals.length) {
                setStorageData('equibhub_withdrawals', cloudData.withdrawals);
            }
            console.log('Loaded data from cloud backup');
        }
    } catch (error) {
        console.warn('Could not load from cloud, using local data');
    }
    
    return true;
}

// ============================================
// USER FUNCTIONS
// ============================================

async function createUser(email, password, name) {
    const users = await getAllUsers();
    if (users.find(u => u.email === email)) throw new Error('Email already exists');
    if (users.length >= CONFIG.MAX_MEMBERS) throw new Error(`Maximum ${CONFIG.MAX_MEMBERS} members reached`);
    if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`);
    }
    const hashedPassword = await hashPassword(password);
    const newUser = {
        id: Date.now().toString(),
        email, password: `hashed:${hashedPassword}`, name,
        balance: 0, totalContributed: 0,
        createdAt: new Date().toISOString(),
        role: users.length === 0 ? 'admin' : 'member',
        bankDetails: { accountName: '', bankName: '', accountNumber: '', routingNumber: '', mobileMoneyId: '' },
        isActive: true,
        lastActive: new Date().toISOString()
    };
    users.push(newUser);
    setStorageData(CONFIG.STORAGE_KEYS.USERS, users);
    if (users.length === 1) await initRounds();
    const { password: _, ...safeUser } = newUser;
    return safeUser;
}

async function getAllUsers() { return getStorageData(CONFIG.STORAGE_KEYS.USERS); }

async function authenticateUser(email, password) {
    const users = await getAllUsers();
    const hashedInput = await hashPassword(password);
    const user = users.find(u => u.email === email && u.password === `hashed:${hashedInput}`);
    if (!user) throw new Error('Invalid credentials');
    if (!user.isActive) throw new Error('Account is deactivated. Contact admin.');
    const { password: _, ...safeUser } = user;
    return safeUser;
}

async function updateUser(user) {
    const users = await getAllUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) { 
        users[index] = user; 
        setStorageData(CONFIG.STORAGE_KEYS.USERS, users); 
    }
}

async function getUserById(id) {
    const users = await getAllUsers();
    const user = users.find(u => u.id === id);
    if (user) { 
        const { password, ...safeUser } = user; 
        return safeUser; 
    }
    return null;
}

async function updateBankDetails(userId, bankDetails) {
    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);
    if (user) { 
        user.bankDetails = bankDetails; 
        await updateUser(user); 
        const { password, ...safeUser } = user; 
        return safeUser; 
    }
    throw new Error('User not found');
}

async function changePassword(userId, currentPassword, newPassword) {
    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    const hashedCurrent = await hashPassword(currentPassword);
    if (user.password !== `hashed:${hashedCurrent}`) throw new Error('Current password is incorrect');
    if (newPassword.length < CONFIG.MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`);
    user.password = `hashed:${await hashPassword(newPassword)}`;
    await updateUser(user);
    return true;
}

// ============================================
// ADMIN FUNCTIONS - SECURITY
// ============================================

async function deactivateUser(userId, adminId) {
    const admin = await getUserById(adminId);
    if (!admin || admin.role !== 'admin') throw new Error('Admin access required');
    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);
    if (user && user.role !== 'admin') {
        user.isActive = false;
        await updateUser(user);
        return true;
    }
    throw new Error('Cannot deactivate admin user');
}

async function activateUser(userId, adminId) {
    const admin = await getUserById(adminId);
    if (!admin || admin.role !== 'admin') throw new Error('Admin access required');
    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        user.isActive = true;
        await updateUser(user);
        return true;
    }
    throw new Error('User not found');
}

async function getSystemStats(adminId) {
    const admin = await getUserById(adminId);
    if (!admin || admin.role !== 'admin') throw new Error('Admin access required');
    
    const users = await getAllUsers();
    const contributions = await getAllContributions();
    const withdrawals = getStorageData('equibhub_withdrawals') || [];
    
    return {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive !== false).length,
        totalContributions: contributions.filter(c => c.amount > 0).length,
        totalAmount: contributions.filter(c => c.amount > 0 && c.status === 'verified').reduce((s, c) => s + c.amount, 0),
        pendingAmount: contributions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0),
        totalWithdrawals: withdrawals.reduce((s, w) => s + w.amount, 0),
        admins: users.filter(u => u.role === 'admin').length
    };
}

// ============================================
// CONTRIBUTION FUNCTIONS
// ============================================

async function addContribution(userId, amount, round, screenshotFile, transactionRef = '') {
    if (!screenshotFile) throw new Error('Payment screenshot is required');
    let screenshotURL = '';
    if (typeof compressAndUpload === 'function') {
        try { screenshotURL = await compressAndUpload(screenshotFile); }
        catch { screenshotURL = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result); reader.readAsDataURL(screenshotFile); }); }
    } else {
        screenshotURL = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result); reader.readAsDataURL(screenshotFile); });
    }
    const contributions = getStorageData('equibhub_contributions');
    const contribution = { id: Date.now().toString(), userId, amount, round, date: new Date().toISOString(), status: 'pending', screenshotURL, transactionRef: transactionRef || '' };
    contributions.push(contribution);
    setStorageData('equibhub_contributions', contributions);
    const user = await getUserById(userId);
    if (user) { const users = await getAllUsers(); const fullUser = users.find(u => u.id === userId); if (fullUser) { fullUser.balance += amount; fullUser.totalContributed += amount; await updateUser(fullUser); } }
    return contribution;
}

async function getContributionById(id) { const c = getStorageData('equibhub_contributions'); return c.find(c => c.id === id); }
async function getUserContributions(userId) { const c = getStorageData('equibhub_contributions'); return c.filter(c => c.userId === userId); }
async function getAllContributions() { return getStorageData('equibhub_contributions'); }
async function verifyContribution(contributionId, adminId) {
    const admin = await getUserById(adminId);
    if (!admin || admin.role !== 'admin') throw new Error('Admin access required');
    const contributions = getStorageData('equibhub_contributions');
    const index = contributions.findIndex(c => c.id === contributionId);
    if (index !== -1) { contributions[index].status = 'verified'; contributions[index].verifiedBy = adminId; contributions[index].verifiedAt = new Date().toISOString(); setStorageData('equibhub_contributions', contributions); return contributions[index]; }
    throw new Error('Contribution not found');
}
async function getPendingContributions() { const c = await getAllContributions(); return c.filter(c => c.status === 'pending' && c.amount > 0); }

// ============================================
// ROUND FUNCTIONS
// ============================================

async function initRounds() {
    const rounds = [];
    for (let i = 1; i <= CONFIG.TOTAL_ROUNDS; i++) rounds.push({ roundNumber: i, status: i === 1 ? 'active' : 'upcoming', recipientId: null, totalAmount: 0, completedAt: null });
    setStorageData('equibhub_rounds', rounds);
}
async function getAllRounds() { let r = getStorageData('equibhub_rounds'); if (!r || r.length === 0) { await initRounds(); r = getStorageData('equibhub_rounds'); } return r; }
async function getCurrentRound() { const r = await getAllRounds(); return r.find(r => r.status === 'active') || r[0]; }
async function updateRound(round) { const rounds = await getAllRounds(); const i = rounds.findIndex(r => r.roundNumber === round.roundNumber); if (i !== -1) { rounds[i] = round; setStorageData('equibhub_rounds', rounds); } }

// ============================================
// WITHDRAWAL FUNCTIONS
// ============================================

async function withdrawFunds(userId, amount) {
    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.balance < amount) throw new Error('Insufficient balance');
    if (!user.bankDetails?.accountNumber && !user.bankDetails?.mobileMoneyId) throw new Error('Please add your bank account details before withdrawing');
    
    const users = await getAllUsers();
    const fullUser = users.find(u => u.id === userId);
    fullUser.balance -= amount;
    await updateUser(fullUser);
    
    const withdrawals = getStorageData('equibhub_withdrawals') || [];
    withdrawals.push({ id: Date.now().toString(), userId, amount, date: new Date().toISOString(), status: 'processed' });
    setStorageData('equibhub_withdrawals', withdrawals);
    return { success: true, newBalance: fullUser.balance };
}

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

async function getMemberSummary() {
    const users = await getAllUsers();
    const contributions = await getAllContributions();
    return users.map(user => {
        const uc = contributions.filter(c => c.userId === user.id && c.amount > 0);
        const totalPaid = uc.reduce((s, c) => s + c.amount, 0);
        return { 
            id: user.id, name: user.name, email: user.email, balance: user.balance, 
            totalPaid, roundsPaid: uc.length, 
            pendingContributions: uc.filter(c => c.status === 'pending').length,
            hasBankDetails: !!(user.bankDetails?.accountNumber || user.bankDetails?.mobileMoneyId),
            status: uc.length >= CONFIG.TOTAL_ROUNDS ? 'complete' : 'active',
            isActive: user.isActive !== false
        };
    });
}

async function getChartData() {
    const contributions = await getAllContributions();
    const verified = contributions.filter(c => c.amount > 0 && c.status === 'verified');
    const totals = {};
    for (let i = 1; i <= CONFIG.TOTAL_ROUNDS; i++) totals[i] = 0;
    verified.forEach(c => { if (totals[c.round] !== undefined) totals[c.round] += c.amount; });
    return { labels: Array.from({ length: CONFIG.TOTAL_ROUNDS }, (_, i) => `Round ${i + 1}`), data: Object.values(totals) };
}

async function exportUserData(userId) {
    const user = await getUserById(userId);
    const contributions = await getUserContributions(userId);
    const withdrawals = getStorageData('equibhub_withdrawals') || [];
    const userWithdrawals = withdrawals.filter(w => w.userId === userId);
    return { 
        user: { name: user.name, email: user.email, balance: user.balance, totalContributed: user.totalContributed, createdAt: user.createdAt },
        contributions: contributions.map(c => ({ amount: c.amount, round: c.round, date: c.date, status: c.status, transactionRef: c.transactionRef })),
        withdrawals: userWithdrawals
    };
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = reject; });
}

async function manualSync() {
    const toast = document.getElementById('toast');
    if (toast) { toast.textContent = 'Syncing to cloud...'; toast.style.background = '#3b82f6'; toast.classList.add('show'); }
    try {
        await syncAllToCloud();
        if (toast) { toast.textContent = 'Sync complete!'; toast.style.background = '#10b981'; setTimeout(() => toast.classList.remove('show'), 2000); }
    } catch (error) {
        if (toast) { toast.textContent = 'Sync failed: ' + error.message; toast.style.background = '#ef4444'; setTimeout(() => toast.classList.remove('show'), 3000); }
    }
}

window.manualSync = manualSync;