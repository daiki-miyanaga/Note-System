/**
 * Base Storage Interface
 * Standardizes common storage operations across different storage backends
 * Provides consistent error handling and retry logic
 */

class BaseStorage {
    constructor(storageType = 'base') {
        this.storageType = storageType;
        this.initialized = false;
        this.retryCount = window.CONFIG_CONSTANTS?.NETWORK_SETTINGS.MAX_RETRY_COUNT || 3;
        this.timeout = window.CONFIG_CONSTANTS?.NETWORK_SETTINGS.DEFAULT_TIMEOUT || 10000;
    }

    // Abstract methods to be implemented by subclasses
    async init(...args) {
        throw new Error('init method must be implemented by subclass');
    }

    async save(key, data) {
        throw new Error('save method must be implemented by subclass');
    }

    async load(key) {
        throw new Error('load method must be implemented by subclass');
    }

    async delete(key) {
        throw new Error('delete method must be implemented by subclass');
    }

    async list() {
        throw new Error('list method must be implemented by subclass');
    }

    // Common utility methods
    isInitialized() {
        return this.initialized;
    }

    getStorageType() {
        return this.storageType;
    }

    // Retry logic for network operations
    async withRetry(operation, maxRetries = this.retryCount) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
                    console.warn(`${this.storageType} operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error.message);
                    await this.sleep(delay);
                } else {
                    console.error(`${this.storageType} operation failed after ${maxRetries + 1} attempts:`, error);
                }
            }
        }
        
        throw lastError;
    }

    // Timeout wrapper for operations
    async withTimeout(operation, timeoutMs = this.timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const result = await operation(controller.signal);
            clearTimeout(timeoutId);
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Operation timed out after ${timeoutMs}ms`);
            }
            throw error;
        }
    }

    // Connection test (to be overridden if needed)
    async testConnection() {
        return { success: true, message: 'Base storage connection test passed' };
    }

    // Utility method for sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Validate data before operations
    validateData(data) {
        if (data === null || data === undefined) {
            throw new Error('Data cannot be null or undefined');
        }
        
        try {
            JSON.stringify(data);
        } catch (error) {
            throw new Error('Data must be JSON serializable');
        }
    }

    // Generate consistent storage keys
    generateKey(prefix, id, suffix = '') {
        const parts = [prefix, id, suffix].filter(Boolean);
        return parts.join('.');
    }

    // Log operation results
    logOperation(operation, key, success, error = null) {
        const logLevel = success ? 'log' : 'error';
        const message = success 
            ? `${this.storageType} ${operation} successful for key: ${key}`
            : `${this.storageType} ${operation} failed for key: ${key}`;
        
        console[logLevel](message, error || '');
    }
}