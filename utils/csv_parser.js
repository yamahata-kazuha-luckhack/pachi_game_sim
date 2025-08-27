// CSVパーサーとパチスロ台データ処理ユーティリティ

class PachislotMachineData {
    constructor() {
        this.machines = [];
        this.ipIndex = new Map();
        this.makerIndex = new Map();
        this.popularityIndex = new Map();
        this.popularityHistory = new Map(); // 人気度履歴を管理
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        this.machines = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const machine = this.createMachineObject(headers, lines[i].split(','));
                this.machines.push(machine);
            }
        }
        
        this.buildIndexes();
        return this.machines;
    }

    createMachineObject(headers, values) {
        const machine = {};
        
        headers.forEach((header, index) => {
            let value = values[index] ? values[index].trim() : '';
            
            // 数値フィールドの処理
            if (['ID', '価格', '何号機か', 'コイン単価', '純増', '1000円当たりのコイン持ち', '人気度_スペック', '人気度_IP', '人気度_発売日'].includes(header)) {
                value = parseFloat(value) || 0;
            }
            
            machine[header] = value;
        });
        
        // 総合人気度を計算
        machine.総合人気度 = this.calculateTotalPopularity(machine);
        
        // 人気度履歴を初期化
        this.popularityHistory.set(machine.ID, [{
            week: 1,
            popularity: machine.総合人気度,
            change: 0,
            factors: { base: 0, ip: 0, spec: 0, release: 0 }
        }]);
        
        return machine;
    }

    // 総合人気度を計算（game_config.jsの関数と重複しているが、ここでも必要）
    calculateTotalPopularity(machine) {
        const spec = machine.人気度_スペック || 5;
        const ip = machine.人気度_IP || 5;
        const releaseDate = machine.発売日 || new Date().toISOString().split('T')[0];
        
        const now = new Date();
        const release = new Date(releaseDate);
        const daysSinceRelease = Math.floor((now - release) / (1000 * 60 * 60 * 24));
        
        // 発売日からの経過日数による人気度（新しいほど高い）
        let releasePopularity = Math.max(0, 10 - (daysSinceRelease / 30));
        releasePopularity = Math.min(10, releasePopularity);
        
        // 重み付き平均で総合人気度を計算
        const totalPopularity = (
            spec * 0.4 +
            ip * 0.3 +
            releasePopularity * 0.3
        );
        
        return Math.round(totalPopularity * 10) / 10;
    }

    // 人気度のTierを取得（game_config.jsの関数と重複しているが、ここでも必要）
    getPopularityTier(popularity) {
        if (popularity >= 7.5) {
            if (popularity >= 9.0) return 'HIGH_TIER_1';
            if (popularity >= 8.5) return 'HIGH_TIER_2';
            if (popularity >= 8.0) return 'HIGH_TIER_3';
            if (popularity >= 7.5) return 'HIGH_TIER_4';
            return 'HIGH_TIER_5';
        } else if (popularity <= 2.5) {
            if (popularity >= 3.0) return 'LOW_TIER_1';
            if (popularity >= 2.5) return 'LOW_TIER_2';
            if (popularity >= 2.0) return 'LOW_TIER_3';
            if (popularity >= 1.5) return 'LOW_TIER_4';
            return 'LOW_TIER_5';
        }
        return 'MEDIUM';
    }

    buildIndexes() {
        this.machines.forEach(machine => {
            // IP名を抽出（SP、CR、P、S、A、B、C、D、E、F、G、H、I、J、K、L、M、N、O、P、Q、R、S、T、U、V、W、X、Y、Z、数字、号機を除去）
            const ipName = machine.名前.replace(/SP|CR|P|S|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|[0-9]|号機/g, '').trim();
            
            // IP別インデックス
            if (!this.ipIndex.has(ipName)) {
                this.ipIndex.set(ipName, []);
            }
            this.ipIndex.get(ipName).push(machine);
            
            // メーカー別インデックス
            if (!this.makerIndex.has(machine.メーカー)) {
                this.makerIndex.set(machine.メーカー, []);
            }
            this.makerIndex.get(machine.メーカー).push(machine);
            
            // 人気度別インデックス
            const popularityTier = this.getPopularityTier(machine.総合人気度);
            if (!this.popularityIndex.has(popularityTier)) {
                this.popularityIndex.set(popularityTier, []);
            }
            this.popularityIndex.get(popularityTier).push(machine);
        });
    }

    // 人気度履歴を更新
    updatePopularityHistory(machineId, week, newPopularity, change, factors) {
        if (!this.popularityHistory.has(machineId)) {
            this.popularityHistory.set(machineId, []);
        }
        
        const history = this.popularityHistory.get(machineId);
        history.push({
            week: week,
            popularity: newPopularity,
            change: change,
            factors: factors
        });
        
        // 履歴は最大52週分（1年分）保持
        if (history.length > 52) {
            history.shift();
        }
    }

    // 人気度履歴を取得
    getPopularityHistory(machineId) {
        return this.popularityHistory.get(machineId) || [];
    }

    // 週次人気度変動を実行
    advanceWeek(currentWeek) {
        this.machines.forEach(machine => {
            const history = this.getPopularityHistory(machine.ID);
            const currentPopularity = history.length > 0 ? history[history.length - 1].popularity : machine.総合人気度;
            
            // 週次変動を計算
            const changeResult = calculateWeeklyPopularityChange(machine, currentWeek, currentPopularity);
            
            // 履歴を更新
            this.updatePopularityHistory(
                machine.ID, 
                currentWeek, 
                changeResult.newPopularity, 
                changeResult.change, 
                changeResult.factors
            );
            
            // 現在の人気度を更新
            machine.総合人気度 = changeResult.newPopularity;
        });
        
        // インデックスを再構築
        this.buildIndexes();
    }

    // 人気度予測を取得
    getPopularityForecast(machineId) {
        const history = this.getPopularityHistory(machineId);
        if (history.length < 2) return null;
        
        const recent = history.slice(-3); // 最近3週分
        const avgChange = recent.reduce((sum, h) => sum + h.change, 0) / recent.length;
        
        return {
            predictedChange: Math.round(avgChange * 10) / 10,
            trend: avgChange > 0.1 ? 'up' : avgChange < -0.1 ? 'down' : 'stable',
            confidence: Math.min(0.9, Math.abs(avgChange) * 2)
        };
    }

    // 全パチスロ台を取得
    getAllMachines() {
        return this.machines;
    }

    // IP別にパチスロ台を取得
    getMachinesByIP(ipName) {
        return this.ipIndex.get(ipName) || [];
    }

    // メーカー別にパチスロ台を取得
    getMachinesByMaker(maker) {
        return this.makerIndex.get(maker) || [];
    }

    // 人気度別にパチスロ台を取得
    getMachinesByPopularity(popularityTier) {
        return this.popularityIndex.get(popularityTier) || [];
    }

    // 検索機能
    searchMachines(query) {
        if (!query) return this.machines;
        
        const searchTerm = query.toLowerCase();
        return this.machines.filter(machine => 
            machine.名前.toLowerCase().includes(searchTerm) ||
            machine.メーカー.toLowerCase().includes(searchTerm) ||
            machine.IPタイプ.toLowerCase().includes(searchTerm)
        );
    }

    // フィルター機能
    filterMachines(maker = null, popularityTier = null) {
        let filtered = this.machines;
        
        if (maker && maker !== 'all') {
            filtered = filtered.filter(machine => machine.メーカー === maker);
        }
        
        if (popularityTier && popularityTier !== 'all') {
            filtered = filtered.filter(machine => this.getPopularityTier(machine.総合人気度) === popularityTier);
        }
        
        return filtered;
    }

    // 人気度の高いパチスロ台を取得
    getTopPopularMachines(limit = 10) {
        return this.machines
            .sort((a, b) => b.総合人気度 - a.総合人気度)
            .slice(0, limit);
    }

    // 人気度の低いパチスロ台を取得
    getLowPopularMachines(limit = 10) {
        return this.machines
            .sort((a, b) => a.総合人気度 - b.総合人気度)
            .slice(0, limit);
    }

    // 価格帯別にパチスロ台を取得
    getMachinesByPriceRange(minPrice, maxPrice) {
        return this.machines.filter(machine => 
            machine.価格 >= minPrice && machine.価格 <= maxPrice
        );
    }

    // 発売日別にパチスロ台を取得
    getMachinesByReleaseDate(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return this.machines.filter(machine => {
            const releaseDate = new Date(machine.発売日);
            return releaseDate >= start && releaseDate <= end;
        });
    }

    // 統計情報を取得
    getStatistics() {
        const totalMachines = this.machines.length;
        const avgPrice = this.machines.reduce((sum, m) => sum + m.価格, 0) / totalMachines;
        const avgPopularity = this.machines.reduce((sum, m) => sum + m.総合人気度, 0) / totalMachines;
        
        const popularityDistribution = {};
        this.machines.forEach(machine => {
            const tier = this.getPopularityTier(machine.総合人気度);
            popularityDistribution[tier] = (popularityDistribution[tier] || 0) + 1;
        });
        
        return {
            totalMachines,
            averagePrice: Math.round(avgPrice),
            averagePopularity: Math.round(avgPopularity * 10) / 10,
            popularityDistribution,
            makers: Array.from(this.makerIndex.keys()),
            ipTypes: [...new Set(this.machines.map(m => m.IPタイプ))]
        };
    }
}

// CSVユーティリティ
const CSVUtils = {
    // CSVファイルを読み込み
    async loadCSVFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error('CSVファイルの読み込みエラー:', error);
            throw error;
        }
    },

    // CSVテキストをパース
    parseCSVText(csvText) {
        const parser = new PachislotMachineData();
        return parser.parseCSV(csvText);
    },

    // CSVにエクスポート
    exportToCSV(machines, headers = null) {
        if (!machines || machines.length === 0) return '';
        
        const csvHeaders = headers || Object.keys(machines[0]);
        const csvRows = machines.map(machine => 
            csvHeaders.map(header => machine[header] || '').join(',')
        );
        
        return [csvHeaders.join(','), ...csvRows].join('\n');
    }
};

// モジュールエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PachislotMachineData, CSVUtils };
}
