/**
 * Google Apps Script ウェブアプリケーション
 * 洋生ノートデータの保存・取得用バックエンド
 * デプロイ: ウェブアプリとして公開 (アクセス: すべてのユーザー)
 */

// スプレッドシートID（データ保存用）
const SPREADSHEET_ID = ''; // デプロイ時に設定

// メイン処理関数 (GET/POST 両方対応)
function doGet(e) {
    return handleRequest(e.parameter || {});
}

function doPost(e) {
    try {
        const postData = JSON.parse(e.postData.contents);
        return handleRequest(postData);
    } catch (error) {
        return createResponse('error', 'Invalid JSON in POST data: ' + error.message);
    }
}

// リクエスト処理のメイン関数
function handleRequest(params) {
    try {
        const action = params.action;
        
        if (!action) {
            // デフォルトの情報レスポンスを返す
            return createResponse('success', {
                message: '洋生ノート GAS Web API',
                version: '1.0',
                usage: 'Add ?action=ping to test the connection, or use POST with JSON data',
                availableActions: [
                    'ping - Connection test',
                    'setItem - Save data',
                    'getItem - Retrieve data',
                    'removeItem - Delete data', 
                    'getAllItems - Get all items',
                    'getDateRange - Get data by date range',
                    'getPreviousYearData - Get previous year data',
                    'createBackup - Create backup',
                    'getSyncStatus - Get sync status'
                ],
                example: 'Add ?action=ping to the URL to test the connection'
            });
        }

        console.log(`Processing action: ${action}`);

        switch (action) {
            case 'ping':
                return handlePing();
                
            case 'setItem':
                return handleSetItem(params);
                
            case 'getItem':
                return handleGetItem(params);
                
            case 'removeItem':
                return handleRemoveItem(params);
                
            case 'getAllItems':
                return handleGetAllItems(params);
                
            case 'getDateRange':
                return handleGetDateRange(params);
                
            case 'getPreviousYearData':
                return handleGetPreviousYearData(params);
                
            case 'createBackup':
                return handleCreateBackup(params);
                
            case 'getSyncStatus':
                return handleGetSyncStatus(params);
                
            default:
                return createResponse('error', 'Unknown action: ' + action);
        }
    } catch (error) {
        console.error('Request handling error:', error);
        return createResponse('error', 'Server error: ' + error.message);
    }
}

// レスポンス作成
function createResponse(status, data, error = null) {
    const response = {
        status: status,
        timestamp: new Date().toISOString()
    };

    if (status === 'success') {
        response.data = data;
    } else if (status === 'error') {
        response.error = error || data;
    } else if (status === 'not_found') {
        response.message = data;
    }

    return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
}

// 接続テスト
function handlePing() {
    return createResponse('success', {
        message: 'GAS Web App is running',
        version: '1.0',
        timestamp: new Date().toISOString()
    });
}

// データ保存
function handleSetItem(params) {
    try {
        const { key, value, storeId, timestamp } = params;
        
        if (!key) {
            return createResponse('error', 'Key is required');
        }
        
        if (value === undefined) {
            return createResponse('error', 'Value is required');
        }

        const sheet = getOrCreateSheet(storeId || 'default');
        
        // 既存行を検索
        const data = sheet.getDataRange().getValues();
        const headerRow = ['key', 'value', 'timestamp', 'lastModified'];
        
        if (data.length === 0) {
            // ヘッダーを作成
            sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
        }

        let rowIndex = -1;
        for (let i = 1; i < data.length; i++) { // ヘッダーをスキップ
            if (data[i][0] === key) {
                rowIndex = i + 1; // 1-indexed
                break;
            }
        }

        const now = new Date().toISOString();
        const rowData = [key, value, timestamp || now, now];

        if (rowIndex > 0) {
            // 既存行を更新
            sheet.getRange(rowIndex, 1, 1, 4).setValues([rowData]);
        } else {
            // 新規行を追加
            sheet.appendRow(rowData);
        }

        return createResponse('success', { 
            key: key, 
            saved: true,
            timestamp: now
        });

    } catch (error) {
        console.error('SetItem error:', error);
        return createResponse('error', 'Failed to save item: ' + error.message);
    }
}

