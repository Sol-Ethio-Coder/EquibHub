// admin-setup.js - Complete Admin Panel with Fixed Pending Contributions

class AdminManager {
    constructor() { 
        this.isInitialized = false; 
    }
    
    async init() { 
        if (this.isInitialized) return; 
        
        // Create pre-configured admin account on first load
        await this.createPreConfiguredAdmin();
        
        await this.addAdminMenuItem(); 
        this.isInitialized = true; 
    }
    
    // Create pre-configured admin account automatically
    async createPreConfiguredAdmin() {
        try {
            const users = await getAllUsers();
            
            // Check if any user exists
            if (users.length === 0) {
                console.log('No users found. Creating pre-configured admin account...');
                
                // Hash the password
                const hashedPassword = await hashPassword('Admin123!');
                
                // Create admin user object with isActive = true
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
                console.log('⚠️  Please change this password after first login!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                // Initialize rounds
                await initRounds();
                
                return true;
            } else {
                // Check if admin already exists, if not, make first user admin
                const adminExists = users.some(u => u.role === 'admin');
                if (!adminExists && users.length > 0) {
                    users[0].role = 'admin';
                    users[0].isActive = true;
                    setStorageData(CONFIG.STORAGE_KEYS.USERS, users);
                    console.log('✅ First user promoted to admin:', users[0].email);
                }
                
                // Also ensure existing users have isActive property
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
    
    async addAdminMenuItem() {
        setTimeout(async () => {
            const user = getCurrentUser();
            if (!user || user.role !== 'admin') return;
            
            const sidebarNav = document.querySelector('.sidebar-nav');
            if (!sidebarNav || document.querySelector('.nav-item[data-view="admin"]')) return;
            
            const adminItem = document.createElement('button');
            adminItem.className = 'nav-item';
            adminItem.setAttribute('data-view', 'admin');
            adminItem.innerHTML = '<i class="fas fa-crown"></i><span>Admin Panel</span>';
            adminItem.style.borderTop = '1px solid rgba(255,255,255,0.1)';
            adminItem.style.marginTop = '1rem';
            adminItem.addEventListener('click', () => this.renderAdminPanel());
            sidebarNav.appendChild(adminItem);
        }, 500);
    }
    
    async renderAdminPanel() {
        console.log('Rendering admin panel...');
        
        const stats = await this.getStats();
        const pending = await this.getPendingContributions();
        const members = await getMemberSummary();
        
        console.log('Pending contributions found:', pending.length);
        if (pending.length > 0) {
            console.log('Pending details:', pending);
        }
        
        let systemStats = {};
        
        try {
            if (typeof getSystemStats === 'function') {
                const currentUser = getCurrentUser();
                systemStats = await getSystemStats(currentUser.id);
            }
        } catch(e) {
            systemStats = { totalUsers: members.length, activeUsers: members.filter(m => m.isActive !== false).length, admins: members.filter(m => m.role === 'admin').length };
        }
        
        let panel = document.getElementById('adminView');
        if (!panel) { 
            panel = document.createElement('div'); 
            panel.id = 'adminView'; 
            panel.className = 'view-panel'; 
            document.querySelector('.main-content').appendChild(panel); 
        }
        
        panel.innerHTML = `
            <div class="admin-panel">
                <h2><i class="fas fa-crown"></i> Admin Dashboard</h2>
                
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-info"><span class="stat-label">Total Members</span><span class="stat-value">${stats.totalMembers}/${CONFIG.MAX_MEMBERS}</span></div></div>
                    <div class="stat-card"><div class="stat-info"><span class="stat-label">Pending Verifications</span><span class="stat-value" id="pendingCount">${stats.pendingCount}</span></div></div>
                    <div class="stat-card"><div class="stat-info"><span class="stat-label">Total Pool</span><span class="stat-value">$${stats.totalCollected}</span></div></div>
                    <div class="stat-card"><div class="stat-info"><span class="stat-label">Active Admins</span><span class="stat-value">${systemStats.admins || 1}</span></div></div>
                </div>
                
                <div class="admin-tabs" style="display:flex; gap:0.5rem; margin-bottom:1.5rem; flex-wrap:wrap;">
                    <button class="admin-tab active" data-tab="pending">⏳ Pending (${stats.pendingCount})</button>
                    <button class="admin-tab" data-tab="members">👥 Members</button>
                    <button class="admin-tab" data-tab="admins">👑 Admins</button>
                    <button class="admin-tab" data-tab="security">🔒 Security</button>
                    <button class="admin-tab" data-tab="export">📥 Export</button>
                </div>
                
                <div id="pendingTab" class="admin-tab-content active">
                    <h3>Pending Verifications</h3>
                    <div id="pendingListContainer">
                        ${pending.length === 0 ? 
                            '<div class="info-box"><i class="fas fa-info-circle"></i><p>No pending verifications. All contributions have been verified!</p></div>' : 
                            `<div class="pending-list">
                                ${pending.map(p => `
                                    <div class="round-item" style="margin-bottom: 10px;">
                                        <div>
                                            <strong>${p.userName}</strong><br>
                                            💰 Amount: $${p.amount}<br>
                                            🔄 Round: ${p.round}<br>
                                            📅 Date: ${new Date(p.date).toLocaleString()}<br>
                                            ${p.transactionRef ? `📝 Ref: ${p.transactionRef}` : ''}
                                        </div>
                                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                            <button class="btn-small" style="background: rgba(16,185,129,0.2); color: #10b981;" onclick="adminManager.viewProofAndVerify('${p.id}')">
                                                <i class="fas fa-image"></i> View Proof & Verify
                                            </button>
                                            <button class="btn-small" style="background: rgba(59,130,246,0.2);" onclick="viewProof('${p.id}')">
                                                <i class="fas fa-eye"></i> View Only
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>`
                        }
                    </div>
                </div>
                
                <div id="membersTab" class="admin-tab-content">
                    <h3>Member Management</h3>
                    ${members.map(m => `
                        <div class="member-card">
                            <div class="member-info">
                                <div class="member-name">${m.name} ${m.isActive === false ? '<span style="color:#ef4444"> (Deactivated)</span>' : ''}</div>
                                <div>${m.email}</div>
                                <div>Role: ${m.role || 'member'} | Balance: $${m.balance} | Status: ${m.status}</div>
                            </div>
                            <div class="member-actions" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                                ${m.role !== 'admin' ? `<button class="btn-small" onclick="adminManager.makeAdmin('${m.id}')">Make Admin</button>` : '<span class="status-badge verified">Admin</span>'}
                                ${m.role !== 'admin' ? (m.isActive !== false ? `<button class="btn-small" style="background:rgba(239,68,68,0.2)" onclick="adminManager.deactivateUser('${m.id}')">Deactivate</button>` : `<button class="btn-small" style="background:rgba(16,185,129,0.2)" onclick="adminManager.activateUser('${m.id}')">Activate</button>`) : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div id="adminsTab" class="admin-tab-content">
                    <h3>Add New Admin</h3>
                    <div style="display:flex; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap;">
                        <input type="email" id="newAdminEmail" placeholder="Enter user email" style="flex:1; padding:0.8rem; background:rgba(0,0,0,0.3); border:1px solid var(--border-color); border-radius:0.8rem; color:var(--text-primary);">
                        <button class="btn-primary" onclick="adminManager.addAdminByEmail()">Make Admin</button>
                    </div>
                    <h3>Current Administrators</h3>
                    ${members.filter(m => m.role === 'admin').map(admin => `
                        <div class="member-card">
                            <div class="member-info">
                                <div class="member-name">${admin.name}</div>
                                <div>${admin.email}</div>
                                <div>Role: Super Admin</div>
                            </div>
                            <div>${members.filter(m => m.role === 'admin').length > 1 ? `<button class="btn-small" style="background:rgba(239,68,68,0.2)" onclick="adminManager.removeAdmin('${admin.id}')">Remove Admin</button>` : '<span class="status-badge verified">Last Admin</span>'}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div id="securityTab" class="admin-tab-content">
                    <h3>Security Settings</h3>
                    <div class="security-card">
                        <div class="security-section">
                            <h3>System Information</h3>
                            <p><strong>Default Admin Email:</strong> admin@equibhub.com</p>
                            <p><strong>Total Users:</strong> ${systemStats.totalUsers || members.length}</p>
                            <p><strong>Active Users:</strong> ${systemStats.activeUsers || members.filter(m => m.isActive !== false).length}</p>
                            <p><strong>Total Contributions:</strong> $${stats.totalCollected}</p>
                            <p><strong>Pending Amount:</strong> $${stats.pendingAmount || 0}</p>
                        </div>
                        <div class="security-section">
                            <h3>Data Management</h3>
                            <button class="btn-secondary" onclick="adminManager.exportFullData()">📥 Export Full System Data</button>
                            <button class="btn-secondary" onclick="adminManager.backupData()" style="margin-left:0.5rem;">💾 Create Backup</button>
                        </div>
                    </div>
                </div>
                
                <div id="exportTab" class="admin-tab-content">
                    <h3>Export Data</h3>
                    <div style="display:flex; gap:1rem; flex-wrap:wrap;">
                        <button class="btn-primary" onclick="adminManager.exportFullData()">📥 Export Full System Data (JSON)</button>
                        <button class="btn-secondary" onclick="adminManager.exportMembersCSV()">👥 Export Members (CSV)</button>
                        <button class="btn-secondary" onclick="adminManager.exportContributionsCSV()">💰 Export Contributions (CSV)</button>
                    </div>
                    <div class="info-box" style="margin-top:1rem;">
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
                document.getElementById(`${tabName}Tab`).classList.add('active');
            });
        });
        
        document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));
        panel.classList.add('active');
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
            pendingAmount: pendingAmount.toFixed(2)
        }; 
    }
    
