// auth.js - Authentication management with FIXED session handling

let currentUser = null;
let sessionTimer = null;
let sessionEndTime = null;
let lastActivityTime = Date.now();
let isRefreshing = false;

function getCurrentUser() {
    // Check if we're in the middle of a refresh
    if (isRefreshing) return currentUser;
    
    const sessionData = sessionStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (sessionData) {
        try {
            const { user, expiresAt } = JSON.parse(sessionData);
            if (Date.now() < expiresAt) {
                currentUser = user;
                return currentUser;
            } else {
                console.log('Session expired, clearing...');
                clearCurrentUser();
                return null;
            }
        } catch(e) { 
            return null;
        }
    }
    return null;
}

function setCurrentUser(user) {
    currentUser = user;
    lastActivityTime = Date.now();
    const expiresAt = Date.now() + (CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000);
    sessionEndTime = expiresAt;
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify({ user, expiresAt }));
    startSessionTimer();
}

function clearCurrentUser() {
    currentUser = null;
    sessionEndTime = null;
    lastActivityTime = Date.now();
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
                
                // Change color when less than 5 minutes remaining
                if (remaining < 300 && remaining > 60) {
                    timerElement.style.color = '#f59e0b';
                } else if (remaining <= 60) {
                    timerElement.style.color = '#ef4444';
                } else {
                    timerElement.style.color = '';
                }
            }
            
            // Auto-refresh session when less than 1 minute remaining
            if (remaining <= 60 && remaining > 0 && !isRefreshing) {
                console.log('Session expiring soon, auto-refreshing...');
                resetSessionTimer();
                if (timerElement) timerElement.style.color = '';
            }
            
            if (remaining <= 0) {
                console.log('Session expired, logging out...');
                clearCurrentUser();
                if (typeof showToast === 'function') {
                    showToast('Session expired. Please login again.', 'warning');
                }
                setTimeout(() => {
                    if (typeof checkAuthState === 'function') {
                        checkAuthState();
                    }
                    location.reload();
                }, 1500);
            }
        }
    }, 1000);
}

function resetSessionTimer() {
    if (currentUser && !isRefreshing) {
        isRefreshing = true;
        const expiresAt = Date.now() + (CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000);
        sessionEndTime = expiresAt;
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify({ user: currentUser, expiresAt }));
        lastActivityTime = Date.now();
        console.log('Session extended to:', new Date(expiresAt).toLocaleTimeString());
        setTimeout(() => { isRefreshing = false; }, 500);
    }
}

// Track user activity more aggressively
function trackUserActivity() {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityTime;
    
    // If more than 10 minutes of inactivity, check session
    if (timeSinceLastActivity > 10 * 60 * 1000) {
        const user = getCurrentUser();
        if (user) {
            console.log('User active after inactivity, resetting session');
            resetSessionTimer();
        }
    }
    lastActivityTime = now;
}

async function login(email, password) {
    try { 
        const user = await authenticateUser(email, password); 
        setCurrentUser(user); 
        return { success: true, user }; 
    }
    catch (error) { 
        return { success: false, error: error.message }; 
    }
}

async function signup(email, password, name, inviteCode = '') {
    if (!name?.trim()) return { success: false, error: 'Name required' };
    if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
        return { success: false, error: `Password must be ${CONFIG.MIN_PASSWORD_LENGTH}+ characters` };
    }
    try { 
        const user = await createUser(email, password, name, inviteCode); 
        setCurrentUser(user); 
        return { success: true, user }; 
    }
    catch (error) { 
        return { success: false, error: error.message }; 
    }
}

async function changeUserPassword(currentPassword, newPassword) {
    const user = getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };
    try { 
        await changePassword(user.id, currentPassword, newPassword); 
        return { success: true }; 
    }
    catch (error) { 
        return { success: false, error: error.message }; 
    }
}

function logout() { 
    clearCurrentUser(); 
    return true; 
}

function isAuthenticated() { 
    const user = getCurrentUser();
    return user !== null; 
}

function hasBankDetails(user) { 
    return user && (user.bankDetails?.accountNumber || user.bankDetails?.mobileMoneyId); 
}

// More robust activity tracking
function setupActivityTracking() {
    const events = ['mousedown', 'keydown', 'touchstart', 'click', 'mousemove', 'scroll', 'touchmove'];
    
    const activityHandler = () => {
        if (isAuthenticated()) {
            resetSessionTimer();
            trackUserActivity();
        }
    };
    
    events.forEach(event => {
        document.addEventListener(event, activityHandler);
    });
    
    // Also track visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && isAuthenticated()) {
            console.log('Tab became visible, checking session...');
            resetSessionTimer();
        }
    });
    
    // Track beforeunload to clean up
    window.addEventListener('beforeunload', () => {
        if (sessionTimer) {
            clearInterval(sessionTimer);
        }
    });
    
    console.log('Activity tracking enabled');
}

// Initialize activity tracking
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupActivityTracking);
} else {
    setupActivityTracking();
}

// Export functions for global use
window.logout = logout;
window.clearCurrentUser = clearCurrentUser;
window.resetSessionTimer = resetSessionTimer;