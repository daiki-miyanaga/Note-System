/**
 * Google Apps Script (GAS) Storage Manager
 * Google Apps Script ウェブアプリを使用したデータ保存・同期システム
 * Google Cloud Console不要、GAS Webアプリで認証なしアクセス
 */

class GASStorage extends BaseStorage {
    constructor() {
        super('gasStorage');
        this.webAppUrl = null;
        this.storeId = null;
    }

    // 初期化
    async init(webAppUrl, storeId = 'KRB01') {
        try {
            this.webAppUrl = webAppUrl;
            this.storeId = storeId;
            
            // 接続テスト
            const testResult = await this.testConnection();
            if (testResult.success) {
                this.initialized = true;
                console.log('GAS Storage initialized successfully');
                return true;
            } else {
                console.error('GAS Storage connection test failed:', testResult.error);
                return false;
            }
        } catch (error) {
            console.error('GAS Storage initialization failed:', error);
            return false;
        }
    }

    // 接続テスト
    async testConnection() {
        try {
            const response = await this.makeRequest('GET', {
                action: 'ping',
                timestamp: Date.now()
            });
            
            if (response.status === 'success') {
                return { success: true };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // GAS ウェブアプリにリクエスト送信
    async makeRequest(method, data, retryCount = 0) {
        if (!this.webAppUrl) {
            throw new Error('Web App URL not configured');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            let url = this.webAppUrl;
            let options = {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (method === 'GET') {
                // GET リクエストはクエリパラメータで送信
                const params = new URLSearchParams();
                Object.entries(data).forEach(([key, value]) => {
                    params.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
                });
                url += '?' + params.toString();
                options.method = 'GET';
            } else {
                // POST リクエスト
                options.method = 'POST';
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                error.message = 'Request timeout';
            }

            // リトライ処理
            if (retryCount < this.retryCount && 
                (error.message.includes('timeout') || error.message.includes('network'))) {
                console.warn(`GAS request failed, retrying (${retryCount + 1}/${this.retryCount}):`, error.message);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return this.makeRequest(method, data, retryCount + 1);
            }

            throw error;
        }
    }

    // BaseStorage interface implementation
    async save(key, data) {
        return await this.setItem(key, data);
    }

    // データ保存
    async setItem(key, value) {
        try {
            if (!this.isInitialized()) {
                throw new Error('GAS Storage not initialized');
            }

            this.validateData(value);
            const storageKey = this.generateKey(this.storeId, key);

            const result = await this.makeRequest('POST', {
                action: 'setItem',
                key: storageKey,
                value: typeof value === 'string' ? value : JSON.stringify(value),
                storeId: this.storeId,
                timestamp: new Date().toISOString()
            });

            const success = result.status === 'success';
            this.logOperation('save', storageKey, success, result.error);

            if (success) {
                return true;
            } else {
                throw new Error(result.error || 'Save failed');
            }
        } catch (error) {
            console.error('GAS setItem failed:', error);
            throw error;
        }
    }

    // BaseStorage interface implementation
    async load(key) {
        return await this.getItem(key);
    }

    // データ取得
    async getItem(key) {
        try {
            if (!this.isInitialized()) {
                throw new Error('GAS Storage not initialized');
            }

            const storageKey = this.generateKey(this.storeId, key);
            const result = await this.makeRequest('GET', {
                action: 'getItem',
                key: storageKey,
                storeId: this.storeId
            });

            const success = result.status === 'success' || result.status === 'not_found';
            this.logOperation('load', storageKey, success, result.error);

            if (result.status === 'success') {
                return result.data;
            } else if (result.status === 'not_found') {
                return null;
            } else {
                throw new Error(result.error || 'Get failed');
            }
        } catch (error) {
            console.error('GAS getItem failed:', error);
            return null; // フォールバック
        }
    }

    // データ削除
    async removeItem(key) {
        try {
            if (!this.initialized) {
                throw new Error('GAS Storage not initialized');
            }

            const result = await this.makeRequest('POST', {
                action: 'removeItem',
                key: key,
                storeId: this.storeId
            });

            if (result.status === 'success') {
                return true;
            } else {
                throw new Error(result.error || 'Remove failed');
            }
        } catch (error) {
            console.error('GAS removeItem failed:', error);
            throw error;
        }
    }

    // 全データ一覧取得
    async getAllItems(prefix = '') {
        try {
            if (!this.initialized) {
                throw new Error('GAS Storage not initialized');
            }

            const result = await this.makeRequest('GET', {
                action: 'getAllItems',
                prefix: prefix,
                storeId: this.storeId
            });

            if (result.status === 'success') {
                return result.data || [];
            } else {
                throw new Error(result.error || 'GetAll failed');
            }
        } catch (error) {
            console.error('GAS getAllItems failed:', error);
            return [];
        }
    }

    // 日付範囲でデータ取得
    async getDateRange(startDate, endDate) {
        try {
            if (!this.initialized) {
                throw new Error('GAS Storage not initialized');
            }

            const result = await this.makeRequest('GET', {
                action: 'getDateRange',
                startDate: startDate,
                endDate: endDate,
                storeId: this.storeId
            });

            if (result.status === 'success') {
                return result.data || [];
            } else {
                throw new Error(result.error || 'GetDateRange failed');
            }
        } catch (error) {
            console.error('GAS getDateRange failed:', error);
            return [];
        }
    }

    // 前年同曜日データ取得
    async getPreviousYearData(targetDate) {
        try {
            if (!this.initialized) {
                throw new Error('GAS Storage not initialized');
            }

            const result = await this.makeRequest('GET', {
                action: 'getPreviousYearData',
                targetDate: targetDate,
                storeId: this.storeId
            });

            if (result.status === 'success') {
                return result.data || null;
            } else {
                return null;
            }
        } catch (error) {
            console.error('GAS getPreviousYearData failed:', error);
            return null;
        }
    }

    // バックアップ作成
    async createBackup() {
        try {
            if (!this.initialized) {
                throw new Error('GAS Storage not initialized');
            }

            const result = await this.makeRequest('POST', {
                action: 'createBackup',
                storeId: this.storeId,
                timestamp: new Date().toISOString()
            });

            if (result.status === 'success') {
                return result.data;
            } else {
                throw new Error(result.error || 'Backup failed');
            }
        } catch (error) {
            console.error('GAS createBackup failed:', error);
            throw error;
        }
    }

    // 同期状態チェック
    async getSyncStatus() {
        try {
            if (!this.initialized) {
                return { connected: false, lastSync: null };
            }

            const result = await this.makeRequest('GET', {
                action: 'getSyncStatus',
                storeId: this.storeId
            });

            if (result.status === 'success') {
                return {
                    connected: true,
                    lastSync: result.data.lastSync,
                    itemCount: result.data.itemCount
                };
            } else {
                return { connected: false, lastSync: null };
            }
        } catch (error) {
            console.error('GAS getSyncStatus failed:', error);
            return { connected: false, lastSync: null };
        }
    }

    // 初期化済みかチェック
    isConnected() {
        return this.initialized;
    }

    // LocalStorage との同期
    async syncWithLocalStorage() {
        try {
            if (!this.initialized) {
                console.log('GAS not connected, skipping sync');
                return false;
            }

            console.log('Starting localStorage sync with GAS...');

            // LocalStorageから洋生ノートデータを取得
            const localKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('yousei:')) {
                    localKeys.push(key);
                }
            }

            let syncCount = 0;
            for (const key of localKeys) {
                try {
                    const localData = localStorage.getItem(key);
                    if (localData) {
                        await this.setItem(key, localData);
                        syncCount++;
                    }
                } catch (error) {
                    console.warn(`Failed to sync ${key}:`, error);
                }
            }

            console.log(`Synced ${syncCount} items to GAS`);
            return true;
        } catch (error) {
            console.error('Sync with localStorage failed:', error);
            return false;
        }
    }

    // BaseStorage interface implementation - additional methods
    async delete(key) {
        // Implementation for delete operation if needed
        throw new Error('Delete operation not implemented for GAS storage');
    }

    async list() {
        // Implementation for listing all keys if needed
        throw new Error('List operation not implemented for GAS storage');
    }
}

// グローバルインスタンス
window.gasStorage = new GASStorage();