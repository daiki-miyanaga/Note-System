/**
 * Google Apps Script Configuration Manager
 * GASウェブアプリの設定管理とセットアップ用コンポーネント
 * Google Cloud Console不要のシンプルな設定
 */

class GASConfig {
    constructor() {
        this.config = this.loadConfig();
        this.statusCheckInterval = null;
    }

    // 設定を読み込み
    loadConfig() {
        try {
            const saved = localStorage.getItem('gasConfig');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('GAS Config load error:', error);
        }

        // デフォルト設定
        return {
            webAppUrl: '',
            storeId: 'KRB01',
            enabled: false,
            autoSync: true,
            syncInterval: 300000, // 5分
            lastSync: null
        };
    }

    // 設定を保存
    saveConfig(config) {
        this.config = { ...this.config, ...config };
        localStorage.setItem('gasConfig', JSON.stringify(this.config));
    }

    // GAS ウェブアプリを有効化
    async enable(webAppUrl, storeId = 'KRB01') {
        try {
            const success = await window.gasStorage.init(webAppUrl, storeId);
            if (success) {
                this.saveConfig({
                    webAppUrl: webAppUrl,
                    storeId: storeId,
                    enabled: true,
                    lastSync: new Date().toISOString()
                });
                
                // 自動同期を開始
                if (this.config.autoSync) {
                    this.startAutoSync();
                }
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('GAS enable failed:', error);
            return false;
        }
    }

    // GAS ウェブアプリを無効化
    disable() {
        this.saveConfig({
            enabled: false
        });
        
        // 自動同期を停止
        this.stopAutoSync();
    }

    // 自動同期を開始
    startAutoSync() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }

