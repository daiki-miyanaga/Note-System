/**
 * Google Drive Storage Manager
 * ローカルストレージをGoogle Driveフォルダに置き換えるライブラリ
 */

class GDriveStorage {
    constructor() {
        this.gapi = null;
        this.folderId = null;
        this.initialized = false;
        this.accessToken = null;
        this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
        this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
        this.CLIENT_ID = ''; // 設定で指定
        this.API_KEY = ''; // 設定で指定
        this.FOLDER_NAME = 'yousei-notebook-data';
    }

    // 初期化
    async init(clientId, apiKey, folderId = null) {
        try {
            this.CLIENT_ID = clientId;
            this.API_KEY = apiKey;
            this.folderId = folderId;

            // Google API スクリプトをロード
            await this.loadGoogleAPI();
            
            // GAPI を初期化
            await gapi.load('client:auth2', async () => {
                await gapi.client.init({
                    apiKey: this.API_KEY,
                    clientId: this.CLIENT_ID,
                    discoveryDocs: [this.DISCOVERY_DOC],
                    scope: this.SCOPES
                });
            });

            this.gapi = gapi;
            this.initialized = true;
            
            // フォルダIDが未指定の場合は作成または検索
            if (!this.folderId) {
                this.folderId = await this.findOrCreateFolder(this.FOLDER_NAME);
            }

            console.log('GDrive Storage initialized successfully');
            return true;
        } catch (error) {
            console.error('GDrive Storage initialization failed:', error);
            return false;
        }
    }

    // Google API スクリプトをロード
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // 認証
    async authenticate() {
        try {
            const authInstance = this.gapi.auth2.getAuthInstance();
            if (!authInstance.isSignedIn.get()) {
                await authInstance.signIn();
            }
            this.accessToken = authInstance.currentUser.get().getAuthResponse().access_token;
            return true;
        } catch (error) {
            console.error('Authentication failed:', error);
            return false;
        }
    }

    // フォルダを検索または作成
    async findOrCreateFolder(folderName) {
        try {
            // 既存フォルダを検索
            const response = await gapi.client.drive.files.list({
                q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
                fields: 'files(id, name)'
            });

            if (response.result.files.length > 0) {
                return response.result.files[0].id;
            }

            // フォルダが存在しない場合は作成
            const folderResponse = await gapi.client.drive.files.create({
                resource: {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder'
                }
            });

            return folderResponse.result.id;
        } catch (error) {
            console.error('Folder creation/search failed:', error);
            throw error;
        }
    }

    // アイテムを保存
    async setItem(key, value) {
        try {
            if (!this.initialized) {
                throw new Error('GDrive Storage not initialized');
            }

            if (!this.accessToken) {
                const authSuccess = await this.authenticate();
                if (!authSuccess) {
                    throw new Error('Authentication failed');
                }
            }

            const fileName = this.sanitizeFileName(key);
            const jsonData = JSON.stringify({
                key: key,
                value: value,
                timestamp: new Date().toISOString()
            });

            // 既存ファイルを検索
            const existingFile = await this.findFile(fileName);
            
            if (existingFile) {
                // 既存ファイルを更新
                await this.updateFile(existingFile.id, jsonData);
            } else {
                // 新しいファイルを作成
                await this.createFile(fileName, jsonData);
            }

            return true;
        } catch (error) {
            console.error('setItem failed:', error);
            // フォールバック: ローカルストレージに保存
            localStorage.setItem(key, value);
            return false;
        }
    }

    // アイテムを取得
    async getItem(key) {
        try {
            if (!this.initialized) {
                throw new Error('GDrive Storage not initialized');
            }

            if (!this.accessToken) {
                const authSuccess = await this.authenticate();
                if (!authSuccess) {
                    throw new Error('Authentication failed');
                }
            }

            const fileName = this.sanitizeFileName(key);
            const file = await this.findFile(fileName);
            
            if (!file) {
                return null;
            }

            const content = await this.downloadFile(file.id);
            const data = JSON.parse(content);
            return data.value;
        } catch (error) {
            console.error('getItem failed:', error);
            // フォールバック: ローカルストレージから取得
            return localStorage.getItem(key);
        }
    }

