// パチンコホールシミュレーター ゲーム設定ファイル

const GAME_CONFIG = {
  // 基本設定
  INITIAL_MONEY: 10000000, // 初期所持金（1000万円）
  WEEK_DURATION: 7, // 1週間の日数
  
  // 人気度計算の重み
  POPULARITY_WEIGHTS: {
    SPEC: 0.4,        // スペックの重み
    IP: 0.3,          // IP人気度の重み
    RELEASE_DATE: 0.3 // 発売日の重み
  },
  
  // 人気度の閾値
  POPULARITY_THRESHOLDS: {
    HIGH: 7.5,    // 高人気の閾値
    MEDIUM: 5.0,  // 普通人気の閾値
    LOW: 2.5      // 低人気の閾値
  },
  
  // 人気度のTier分類
  POPULARITY_TIERS: {
    HIGH: {
      TIER_1: 9.0,  // Tier 1: 9.0以上
      TIER_2: 8.5,  // Tier 2: 8.5-8.9
      TIER_3: 8.0,  // Tier 3: 8.0-8.4
      TIER_4: 7.5,  // Tier 4: 7.5-7.9
      TIER_5: 7.0   // Tier 5: 7.0-7.4
    },
    LOW: {
      TIER_1: 3.0,  // Tier 1: 3.0-3.4
      TIER_2: 2.5,  // Tier 2: 2.5-2.9
      TIER_3: 2.0,  // Tier 3: 2.0-2.4
      TIER_4: 1.5,  // Tier 4: 1.5-1.9
      TIER_5: 1.0   // Tier 5: 1.0-1.4
    }
  },
  
  // 価格変動の設定
  PRICE_VOLATILITY: {
    BASE_MULTIPLIER: 1.0,     // 基本倍率
    HIGH_POPULARITY: 1.3,     // 高人気時の倍率
    MEDIUM_POPULARITY: 1.0,   // 普通人気時の倍率
    LOW_POPULARITY: 0.7,      // 低人気時の倍率
    RANDOM_VARIANCE: 0.2      // ランダム変動の範囲（±20%）
  },
  
  // 島単位購入の設定
  ISLAND_PURCHASE: {
    MACHINES_PER_ISLAND: 20,  // 1島あたりの台数
    ISLAND_DISCOUNT: 0.95     // 島単位購入時の割引率（5%割引）
  },
  
  // 売却の設定
  SALE_SETTINGS: {
    PRICE_MULTIPLIER: 0.9,    // 売却価格（市場価格の90%）
    MIN_SALE_PRICE: 50000     // 最小売却価格
  },
  
  // 時間管理の設定
  TIME_MANAGEMENT: {
    WEEKS_PER_YEAR: 52,       // 1年あたりの週数
    MAX_WEEKS: 260            // 最大週数（5年分）
  },
  
  // 人気度変動の設定
  POPULARITY_CHANGE: {
    MAX_CHANGE_PER_WEEK: 1.0, // 1週間あたりの最大変化量
    GRADUAL_CHANGE: true,     // 急激な変化を防ぐ
    FORECAST_MESSAGES: true   // 次の人気度を推測できるメッセージを表示
  },
  
  // メッセージテンプレート
  MESSAGE_TEMPLATES: {
    POPULARITY_FORECAST: [
      "噂では{ip_name}が面白いらしい",
      "{ip_name}の評判が上がっている",
      "{ip_name}が話題になっている",
      "{ip_name}の人気が急上昇中",
      "{ip_name}が注目を集めている"
    ],
    POPULARITY_DECLINE: [
      "{ip_name}の話題が減ってきた",
      "{ip_name}の評判が下がっている",
      "{ip_name}の人気が落ち着いてきた",
      "{ip_name}の話題性が薄れてきた"
    ]
  }
};

