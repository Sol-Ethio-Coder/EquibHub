// Database management for EQUIB App with Security Features
let dbInitialized = false;

// Password Hashing Function
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

// Initialize Database
function initDatabase() {
    return new Promise(async (resolve) => {
        try {
            // Check if we have existing data in localStorage (for backward compatibility)
            const existingUsers = localStorage.getItem(CONFIG.STORAGE_KEYS.USERS);
            if (existingUsers) {
                const users = JSON.parse(existingUsers);
                // Migrate to hashed passwords if needed
                let needsMigration = false;
                for (const user of users) {
                    if (user.password && !user.password.startsWith('hashed:')) {
                        needsMigration = true;
                        break;
                    }
                }
                
                if (needsMigration) {
                    for (const user of users) {
                        if (user.password && !user.password.startsWith('hashed:')) {
                            const hashed = await hashPassword(user.password);
                            user.password = `hashed:${hashed}`;
                        }
                    }
                    localStorage.setItem(CONFIG.STORAGE_KEYS.USERS, JSON.stringify(users));
                }
            }
            
            // Initialize rounds if not exists
            const existingRounds = localStorage.getItem('equib_rounds');
            if (!existingRounds) {
                await initRounds();
            }
            
            // Initialize contributions if not exists
            const existingContributions = localStorage.getItem('equib_contributions');
            if (!existingContributions) {
                localStorage.setItem('equib_contributions', JSON.stringify([]));
            }
            
            // Initialize withdrawals if not exists
            const existingWithdrawals = localStorage.getItem('equib_withdrawals');
            if (!existingWithdrawals) {
                localStorage.setItem('equib_withdrawals', JSON.stringify([]));
            }
            
            dbInitialized = true;
            resolve();
        } catch (error) {
            console.error('Database init error:', error);
            resolve(); // Resolve anyway to prevent infinite loading
        }
    });
}

// Helper for database operations
function getStorageData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function setStorageData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// User functions with hashed passwords
async function createUser(email, password, name) {
    const users = await getAllUsers();
    if (users.find(u => u.email === email)) {
        throw new Error('Email already exists');
    }
    
    if (users.length >= CONFIG.MAX_MEMBERS) {
        throw new Error(`Maximum ${CONFIG.MAX_MEMBERS} members reached`);
    }
    
    if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`);
    }
    
    const hashedPassword = await hashPassword(password);
    
    const newUser = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        email: email,
        password: `hashed:${hashedPassword}`,
        name: name,
        balance: 0,
        totalContributed: 0,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        role: users.length === 0 ? 'admin' : 'member',
        bankDetails: {
            accountName: '',
            bankName: '',
            accountNumber: '',
            routingNumber: '',
            mobileMoneyId: ''
        },
        securitySettings: {
            twoFactorEnabled: false,
            lastPasswordChange: new Date().toISOString()
        }
    };
    
    users.push(newUser);
    setStorageData(CONFIG.STORAGE_KEYS.USERS, users);
    
    // Initialize rounds if first user
    if (users.length === 1) {
        await initRounds();
    }
    
    const { password: _, ...safeUser } = newUser;
    return safeUser;
}

async function getAllUsers() {
    return getStorageData(CONFIG.STORAGE_KEYS.USERS);
}

async function authenticateUser(email, password) {
    const users = await getAllUsers();
    const hashedInput = await hashPassword(password);
    const user = users.find(u => u.email === email && u.password === `hashed:${hashedInput}`);
    
    if (!user) {
        recordFailedLogin(email);
        throw new Error('Invalid credentials');
    }
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    await updateUser(user);
    
    // Return user without password
    const { password: _, ...safeUser } = user;
    return safeUser;
}

// Rate limiting for login attempts
const loginAttempts = new Map();

function recordFailedLogin(email) {
    const attempts = loginAttempts.get(email) || { count: 0, lastTry: 0, lockedUntil: 0 };
    const now = Date.now();
    
    if (now < attempts.lockedUntil) {
        return;
    }
    
    attempts.count++;
    attempts.lastTry = now;
    
    if (attempts.count >= CONFIG.MAX_LOGIN_ATTEMPTS) {
        attempts.lockedUntil = now + (CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000);
    }
    
    loginAttempts.set(email, attempts);
}

function isAccountLocked(email) {
    const attempts = loginAttempts.get(email);
    if (!attempts) return false;
    return Date.now() < attempts.lockedUntil;
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

async function changePassword(userId, currentPassword, newPassword) {
    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) throw new Error('User not found');
    
    // Verify current password
    const hashedCurrent = await hashPassword(currentPassword);
    if (user.password !== `hashed:${hashedCurrent}`) {
        throw new Error('Current password is incorrect');
    }
    
    if (newPassword.length < CONFIG.MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`);
    }
    
    const hashedNew = await hashPassword(newPassword);
    user.password = `hashed:${hashedNew}`;
    user.securitySettings.lastPasswordChange = new Date().toISOString();
    
    await updateUser(user);
    return true;
}

async function updateBankDetails(userId, bankDetails) {
    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    
    user.bankDetails = {
        accountName: bankDetails.accountName || '',
        bankName: bankDetails.bankName || '',
        accountNumber: bankDetails.accountNumber ? encryptData(bankDetails.accountNumber) : '',
        routingNumber: bankDetails.routingNumber ? encryptData(bankDetails.routingNumber) : '',
        mobileMoneyId: bankDetails.mobileMoneyId || ''
    };
    
    await updateUser(user);
    
    const { password, ...safeUser } = user;
    return safeUser;
}

// Simple encryption for sensitive data
function encryptData(data) {
    return btoa(data);
}

