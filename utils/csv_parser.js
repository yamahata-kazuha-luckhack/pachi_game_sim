// CSVパーサーとパチスロ台データ処理ユーティリティ

class PachislotMachineData {
  constructor() {
    this.machines = [];
    this.machinesByIP = new Map(); // IP別にグループ化
    this.machinesByMaker = new Map(); // メーカー別にグループ化
    this.machinesBySeries = new Map(); // シリーズ別にグループ化
  }

  // CSVデータを解析してパチスロ台データを構築
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    this.machines = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length === headers.length) {
        const machine = this.createMachineObject(headers, values);
        this.machines.push(machine);
      }
    }
    
    this.buildIndexes();
    return this.machines;
  }

  // ヘッダーと値からパチスロ台オブジェクトを作成
  createMachineObject(headers, values) {
    const machine = {};
    
    headers.forEach((header, index) => {
      let value = values[index];
      
      // 数値フィールドの変換
      if (['ID', '価格', 'コイン単価', '純増', '1000円当たりのコイン持ち', '人気度_スペック', '人気度_IP', '人気度_発売日'].includes(header)) {
        value = parseFloat(value) || 0;
      }
      
      // 日付フィールドの変換
      if (header === '発売日') {
        value = new Date(value);
      }
      
      machine[header] = value;
    });
    
    // 総合人気度を計算
    machine.総合人気度 = this.calculateTotalPopularity(machine);
    machine.人気度Tier = this.getPopularityTier(machine.総合人気度);
    
    return machine;
  }

  // 総合人気度を計算
  calculateTotalPopularity(machine) {
    const spec = machine['人気度_スペック'] || 0;
    const ip = machine['人気度_IP'] || 0;
    const releaseDate = machine['発売日'];
    
    if (!releaseDate) return 0;
    
    const now = new Date();
    const daysSinceRelease = Math.floor((now - releaseDate) / (1000 * 60 * 60 * 24));
    
    // 発売日からの経過日数による人気度（新しいほど高い）
    let releasePopularity = Math.max(0, 10 - (daysSinceRelease / 30));
    releasePopularity = Math.min(10, releasePopularity);
    
    // 重み付き平均で総合人気度を計算
    const totalPopularity = (
      spec * 0.4 +      // スペックの重み
      ip * 0.3 +        // IP人気度の重み
      releasePopularity * 0.3  // 発売日の重み
    );
    
    return Math.round(totalPopularity * 10) / 10; // 小数点第1位まで
  }

  // 人気度のTierを取得
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

  // インデックスを構築
  buildIndexes() {
    this.machinesByIP.clear();
    this.machinesByMaker.clear();
    this.machinesBySeries.clear();
    
    this.machines.forEach(machine => {
      // IP別にグループ化
      const ipName = machine['名前'].replace(/SP|CR|P|S|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|[0-9]|号機/g, '').trim();
      if (!this.machinesByIP.has(ipName)) {
        this.machinesByIP.set(ipName, []);
      }
      this.machinesByIP.get(ipName).push(machine);
      
      // メーカー別にグループ化
      const maker = machine['メーカー'];
      if (!this.machinesByMaker.has(maker)) {
        this.machinesByMaker.set(maker, []);
      }
      this.machinesByMaker.get(maker).push(machine);
      
      // シリーズ別にグループ化
      const series = machine['シリーズ'];
      if (!this.machinesBySeries.has(series)) {
        this.machinesBySeries.set(series, []);
      }
      this.machinesBySeries.get(series).push(machine);
    });
  }

  // 全パチスロ台を取得
  getAllMachines() {
    return this.machines;
  }

  // IP別にパチスロ台を取得
  getMachinesByIP(ipName) {
    return this.machinesByIP.get(ipName) || [];
  }

  // メーカー別にパチスロ台を取得
  getMachinesByMaker(maker) {
    return this.machinesByMaker.get(maker) || [];
  }

  // シリーズ別にパチスロ台を取得
  getMachinesBySeries(series) {
    return this.machinesBySeries.get(series) || [];
  }

  // 人気度別にパチスロ台を取得
  getMachinesByPopularity(minPopularity, maxPopularity) {
    return this.machines.filter(machine => 
      machine.総合人気度 >= minPopularity && machine.総合人気度 <= maxPopularity
    );
  }

  // 価格別にパチスロ台を取得
  getMachinesByPrice(minPrice, maxPrice) {
    return this.machines.filter(machine => 
      machine['価格'] >= minPrice && machine['価格'] <= maxPrice
    );
  }

  // 特定のパチスロ台をIDで取得
  getMachineById(id) {
    return this.machines.find(machine => machine['ID'] === id);
  }

  // 検索機能
  searchMachines(query) {
    const searchTerm = query.toLowerCase();
    return this.machines.filter(machine => 
      machine['名前'].toLowerCase().includes(searchTerm) ||
      machine['メーカー'].toLowerCase().includes(searchTerm) ||
      machine['IPタイプ'].toLowerCase().includes(searchTerm) ||
      machine['台の説明'].toLowerCase().includes(searchTerm)
    );
  }

  // 統計情報を取得
  getStatistics() {
    const stats = {
      totalMachines: this.machines.length,
      totalValue: this.machines.reduce((sum, machine) => sum + machine['価格'], 0),
      averagePrice: 0,
      popularityDistribution: {
        high: 0,
        medium: 0,
        low: 0
      },
      makerDistribution: {},
      ipTypeDistribution: {}
    };

    if (stats.totalMachines > 0) {
      stats.averagePrice = Math.round(stats.totalValue / stats.totalMachines);
    }

    // 人気度分布を計算
    this.machines.forEach(machine => {
      if (machine.総合人気度 >= 7.5) {
        stats.popularityDistribution.high++;
      } else if (machine.総合人気度 <= 2.5) {
        stats.popularityDistribution.low++;
      } else {
        stats.popularityDistribution.medium++;
      }
    });

    // メーカー分布を計算
    this.machines.forEach(machine => {
      const maker = machine['メーカー'];
      stats.makerDistribution[maker] = (stats.makerDistribution[maker] || 0) + 1;
    });

    // IPタイプ分布を計算
    this.machines.forEach(machine => {
      const ipType = machine['IPタイプ'];
      stats.ipTypeDistribution[ipType] = (stats.ipTypeDistribution[ipType] || 0) + 1;
    });

    return stats;
  }

  // 人気度の予測メッセージを生成
  generatePopularityForecast(ipName, currentPopularity, nextPopularity) {
    const messages = [
      "噂では{ip_name}が面白いらしい",
      "{ip_name}の評判が上がっている",
      "{ip_name}が話題になっている",
      "{ip_name}の人気が急上昇中",
      "{ip_name}が注目を集めている",
      "{ip_name}の話題が減ってきた",
      "{ip_name}の評判が下がっている",
      "{ip_name}の人気が落ち着いてきた",
      "{ip_name}の話題性が薄れてきた"
    ];

    let messageIndex;
    if (nextPopularity > currentPopularity) {
      // 人気上昇
      messageIndex = Math.floor(Math.random() * 5);
    } else if (nextPopularity < currentPopularity) {
      // 人気下降
      messageIndex = 5 + Math.floor(Math.random() * 4);
    } else {
      // 変化なし
      return null;
    }

    return messages[messageIndex].replace('{ip_name}', ipName);
  }
}

// ユーティリティ関数
const CSVUtils = {
  // CSVファイルを読み込み
  async loadCSVFile(filePath) {
    try {
      const response = await fetch(filePath);
      const csvText = await response.text();
      return csvText;
    } catch (error) {
      console.error('CSVファイルの読み込みに失敗しました:', error);
      throw error;
    }
  },

  // CSVテキストをパース
  parseCSVText(csvText) {
    const parser = new PachislotMachineData();
    return parser.parseCSV(csvText);
  },

  // データをCSV形式でエクスポート
  exportToCSV(machines, headers = null) {
    if (!headers) {
      headers = Object.keys(machines[0] || {});
    }
    
    const csvContent = [
      headers.join(','),
      ...machines.map(machine => 
        headers.map(header => {
          let value = machine[header];
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0];
          }
          if (typeof value === 'string' && value.includes(',')) {
            value = `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }
};

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PachislotMachineData,
    CSVUtils
  };
}