        if (this.config.enabled && this.config.autoSync) {
            this.statusCheckInterval = setInterval(async () => {
                try {
                    await this.performAutoSync();
                } catch (error) {
                    console.error('Auto sync failed:', error);
                }
            }, this.config.syncInterval);
            
            console.log(`Auto sync started (interval: ${this.config.syncInterval / 1000}s)`);
        }
    }

    // 自動同期を停止
    stopAutoSync() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
            console.log('Auto sync stopped');
        }
    }

    // 自動同期実行
    async performAutoSync() {
        if (!this.config.enabled || !window.gasStorage.isConnected()) {
            return false;
        }

        try {
            const success = await window.gasStorage.syncWithLocalStorage();
            if (success) {
                this.saveConfig({
                    lastSync: new Date().toISOString()
                });
            }
            return success;
        } catch (error) {
            console.error('Auto sync error:', error);
            return false;
        }
    }

    // 手動同期実行
    async performManualSync() {
        if (!this.config.enabled) {
            throw new Error('GAS is not enabled');
        }

        return await this.performAutoSync();
    }

    // 設定UI を作成
    createConfigUI() {
        const modal = document.createElement('div');
        modal.className = 'gas-config-modal';
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
            <div class="gas-config-content" style="
                background: white;
                padding: 30px;
                border-radius: 8px;
                width: 600px;
                max-width: 90%;
                max-height: 80%;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            ">
                <h2 style="margin-bottom: 20px; color: #333;">
                    📊 Google Apps Script 設定
                </h2>
                
                <div class="config-section" style="margin-bottom: 25px;">
                    <h3 style="color: #666; margin-bottom: 15px;">🌐 ウェブアプリURL</h3>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">GAS ウェブアプリ URL:</label>
                        <input type="url" id="gas-webapp-url" value="${this.config.webAppUrl}" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
                               placeholder="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec">
                        <small style="color: #666; display: block; margin-top: 5px;">
                            GAS プロジェクトをウェブアプリとしてデプロイした際のURLを入力してください
                        </small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">店舗ID:</label>
                        <input type="text" id="gas-store-id" value="${this.config.storeId}"
                               style="width: 200px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                               placeholder="KRB01">
                        <small style="color: #666; display: block; margin-top: 5px;">
                            データ保存時に使用する店舗識別子
                        </small>
                    </div>
                </div>

                <div class="config-section" style="margin-bottom: 25px;">
                    <h3 style="color: #666; margin-bottom: 15px;">⚙️ 同期設定</h3>
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="gas-auto-sync" ${this.config.autoSync ? 'checked' : ''}>
                            <span>自動同期を有効にする</span>
                        </label>
                        <small style="color: #666; display: block; margin-top: 5px;">
                            定期的にローカルデータをGASに自動同期します
                        </small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">同期間隔:</label>
                        <select id="gas-sync-interval" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="60000" ${this.config.syncInterval === 60000 ? 'selected' : ''}>1分</option>
                            <option value="300000" ${this.config.syncInterval === 300000 ? 'selected' : ''}>5分</option>
                            <option value="600000" ${this.config.syncInterval === 600000 ? 'selected' : ''}>10分</option>
                            <option value="1800000" ${this.config.syncInterval === 1800000 ? 'selected' : ''}>30分</option>
                            <option value="3600000" ${this.config.syncInterval === 3600000 ? 'selected' : ''}>1時間</option>
                        </select>
                    </div>
                </div>

                <div class="config-status" style="margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong>現在の状態:</strong> 
                        <span id="gas-status-indicator" style="padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                            ${this.config.enabled ? '🟢 有効' : '🔴 無効'}
                        </span>
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        <div>最終同期: ${this.config.lastSync ? new Date(this.config.lastSync).toLocaleString('ja-JP') : '未同期'}</div>
                        <div>自動同期: ${this.config.autoSync ? '有効' : '無効'}</div>
                    </div>
                </div>

                <div class="config-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-bottom: 20px;">
                    <button id="gas-test-btn" style="
                        padding: 12px 20px;
                        border: 1px solid #3498db;
                        background: white;
                        color: #3498db;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">接続テスト</button>
                    <button id="gas-sync-btn" style="
                        padding: 12px 20px;
                        border: 1px solid #2ecc71;
                        background: white;
                        color: #2ecc71;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">手動同期</button>
                    <button id="gas-save-btn" style="
                        padding: 12px 20px;
                        border: none;
                        background: #3498db;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">保存して有効化</button>
                    <button id="gas-disable-btn" style="
                        padding: 12px 20px;
                        border: 1px solid #e74c3c;
                        background: white;
                        color: #e74c3c;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">無効化</button>
                    <button id="gas-close-btn" style="
                        padding: 12px 20px;
                        border: 1px solid #ddd;
                        background: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">閉じる</button>
                </div>

                <div class="config-help" style="padding: 20px; background: #fff3cd; border-radius: 6px; font-size: 14px;">
                    <strong>📋 GAS セットアップ手順:</strong>
                    <ol style="margin-top: 15px; margin-left: 20px; line-height: 1.6;">
                        <li>Google Apps Script (script.google.com) にアクセス</li>
                        <li>新しいプロジェクトを作成</li>
                        <li><code>gas-webapp.gs</code> ファイルの内容をコピー＆ペースト</li>
                        <li>「デプロイ」→「新しいデプロイ」を選択</li>
                        <li>種類：「ウェブアプリ」を選択</li>
                        <li>次のユーザーとして実行：「自分」を選択</li>
                        <li>アクセスできるユーザー：「すべてのユーザー」を選択</li>
                        <li>「デプロイ」をクリック</li>
                        <li>表示されたウェブアプリURLを上記に入力</li>
                        <li>「保存して有効化」をクリック</li>
                    </ol>
                    <div style="margin-top: 15px; padding: 10px; background: #e8f4ff; border-radius: 4px;">
                        <strong>💡 ポイント:</strong> Google Cloud Console の設定は不要です。
                        GAS のウェブアプリ機能のみを使用します。
                    </div>
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
        const testBtn = modal.querySelector('#gas-test-btn');
        const syncBtn = modal.querySelector('#gas-sync-btn');
        const saveBtn = modal.querySelector('#gas-save-btn');
        const disableBtn = modal.querySelector('#gas-disable-btn');
        const closeBtn = modal.querySelector('#gas-close-btn');

        // 接続テスト
        testBtn.addEventListener('click', async () => {
            const webAppUrl = modal.querySelector('#gas-webapp-url').value.trim();

            if (!webAppUrl) {
                alert('ウェブアプリURLを入力してください');
                return;
            }

            testBtn.textContent = '接続中...';
            testBtn.disabled = true;

            try {
                const tempStorage = new GASStorage();
                const success = await tempStorage.init(webAppUrl, this.config.storeId);
                if (success) {
                    alert('✅ 接続に成功しました！GAS ウェブアプリが正常に動作しています。');
                } else {
                    alert('❌ 接続に失敗しました。URLを確認してください。');
                }
            } catch (error) {
                console.error('Test failed:', error);
                alert('❌ 接続テストに失敗しました: ' + error.message);
            }

            testBtn.textContent = '接続テスト';
            testBtn.disabled = false;
        });

        // 手動同期
        syncBtn.addEventListener('click', async () => {
            if (!this.config.enabled) {
                alert('先にGAS設定を有効化してください');
                return;
            }

            syncBtn.textContent = '同期中...';
            syncBtn.disabled = true;

            try {
                const success = await this.performManualSync();
                if (success) {
                    alert('✅ 同期が完了しました！');
                    // ステータス表示を更新
                    const statusSection = modal.querySelector('.config-status');
                    statusSection.innerHTML = statusSection.innerHTML.replace(
                        /最終同期: [^<]+/,
                        `最終同期: ${new Date().toLocaleString('ja-JP')}`
                    );
                } else {
                    alert('❌ 同期に失敗しました。');
                }
            } catch (error) {
                console.error('Sync failed:', error);
                alert('❌ 同期に失敗しました: ' + error.message);
            }

            syncBtn.textContent = '手動同期';
            syncBtn.disabled = false;
        });

        // 保存して有効化
        saveBtn.addEventListener('click', async () => {
            const webAppUrl = modal.querySelector('#gas-webapp-url').value.trim();
            const storeId = modal.querySelector('#gas-store-id').value.trim();
            const autoSync = modal.querySelector('#gas-auto-sync').checked;
            const syncInterval = parseInt(modal.querySelector('#gas-sync-interval').value);

            if (!webAppUrl) {
                alert('ウェブアプリURLを入力してください');
                return;
            }

            if (!storeId) {
                alert('店舗IDを入力してください');
                return;
            }

            saveBtn.textContent = '保存中...';
            saveBtn.disabled = true;

            try {
                // 先に同期設定を保存
                this.saveConfig({
                    autoSync: autoSync,
                    syncInterval: syncInterval
                });

                const success = await this.enable(webAppUrl, storeId);
                if (success) {
                    alert('✅ GAS連携が有効になりました！');
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

        // 無効化
        disableBtn.addEventListener('click', () => {
            if (confirm('GAS連携を無効化しますか？\n※データはローカルストレージに保存されます')) {
                this.disable();
                alert('GAS連携を無効化しました');
                document.body.removeChild(modal);
            }
        });

        // 閉じる
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
        return this.config.enabled && this.config.webAppUrl;
    }

    // 自動初期化
    async autoInit() {
        if (this.isConfigured()) {
            try {
                const success = await window.gasStorage.init(
                    this.config.webAppUrl,
                    this.config.storeId
                );
                
                if (success && this.config.autoSync) {
                    this.startAutoSync();
                }
                
                return success;
            } catch (error) {
                console.error('GAS auto init failed:', error);
                return false;
            }
        }
        return false;
    }

    // 現在の設定を取得
    getConfig() {
        return { ...this.config };
    }
}

// グローバルインスタンス
window.gasConfig = new GASConfig();