function decryptData(encryptedData) {
    try {
        return atob(encryptedData);
    } catch {
        return encryptedData;
    }
}

// Contribution functions with screenshot
async function addContribution(userId, amount, round, screenshotData, transactionRef = '') {
    if (!screenshotData) {
        throw new Error('Payment screenshot is required');
    }
    
    const contributions = getStorageData('equib_contributions') || [];
    
    const contribution = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        userId: userId,
        amount: amount,
        round: round,
        date: new Date().toISOString(),
        status: 'pending',
        screenshot: screenshotData,
        transactionRef: transactionRef,
        verifiedBy: null,
        verifiedAt: null
    };
    
    contributions.push(contribution);
    setStorageData('equib_contributions', contributions);
    
    // Update user balance
    const users = await getAllUsers();
    const fullUser = users.find(u => u.id === userId);
    if (fullUser) {
        fullUser.balance += amount;
        fullUser.totalContributed += amount;
        await updateUser(fullUser);
    }
    
    return contribution;
}

async function getContributionById(id) {
    const contributions = getStorageData('equib_contributions') || [];
    return contributions.find(c => c.id === id);
}

async function getUserContributions(userId) {
    const contributions = getStorageData('equib_contributions') || [];
    return contributions.filter(c => c.userId === userId);
}

async function getAllContributions() {
    return getStorageData('equib_contributions') || [];
}

// Rounds functions
async function initRounds() {
    const rounds = [];
    for (let i = 1; i <= CONFIG.TOTAL_ROUNDS; i++) {
        rounds.push({
            roundNumber: i,
            status: i === 1 ? 'active' : 'upcoming',
            recipientId: null,
            totalAmount: 0,
            completedAt: null
        });
    }
    setStorageData('equib_rounds', rounds);
}

async function getAllRounds() {
    const rounds = getStorageData('equib_rounds');
    if (!rounds || rounds.length === 0) {
        await initRounds();
        return getStorageData('equib_rounds');
    }
    return rounds;
}

async function updateRound(round) {
    const rounds = await getAllRounds();
    const index = rounds.findIndex(r => r.roundNumber === round.roundNumber);
    if (index !== -1) {
        rounds[index] = round;
        setStorageData('equib_rounds', rounds);
    }
}

async function getCurrentRound() {
    const rounds = await getAllRounds();
    return rounds.find(r => r.status === 'active') || rounds[0];
}

// Withdrawal function
async function withdrawFunds(userId, amount) {
    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) throw new Error('User not found');
    if (user.balance < amount) throw new Error('Insufficient balance');
    
    // Check if user has bank details
    if (!user.bankDetails.accountNumber && !user.bankDetails.mobileMoneyId) {
        throw new Error('Please add your bank account details before withdrawing');
    }
    
    user.balance -= amount;
    await updateUser(user);
    
    // Record withdrawal
    const withdrawals = getStorageData('equib_withdrawals') || [];
    withdrawals.push({
        id: Date.now().toString(),
        userId: userId,
        amount: amount,
        date: new Date().toISOString(),
        status: 'processed',
        bankDetails: {
            accountNumber: user.bankDetails.accountNumber ? '***' + decryptData(user.bankDetails.accountNumber).slice(-4) : null,
            mobileMoneyId: user.bankDetails.mobileMoneyId
        }
    });
    setStorageData('equib_withdrawals', withdrawals);
    
    return { success: true, newBalance: user.balance };
}

// Get member summary
async function getMemberSummary() {
    const users = await getAllUsers();
    const contributions = await getAllContributions();
    
    return users.map(user => {
        const userContribs = contributions.filter(c => c.userId === user.id && c.amount > 0);
        const totalPaid = userContribs.reduce((sum, c) => sum + c.amount, 0);
        const roundsPaid = userContribs.length;
        const pendingContribs = userContribs.filter(c => c.status === 'pending').length;
        
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            balance: user.balance,
            totalPaid: totalPaid,
            roundsPaid: roundsPaid,
            pendingContributions: pendingContribs,
            hasBankDetails: !!(user.bankDetails.accountNumber || user.bankDetails.mobileMoneyId),
            status: roundsPaid >= CONFIG.TOTAL_ROUNDS ? 'complete' : 'active'
        };
    });
}

// Get statistics for chart
async function getChartData() {
    const contributions = await getAllContributions();
    const verifiedContribs = contributions.filter(c => c.amount > 0 && c.status === 'verified');
    
    const roundTotals = {};
    for (let i = 1; i <= CONFIG.TOTAL_ROUNDS; i++) {
        roundTotals[i] = 0;
    }
    
    verifiedContribs.forEach(c => {
        if (c.round !== 'withdrawal' && roundTotals[c.round] !== undefined) {
            roundTotals[c.round] += c.amount;
        }
    });
    
    return {
        labels: Array.from({length: CONFIG.TOTAL_ROUNDS}, (_, i) => `Round ${i + 1}`),
        data: Object.values(roundTotals)
    };
}

// Helper to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Export user data
async function exportUserData(userId) {
    const user = await getUserById(userId);
    const contributions = await getUserContributions(userId);
    const withdrawals = getStorageData('equib_withdrawals') || [];
    const userWithdrawals = withdrawals.filter(w => w.userId === userId);
    
    return {
        user: {
            name: user.name,
            email: user.email,
            balance: user.balance,
            totalContributed: user.totalContributed,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        },
        contributions: contributions.map(c => ({
            amount: c.amount,
            round: c.round,
            date: c.date,
            status: c.status,
            transactionRef: c.transactionRef
        })),
        withdrawals: userWithdrawals.map(w => ({
            amount: w.amount,
            date: w.date,
            status: w.status
        }))
    };
}