    // アイテムを削除
    async removeItem(key) {
        try {
            if (!this.initialized) {
                throw new Error('GDrive Storage not initialized');
            }

            if (!this.accessToken) {
                const authSuccess = await this.authenticate();
                if (!authSuccess) {
                    throw new Error('Authentication failed');
                }
            }

            const fileName = this.sanitizeFileName(key);
            const file = await this.findFile(fileName);
            
            if (file) {
                await gapi.client.drive.files.delete({
                    fileId: file.id
                });
            }

            return true;
        } catch (error) {
            console.error('removeItem failed:', error);
            // フォールバック: ローカルストレージから削除
            localStorage.removeItem(key);
            return false;
        }
    }

    // ファイル名をサニタイズ
    sanitizeFileName(key) {
        return key.replace(/[<>:"/\\|?*]/g, '_') + '.json';
    }

    // ファイルを検索
    async findFile(fileName) {
        try {
            const response = await gapi.client.drive.files.list({
                q: `name='${fileName}' and parents in '${this.folderId}'`,
                fields: 'files(id, name)'
            });

            return response.result.files.length > 0 ? response.result.files[0] : null;
        } catch (error) {
            console.error('File search failed:', error);
            return null;
        }
    }

    // ファイルを作成
    async createFile(fileName, content) {
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const metadata = {
            'name': fileName,
            'parents': [this.folderId]
        };

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: text/plain\r\n\r\n' +
            content +
            close_delim;

        const request = gapi.client.request({
            'path': 'https://www.googleapis.com/upload/drive/v3/files',
            'method': 'POST',
            'params': {'uploadType': 'multipart'},
            'headers': {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            'body': multipartRequestBody
        });

        return request;
    }

    // ファイルを更新
    async updateFile(fileId, content) {
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            '{}' +
            delimiter +
            'Content-Type: text/plain\r\n\r\n' +
            content +
            close_delim;

        const request = gapi.client.request({
            'path': `https://www.googleapis.com/upload/drive/v3/files/${fileId}`,
            'method': 'PATCH',
            'params': {'uploadType': 'multipart'},
            'headers': {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            'body': multipartRequestBody
        });

        return request;
    }

    // ファイルをダウンロード
    async downloadFile(fileId) {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        return response.body;
    }

    // 接続状態をチェック
    isConnected() {
        return this.initialized && this.accessToken && this.gapi && this.gapi.auth2.getAuthInstance().isSignedIn.get();
    }

    // 同期状態を表示
    showSyncStatus(isSync = true) {
        const indicator = document.getElementById('sync-indicator') || this.createSyncIndicator();
        indicator.textContent = isSync ? '☁️ Google Drive 同期済み' : '💾 ローカル保存のみ';
        indicator.className = isSync ? 'sync-indicator connected' : 'sync-indicator offline';
        indicator.style.display = 'block';
        
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 3000);
    }

    // 同期インジケーターを作成
    createSyncIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'sync-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #2ecc71;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            z-index: 1000;
            display: none;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(indicator);
        
        const style = document.createElement('style');
        style.textContent = `
            .sync-indicator.connected {
                background: #2ecc71;
            }
            .sync-indicator.offline {
                background: #f39c12;
            }
        `;
        document.head.appendChild(style);
        
        return indicator;
    }
}

// グローバルインスタンス
window.gdriveStorage = new GDriveStorage();

// localStorage の代替実装
window.gdriveLocalStorage = {
    async setItem(key, value) {
        const success = await window.gdriveStorage.setItem(key, value);
        window.gdriveStorage.showSyncStatus(success);
        return success;
    },
    
    async getItem(key) {
        return await window.gdriveStorage.getItem(key);
    },
    
    async removeItem(key) {
        const success = await window.gdriveStorage.removeItem(key);
        window.gdriveStorage.showSyncStatus(success);
        return success;
    }
};