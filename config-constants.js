/**
 * Configuration Constants
 * Centralized storage for localStorage keys, default values, and other constants
 * Eliminates magic strings and provides single source of truth
 */

// localStorage Keys
const STORAGE_KEYS = {
    GAS_CONFIG: 'gasConfig',
    GDRIVE_CONFIG: 'gdriveConfig',
    YOUSEI_DATA: 'wns.v1.day',
    YOUSEI_LEGACY: 'yousei-notebook-'
};

// Default Configurations
const DEFAULT_CONFIGS = {
    GAS: {
        webAppUrl: '',
        storeId: 'KRB01',
        enabled: false,
        autoSync: true,
        syncInterval: 300000, // 5 minutes
        lastSync: null
    },
    
    GDRIVE: {
        clientId: '',
        apiKey: '',
        folderId: '',
        enabled: false,
        folderName: 'yousei-notebook-data'
    }
};

// Network Settings
const NETWORK_SETTINGS = {
    DEFAULT_TIMEOUT: 10000, // 10 seconds
    MAX_RETRY_COUNT: 3,
    RETRY_DELAY: 1000 // 1 second
};

// Storage Types
const STORAGE_TYPES = {
    LOCAL: 'localStorage',
    GAS: 'gasStorage',
    GDRIVE: 'gdriveStorage'
};

// Status Constants
const STATUS = {
    SUCCESS: 'success',
    ERROR: 'error',
    PENDING: 'pending',
    DISABLED: 'disabled'
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CONFIG_CONSTANTS = {
        STORAGE_KEYS,
        DEFAULT_CONFIGS,
        NETWORK_SETTINGS,
        STORAGE_TYPES,
        STATUS
    };
}