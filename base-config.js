/**
 * Base Configuration Manager
 * Provides common configuration loading/saving functionality
 * Eliminates code duplication between GASConfig and GDriveConfig
 */

class BaseConfig {
    constructor(storageKey, defaultConfig = {}) {
        this.storageKey = storageKey;
        this.defaultConfig = defaultConfig;
        this.config = this.loadConfig();
    }

    // Load configuration from localStorage
    loadConfig() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                return { ...this.defaultConfig, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error(`Config load error for ${this.storageKey}:`, error);
        }

        return { ...this.defaultConfig };
    }

    // Save configuration to localStorage
    saveConfig(config) {
        this.config = { ...this.config, ...config };
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
        } catch (error) {
            console.error(`Config save error for ${this.storageKey}:`, error);
        }
    }

    // Get current configuration
    getConfig() {
        return { ...this.config };
    }

    // Get specific configuration value
    get(key) {
        return this.config[key];
    }

    // Set specific configuration value
    set(key, value) {
        this.saveConfig({ [key]: value });
    }

    // Check if feature is enabled
    isEnabled() {
        return this.config.enabled === true;
    }

    // Enable configuration
    enable(additionalConfig = {}) {
        this.saveConfig({ ...additionalConfig, enabled: true });
    }

    // Disable configuration
    disable() {
        this.saveConfig({ enabled: false });
    }

    // Reset to default configuration
    reset() {
        this.config = { ...this.defaultConfig };
        localStorage.removeItem(this.storageKey);
    }
}