// admin-setup.js - Complete Admin Panel with User Management (Delete/Deactivate/Activate)

class AdminManager {
    constructor() { 
        this.isInitialized = false; 
        this.adminMenuItemAdded = false;
    }
    
    async init() { 
        if (this.isInitialized) return; 
        
        console.log('🔧 AdminManager initializing...');
        
        // Create pre-configured admin account on first load
        await this.createPreConfiguredAdmin();
        
        // Add admin menu item with multiple attempts
        await this.ensureAdminMenuItem();
        
        this.isInitialized = true; 
    }
    
    // Ensure admin menu item is added (with retries)
    async ensureAdminMenuItem() {
        // Try immediately
        await this.tryAddAdminMenuItem();
        
        // Try again after 1 second
        setTimeout(() => this.tryAddAdminMenuItem(), 1000);
        
        // Try again after 3 seconds
        setTimeout(() => this.tryAddAdminMenuItem(), 3000);
        
        // Try again after 5 seconds
        setTimeout(() => this.tryAddAdminMenuItem(), 5000);
    }
    
    async tryAddAdminMenuItem() {
        // Get current user
        let user = getCurrentUser();
        
        // If no user, try to get from storage
        if (!user) {
            const sessionData = sessionStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
            if (sessionData) {
                try {
                    const parsed = JSON.parse(sessionData);
                    user = parsed.user;
                } catch(e) {}
            }
        }
        
        console.log('🔍 Current user check:', user ? { email: user.email, role: user.role } : 'No user');
        
        // If user exists but is not admin, try to fix
        if (user && user.role !== 'admin') {
            console.log('⚠️ User is not admin, attempting to fix...');
            
            // Check if this is the first user
            const users = await getAllUsers();
            if (users.length > 0 && users[0].email === user.email) {
                // This is the first user, make them admin
                users[0].role = 'admin';
                users[0].isActive = true;
                setStorageData(CONFIG.STORAGE_KEYS.USERS, users);
                
                // Update session
                user.role = 'admin';
                setCurrentUser(user);
                
                console.log('✅ Fixed: First user is now admin');
            }
        }
        
        // Re-check user after potential fix
        user = getCurrentUser();
        
        // Only proceed if user is admin
        if (!user || user.role !== 'admin') {
            console.log('❌ User is not admin, skipping admin menu');
            return false;
        }
        
        // Find sidebar
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (!sidebarNav) {
            console.log('⚠️ Sidebar not found, will retry');
            return false;
        }
        
        // Check if already added
        if (document.querySelector('.nav-item[data-view="admin"]')) {
            console.log('✅ Admin menu already exists');
            return true;
        }
        
        // Create admin menu item
        const adminItem = document.createElement('button');
        adminItem.className = 'nav-item';
        adminItem.setAttribute('data-view', 'admin');
        adminItem.innerHTML = '<i class="fas fa-crown"></i><span>Admin Panel</span>';
        adminItem.style.borderTop = '1px solid rgba(255,255,255,0.1)';
        adminItem.style.marginTop = '1rem';
        adminItem.style.paddingTop = '1rem';
        
        // Add click handler
        adminItem.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('👑 Admin panel clicked');
            await this.renderAdminPanel();
            
            // Also update URL hash for direct access
            window.location.hash = '#admin';
        });
        
        sidebarNav.appendChild(adminItem);
        this.adminMenuItemAdded = true;
        console.log('✅ Admin menu item added successfully!');
        
        // If URL hash is #admin, open admin panel automatically
        if (window.location.hash === '#admin') {
            setTimeout(() => this.renderAdminPanel(), 500);
        }
        
        return true;
    }
    
    // Create pre-configured admin account automatically
    async createPreConfiguredAdmin() {
        try {
            const users = await getAllUsers();
            
            // If no users exist, create default admin
            if (users.length === 0) {
                console.log('📝 No users found. Creating pre-configured admin account...');
                
                const hashedPassword = await hashPassword('Admin123!');
                
                const adminUser = {
                    id: 'admin_' + Date.now(),
                    email: 'admin@equibhub.com',
                    password: `hashed:${hashedPassword}`,
                    name: 'System Administrator',
                    balance: 0,
                    totalContributed: 0,
                    createdAt: new Date().toISOString(),
                    lastLogin: null,
                    role: 'admin',
                    isActive: true,
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
                
                users.push(adminUser);
                setStorageData(CONFIG.STORAGE_KEYS.USERS, users);
                
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ PRE-CONFIGURED ADMIN ACCOUNT CREATED!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('📧 Email: admin@equibhub.com');
                console.log('🔑 Password: Admin123!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                await initRounds();
                return true;
            } 
            // If users exist but no admin, make first user admin
            else {
                const adminExists = users.some(u => u.role === 'admin');
                
                if (!adminExists && users.length > 0) {
                    console.log('📝 No admin found, promoting first user to admin...');
                    users[0].role = 'admin';
                    users[0].isActive = true;
                    setStorageData(CONFIG.STORAGE_KEYS.USERS, users);
                    console.log(`✅ First user promoted to admin: ${users[0].email}`);
                    
                    // Update current session if this is the logged-in user
                    const currentUser = getCurrentUser();
                    if (currentUser && currentUser.id === users[0].id) {
                        setCurrentUser(users[0]);
                        console.log('✅ Current session updated');
                    }
                }
                
                // Ensure all users have isActive property
                let needsUpdate = false;
                for (const user of users) {
                    if (user.isActive === undefined) {
                        user.isActive = true;
                        needsUpdate = true;
                    }
                }
                if (needsUpdate) {
                    setStorageData(CONFIG.STORAGE_KEYS.USERS, users);
                    console.log('✅ Fixed missing isActive property for existing users');
                }
                
                return false;
            }
        } catch (error) {
            console.error('Error creating pre-configured admin:', error);
            return false;
        }
    }
    
    async renderAdminPanel() {
        console.log('🎨 Rendering admin panel...');
        
        // Make sure we have the latest data
        const stats = await this.getStats();
        const pending = await this.getPendingContributions();
        const members = await getMemberSummary();
        const currentUser = getCurrentUser();
        
        // Get or create admin view panel
        let panel = document.getElementById('adminView');
        if (!panel) { 
            panel = document.createElement('div'); 
            panel.id = 'adminView'; 
            panel.className = 'view-panel'; 
            document.querySelector('.main-content').appendChild(panel); 
        }
        
        // Admin panel HTML
        panel.innerHTML = `
            <div class="admin-panel">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h2 style="margin: 0;"><i class="fas fa-crown"></i> Admin Dashboard</h2>
                    <button class="btn-secondary" onclick="adminManager.refreshAdminPanel()" style="padding: 0.5rem 1rem;">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-users"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Total Members</span>
                            <span class="stat-value">${stats.totalMembers}/${CONFIG.MAX_MEMBERS}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-clock"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Pending Verifications</span>
                            <span class="stat-value" id="pendingCount">${stats.pendingCount}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-dollar-sign"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Total Pool</span>
                            <span class="stat-value">$${stats.totalCollected}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Total Contributions</span>
                            <span class="stat-value">${stats.totalContributions || 0}</span>
                        </div>
                    </div>
                </div>
                
                <div class="admin-tabs" style="display: flex; gap: 0.8rem; margin-bottom: 1.5rem; flex-wrap: wrap; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <button class="admin-tab active" data-tab="pending">⏳ Pending (${stats.pendingCount})</button>
                    <button class="admin-tab" data-tab="members">👥 Members</button>
                    <button class="admin-tab" data-tab="admins">👑 Admins</button>
                    <button class="admin-tab" data-tab="security">🔒 Security</button>
                    <button class="admin-tab" data-tab="export">📥 Export</button>
                </div>
                
                <!-- Pending Tab -->
                <div id="pendingTab" class="admin-tab-content active">
                    <h3><i class="fas fa-clock"></i> Pending Verifications</h3>
                    ${pending.length === 0 ? 
                        '<div class="info-box"><i class="fas fa-check-circle"></i><p>No pending verifications. All caught up!</p></div>' : 
                        `<div class="pending-list">
                            ${pending.map(p => `
                                <div class="pending-item" style="background: var(--card-bg); border-radius: 1rem; padding: 1rem; margin-bottom: 0.8rem; border: 1px solid var(--border-color);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                                        <div>
                                            <strong style="font-size: 1.1rem;">${p.userName}</strong><br>
                                            <span style="color: var(--success);">💰 Amount: $${p.amount}</span><br>
                                            <span>🔄 Round: ${p.round}</span><br>
                                            <small>📅 ${new Date(p.date).toLocaleString()}</small><br>
                                            ${p.transactionRef ? `<small>📝 Ref: ${p.transactionRef}</small>` : ''}
                                        </div>
                                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                            <button class="btn-primary" style="background: #10b981; padding: 0.5rem 1rem;" onclick="adminManager.verifyContributionAndRefresh('${p.id}')">
                                                <i class="fas fa-check-circle"></i> Verify
                                            </button>
                                            <button class="btn-secondary" onclick="viewProof('${p.id}')">
                                                <i class="fas fa-image"></i> View Proof
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                </div>
                
                <!-- Members Tab with Delete/Deactivate/Activate -->
                <div id="membersTab" class="admin-tab-content">
                    <h3><i class="fas fa-users"></i> Member Management</h3>
                    <div class="members-list">
                        ${members.map(m => `
                            <div class="member-admin-card" style="background: var(--card-bg); border-radius: 1rem; padding: 1rem; margin-bottom: 0.8rem; border: 1px solid var(--border-color);">
                                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                                    <div>
                                        <strong>${m.name}</strong> ${!m.isActive ? '<span style="color:#ef4444">(Deactivated)</span>' : ''}<br>
                                        <small>${m.email}</small><br>
                                        <small>Role: ${m.role || 'member'} | Balance: $${m.balance} | Status: ${m.status}</small>
                                        <br><small>💰 Total Paid: $${m.totalPaid} | 📦 Rounds: ${m.roundsPaid}/${CONFIG.TOTAL_ROUNDS}</small>
                                    </div>
                                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                        ${m.role !== 'admin' ? 
                                            `<button class="btn-small" style="background: rgba(245,158,11,0.2); color: #f59e0b;" onclick="adminManager.makeAdmin('${m.id}')">
                                                <i class="fas fa-crown"></i> Make Admin
                                            </button>` : 
                                            '<span class="status-badge verified">Admin</span>'}
                                        
                                        ${m.role !== 'admin' ? 
                                            (m.isActive !== false ? 
                                                `<button class="btn-small" style="background: rgba(239,68,68,0.2); color: #ef4444;" onclick="adminManager.deactivateUser('${m.id}')">
                                                    <i class="fas fa-pause-circle"></i> Deactivate
                                                </button>` : 
                                                `<button class="btn-small" style="background: rgba(16,185,129,0.2); color: #10b981;" onclick="adminManager.activateUser('${m.id}')">
                                                    <i class="fas fa-play-circle"></i> Activate
                                                </button>`) : ''
                                        }
                                        
                                        <!-- Delete User Button -->
                                        ${m.id !== currentUser?.id ? `
                                            <button class="btn-small" style="background: rgba(239,68,68,0.2); color: #ef4444;" onclick="adminManager.deleteUser('${m.id}')">
                                                <i class="fas fa-trash-alt"></i> Delete
                                            </button>
                                        ` : '<span style="font-size: 0.7rem; color: #64748b; padding: 0.3rem 0.6rem;">(You)</span>'}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="info-box" style="margin-top: 1rem; background: rgba(239,68,68,0.1); border-left-color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                        <div>
                            <strong>⚠️ User Management Notes:</strong><br>
                            • <strong>Deactivate</strong> - Temporarily disables account (can be reactivated)<br>
                            • <strong>Delete</strong> - Permanently removes user and ALL data (cannot be undone!)<br>
                            • <strong>Make Admin</strong> - Grants administrative privileges
                        </div>
                    </div>
                </div>
                
                <!-- Admins Tab -->
                <div id="adminsTab" class="admin-tab-content">
                    <h3><i class="fas fa-user-plus"></i> Add New Admin</h3>
                    <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                        <input type="email" id="newAdminEmail" placeholder="Enter user email" style="flex: 1; padding: 0.8rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 0.8rem; color: var(--text-primary);">
                        <button class="btn-primary" onclick="adminManager.addAdminByEmail()">Make Admin</button>
                    </div>
                    <h3><i class="fas fa-crown"></i> Current Administrators</h3>
                    ${members.filter(m => m.role === 'admin').map(admin => `
                        <div class="member-admin-card" style="background: var(--card-bg); border-radius: 1rem; padding: 1rem; margin-bottom: 0.8rem; border: 1px solid var(--border-color);">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                                <div>
                                    <strong>${admin.name}</strong><br>
                                    <small>${admin.email}</small>
                                </div>
                                <div>
                                    ${members.filter(m => m.role === 'admin').length > 1 ? 
                                        `<button class="btn-small" style="background: rgba(239,68,68,0.2); color: #ef4444;" onclick="adminManager.removeAdmin('${admin.id}')">
                                            <i class="fas fa-user-minus"></i> Remove Admin
                                        </button>` : 
                                        '<span class="status-badge verified">Last Admin</span>'}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Security Tab -->
                <div id="securityTab" class="admin-tab-content">
                    <h3><i class="fas fa-shield-alt"></i> Security Settings</h3>
                    <div style="background: var(--card-bg); border-radius: 1rem; padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--border-color);">
                        <p><strong>📊 System Statistics:</strong></p>
                        <p>👥 Total Users: ${stats.totalMembers}</p>
                        <p>💰 Total Contributions: ${stats.totalContributions || 0}</p>
                        <p>💵 Total Collected: $${stats.totalCollected}</p>
                        <p>⏳ Pending Amount: $${stats.pendingAmount || 0}</p>
                        <p>👑 Administrators: ${members.filter(m => m.role === 'admin').length}</p>
                    </div>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button class="btn-secondary" onclick="adminManager.exportFullData()">📥 Export Full Data</button>
                        <button class="btn-secondary" onclick="adminManager.backupData()">💾 Backup to Cloud</button>
                    </div>
                </div>
                
                <!-- Export Tab -->
                <div id="exportTab" class="admin-tab-content">
                    <h3><i class="fas fa-download"></i> Export Data</h3>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem;">
                        <button class="btn-primary" onclick="adminManager.exportFullData()">📥 Export Full Data (JSON)</button>
                        <button class="btn-secondary" onclick="adminManager.exportMembersCSV()">👥 Export Members (CSV)</button>
                        <button class="btn-secondary" onclick="adminManager.exportContributionsCSV()">💰 Export Contributions (CSV)</button>
                    </div>
                    <div class="info-box">
                        <i class="fas fa-info-circle"></i>
                        <p>Exports include all user data, contributions, and system settings.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Add tab switching
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const contentDiv = document.getElementById(`${tabName}Tab`);
                if (contentDiv) contentDiv.classList.add('active');
            });
        });
        
        // Hide all other views and show admin panel
        document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));
        panel.classList.add('active');
        
        console.log('✅ Admin panel rendered successfully');
    }
    
    async refreshAdminPanel() {
        console.log('🔄 Refreshing admin panel...');
        await this.renderAdminPanel();
        showToast('Admin panel refreshed!', 'success');
    }
    
    async verifyContributionAndRefresh(contributionId) {
        await this.verify(contributionId);
        await this.refreshAdminPanel();
    }
    
    async getStats() { 
        const users = await getAllUsers(); 
        const contributions = await getAllContributions(); 
        const pending = contributions.filter(c => c.status === 'pending' && c.amount > 0); 
        const verified = contributions.filter(c => c.status === 'verified' && c.amount > 0);
        const pendingAmount = pending.reduce((s,c) => s + c.amount, 0);
        return { 
            totalMembers: users.length, 
            pendingCount: pending.length, 
            totalCollected: verified.reduce((s,c) => s + c.amount, 0).toFixed(2),
            pendingAmount: pendingAmount.toFixed(2),
            totalContributions: contributions.filter(c => c.amount > 0).length
        }; 
    }
    
    async getPendingContributions() { 
        const contributions = await getAllContributions(); 
        const users = await getAllUsers(); 
        const userMap = Object.fromEntries(users.map(u => [u.id, { name: u.name }])); 
        const pending = contributions.filter(c => c.status === 'pending' && c.amount > 0);
        return pending.map(c => ({ 
            id: c.id, 
            userName: userMap[c.userId]?.name || 'Unknown', 
            amount: c.amount, 
            round: c.round, 
            date: c.date,
            transactionRef: c.transactionRef
        })); 
    }
    
    async verify(id) { 
        const user = getCurrentUser(); 
        if (user.role !== 'admin') { showToast('Admin access required', 'error'); return; }
        await verifyContribution(id, user.id); 
        showToast('✅ Contribution verified!', 'success'); 
        if (typeof loadDashboardData === 'function') loadDashboardData(); 
    }
    
    async makeAdmin(userId) { 
        const currentUser = getCurrentUser();
        if (currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
        const users = await getAllUsers(); 
        const user = users.find(u => u.id === userId); 
        if (user) { 
            user.role = 'admin'; 
            user.isActive = true;
            await updateUser(user); 
            showToast(`${user.name} is now admin`, 'success'); 
            await this.refreshAdminPanel();
        } 
    }
    
    async removeAdmin(userId) {
        const currentUser = getCurrentUser();
        if (currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
        const users = await getAllUsers();
        const admins = users.filter(u => u.role === 'admin');
        if (admins.length <= 1) { showToast('Cannot remove the last admin', 'error'); return; }
        const user = users.find(u => u.id === userId);
        if (user && user.role === 'admin') {
            user.role = 'member';
            await updateUser(user);
            showToast(`${user.name} is no longer admin`, 'success');
            await this.refreshAdminPanel();
        }
    }
    
    async addAdminByEmail() {
        const emailInput = document.getElementById('newAdminEmail');
        const email = emailInput?.value.trim();
        if (!email) { showToast('Enter an email address', 'error'); return; }
        const users = await getAllUsers();
        const user = users.find(u => u.email === email);
        if (!user) { showToast('User not found', 'error'); return; }
        await this.makeAdmin(user.id);
        if (emailInput) emailInput.value = '';
    }
    
    async deactivateUser(userId) {
        const currentUser = getCurrentUser();
        if (currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
        const users = await getAllUsers();
        const user = users.find(u => u.id === userId);
        if (user && user.role !== 'admin') {
            user.isActive = false;
            await updateUser(user);
            showToast(`✅ ${user.name} has been deactivated`, 'success');
            await this.refreshAdminPanel();
        }
    }
    
    async activateUser(userId) {
        const currentUser = getCurrentUser();
        if (currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
        const users = await getAllUsers();
        const user = users.find(u => u.id === userId);
        if (user) {
            user.isActive = true;
            await updateUser(user);
            showToast(`✅ ${user.name} has been activated`, 'success');
            await this.refreshAdminPanel();
        }
    }
    
    // DELETE USER - Permanent removal with confirmation
    async deleteUser(userId) {
        const currentUser = getCurrentUser();
        
        // Check if admin
        if (currentUser.role !== 'admin') { 
            showToast('Admin access required', 'error'); 
            return false;
        }
        
        const users = await getAllUsers();
        const userToDelete = users.find(u => u.id === userId);
        
        if (!userToDelete) {
            showToast('User not found', 'error');
            return false;
        }
        
        // Don't allow deleting yourself
        if (currentUser.id === userId) {
            showToast('You cannot delete your own account!', 'error');
            return false;
        }
        
        // Don't allow deleting the last admin
        const admins = users.filter(u => u.role === 'admin');
        if (userToDelete.role === 'admin' && admins.length <= 1) {
            showToast('Cannot delete the last admin!', 'error');
            return false;
        }
        
        // Double confirmation for safety
        const confirmed = confirm(`⚠️ WARNING: You are about to permanently delete "${userToDelete.name}"!\n\nThis will remove:\n- All their contributions\n- Their balance ($${userToDelete.balance})\n- Their bank details\n- All transaction history\n\nThis action CANNOT be undone!\n\nClick OK to continue or Cancel to abort.`);
        
        if (!confirmed) return false;
        
        // Final confirmation with typing
        const finalConfirm = prompt(`Type "DELETE" to permanently delete ${userToDelete.name}:`);
        if (finalConfirm !== 'DELETE') {
            showToast('Deletion cancelled', 'info');
            return false;
        }
        
        try {
            // Remove user from users array
            const updatedUsers = users.filter(u => u.id !== userId);
            setStorageData(CONFIG.STORAGE_KEYS.USERS, updatedUsers);
            
            // Remove user's contributions
            const contributions = await getAllContributions();
            const updatedContributions = contributions.filter(c => c.userId !== userId);
            setStorageData('equibhub_contributions', updatedContributions);
            
            // Remove user's withdrawals
            const withdrawals = getStorageData('equibhub_withdrawals') || [];
            const updatedWithdrawals = withdrawals.filter(w => w.userId !== userId);
            setStorageData('equibhub_withdrawals', updatedWithdrawals);
            
            showToast(`✅ User "${userToDelete.name}" has been permanently deleted`, 'success');
            
            // Refresh admin panel
            await this.refreshAdminPanel();
            
            // Refresh dashboard data if needed
            if (typeof loadDashboardData === 'function') {
                await loadDashboardData();
            }
            
            return true;
            
        } catch (error) {
            console.error('Delete user error:', error);
            showToast('Error deleting user', 'error');
            return false;
        }
    }
    
    async exportFullData() {
        const currentUser = getCurrentUser();
        if (currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
        
        const users = await getAllUsers();
        const contributions = await getAllContributions();
        const rounds = await getAllRounds();
        const withdrawals = getStorageData('equibhub_withdrawals') || [];
        
        const data = { 
            users, contributions, rounds, withdrawals,
            exportedAt: new Date().toISOString(), 
            exportedBy: currentUser.name,
            systemInfo: {
                version: CONFIG.VERSION,
                maxMembers: CONFIG.MAX_MEMBERS,
                totalRounds: CONFIG.TOTAL_ROUNDS
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `equibhub_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported!', 'success');
    }
    
    async exportMembersCSV() {
        const members = await getMemberSummary();
        let csv = 'Name,Email,Role,Balance,Total Paid,Rounds Completed,Status,Is Active\n';
        members.forEach(m => { 
            csv += `"${m.name}","${m.email}","${m.role || 'member'}",${m.balance},${m.totalPaid},${m.roundsPaid},${m.status},${m.isActive !== false ? 'Yes' : 'No'}\n`; 
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `equibhub_members_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Members exported!', 'success');
    }
    
    async exportContributionsCSV() {
        const contributions = await getAllContributions();
        const users = await getAllUsers();
        const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
        let csv = 'Date,Member,Amount,Round,Status,Transaction Ref\n';
        contributions.forEach(c => { 
            if (c.amount > 0) csv += `${new Date(c.date).toISOString()},${userMap[c.userId] || 'Unknown'},${c.amount},${c.round},${c.status},${c.transactionRef || ''}\n`; 
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `equibhub_contributions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Contributions exported!', 'success');
    }
    
    async backupData() {
        showToast('Creating backup...', 'info');
        if (typeof syncAllToCloud === 'function') {
            await syncAllToCloud();
            showToast('Backup completed!', 'success');
        } else {
            showToast('Sync function not available', 'error');
        }
    }
    
    // Helper to show default admin credentials
    showDefaultAdminCredentials() {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👑 DEFAULT ADMIN CREDENTIALS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email: admin@equibhub.com');
        console.log('🔑 Password: Admin123!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return { email: 'admin@equibhub.com', password: 'Admin123!' };
    }
}

// Create global admin manager instance
const adminManager = new AdminManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => { 
    console.log('🚀 DOM ready, initializing AdminManager...');
    await adminManager.init(); 
    
    const users = await getAllUsers();
    if (!users || users.length === 0) {
        adminManager.showDefaultAdminCredentials();
    }
    
    console.log('✅ AdminManager initialization complete');
});

// Make adminManager available globally
window.adminManager = adminManager;

// Keyboard shortcut: Ctrl+Shift+A to open admin panel
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        console.log('🔑 Admin shortcut triggered');
        adminManager.renderAdminPanel();
    }
});