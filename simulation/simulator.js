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
        
        div.innerHTML = `
            <h4>${machine['名前']}</h4>
            <div class="machine-info">
                <span>${machine['メーカー']}</span>
                <span class="popularity ${popularityClass}">${popularityText}</span>
            </div>
            <div class="machine-info">
                <span>¥${machine['価格'].toLocaleString()}</span>
                <span>${machine['台タイプ']}</span>
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
        // 前の選択を解除
        document.querySelectorAll('.machine-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // 新しい選択を設定
        document.querySelector(`[data-machine-id="${machine.ID}"]`).classList.add('selected');
        
        this.gameState.selectedMachine = machine;
        this.displayMachineDetail(machine);
        this.showTradePanel();
    }

    // パチスロ台詳細を表示
    displayMachineDetail(machine) {
        const detailDiv = document.getElementById('machine-detail');
        
        detailDiv.innerHTML = `
            <div class="detail-header">
                <h3>${machine['名前']}</h3>
            </div>
            <div class="detail-content">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <strong>メーカー:</strong> ${machine['メーカー']}<br>
                        <strong>シリーズ:</strong> ${machine['シリーズ']}<br>
                        <strong>IPタイプ:</strong> ${machine['IPタイプ']}<br>
                        <strong>台タイプ:</strong> ${machine['台タイプ']}
                    </div>
                    <div>
                        <strong>価格:</strong> ¥${machine['価格'].toLocaleString()}<br>
                        <strong>コイン単価:</strong> ¥${machine['コイン単価']}<br>
                        <strong>純増:</strong> ${machine['純増']}<br>
                        <strong>1000円当たり:</strong> ${machine['1000円当たりのコイン持ち']}枚
                    </div>
                </div>
                <div style="margin-bottom: 20px;">
                    <strong>総合人気度:</strong> 
                    <span class="popularity ${this.getPopularityClass(machine.総合人気度)}">
                        ${machine.総合人気度} (${this.getPopularityText(machine.総合人気度)})
                    </span>
                </div>
                <div>
                    <strong>台の説明:</strong> ${machine['台の説明']}<br>
                    <strong>スペック表:</strong> ${machine['スペック表']}<br>
                    <strong>発売日:</strong> ${machine['発売日'].toLocaleDateString('ja-JP')}
                </div>
            </div>
        `;
    }

    // 取引パネルを表示
    showTradePanel() {
        document.getElementById('trade-panel').style.display = 'block';
        this.updatePurchaseInfo();
        this.updateSaleInfo();
    }

    // 購入情報を更新
    updatePurchaseInfo() {
        if (!this.gameState.selectedMachine) return;
        
        const quantity = parseInt(document.getElementById('purchase-quantity').value);
        const unitPrice = this.gameState.selectedMachine['価格'];
        const totalPrice = unitPrice * quantity;
        
        document.getElementById('unit-price').textContent = `¥${unitPrice.toLocaleString()}`;
        document.getElementById('total-price').textContent = `¥${totalPrice.toLocaleString()}`;
    }

    // 売却情報を更新
    updateSaleInfo() {
        if (!this.gameState.selectedMachine) return;
        
        const machineId = this.gameState.selectedMachine.ID;
        const ownedQuantity = this.gameState.ownedMachines.get(machineId) || 0;
        
        if (ownedQuantity === 0) {
            document.getElementById('sale-quantity').innerHTML = '<option value="0">所有していません</option>';
            document.getElementById('sale-price').textContent = '¥0';
            document.getElementById('sale-btn').disabled = true;
        } else {
            document.getElementById('sale-quantity').innerHTML = `
                <option value="1">1台</option>
                <option value="5">5台</option>
                <option value="10">10台</option>
                <option value="${ownedQuantity}">全台(${ownedQuantity}台)</option>
            `;
            document.getElementById('sale-btn').disabled = false;
            this.updateSalePrice();
        }
    }

    // 売却価格を更新
    updateSalePrice() {
        const quantity = parseInt(document.getElementById('sale-quantity').value);
        if (quantity === 0) return;
        
        const salePrice = this.calculateSalePrice(this.gameState.selectedMachine['価格']) * quantity;
        document.getElementById('sale-price').textContent = `¥${salePrice.toLocaleString()}`;
    }

    // 売却価格を計算
    calculateSalePrice(marketPrice) {
        return Math.round(marketPrice * 0.9); // 市場価格の90%
    }

    // 検索機能
    searchMachines() {
        const searchTerm = document.getElementById('search-input').value.trim();
        if (!searchTerm) {
            this.displayMachines();
            return;
        }
        
        const searchResults = this.machineData.searchMachines(searchTerm);
        this.displayMachines(searchResults);
    }

    // フィルター機能
    filterMachines() {
        const makerFilter = document.getElementById('maker-filter').value;
        const popularityFilter = document.getElementById('popularity-filter').value;
        
        let filteredMachines = this.machineData;
        
        if (makerFilter) {
            filteredMachines = filteredMachines.getMachinesByMaker(makerFilter);
        }
        
        if (popularityFilter) {
            let minPop, maxPop;
            switch (popularityFilter) {
                case 'high':
                    minPop = 7.5;
                    maxPop = 10;
                    break;
                case 'medium':
                    minPop = 2.5;
                    maxPop = 7.5;
                    break;
                case 'low':
                    minPop = 0;
                    maxPop = 2.5;
                    break;
            }
            filteredMachines = filteredMachines.getMachinesByPopularity(minPop, maxPop);
        }
        
        this.displayMachines(filteredMachines);
    }

    // パチスロ台を購入
    purchaseMachine() {
        if (!this.gameState.selectedMachine) {
            this.showMessage('エラー', 'パチスロ台を選択してください');
            return;
        }
        
        const quantity = parseInt(document.getElementById('purchase-quantity').value);
        const totalPrice = this.gameState.selectedMachine['価格'] * quantity;
        
        if (totalPrice > this.gameState.money) {
            this.showMessage('エラー', '所持金が不足しています');
            return;
        }
        
        this.showConfirmModal(
            '購入確認',
            `${this.gameState.selectedMachine['名前']}を${quantity}台購入しますか？\n合計: ¥${totalPrice.toLocaleString()}`,
            () => this.executePurchase(quantity, totalPrice)
        );
    }

    // 購入を実行
    executePurchase(quantity, totalPrice) {
        const machineId = this.gameState.selectedMachine.ID;
        const currentOwned = this.gameState.ownedMachines.get(machineId) || 0;
        
        this.gameState.ownedMachines.set(machineId, currentOwned + quantity);
        this.gameState.money -= totalPrice;
        
        this.updateUI();
        this.updateOwnedMachinesList();
        this.updateSaleInfo();
        
        this.showMessage('成功', `${this.gameState.selectedMachine['名前']}を${quantity}台購入しました！`);
        this.hideModal('confirm-modal');
    }

    // パチスロ台を売却
    sellMachine() {
        if (!this.gameState.selectedMachine) {
            this.showMessage('エラー', 'パチスロ台を選択してください');
            return;
        }
        
        const machineId = this.gameState.selectedMachine.ID;
        const ownedQuantity = this.gameState.ownedMachines.get(machineId) || 0;
        
        if (ownedQuantity === 0) {
            this.showMessage('エラー', 'このパチスロ台を所有していません');
            return;
        }
        
        const sellQuantity = parseInt(document.getElementById('sale-quantity').value);
        if (sellQuantity === 0) return;
        
        const salePrice = this.calculateSalePrice(this.gameState.selectedMachine['価格']) * sellQuantity;
        
        this.showConfirmModal(
            '売却確認',
            `${this.gameState.selectedMachine['名前']}を${sellQuantity}台売却しますか？\n売却価格: ¥${salePrice.toLocaleString()}`,
            () => this.executeSale(sellQuantity, salePrice)
        );
    }

    // 売却を実行
    executeSale(quantity, salePrice) {
        const machineId = this.gameState.selectedMachine.ID;
        const currentOwned = this.gameState.ownedMachines.get(machineId);
        
        if (currentOwned <= quantity) {
            this.gameState.ownedMachines.delete(machineId);
        } else {
            this.gameState.ownedMachines.set(machineId, currentOwned - quantity);
        }
        
        this.gameState.money += salePrice;
        
        this.updateUI();
        this.updateOwnedMachinesList();
        this.updateSaleInfo();
        
        this.showMessage('成功', `${this.gameState.selectedMachine['名前']}を${quantity}台売却しました！`);
        this.hideModal('confirm-modal');
    }

    // 次の週へ
    nextWeek() {
        this.gameState.currentWeek++;
        this.updateUI();
        this.showMessage('進行', `${this.gameState.currentWeek}週目になりました！`);
    }

    // ゲームをリセット
    resetGame() {
        this.showConfirmModal(
            'リセット確認',
            'ゲームをリセットしますか？\n全ての進行状況と所持品が失われます。',
            () => this.executeReset()
        );
    }

    // リセットを実行
    executeReset() {
        this.gameState = {
            currentWeek: 1,
            money: 10000000,
            ownedMachines: new Map(),
            selectedMachine: null
        };
        
        this.updateUI();
        this.updateOwnedMachinesList();
        this.displayMachineDetail({});
        document.getElementById('trade-panel').style.display = 'none';
        
        this.showMessage('リセット完了', 'ゲームがリセットされました');
        this.hideModal('confirm-modal');
    }

    // 所有パチスロ台リストを更新
    updateOwnedMachinesList() {
        const ownedList = document.getElementById('owned-machines-list');
        
        if (this.gameState.ownedMachines.size === 0) {
            ownedList.innerHTML = '<p class="no-machines">まだパチスロ台を所有していません</p>';
            return;
        }
        
        ownedList.innerHTML = '';
        
        this.gameState.ownedMachines.forEach((quantity, machineId) => {
            const machine = this.machineData.getMachineById(machineId);
            if (machine) {
                const ownedItem = document.createElement('div');
                ownedItem.className = 'owned-machine-item';
                ownedItem.innerHTML = `
                    <h4>${machine['名前']}</h4>
                    <div class="machine-stats">
                        <span>所持数: ${quantity}台</span>
                        <span>購入価格: ¥${machine['価格'].toLocaleString()}</span>
                    </div>
                `;
                ownedList.appendChild(ownedItem);
            }
        });
    }

    // UIを更新
    updateUI() {
        document.getElementById('current-week').textContent = this.gameState.currentWeek;
        document.getElementById('current-money').textContent = `¥${this.gameState.money.toLocaleString()}`;
        
        const totalOwned = Array.from(this.gameState.ownedMachines.values()).reduce((sum, qty) => sum + qty, 0);
        document.getElementById('owned-machines').textContent = `${totalOwned}台`;
    }

    // 確認モーダルを表示
    showConfirmModal(title, message, onConfirm) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('confirm-modal').style.display = 'flex';
        
        this.confirmCallback = onConfirm;
    }

    // メッセージモーダルを表示
    showMessage(title, message) {
        document.getElementById('message-title').textContent = title;
        document.getElementById('message-text').textContent = message;
        document.getElementById('message-modal').style.display = 'flex';
    }

    // モーダルを非表示
    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // 確認されたアクションを実行
    executeConfirmedAction() {
        if (this.confirmCallback) {
            this.confirmCallback();
        }
    }
}

// ページ読み込み完了後にシミュレーターを初期化
document.addEventListener('DOMContentLoaded', () => {
    window.simulator = new PachislotSimulator();
});
