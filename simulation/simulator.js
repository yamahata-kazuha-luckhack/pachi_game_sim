// パチスロホールシミュレーター メインスクリプト

class PachislotSimulator {
    constructor() {
        this.gameState = {
            currentWeek: 1,
            money: 10000000, // 1000万円
            ownedMachines: new Map(), // 所有パチスロ台
            selectedMachine: null
        };
        
        this.machineData = null;
        this.popularityMessages = []; // 人気度変動メッセージ
        this.init();
    }

    async init() {
        try {
            // CSVデータを読み込み
            await this.loadMachineData();
            
            // UIイベントリスナーを設定
            this.setupEventListeners();
            
            // 初期表示
            this.updateUI();
            this.displayMachines();
            this.displayPopularityMessages();
            
            console.log('パチスロホールシミュレーターが初期化されました');
        } catch (error) {
            console.error('初期化エラー:', error);
            this.showMessage('エラー', 'データの読み込みに失敗しました');
        }
    }

    // CSVデータを読み込み
    async loadMachineData() {
        try {
            const csvText = await CSVUtils.loadCSVFile('../data/pachislot_machines.csv');
            this.machineData = CSVUtils.parseCSVText(csvText);
            console.log(`${this.machineData.length}台のパチスロ台データを読み込みました`);
        } catch (error) {
            throw new Error('CSVデータの読み込みに失敗しました');
        }
    }

