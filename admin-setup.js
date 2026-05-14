/**
 * EquibHub - Complete Admin Management System
 * Version: 2.1 (FIXED)
 */

// ==================== ADMIN MANAGER CLASS ====================

class AdminManager {
    constructor() {
        this.isInitialized = false;
    }

    // Initialize admin system
    async init() {
        if (this.isInitialized) return;
        
        // Create default admin if no users exist
        await this.createDefaultAdmin();
        
        // Add admin menu item if user is admin
        await this.addAdminMenuItem();
        
        this.isInitialized = true;
        console.log('✅ Admin Manager Initialized');
    }

    // Create default admin account (first-time setup)
    async createDefaultAdmin() {
        const users = await getAllUsers();
        
        if (users.length === 0) {
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
            console.log('✅ DEFAULT ADMIN ACCOUNT CREATED!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 Email: admin@equibhub.com');
            console.log('🔑 Password: Admin123!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            return true;
        }
        return false;
    }

    // Make a user admin
    async makeAdmin(identifier) {
        const users = await getAllUsers();
        const user = users.find(u => u.email === identifier || u.id === identifier);
        
        if (!user) {
            this.showToast('User not found', 'error');
            return { success: false };
        }
        
        if (user.role === 'admin') {
            this.showToast(`${user.name} is already an admin`, 'info');
            return { success: false };
        }
        
        user.role = 'admin';
        await updateUser(user);
        
        this.showToast(`${user.name} is now an admin`, 'success');
        await this.renderAdminPanel();
        
        return { success: true };
    }

    // Add admin by email
    async addAdminByEmail() {
        const emailInput = document.getElementById('newAdminEmail');
        const email = emailInput?.value.trim();
        
        if (!email) {
            this.showToast('Please enter an email address', 'error');
            return;
        }
        
        await this.makeAdmin(email);
        if (emailInput) emailInput.value = '';
    }

    // Remove admin privileges
    async removeAdmin(identifier) {
        const users = await getAllUsers();
        const user = users.find(u => u.email === identifier || u.id === identifier);
        
        if (!user) {
            this.showToast('User not found', 'error');
            return { success: false };
        }
        
        if (user.role !== 'admin') {
            this.showToast('User is not an admin', 'error');
            return { success: false };
        }
        
        const admins = users.filter(u => u.role === 'admin');
        if (admins.length === 1 && admins[0].id === user.id) {
            this.showToast('Cannot remove the last admin!', 'error');
            return { success: false };
        }
        
        user.role = 'member';
        await updateUser(user);
        
        this.showToast(`${user.name} is no longer an admin`, 'info');
        await this.renderAdminPanel();
        
        return { success: true };
    }

    // Verify a contribution
    async verifyContribution(contributionId) {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            this.showToast('Admin access required', 'error');
            return { success: false };
        }
        
        const contributions = getStorageData('equib_contributions') || [];
        const index = contributions.findIndex(c => c.id === contributionId);
        
        if (index === -1) {
            this.showToast('Contribution not found', 'error');
            return { success: false };
        }
        
        if (contributions[index].status === 'verified') {
            this.showToast('Already verified', 'info');
            return { success: false };
        }
        
        contributions[index].status = 'verified';
        contributions[index].verifiedBy = currentUser.id;
        contributions[index].verifiedAt = new Date().toISOString();
        
        setStorageData('equib_contributions', contributions);
        
        this.showToast('Contribution verified successfully!', 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }
        
        await this.renderAdminPanel();
        
        return { success: true };
    }

    // Show reject modal
    showRejectModal(contributionId) {
        const reason = prompt('Please enter reason for rejection:');
        if (reason !== null) {
            this.rejectContribution(contributionId, reason);
        }
    }

    // Reject a contribution
    async rejectContribution(contributionId, reason = '') {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            this.showToast('Admin access required', 'error');
            return { success: false };
        }
        
        const contributions = getStorageData('equib_contributions') || [];
        const index = contributions.findIndex(c => c.id === contributionId);
        
        if (index === -1) {
            this.showToast('Contribution not found', 'error');
            return { success: false };
        }
        
        const contribution = contributions[index];
        
        // Refund the user
        const users = await getAllUsers();
        const user = users.find(u => u.id === contribution.userId);
        if (user) {
            user.balance -= contribution.amount;
            user.totalContributed -= contribution.amount;
            await updateUser(user);
        }
        
        contributions[index].status = 'rejected';
        contributions[index].rejectedBy = currentUser.id;
        contributions[index].rejectedAt = new Date().toISOString();
        contributions[index].rejectionReason = reason;
        
        setStorageData('equib_contributions', contributions);
        
        this.showToast('Contribution rejected and refunded', 'warning');
        await this.renderAdminPanel();
        
