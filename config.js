// EquibHub Configuration - ETB Currency
const CONFIG = {
    APP_NAME: 'EquibHub',
    VERSION: '2.0.0',
    MAX_MEMBERS: 6,
    DEFAULT_CONTRIBUTION: 5000, // 5000 ETB (Ethiopian Birr)
    TOTAL_ROUNDS: 6,
    SESSION_TIMEOUT_MINUTES: 30,
    MIN_PASSWORD_LENGTH: 4,
    MAX_FILE_SIZE_MB: 5,
    
    // Currency Settings
    CURRENCY: {
        CODE: 'ETB',
        SYMBOL: 'Br',
        NAME: 'Ethiopian Birr'
    },
    
    // ============================================
    // 🔴 REPLACE THESE WITH YOUR ACTUAL KEYS:
    // Get them from https://jsonbin.io
    // ============================================
    JSONBIN_API_KEY: "$2a$10$.26.vuumasOC/yR8IFdTv.NiGRWSgz6mR6rCQ6OFogmLBeK2eSGE2",
    JSONBIN_BIN_ID: "6a065225c0954111d8252bb0",
    
    STORAGE_KEYS: {
        USERS: 'equibhub_users',
        SESSION: 'equibhub_session',
        THEME: 'equibhub_theme'
    }
};

Object.freeze(CONFIG);