// 人気度計算関数
function calculatePopularity(spec, ip, releaseDate) {
  const now = new Date();
  const release = new Date(releaseDate);
  const daysSinceRelease = Math.floor((now - release) / (1000 * 60 * 60 * 24));
  
  // 発売日からの経過日数による人気度（新しいほど高い）
  let releasePopularity = Math.max(0, 10 - (daysSinceRelease / 30));
  releasePopularity = Math.min(10, releasePopularity);
  
  // 重み付き平均で総合人気度を計算
  const totalPopularity = (
    spec * GAME_CONFIG.POPULARITY_WEIGHTS.SPEC +
    ip * GAME_CONFIG.POPULARITY_WEIGHTS.IP +
    releasePopularity * GAME_CONFIG.POPULARITY_WEIGHTS.RELEASE_DATE
  );
  
  return Math.round(totalPopularity * 10) / 10; // 小数点第1位まで
}

// 人気度のTierを取得
function getPopularityTier(popularity) {
  if (popularity >= GAME_CONFIG.POPULARITY_THRESHOLDS.HIGH) {
    if (popularity >= GAME_CONFIG.POPULARITY_TIERS.HIGH.TIER_1) return 'HIGH_TIER_1';
    if (popularity >= GAME_CONFIG.POPULARITY_TIERS.HIGH.TIER_2) return 'HIGH_TIER_2';
    if (popularity >= GAME_CONFIG.POPULARITY_TIERS.HIGH.TIER_3) return 'HIGH_TIER_3';
    if (popularity >= GAME_CONFIG.POPULARITY_TIERS.HIGH.TIER_4) return 'HIGH_TIER_4';
    if (popularity >= GAME_CONFIG.POPULARITY_TIERS.HIGH.TIER_5) return 'HIGH_TIER_5';
  } else if (popularity <= GAME_CONFIG.POPULARITY_THRESHOLDS.LOW) {
    if (popularity >= GAME_CONFIG.POPULARITY_TIERS.LOW.TIER_1) return 'LOW_TIER_1';
    if (popularity >= GAME_CONFIG.POPULARITY_TIERS.LOW.TIER_2) return 'LOW_TIER_2';
    if (popularity >= GAME_CONFIG.POPULARITY_TIERS.LOW.TIER_3) return 'LOW_TIER_3';
    if (popularity >= GAME_CONFIG.POPULARITY_TIERS.LOW.TIER_4) return 'LOW_TIER_4';
    if (popularity >= GAME_CONFIG.POPULARITY_TIERS.LOW.TIER_5) return 'LOW_TIER_5';
  }
  return 'MEDIUM';
}

// 中古価格を計算
function calculateUsedPrice(basePrice, popularity) {
  let multiplier = GAME_CONFIG.PRICE_VOLATILITY.BASE_MULTIPLIER;
  
  if (popularity >= GAME_CONFIG.POPULARITY_THRESHOLDS.HIGH) {
    multiplier = GAME_CONFIG.PRICE_VOLATILITY.HIGH_POPULARITY;
  } else if (popularity <= GAME_CONFIG.POPULARITY_THRESHOLDS.LOW) {
    multiplier = GAME_CONFIG.PRICE_VOLATILITY.LOW_POPULARITY;
  }
  
  // ランダム変動を追加
  const randomVariance = 1 + (Math.random() - 0.5) * GAME_CONFIG.PRICE_VOLATILITY.RANDOM_VARIANCE;
  
  return Math.round(basePrice * multiplier * randomVariance);
}

// 島単位購入価格を計算
function calculateIslandPrice(machinePrice, machineCount) {
  const totalPrice = machinePrice * machineCount;
  return Math.round(totalPrice * GAME_CONFIG.ISLAND_PURCHASE.ISLAND_DISCOUNT);
}

// 売却価格を計算
function calculateSalePrice(marketPrice) {
  const salePrice = marketPrice * GAME_CONFIG.SALE_SETTINGS.PRICE_MULTIPLIER;
  return Math.max(salePrice, GAME_CONFIG.SALE_SETTINGS.MIN_SALE_PRICE);
}

// 設定をエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GAME_CONFIG,
    calculatePopularity,
    getPopularityTier,
    calculateUsedPrice,
    calculateIslandPrice,
    calculateSalePrice
  };
}
