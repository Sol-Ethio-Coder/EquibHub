// EQUIB App Configuration
const CONFIG = {
    APP_NAME: 'EquibHub',
    VERSION: '2.0.0',
    MAX_MEMBERS: 6,
    DEFAULT_CONTRIBUTION: 50,
    TOTAL_ROUNDS: 6,
    
    // Session Configuration
    SESSION_TIMEOUT_MINUTES: 30,
    
    // File Upload Configuration
    MAX_FILE_SIZE_MB: 5,
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    
    // Security Settings
    MIN_PASSWORD_LENGTH: 8,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    
    // Feature Flags
    ENABLE_NOTIFICATIONS: true,
    ENABLE_EXPORT: true,
    ENABLE_DARK_MODE: true,
    
    // Storage Keys
    STORAGE_KEYS: {
        USERS: 'equib_secure_users',
        SESSION: 'equib_secure_session',
        THEME: 'equib_theme',
        BACKUP: 'equib_backup'
    }
};

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);