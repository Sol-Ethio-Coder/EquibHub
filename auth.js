// Authentication management with enhanced security
let currentUser = null;
let sessionTimer = null;
let sessionEndTime = null;

function getCurrentUser() {
    const sessionData = sessionStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (sessionData) {
        try {
            const { user, expiresAt } = JSON.parse(sessionData);
            if (Date.now() < expiresAt) {
                currentUser = user;
                return currentUser;
            } else {
                clearCurrentUser();
                return null;
            }
        } catch (e) {
            return null;
        }
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
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
    if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = null;
    }
}

function startSessionTimer() {
    if (sessionTimer) clearInterval(sessionTimer);
    
    sessionTimer = setInterval(() => {
        if (sessionEndTime) {
            const remaining = Math.max(0, Math.floor((sessionEndTime - Date.now()) / 1000));
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            
            const timerElement = document.getElementById('timerCount');
            if (timerElement) {
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            if (remaining <= 0) {
                clearCurrentUser();
                if (document.getElementById('dashboard') && document.getElementById('dashboard').style.display !== 'none') {
                    const toast = document.getElementById('toast');
                    if (toast) {
                        toast.textContent = 'Session expired. Please login again.';
                        toast.style.background = '#f59e0b';
                        toast.classList.add('show');
                        setTimeout(() => toast.classList.remove('show'), 3000);
                    }
                    setTimeout(() => location.reload(), 2000);
                }
            }
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
    try {
        if (isAccountLocked(email)) {
            return { success: false, error: 'Account temporarily locked. Try again later.' };
        }
        
        const user = await authenticateUser(email, password);
        setCurrentUser(user);
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function signup(email, password, name) {
    if (!name || name.trim() === '') {
        return { success: false, error: 'Name is required' };
    }
    if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
        return { success: false, error: `Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters` };
    }
    
    try {
        const users = await getAllUsers();
        if (users.length >= CONFIG.MAX_MEMBERS) {
            return { success: false, error: `Maximum ${CONFIG.MAX_MEMBERS} members reached` };
        }
        
        const user = await createUser(email, password, name);
        setCurrentUser(user);
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function changeUserPassword(currentPassword, newPassword) {
    const user = getCurrentUser();
    if (!user) {
        return { success: false, error: 'Not logged in' };
    }
    
    try {
        await changePassword(user.id, currentPassword, newPassword);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function logout() {
    clearCurrentUser();
}

function isAuthenticated() {
    return getCurrentUser() !== null;
}

function hasBankDetails(user) {
    return user && (user.bankDetails?.accountNumber || user.bankDetails?.mobileMoneyId);
}

// Activity tracking for session reset
function setupActivityTracking() {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(event => {
        document.addEventListener(event, () => {
            if (isAuthenticated()) {
                resetSessionTimer();
            }
        });
    });
}

// Call this when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupActivityTracking);
} else {
    setupActivityTracking();
}