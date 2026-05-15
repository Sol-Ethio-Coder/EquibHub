// EquibHub Configuration - JSONBin.io Cloud Database
const CONFIG = {
    APP_NAME: 'EquibHub',
    VERSION: '2.0.0',
    MAX_MEMBERS: 6,
    DEFAULT_CONTRIBUTION: 50,
    TOTAL_ROUNDS: 6,
    SESSION_TIMEOUT_MINUTES: 30,
    MIN_PASSWORD_LENGTH: 4,
    
    // ============================================
    // 🔴 REPLACE THESE WITH YOUR ACTUAL KEYS:
    // ============================================
    JSONBIN_API_KEY: "$2a$10$.26.vuumasOC/yR8IFdTv.NiGRWSgz6mR6rCQ6OFogmLBeK2eSGE2",  // From jsonbin.io → Account → API Keys
    JSONBIN_BIN_ID: "6a065225c0954111d8252bb0",       // From your bin URL
    
    STORAGE_KEYS: {
        USERS: 'equibhub_users',
        SESSION: 'equibhub_session',
        THEME: 'equibhub_theme'
    }
};

Object.freeze(CONFIG);