// データ取得
function handleGetItem(params) {
    try {
        const { key, storeId } = params;
        
        if (!key) {
            return createResponse('error', 'Key is required');
        }

        const sheet = getOrCreateSheet(storeId || 'default');
        const data = sheet.getDataRange().getValues();
        
        if (data.length <= 1) {
            return createResponse('not_found', 'No data found');
        }

        // キーで検索
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === key) {
                return createResponse('success', data[i][1]); // value を返す
            }
        }

        return createResponse('not_found', 'Key not found: ' + key);

    } catch (error) {
        console.error('GetItem error:', error);
        return createResponse('error', 'Failed to get item: ' + error.message);
    }
}

// データ削除
function handleRemoveItem(params) {
    try {
        const { key, storeId } = params;
        
        if (!key) {
            return createResponse('error', 'Key is required');
        }

        const sheet = getOrCreateSheet(storeId || 'default');
        const data = sheet.getDataRange().getValues();
        
        if (data.length <= 1) {
            return createResponse('not_found', 'No data found');
        }

        // キーで検索して削除
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === key) {
                sheet.deleteRow(i + 1);
                return createResponse('success', { 
                    key: key, 
                    removed: true 
                });
            }
        }

        return createResponse('not_found', 'Key not found: ' + key);

    } catch (error) {
        console.error('RemoveItem error:', error);
        return createResponse('error', 'Failed to remove item: ' + error.message);
    }
}

// 全データ取得
function handleGetAllItems(params) {
    try {
        const { prefix, storeId } = params;
        const sheet = getOrCreateSheet(storeId || 'default');
        const data = sheet.getDataRange().getValues();
        
        if (data.length <= 1) {
            return createResponse('success', []);
        }

        const items = [];
        for (let i = 1; i < data.length; i++) {
            const key = data[i][0];
            const value = data[i][1];
            
            if (!prefix || key.startsWith(prefix)) {
                items.push({
                    key: key,
                    value: value,
                    timestamp: data[i][2],
                    lastModified: data[i][3]
                });
            }
        }

        return createResponse('success', items);

    } catch (error) {
        console.error('GetAllItems error:', error);
        return createResponse('error', 'Failed to get all items: ' + error.message);
    }
}

// 日付範囲でデータ取得
function handleGetDateRange(params) {
    try {
        const { startDate, endDate, storeId } = params;
        const sheet = getOrCreateSheet(storeId || 'default');
        const data = sheet.getDataRange().getValues();
        
        if (data.length <= 1) {
            return createResponse('success', []);
        }

        const items = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let i = 1; i < data.length; i++) {
            const key = data[i][0];
            
            // 洋生ノートキー形式: yousei:STORE:YYYY-MM-DD
            if (key.startsWith('yousei:')) {
                const parts = key.split(':');
                if (parts.length >= 3) {
                    const dateStr = parts[2];
                    const itemDate = new Date(dateStr);
                    
                    if (itemDate >= start && itemDate <= end) {
                        items.push({
                            key: key,
                            value: data[i][1],
                            date: dateStr,
                            timestamp: data[i][2],
                            lastModified: data[i][3]
                        });
                    }
                }
            }
        }

        // 日付順でソート
        items.sort((a, b) => a.date.localeCompare(b.date));

        return createResponse('success', items);

    } catch (error) {
        console.error('GetDateRange error:', error);
        return createResponse('error', 'Failed to get date range: ' + error.message);
    }
}

// 前年同曜日データ取得
function handleGetPreviousYearData(params) {
    try {
        const { targetDate, storeId } = params;
        
        const target = new Date(targetDate);
        const prevYear = new Date(target);
        prevYear.setFullYear(target.getFullYear() - 1);
        
        // 前年同曜日を探す（±3日の範囲）
        const prevYearDateStr = prevYear.toISOString().slice(0, 10);
        const key = `yousei:${storeId || 'default'}:${prevYearDateStr}`;
        
        const result = handleGetItem({ key: key, storeId: storeId });
        
        if (result.status === 'success') {
            return createResponse('success', result.data);
        } else {
            // 前後の日付も検索
            for (let offset = 1; offset <= 3; offset++) {
                // 前の日
                const prevDate = new Date(prevYear);
                prevDate.setDate(prevDate.getDate() - offset);
                const prevKey = `yousei:${storeId || 'default'}:${prevDate.toISOString().slice(0, 10)}`;
                const prevResult = handleGetItem({ key: prevKey, storeId: storeId });
                if (prevResult.status === 'success') {
                    return createResponse('success', prevResult.data);
                }
                
                // 後の日
                const nextDate = new Date(prevYear);
                nextDate.setDate(nextDate.getDate() + offset);
                const nextKey = `yousei:${storeId || 'default'}:${nextDate.toISOString().slice(0, 10)}`;
                const nextResult = handleGetItem({ key: nextKey, storeId: storeId });
                if (nextResult.status === 'success') {
                    return createResponse('success', nextResult.data);
                }
            }
            
            return createResponse('not_found', 'Previous year data not found');
        }

    } catch (error) {
        console.error('GetPreviousYearData error:', error);
        return createResponse('error', 'Failed to get previous year data: ' + error.message);
    }
}