        return { success: true };
    }

    // Get dashboard statistics
    async getDashboardStats() {
        const users = await getAllUsers();
        const contributions = await getAllContributions();
        const rounds = await getAllRounds();
        
        const verifiedContributions = contributions.filter(c => c.status === 'verified' && c.amount > 0);
        const pendingContributions = contributions.filter(c => c.status === 'pending' && c.amount > 0);
        
        const totalCollected = verifiedContributions.reduce((sum, c) => sum + c.amount, 0);
        const pendingAmount = pendingContributions.reduce((sum, c) => sum + c.amount, 0);
        
        const currentRound = rounds.find(r => r.status === 'active') || rounds[0];
        
        return {
            totalMembers: users.length,
            maxMembers: CONFIG.MAX_MEMBERS,
            adminCount: users.filter(u => u.role === 'admin').length,
            totalCollected: totalCollected,
            pendingVerifications: pendingContributions.length,
            pendingAmount: pendingAmount,
            currentRound: currentRound?.roundNumber || 1,
            verifiedCount: verifiedContributions.length
        };
    }

    // Get pending contributions
    async getPendingContributions() {
        const contributions = await getAllContributions();
        const users = await getAllUsers();
        const userMap = {};
        users.forEach(u => userMap[u.id] = u);
        
        return contributions.filter(c => c.status === 'pending' && c.amount > 0).map(c => ({
            id: c.id,
            userName: userMap[c.userId]?.name || 'Unknown',
            amount: c.amount,
            round: c.round,
            date: c.date,
            transactionRef: c.transactionRef
        }));
    }

    // Get member stats
    async getMemberStats() {
        const users = await getAllUsers();
        const contributions = await getAllContributions();
        
        return users.map(user => {
            const userContribs = contributions.filter(c => c.userId === user.id && c.amount > 0);
            const verifiedContribs = userContribs.filter(c => c.status === 'verified');
            
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                balance: user.balance,
                totalContributed: verifiedContribs.reduce((sum, c) => sum + c.amount, 0),
                roundsCompleted: verifiedContribs.length,
                hasBankDetails: !!(user.bankDetails?.accountNumber || user.bankDetails?.mobileMoneyId)
            };
        });
    }

    // Remove a member
    async removeMember(userId) {
        if (!confirm('Are you sure you want to remove this member?')) return { success: false };
        
        const users = await getAllUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            this.showToast('User not found', 'error');
            return { success: false };
        }
        
        const userToRemove = users[userIndex];
        
        if (userToRemove.role === 'admin') {
            const admins = users.filter(u => u.role === 'admin');
            if (admins.length === 1) {
                this.showToast('Cannot remove the last admin!', 'error');
                return { success: false };
            }
        }
        
        users.splice(userIndex, 1);
        setStorageData(CONFIG.STORAGE_KEYS.USERS, users);
        
        this.showToast(`${userToRemove.name} has been removed`, 'warning');
        await this.renderAdminPanel();
        
        return { success: true };
    }

    // Export all data
    async exportAllData() {
        const users = await getAllUsers();
        const contributions = await getAllContributions();
        const rounds = await getAllRounds();
        
        const exportData = {
            exportedAt: new Date().toISOString(),
            users: users.map(u => ({ name: u.name, email: u.email, role: u.role, balance: u.balance })),
            contributions: contributions,
            rounds: rounds
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `equibhub_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Data exported successfully!', 'success');
    }

    // Export members CSV
    async exportMembersList() {
        const members = await this.getMemberStats();
        
        let csv = 'Name,Email,Role,Balance,Total Contributed,Rounds Completed\n';
        members.forEach(m => {
            csv += `"${m.name}","${m.email}","${m.role}",${m.balance},${m.totalContributed},${m.roundsCompleted}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `equibhub_members_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Members list exported!', 'success');
    }

    // Export contributions CSV
    async exportContributionsReport() {
        const contributions = await getAllContributions();
        const users = await getAllUsers();
        const userMap = {};
        users.forEach(u => userMap[u.id] = u.name);
        
        let csv = 'Date,Member,Amount,Round,Status\n';
        contributions.forEach(c => {
            if (c.amount > 0) {
                csv += `"${new Date(c.date).toISOString()}","${userMap[c.userId] || 'Unknown'}",${c.amount},${c.round},${c.status}\n`;
            }
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `equibhub_contributions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Contributions exported!', 'success');
    }

    // Add admin menu item to sidebar
    async addAdminMenuItem() {
        setTimeout(async () => {
            const currentUser = getCurrentUser();
            if (!currentUser || currentUser.role !== 'admin') return;
            
            const sidebarNav = document.querySelector('.sidebar-nav');
            if (!sidebarNav) return;
            
            if (document.querySelector('.nav-item[data-view="admin"]')) return;
            
            const adminMenuItem = document.createElement('button');
            adminMenuItem.className = 'nav-item';
            adminMenuItem.setAttribute('data-view', 'admin');
            adminMenuItem.innerHTML = '<i class="fas fa-crown"></i><span>Admin Panel</span>';
            adminMenuItem.style.borderTop = '1px solid rgba(255,255,255,0.1)';
            adminMenuItem.style.marginTop = '1rem';
            adminMenuItem.style.paddingTop = '1rem';
            
            adminMenuItem.addEventListener('click', async () => {
                // Create admin view if it doesn't exist
                let adminView = document.getElementById('adminView');
                if (!adminView) {
                    adminView = document.createElement('div');
                    adminView.id = 'adminView';
                    adminView.className = 'view-panel';
                    document.querySelector('.main-content').appendChild(adminView);
                }
                
                // Hide all views and show admin view
                document.querySelectorAll('.view-panel').forEach(panel => {
                    panel.classList.remove('active');
                });
                adminView.classList.add('active');
                
                // Update nav active state
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                adminMenuItem.classList.add('active');
                
                // Render admin panel
                await this.renderAdminPanel();
            });
            
            sidebarNav.appendChild(adminMenuItem);
        }, 500);
    }

    // Render admin panel
    async renderAdminPanel() {
        const stats = await this.getDashboardStats();
        const pendingContributions = await this.getPendingContributions();
        const memberStats = await this.getMemberStats();
        const users = await getAllUsers();
        const admins = users.filter(u => u.role === 'admin');
        
        const adminHtml = `
            <style>
                .admin-panel { animation: fadeIn 0.4s ease; }
                .admin-header { margin-bottom: 1.5rem; }
                .admin-header h2 { color: var(--text-primary); margin-bottom: 0.5rem; }
                .admin-header p { color: var(--text-secondary); }
                .admin-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; }
                .admin-tab { background: none; border: none; padding: 0.8rem 1.5rem; cursor: pointer; color: var(--text-secondary); transition: all 0.3s ease; }
                .admin-tab:hover { color: var(--accent-primary); }
                .admin-tab.active { color: var(--accent-primary); border-bottom: 2px solid var(--accent-primary); }
                .admin-tab-content { display: none; animation: fadeIn 0.3s ease; }
                .admin-tab-content.active { display: block; }
                .pending-list { display: flex; flex-direction: column; gap: 1rem; }
                .pending-item { background: var(--card-bg); border-radius: 1rem; padding: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border: 1px solid var(--border-color); }
                .pending-info strong { color: var(--text-primary); display: block; }
                .pending-info span { color: var(--success); font-weight: 600; }
                .pending-info small { color: var(--text-secondary); font-size: 0.75rem; }
                .pending-actions { display: flex; gap: 0.5rem; }
                .verify-btn { background: rgba(16,185,129,0.2); color: var(--success); }
                .verify-btn:hover { background: var(--success); color: white; }
                .reject-btn { background: rgba(239,68,68,0.2); color: var(--danger); }
                .reject-btn:hover { background: var(--danger); color: white; }
                .member-admin-card { background: var(--card-bg); border-radius: 1rem; padding: 1rem; display: flex; align-items: center; gap: 1rem; margin-bottom: 0.8rem; border: 1px solid var(--border-color); flex-wrap: wrap; }
                .member-details { flex: 1; }
                .member-name { font-weight: 600; color: var(--text-primary); }
                .member-email { font-size: 0.8rem; color: var(--text-secondary); }
                .member-stats-admin { display: flex; gap: 1rem; font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem; flex-wrap: wrap; }
                .member-actions { display: flex; gap: 0.5rem; }
                .make-admin-btn { background: rgba(245,158,11,0.2); color: var(--warning); }
                .make-admin-btn:hover { background: var(--warning); color: white; }
                .remove-btn { background: rgba(239,68,68,0.2); color: var(--danger); }
                .remove-btn:hover { background: var(--danger); color: white; }
                .admin-badge-small { background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.7rem; color: white; }
                .add-admin-form { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
                .admin-input { flex: 1; padding: 0.8rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 0.8rem; color: var(--text-primary); }
                .export-options { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
            </style>
            
            <div class="admin-panel">
                <div class="admin-header">
                    <h2><i class="fas fa-crown"></i> Admin Dashboard</h2>
                    <p>Complete control panel for EquibHub management</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card primary">
                        <div class="stat-icon"><i class="fas fa-users"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Total Members</span>
                            <span class="stat-value">${stats.totalMembers}/${stats.maxMembers}</span>
                        </div>
                    </div>
                    <div class="stat-card success">
                        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Verified</span>
                            <span class="stat-value">${stats.verifiedCount}</span>
                        </div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-icon"><i class="fas fa-clock"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Pending</span>
                            <span class="stat-value">${stats.pendingVerifications}</span>
                        </div>
                    </div>
                    <div class="stat-card info">
                        <div class="stat-icon"><i class="fas fa-dollar-sign"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Total Collected</span>
                            <span class="stat-value">$${stats.totalCollected.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="admin-tabs">
                    <button class="admin-tab active" data-tab="pending">⏳ Pending (${stats.pendingVerifications})</button>
                    <button class="admin-tab" data-tab="members">👥 Members</button>
                    <button class="admin-tab" data-tab="admins">👑 Admins</button>
                    <button class="admin-tab" data-tab="export">📥 Export</button>
                </div>
                
                <div id="pendingTab" class="admin-tab-content active">
                    <h3>Pending Verifications</h3>
                    ${pendingContributions.length === 0 ? 
                        '<div class="info-box"><i class="fas fa-check-circle"></i><p>No pending verifications!</p></div>' :
                        `<div class="pending-list">
                            ${pendingContributions.map(c => `
                                <div class="pending-item">
                                    <div class="pending-info">
                                        <strong>${c.userName}</strong>
                                        <span>$${c.amount} - Round ${c.round}</span>
                                        <small>${new Date(c.date).toLocaleString()}</small>
                                        ${c.transactionRef ? `<small>Ref: ${c.transactionRef}</small>` : ''}
                                    </div>
                                    <div class="pending-actions">
                                        <button class="btn-small verify-btn" onclick="adminManager.verifyContribution('${c.id}')">
                                            <i class="fas fa-check"></i> Verify
                                        </button>
                                        <button class="btn-small reject-btn" onclick="adminManager.showRejectModal('${c.id}')">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                </div>
                
                <div id="membersTab" class="admin-tab-content">
                    <h3>Member Management</h3>
                    ${memberStats.map(member => `
                        <div class="member-admin-card">
                            <div class="member-avatar">${member.name.charAt(0).toUpperCase()}</div>
                            <div class="member-details">
                                <div class="member-name">${member.name}</div>
                                <div class="member-email">${member.email}</div>
                                <div class="member-stats-admin">
                                    <span>💰 $${member.balance}</span>
                                    <span>📦 ${member.roundsCompleted}/${CONFIG.TOTAL_ROUNDS}</span>
                                    <span>✅ $${member.totalContributed}</span>
                                </div>
                            </div>
                            <div class="member-actions">
                                ${member.role !== 'admin' ? 
                                    `<button class="btn-small make-admin-btn" onclick="adminManager.makeAdmin('${member.id}')">
                                        <i class="fas fa-crown"></i> Make Admin
                                    </button>
                                    <button class="btn-small remove-btn" onclick="adminManager.removeMember('${member.id}')">
                                        <i class="fas fa-trash"></i> Remove
                                    </button>` :
                                    '<span class="admin-badge-small"><i class="fas fa-crown"></i> Admin</span>'
                                }
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div id="adminsTab" class="admin-tab-content">
                    <h3>Add New Admin</h3>
                    <div class="add-admin-form">
                        <input type="email" id="newAdminEmail" placeholder="Enter user email" class="admin-input">
                        <button class="btn-primary" onclick="adminManager.addAdminByEmail()">
                            <i class="fas fa-crown"></i> Make Admin
                        </button>
                    </div>
                    <h3>Current Admins</h3>
                    ${admins.map(admin => `
                        <div class="member-admin-card">
                            <div class="member-avatar">${admin.name.charAt(0).toUpperCase()}</div>
                            <div class="member-details">
                                <div class="member-name">${admin.name}</div>
                                <div class="member-email">${admin.email}</div>
                            </div>
                            <div class="member-actions">
                                ${admins.length > 1 ? 
                                    `<button class="btn-small remove-btn" onclick="adminManager.removeAdmin('${admin.id}')">
                                        <i class="fas fa-user-minus"></i> Remove
                                    </button>` : 
                                    '<span class="admin-badge-small">Last Admin</span>'
                                }
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div id="exportTab" class="admin-tab-content">
                    <h3>Export Data</h3>
                    <div class="export-options">
                        <button class="btn-primary" onclick="adminManager.exportAllData()">
                            <i class="fas fa-database"></i> Full Export (JSON)
                        </button>
                        <button class="btn-secondary" onclick="adminManager.exportMembersList()">
                            <i class="fas fa-users"></i> Members (CSV)
                        </button>
                        <button class="btn-secondary" onclick="adminManager.exportContributionsReport()">
                            <i class="fas fa-coins"></i> Contributions (CSV)
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const adminView = document.getElementById('adminView');
        if (adminView) {
            adminView.innerHTML = adminHtml;
        }
        
        // Add tab switching
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`${tabName}Tab`).classList.add('active');
            });
        });
    }

    // Show toast
    showToast(message, type) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.style.background = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        } else {
            console.log(message);
        }
    }
}

// Create global admin manager
const adminManager = new AdminManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await adminManager.init();
});

window.adminManager = adminManager;