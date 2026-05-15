// auth.js - Authentication management

let currentUser = null;
let sessionTimer = null;
let sessionEndTime = null;

function getCurrentUser() {
    const sessionData = sessionStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (sessionData) {
        try {
            const { user, expiresAt } = JSON.parse(sessionData);
            if (Date.now() < expiresAt) { currentUser = user; return currentUser; }
            else { clearCurrentUser(); return null; }
        } catch(e) { return null; }
    }
    return null;
}

function setCurrentUser(user) {
    currentUser = user;
    const expiresAt = Date.now() + (CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000);
    sessionEndTime = expiresAt;
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify({ user, expiresAt }));
    startSessionTimer();
}

function clearCurrentUser() {
    currentUser = null;
    sessionEndTime = null;
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
    if (sessionTimer) { clearInterval(sessionTimer); sessionTimer = null; }
}

async function authenticateUser(email, password) {
    const users = await getAllUsers();
    const hashedInput = await hashPassword(password);
    const user = users.find(u => u.email === email && u.password === `hashed:${hashedInput}`);
    if (!user) throw new Error('Invalid credentials');
    // ✅ Fix: Check if user is active (not deactivated)
    if (user.isActive === false) throw new Error('Account is deactivated. Contact admin.');
    const { password: _, ...safeUser } = user;
    return safeUser;
}

function startSessionTimer() {
    if (sessionTimer) clearInterval(sessionTimer);
    sessionTimer = setInterval(() => {
        if (sessionEndTime) {
            const remaining = Math.max(0, Math.floor((sessionEndTime - Date.now()) / 1000));
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            const timerEl = document.getElementById('timerCount');
            if (timerEl) timerEl.textContent = `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
            if (remaining <= 0) { clearCurrentUser(); if (typeof showToast === 'function') showToast('Session expired. Please login again.', 'warning'); setTimeout(() => location.reload(), 1500); }
        }
    }, 1000);
}

function resetSessionTimer() {
    if (currentUser) {
        const expiresAt = Date.now() + (CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000);
        sessionEndTime = expiresAt;
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify({ user: currentUser, expiresAt }));
    }
}

async function login(email, password) {
    try { const user = await authenticateUser(email, password); setCurrentUser(user); return { success: true, user }; }
    catch (error) { return { success: false, error: error.message }; }
}

async function signup(email, password, name) {
    if (!name?.trim()) return { success: false, error: 'Name required' };
    if (password.length < CONFIG.MIN_PASSWORD_LENGTH) return { success: false, error: `Password must be ${CONFIG.MIN_PASSWORD_LENGTH}+ characters` };
    try { const user = await createUser(email, password, name); setCurrentUser(user); return { success: true, user }; }
    catch (error) { return { success: false, error: error.message }; }
}

async function changeUserPassword(currentPassword, newPassword) {
    const user = getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };
    try { await changePassword(user.id, currentPassword, newPassword); return { success: true }; }
    catch (error) { return { success: false, error: error.message }; }
}

function logout() { 
    clearCurrentUser(); 
    return true; 
}

function isAuthenticated() { return getCurrentUser() !== null; }
function hasBankDetails(user) { return user && (user.bankDetails?.accountNumber || user.bankDetails?.mobileMoneyId); }

// Activity tracking
document.addEventListener('DOMContentLoaded', () => {
    ['mousedown', 'keydown', 'touchstart', 'click', 'mousemove'].forEach(event => {
        document.addEventListener(event, () => { if (isAuthenticated()) resetSessionTimer(); });
    });
});

window.logout = logout;
window.clearCurrentUser = clearCurrentUser;