// バックアップ作成
function handleCreateBackup(params) {
    try {
        const { storeId } = params;
        const sheet = getOrCreateSheet(storeId || 'default');
        
        // バックアップシートを作成
        const backupSheetName = `backup_${storeId || 'default'}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
        const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
        
        // 既存のバックアップシートがあれば削除
        const existingBackup = spreadsheet.getSheetByName(backupSheetName);
        if (existingBackup) {
            spreadsheet.deleteSheet(existingBackup);
        }
        
        // シートをコピー
        const backupSheet = sheet.copyTo(spreadsheet);
        backupSheet.setName(backupSheetName);

        return createResponse('success', {
            backupSheet: backupSheetName,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('CreateBackup error:', error);
        return createResponse('error', 'Failed to create backup: ' + error.message);
    }
}

// 同期状態取得
function handleGetSyncStatus(params) {
    try {
        const { storeId } = params;
        const sheet = getOrCreateSheet(storeId || 'default');
        const data = sheet.getDataRange().getValues();
        
        let lastModified = null;
        let itemCount = Math.max(0, data.length - 1); // ヘッダー行を除く

        if (data.length > 1) {
            // 最新の更新日時を取得
            for (let i = 1; i < data.length; i++) {
                const modified = data[i][3]; // lastModified column
                if (modified && (!lastModified || new Date(modified) > new Date(lastModified))) {
                    lastModified = modified;
                }
            }
        }

        return createResponse('success', {
            lastSync: lastModified,
            itemCount: itemCount,
            sheetName: sheet.getName()
        });

    } catch (error) {
        console.error('GetSyncStatus error:', error);
        return createResponse('error', 'Failed to get sync status: ' + error.message);
    }
}

// スプレッドシートのシートを取得または作成
function getOrCreateSheet(sheetName) {
    const spreadsheetId = getSpreadsheetId();
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        
        // ヘッダー行を追加
        const headers = ['key', 'value', 'timestamp', 'lastModified'];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        sheet.setFrozenRows(1);
        
        console.log(`Created new sheet: ${sheetName}`);
    }
    
    return sheet;
}

// スプレッドシートID を取得（設定または自動作成）
function getSpreadsheetId() {
    if (SPREADSHEET_ID) {
        return SPREADSHEET_ID;
    }
    
    // PropertiesService から取得を試行
    const properties = PropertiesService.getScriptProperties();
    let spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    
    if (!spreadsheetId) {
        // 新しいスプレッドシートを作成
        const spreadsheet = SpreadsheetApp.create('洋生ノート データストア');
        spreadsheetId = spreadsheet.getId();
        
        // PropertiesService に保存
        properties.setProperty('SPREADSHEET_ID', spreadsheetId);
        
        console.log(`Created new spreadsheet: ${spreadsheetId}`);
    }
    
    return spreadsheetId;
}

// 手動でスプレッドシートIDを設定する関数（初回セットアップ用）
function setSpreadsheetId(spreadsheetId) {
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty('SPREADSHEET_ID', spreadsheetId);
    console.log(`Spreadsheet ID set to: ${spreadsheetId}`);
}

// テスト関数
function testEndpoint() {
    console.log('Testing GAS endpoint...');
    
    // ping テスト
    const pingResult = handlePing();
    console.log('Ping result:', pingResult.getContent());
    
    // データ保存テスト
    const setResult = handleSetItem({
        action: 'setItem',
        key: 'test:key',
        value: JSON.stringify({ test: 'data', timestamp: new Date().toISOString() }),
        storeId: 'test'
    });
    console.log('Set result:', setResult.getContent());
    
    // データ取得テスト
    const getResult = handleGetItem({
        action: 'getItem',
        key: 'test:key',
        storeId: 'test'
    });
    console.log('Get result:', getResult.getContent());
}