    async getPendingContributions() { 
        const contributions = await getAllContributions(); 
        const users = await getAllUsers(); 
        const userMap = Object.fromEntries(users.map(u => [u.id, { name: u.name }])); 
        console.log('All contributions:', contributions);
        const pending = contributions.filter(c => c.status === 'pending' && c.amount > 0);
        console.log('Filtered pending:', pending);
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
        showToast('Verified!', 'success'); 
        this.renderAdminPanel(); 
        if (typeof loadDashboardData === 'function') loadDashboardData(); 
    }
    
    // New method to view proof and verify in one flow
    async viewProofAndVerify(contributionId) {
        try {
            const contribution = await getContributionById(contributionId);
            if (!contribution) {
                showToast('Contribution not found', 'error');
                return;
            }
            
            // Create a modal to show proof and verify
            const modal = document.getElementById('proofModal');
            const proofImage = document.getElementById('proofImage');
            const proofDetails = document.getElementById('proofDetails');
            
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
                <button class="btn-primary" onclick="adminManager.verifyAndCloseModal('${contribution.id}')" style="margin-top: 1rem;">
                    <i class="fas fa-check-circle"></i> Verify This Contribution
                </button>
            `;
            
            modal.classList.add('active');
        } catch (error) {
            console.error('Error:', error);
            showToast('Error loading proof', 'error');
        }
    }
    
    async verifyAndCloseModal(contributionId) {
        await this.verify(contributionId);
        closeAllModals();
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
            this.renderAdminPanel(); 
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
            this.renderAdminPanel();
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
        emailInput.value = '';
    }
    
    async deactivateUser(userId) {
        const currentUser = getCurrentUser();
        if (currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
        const users = await getAllUsers();
        const user = users.find(u => u.id === userId);
        if (user && user.role !== 'admin') {
            user.isActive = false;
            await updateUser(user);
        }
        showToast('User deactivated', 'success');
        this.renderAdminPanel();
    }
    
    async activateUser(userId) {
        const currentUser = getCurrentUser();
        if (currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
        const users = await getAllUsers();
        const user = users.find(u => u.id === userId);
        if (user) {
            user.isActive = true;
            await updateUser(user);
        }
        showToast('User activated', 'success');
        this.renderAdminPanel();
    }
    
    async exportFullData() {
        const currentUser = getCurrentUser();
        if (currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
        
        const users = await getAllUsers();
        const contributions = await getAllContributions();
        const rounds = await getAllRounds();
        const withdrawals = getStorageData('equibhub_withdrawals') || [];
        
        const data = { 
            users, 
            contributions, 
            rounds, 
            withdrawals, 
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
        a.download = `equibhub_full_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Full data exported!', 'success');
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
            showToast('Backup completed! Data synced to cloud.', 'success');
        } else {
            showToast('Backup function not available', 'error');
        }
    }
    
    // Helper method to show default admin credentials
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