    // イベントリスナーを設定
    setupEventListeners() {
        // 検索機能
        document.getElementById('search-btn').addEventListener('click', () => this.searchMachines());
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchMachines();
        });

        // フィルター機能
        document.getElementById('maker-filter').addEventListener('change', () => this.filterMachines());
        document.getElementById('popularity-filter').addEventListener('change', () => this.filterMachines());

        // 購入・売却ボタン
        document.getElementById('purchase-btn').addEventListener('click', () => this.purchaseMachine());
        document.getElementById('sale-btn').addEventListener('click', () => this.sellMachine());

        // 数量選択の変更
        document.getElementById('purchase-quantity').addEventListener('change', () => this.updatePurchaseInfo());
        document.getElementById('sale-quantity').addEventListener('change', () => this.updateSaleInfo());

        // ゲームコントロール
        document.getElementById('next-week-btn').addEventListener('click', () => this.nextWeek());
        document.getElementById('reset-game-btn').addEventListener('click', () => this.resetGame());

        // モーダル
        document.getElementById('modal-cancel').addEventListener('click', () => this.hideModal('confirm-modal'));
        document.getElementById('modal-confirm').addEventListener('click', () => this.executeConfirmedAction());
        document.getElementById('message-close').addEventListener('click', () => this.hideModal('message-modal'));
    }

    // パチスロ台一覧を表示
    displayMachines(machines = null) {
        const machineList = document.getElementById('machine-list');
        const machinesToShow = machines || this.machineData;
        
        machineList.innerHTML = '';
        
        if (!machinesToShow || machinesToShow.length === 0) {
            machineList.innerHTML = '<p class="no-machines">パチスロ台が見つかりません</p>';
            return;
        }

        machinesToShow.forEach(machine => {
            const machineItem = this.createMachineItem(machine);
            machineList.appendChild(machineItem);
        });
    }

    // パチスロ台アイテムを作成
    createMachineItem(machine) {
        const div = document.createElement('div');
        div.className = 'machine-item';
        div.dataset.machineId = machine.ID;
        
        const popularityClass = this.getPopularityClass(machine.総合人気度);
        const popularityText = this.getPopularityText(machine.総合人気度);
        
        // 人気度予測を取得
        const forecast = this.machineData.getPopularityForecast(machine.ID);
        let forecastHtml = '';
        if (forecast && forecast.confidence > 0.3) {
            const trendIcon = forecast.trend === 'up' ? '📈' : forecast.trend === 'down' ? '📉' : '➡️';
            forecastHtml = `<div class="forecast ${forecast.trend}">${trendIcon} 予測: ${forecast.predictedChange > 0 ? '+' : ''}${forecast.predictedChange}</div>`;
        }
        
        div.innerHTML = `
            <div class="machine-header">
                <h3>${machine.名前}</h3>
                <span class="popularity ${popularityClass}">${popularityText}</span>
            </div>
            <div class="machine-details">
                <p><strong>メーカー:</strong> ${machine.メーカー}</p>
                <p><strong>価格:</strong> ¥${machine.価格.toLocaleString()}</p>
                <p><strong>総合人気度:</strong> ${machine.総合人気度}</p>
                ${forecastHtml}
            </div>
        `;
        
        div.addEventListener('click', () => this.selectMachine(machine));
        return div;
    }

    // 人気度クラスを取得
    getPopularityClass(popularity) {
        if (popularity >= 7.5) return 'high';
        if (popularity <= 2.5) return 'low';
        return 'medium';
    }

    // 人気度テキストを取得
    getPopularityText(popularity) {
        if (popularity >= 7.5) return '高人気';
        if (popularity <= 2.5) return '低人気';
        return '普通人気';
    }

    // パチスロ台を選択
    selectMachine(machine) {
        this.gameState.selectedMachine = machine;
        this.displayMachineDetail(machine);
        this.showTradePanel();
        this.updatePurchaseInfo();
        this.updateSaleInfo();
        
        // 選択状態を更新
        document.querySelectorAll('.machine-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-machine-id="${machine.ID}"]`).classList.add('selected');
    }

    // パチスロ台詳細を表示
    displayMachineDetail(machine) {
        const detailArea = document.getElementById('machine-detail');
        const popularityClass = this.getPopularityClass(machine.総合人気度);
        const popularityText = this.getPopularityText(machine.総合人気度);
        
        // 人気度履歴を取得
        const history = this.machineData.getPopularityHistory(machine.ID);
        const historyHtml = this.createHistoryChart(history);
        
        // 人気度予測を取得
        const forecast = this.machineData.getPopularityForecast(machine.ID);
        let forecastHtml = '';
        if (forecast) {
            const trendIcon = forecast.trend === 'up' ? '📈' : forecast.trend === 'down' ? '📉' : '➡️';
            const confidenceText = Math.round(forecast.confidence * 100);
            forecastHtml = `
                <div class="forecast-info">
                    <h4>人気度予測</h4>
                    <p>${trendIcon} 予測変動: ${forecast.predictedChange > 0 ? '+' : ''}${forecast.predictedChange}</p>
                    <p>確信度: ${confidenceText}%</p>
                </div>
            `;
        }
        
        detailArea.innerHTML = `
            <h2>${machine.名前}</h2>
            <div class="machine-info">
                <div class="info-row">
                    <span class="label">メーカー:</span>
                    <span class="value">${machine.メーカー}</span>
                </div>
                <div class="info-row">
                    <span class="label">シリーズ:</span>
                    <span class="value">${machine.シリーズ}</span>
                </div>
                <div class="info-row">
                    <span class="label">IPタイプ:</span>
                    <span class="value">${machine.IPタイプ}</span>
                </div>
                <div class="info-row">
                    <span class="label">価格:</span>
                    <span class="value">¥${machine.価格.toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="label">何号機か:</span>
                    <span class="value">${machine.何号機か}</span>
                </div>
                <div class="info-row">
                    <span class="label">台タイプ:</span>
                    <span class="value">${machine.台タイプ}</span>
                </div>
                <div class="info-row">
                    <span class="label">コイン単価:</span>
                    <span class="value">¥${machine.コイン単価}</span>
                </div>
                <div class="info-row">
                    <span class="label">純増:</span>
                    <span class="value">${machine.純増}</span>
                </div>
                <div class="info-row">
                    <span class="label">1000円当たりのコイン持ち:</span>
                    <span class="value">${machine['1000円当たりのコイン持ち']}枚</span>
                </div>
                <div class="info-row">
                    <span class="label">発売日:</span>
                    <span class="value">${machine.発売日}</span>
                </div>
            </div>
            
            <div class="popularity-section">
                <h3>人気度情報</h3>
                <div class="popularity-breakdown">
                    <div class="popularity-item">
                        <span class="label">スペック:</span>
                        <span class="value">${machine.人気度_スペック}/10</span>
                    </div>
                    <div class="popularity-item">
                        <span class="label">IP:</span>
                        <span class="value">${machine.人気度_IP}/10</span>
                    </div>
                    <div class="popularity-item">
                        <span class="label">発売日:</span>
                        <span class="value">${machine.人気度_発売日}/10</span>
                    </div>
                    <div class="popularity-item total">
                        <span class="label">総合人気度:</span>
                        <span class="value ${popularityClass}">${machine.総合人気度}/10 (${popularityText})</span>
                    </div>
                </div>
                ${forecastHtml}
            </div>
            
            <div class="description-section">
                <h3>台の説明</h3>
                <p>${machine.台の説明}</p>
            </div>
            
            <div class="history-section">
                <h3>人気度履歴</h3>
                ${historyHtml}
            </div>
        `;
    }

    // 人気度履歴チャートを作成
    createHistoryChart(history) {
        if (history.length < 2) {
            return '<p>履歴データが不足しています</p>';
        }
        
        const chartData = history.map(h => ({
            week: h.week,
            popularity: h.popularity,
            change: h.change
        }));
        
        let chartHtml = '<div class="history-chart">';
        chartData.forEach((data, index) => {
            const changeClass = data.change > 0 ? 'positive' : data.change < 0 ? 'negative' : 'neutral';
            const changeIcon = data.change > 0 ? '↗️' : data.change < 0 ? '↘️' : '→';
            
            chartHtml += `
                <div class="chart-item ${changeClass}">
                    <div class="week">第${data.week}週</div>
                    <div class="popularity">${data.popularity}</div>
                    <div class="change">${changeIcon} ${data.change > 0 ? '+' : ''}${data.change}</div>
                </div>
            `;
        });
        chartHtml += '</div>';
        
        return chartHtml;
    }

    // 取引パネルを表示
    showTradePanel() {
        const tradePanel = document.getElementById('trade-panel');
        tradePanel.style.display = 'block';
    }

    // 購入情報を更新
    updatePurchaseInfo() {
        if (!this.gameState.selectedMachine) return;
        
        const quantity = parseInt(document.getElementById('purchase-quantity').value);
        const machine = this.gameState.selectedMachine;
        const totalPrice = quantity * machine.価格;
        
        document.getElementById('purchase-total').textContent = `¥${totalPrice.toLocaleString()}`;
        
        // 島単位購入の情報も表示
        if (quantity >= 20) {
            const islandPrice = calculateIslandPrice(machine.価格, quantity);
            const savings = totalPrice - islandPrice;
            document.getElementById('island-discount').textContent = `島割引適用: ¥${savings.toLocaleString()}お得`;
            document.getElementById('island-discount').style.display = 'block';
        } else {
            document.getElementById('island-discount').style.display = 'none';
        }
    }

    // 売却情報を更新
    updateSaleInfo() {
        if (!this.gameState.selectedMachine) return;
        
        const machine = this.gameState.selectedMachine;
        const ownedQuantity = this.gameState.ownedMachines.get(machine.ID) || 0;
        
        if (ownedQuantity === 0) {
            document.getElementById('sale-section').style.display = 'none';
            return;
        }
        
        document.getElementById('sale-section').style.display = 'block';
        
        const saleQuantitySelect = document.getElementById('sale-quantity');
        saleQuantitySelect.innerHTML = '';
        
        for (let i = 1; i <= ownedQuantity; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}台`;
            saleQuantitySelect.appendChild(option);
        }
        
        this.updateSalePrice();
    }

    // 売却価格を更新
    updateSalePrice() {
        if (!this.gameState.selectedMachine) return;
        
        const quantity = parseInt(document.getElementById('sale-quantity').value);
        const machine = this.gameState.selectedMachine;
        const marketPrice = calculateUsedPrice(machine.価格, machine.総合人気度);
        const salePrice = calculateSalePrice(marketPrice) * quantity;
        
        document.getElementById('sale-price').textContent = `¥${salePrice.toLocaleString()}`;
        document.getElementById('market-price').textContent = `市場価格: ¥${marketPrice.toLocaleString()}`;
    }

    // 売却価格を計算
    calculateSalePrice(marketPrice) {
        return Math.round(marketPrice * 0.9);
    }

    // パチスロ台を検索
    searchMachines() {
        const query = document.getElementById('search-input').value;
        const results = this.machineData.searchMachines(query);
        this.displayMachines(results);
    }

    // パチスロ台をフィルター
    filterMachines() {
        const maker = document.getElementById('maker-filter').value;
        const popularity = document.getElementById('popularity-filter').value;
        const results = this.machineData.filterMachines(maker, popularity);
        this.displayMachines(results);
    }

    // パチスロ台を購入
    purchaseMachine() {
        if (!this.gameState.selectedMachine) {
            this.showMessage('エラー', 'パチスロ台を選択してください');
            return;
        }
        
        const quantity = parseInt(document.getElementById('purchase-quantity').value);
        const machine = this.gameState.selectedMachine;
        let totalPrice = quantity * machine.価格;
        
        // 島単位購入の割引を適用
        if (quantity >= 20) {
            totalPrice = calculateIslandPrice(machine.価格, quantity);
        }
        
        if (totalPrice > this.gameState.money) {
            this.showMessage('エラー', '所持金が不足しています');
            return;
        }
        
        const message = `「${machine.名前}」を${quantity}台購入しますか？\n合計金額: ¥${totalPrice.toLocaleString()}`;
        this.showConfirmModal('購入確認', message, () => this.executePurchase(quantity, totalPrice));
    }

    // 購入を実行
    executePurchase(quantity, totalPrice) {
        const machine = this.gameState.selectedMachine;
        
        // 所持金を減らす
        this.gameState.money -= totalPrice;
        
        // 所有パチスロ台を更新
        const currentOwned = this.gameState.ownedMachines.get(machine.ID) || 0;
        this.gameState.ownedMachines.set(machine.ID, currentOwned + quantity);
        
        this.updateUI();
        this.updateOwnedMachinesList();
        this.updateSaleInfo();
        
        this.showMessage('購入完了', `「${machine.名前}」を${quantity}台購入しました！`);
    }

    // パチスロ台を売却
    sellMachine() {
        if (!this.gameState.selectedMachine) return;
        
        const quantity = parseInt(document.getElementById('sale-quantity').value);
        const machine = this.gameState.selectedMachine;
        const marketPrice = calculateUsedPrice(machine.価格, machine.総合人気度);
        const salePrice = calculateSalePrice(marketPrice) * quantity;
        
        const message = `「${machine.名前}」を${quantity}台売却しますか？\n売却価格: ¥${salePrice.toLocaleString()}`;
        this.showConfirmModal('売却確認', message, () => this.executeSale(quantity, salePrice));
    }

    // 売却を実行
    executeSale(quantity, salePrice) {
        const machine = this.gameState.selectedMachine;
        
        // 所持金を増やす
        this.gameState.money += salePrice;
        
        // 所有パチスロ台を更新
        const currentOwned = this.gameState.ownedMachines.get(machine.ID);
        if (currentOwned <= quantity) {
            this.gameState.ownedMachines.delete(machine.ID);
        } else {
            this.gameState.ownedMachines.set(machine.ID, currentOwned - quantity);
        }
        
        this.updateUI();
        this.updateOwnedMachinesList();
        this.updateSaleInfo();
        
        this.showMessage('売却完了', `「${machine.名前}」を${quantity}台売却しました！`);
    }

    // 次の週に進む
    nextWeek() {
        this.gameState.currentWeek++;
        
        // 人気度変動を実行
        this.machineData.advanceWeek(this.gameState.currentWeek);
        
        // 人気度変動メッセージを生成
        this.generateWeeklyMessages();
        
        // UIを更新
        this.updateUI();
        this.displayMachines();
        this.displayPopularityMessages();
        
        // 選択中のパチスロ台の詳細も更新
        if (this.gameState.selectedMachine) {
            const updatedMachine = this.machineData.getAllMachines().find(m => m.ID === this.gameState.selectedMachine.ID);
            if (updatedMachine) {
                this.gameState.selectedMachine = updatedMachine;
                this.displayMachineDetail(updatedMachine);
                this.updateSaleInfo();
            }
        }
        
        this.showMessage('週次更新', `第${this.gameState.currentWeek}週になりました。人気度が変動しています。`);
    }

    // 週次メッセージを生成
    generateWeeklyMessages() {
        this.popularityMessages = [];
        
        // 人気度変動が大きいパチスロ台のメッセージを生成
        this.machineData.getAllMachines().forEach(machine => {
            const history = this.machineData.getPopularityHistory(machine.ID);
            if (history.length >= 2) {
                const lastChange = history[history.length - 1];
                if (Math.abs(lastChange.change) > 0.5) {
                    const forecast = generatePopularityForecast(machine, lastChange.popularity, lastChange.change);
                    this.popularityMessages.push({
                        machine: machine,
                        message: forecast.message,
                        type: forecast.type,
                        change: lastChange.change
                    });
                }
            }
        });
        
        // メッセージを最大5件まで制限
        this.popularityMessages = this.popularityMessages.slice(0, 5);
    }

    // 人気度変動メッセージを表示
    displayPopularityMessages() {
        const messageArea = document.getElementById('popularity-messages');
        if (!messageArea) return;
        
        if (this.popularityMessages.length === 0) {
            messageArea.innerHTML = '<p class="no-messages">人気度変動のメッセージはありません</p>';
            return;
        }
        
        let messagesHtml = '<h3>人気度変動情報</h3>';
        this.popularityMessages.forEach(msg => {
            const changeIcon = msg.change > 0 ? '📈' : '📉';
            const changeClass = msg.change > 0 ? 'positive' : 'negative';
            messagesHtml += `
                <div class="message-item ${changeClass}">
                    <div class="message-header">
                        <span class="change-icon">${changeIcon}</span>
                        <span class="machine-name">${msg.machine.名前}</span>
                        <span class="change-value">${msg.change > 0 ? '+' : ''}${msg.change}</span>
                    </div>
                    <div class="message-text">${msg.message}</div>
                </div>
            `;
        });
        
        messageArea.innerHTML = messagesHtml;
    }

    // ゲームをリセット
    resetGame() {
        this.showConfirmModal('リセット確認', 'ゲームをリセットしますか？\n全ての進行状況が失われます。', () => this.executeReset());
    }

    // リセットを実行
    executeReset() {
        this.gameState = {
            currentWeek: 1,
            money: 10000000,
            ownedMachines: new Map(),
            selectedMachine: null
        };
        
        this.popularityMessages = [];
        
        // CSVデータを再読み込み
        this.loadMachineData().then(() => {
            this.updateUI();
            this.displayMachines();
            this.displayPopularityMessages();
            this.showMessage('リセット完了', 'ゲームがリセットされました');
        });
    }

    // 所有パチスロ台リストを更新
    updateOwnedMachinesList() {
        const ownedList = document.getElementById('owned-machines-list');
        ownedList.innerHTML = '';
        
        if (this.gameState.ownedMachines.size === 0) {
            ownedList.innerHTML = '<p class="no-owned">所有しているパチスロ台はありません</p>';
            return;
        }
        
        this.gameState.ownedMachines.forEach((quantity, machineId) => {
            const machine = this.machineData.getAllMachines().find(m => m.ID == machineId);
            if (machine) {
                const div = document.createElement('div');
                div.className = 'owned-machine-item';
                div.innerHTML = `
                    <div class="owned-machine-header">
                        <h4>${machine.名前}</h4>
                        <span class="quantity">${quantity}台</span>
                    </div>
                    <div class="owned-machine-details">
                        <p>人気度: ${machine.総合人気度}</p>
                        <p>購入価格: ¥${machine.価格.toLocaleString()}</p>
                    </div>
                `;
                ownedList.appendChild(div);
            }
        });
    }

    // UIを更新
    updateUI() {
        document.getElementById('current-week').textContent = this.gameState.currentWeek;
        document.getElementById('current-money').textContent = `¥${this.gameState.money.toLocaleString()}`;
        document.getElementById('owned-count').textContent = this.gameState.ownedMachines.size;
    }

    // 確認モーダルを表示
    showConfirmModal(title, message, onConfirm) {
        this.confirmedCallback = onConfirm;
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('confirm-modal').style.display = 'block';
    }

    // メッセージモーダルを表示
    showMessage(title, message) {
        document.getElementById('message-title').textContent = title;
        document.getElementById('message-text').textContent = message;
        document.getElementById('message-modal').style.display = 'block';
    }

    // モーダルを非表示
    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // 確認されたアクションを実行
    executeConfirmedAction() {
        if (this.confirmedCallback) {
            this.confirmedCallback();
            this.confirmedCallback = null;
        }
        this.hideModal('confirm-modal');
    }
}

// ページ読み込み完了時にシミュレーターを初期化
document.addEventListener('DOMContentLoaded', () => {
    window.simulator = new PachislotSimulator();
});
