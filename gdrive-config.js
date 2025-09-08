/**
 * Google Drive Storage Configuration
 * 設定管理とセットアップ用のコンポーネント
 */

class GDriveConfig {
    constructor() {
        this.config = this.loadConfig();
    }

    // 設定を読み込み
    loadConfig() {
        try {
            const saved = localStorage.getItem('gdriveConfig');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Config load error:', error);
        }

        // デフォルト設定
        return {
            clientId: '',
            apiKey: '',
            folderId: '',
            enabled: false,
            folderName: 'yousei-notebook-data'
        };
    }

    // 設定を保存
    saveConfig(config) {
        this.config = { ...this.config, ...config };
        localStorage.setItem('gdriveConfig', JSON.stringify(this.config));
    }

    // Google Drive を有効化
    async enable(clientId, apiKey, folderId = null) {
        try {
            const success = await window.gdriveStorage.init(clientId, apiKey, folderId);
            if (success) {
                this.saveConfig({
                    clientId: clientId,
                    apiKey: apiKey,
                    folderId: folderId,
                    enabled: true
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Enable failed:', error);
            return false;
        }
    }

    // Google Drive を無効化
    disable() {
        this.saveConfig({
            enabled: false
        });
    }

    // 設定UI を作成
    createConfigUI() {
        const modal = document.createElement('div');
        modal.className = 'gdrive-config-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;

        modal.innerHTML = `
            <div class="gdrive-config-content" style="
                background: white;
                padding: 30px;
                border-radius: 8px;
                width: 500px;
                max-width: 90%;
                max-height: 80%;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            ">
                <h2 style="margin-bottom: 20px; color: #333;">Google Drive 設定</h2>
                
                <div class="config-section" style="margin-bottom: 20px;">
                    <h3 style="color: #666; margin-bottom: 10px;">🔑 API 認証情報</h3>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Client ID:</label>
                        <input type="text" id="gdrive-client-id" value="${this.config.clientId}" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                               placeholder="Google Cloud Console から取得">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">API Key:</label>
                        <input type="text" id="gdrive-api-key" value="${this.config.apiKey}"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                               placeholder="Google Cloud Console から取得">
                    </div>
                </div>

                <div class="config-section" style="margin-bottom: 20px;">
                    <h3 style="color: #666; margin-bottom: 10px;">📁 保存先フォルダ</h3>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">フォルダID (オプション):</label>
                        <input type="text" id="gdrive-folder-id" value="${this.config.folderId}"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                               placeholder="空欄の場合は自動でフォルダを作成">
                        <small style="color: #666;">Google Drive で右クリック > 「リンクを取得」から URL のフォルダ ID を取得できます</small>
                    </div>
                </div>

                <div class="config-status" style="margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                    <strong>現在の状態:</strong> ${this.config.enabled ? '🟢 有効' : '🔴 無効'}
                </div>

                <div class="config-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="gdrive-test-btn" style="
                        padding: 10px 20px;
                        border: 1px solid #ddd;
                        background: white;
                        border-radius: 4px;
                        cursor: pointer;
                    ">接続テスト</button>
                    <button id="gdrive-save-btn" style="
                        padding: 10px 20px;
                        border: none;
                        background: #2ecc71;
                        color: white;
                        border-radius: 4px;
                        cursor: pointer;
                    ">保存して有効化</button>
                    <button id="gdrive-disable-btn" style="
                        padding: 10px 20px;
                        border: 1px solid #e74c3c;
                        background: white;
                        color: #e74c3c;
                        border-radius: 4px;
                        cursor: pointer;
                    ">無効化</button>
                    <button id="gdrive-close-btn" style="
                        padding: 10px 20px;
                        border: 1px solid #ddd;
                        background: white;
                        border-radius: 4px;
                        cursor: pointer;
                    ">閉じる</button>
                </div>

                <div class="config-help" style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 4px; font-size: 14px;">
                    <strong>📝 セットアップ手順:</strong>
                    <ol style="margin-top: 10px; margin-left: 20px;">
                        <li>Google Cloud Console で新しいプロジェクトを作成</li>
                        <li>Drive API を有効化</li>
                        <li>OAuth 2.0 クライアント ID を作成（Web アプリケーション用）</li>
                        <li>API キーを作成</li>
                        <li>上記で取得した Client ID と API Key を入力</li>
                        <li>「保存して有効化」をクリック</li>
                    </ol>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // イベントリスナーを追加
        this.attachConfigEvents(modal);

        return modal;
    }

    // 設定UI のイベントを追加
    attachConfigEvents(modal) {
        const testBtn = modal.querySelector('#gdrive-test-btn');
        const saveBtn = modal.querySelector('#gdrive-save-btn');
        const disableBtn = modal.querySelector('#gdrive-disable-btn');
        const closeBtn = modal.querySelector('#gdrive-close-btn');

        testBtn.addEventListener('click', async () => {
            const clientId = modal.querySelector('#gdrive-client-id').value.trim();
            const apiKey = modal.querySelector('#gdrive-api-key').value.trim();

            if (!clientId || !apiKey) {
                alert('Client ID と API Key を入力してください');
                return;
            }

            testBtn.textContent = '接続中...';
            testBtn.disabled = true;

            try {
                const success = await window.gdriveStorage.init(clientId, apiKey);
                if (success) {
                    const authSuccess = await window.gdriveStorage.authenticate();
                    if (authSuccess) {
                        alert('✅ 接続に成功しました！');
                    } else {
                        alert('❌ 認証に失敗しました。設定を確認してください。');
                    }
                } else {
                    alert('❌ 初期化に失敗しました。Client ID と API Key を確認してください。');
                }
            } catch (error) {
                console.error('Test failed:', error);
                alert('❌ 接続テストに失敗しました: ' + error.message);
            }

            testBtn.textContent = '接続テスト';
            testBtn.disabled = false;
        });

        saveBtn.addEventListener('click', async () => {
            const clientId = modal.querySelector('#gdrive-client-id').value.trim();
            const apiKey = modal.querySelector('#gdrive-api-key').value.trim();
            const folderId = modal.querySelector('#gdrive-folder-id').value.trim();

            if (!clientId || !apiKey) {
                alert('Client ID と API Key を入力してください');
                return;
            }

            saveBtn.textContent = '保存中...';
            saveBtn.disabled = true;

            try {
                const success = await this.enable(clientId, apiKey, folderId || null);
                if (success) {
                    alert('✅ Google Drive 連携が有効になりました！');
                    document.body.removeChild(modal);
                } else {
                    alert('❌ 設定の保存に失敗しました。');
                }
            } catch (error) {
                console.error('Save failed:', error);
                alert('❌ 設定の保存に失敗しました: ' + error.message);
            }

            saveBtn.textContent = '保存して有効化';
            saveBtn.disabled = false;
        });

        disableBtn.addEventListener('click', () => {
            if (confirm('Google Drive 連携を無効化しますか？\n※データはローカルストレージに保存されます')) {
                this.disable();
                alert('Google Drive 連携を無効化しました');
                document.body.removeChild(modal);
            }
        });

        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // 初期化済みかチェック
    isConfigured() {
        return this.config.enabled && this.config.clientId && this.config.apiKey;
    }

    // 自動初期化
    async autoInit() {
        if (this.isConfigured()) {
            try {
                const success = await window.gdriveStorage.init(
                    this.config.clientId,
                    this.config.apiKey,
                    this.config.folderId
                );
                return success;
            } catch (error) {
                console.error('Auto init failed:', error);
                return false;
            }
        }
        return false;
    }
}

// グローバルインスタンス
window.gdriveConfig = new GDriveConfig();