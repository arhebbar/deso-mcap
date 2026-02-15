// Hardcoded wallet and market data for DeSo Capital Structure Dashboard

export interface WalletData {
  name: string;
  classification: 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL' | 'EXTERNAL';
  balances: Record<string, number>;
  usdValue: number;
  /** DESO staked (when known). Total DESO = desoStaked + desoUnstaked. */
  desoStaked?: number;
  /** DESO unstaked (when known). Total DESO = desoStaked + desoUnstaked. */
  desoUnstaked?: number;
}

export interface MarketData {
  desoPrice: number;
  desoTotalSupply: number;
  desoStaked: number;
  btcPrice: number;
  ethPrice: number;
  solPrice: number;
  focusPrice: number;
  openfundPrice: number;
}

export const MARKET_DATA: MarketData = {
  desoPrice: 5.78,
  desoTotalSupply: 12_200_000,
  desoStaked: 5_730_000,
  btcPrice: 97_400,
  ethPrice: 2_640,
  solPrice: 196,
  focusPrice: 0.00034,
  openfundPrice: 0.087,
};

export const FOUNDATION_WALLETS: WalletData[] = [
  {
    name: 'Gringotts_Wizarding_Bank',
    classification: 'FOUNDATION',
    // DESO fetched from API (get-users-stateless BalanceNanos); ~76k used as fallback when API fails
    balances: { DESO: 76_000, dUSDC: 6_590_000, Focus: 1_520_000_000, Openfund: 4_000_000, dBTC: 21.46, dETH: 197, dSOL: 2_610 },
    usdValue: 8_450_000,
  },
  {
    name: 'FOCUS_COLD_000',
    classification: 'FOUNDATION',
    balances: { DESO: 1_000_000 },
    usdValue: 5_780_000,
    desoStaked: 800_000,
    desoUnstaked: 200_000,
  },
  {
    name: 'focus',
    classification: 'FOUNDATION',
    // Focus balance excluded: minted by account, not bought on DeSo – no real significance
    balances: { DESO: 12_000, Openfund: 1_500_000 },
    usdValue: 450_000,
  },
  {
    name: 'openfund',
    classification: 'FOUNDATION',
    balances: { Openfund: 8_000_000, DESO: 25_000, Focus: 500_000_000, dUSDC: 120_000 },
    usdValue: 850_000,
  },
  {
    name: 'Deso',
    classification: 'FOUNDATION',
    balances: { DESO: 95_000, Openfund: 2_000_000, Focus: 200_000_000, dUSDC: 80_000 },
    usdValue: 750_000,
  },
];

export const AMM_WALLETS: WalletData[] = [
  { name: 'AMM_DESO_24_PlAEU', classification: 'AMM', balances: { dUSDC: 1_410_000, DESO: 96_500 }, usdValue: 1_950_000 },
  { name: 'AMM_DESO_23_GrYpe', classification: 'AMM', balances: { DESO: 1_440_000, dUSDC: 3_000 }, usdValue: 8_330_000 },
  { name: 'AMM_focus_12_nzWku', classification: 'AMM', balances: { Focus: 1_770_000_000 }, usdValue: 601_800 },
  { name: 'AMM_openfund_12_gOR1b', classification: 'AMM', balances: { Openfund: 5_046_000 }, usdValue: 439_000 },
  { name: 'AMM_DESO_19_W5vn0', classification: 'AMM', balances: { DESO: 74_048 }, usdValue: 428_000 },
  { name: 'AMM_openfund_13_1gbih', classification: 'AMM', balances: { Openfund: 1_207_000 }, usdValue: 105_000 },
];

export const FOUNDER_WALLETS: WalletData[] = [
  {
    name: 'Whoami',
    classification: 'FOUNDER',
    balances: { Openfund: 5_150_000, dUSDC: 35_000, Focus: 3_650, dBTC: 0.176 },
    usdValue: 518_400,
  },
  { name: 'Nader', classification: 'FOUNDER', balances: { Openfund: 12_500_000 }, usdValue: 1_087_500 },
  { name: 'Mossified', classification: 'FOUNDER', balances: { Openfund: 2_800_000 }, usdValue: 243_600 },
  { name: 'LazyNina', classification: 'FOUNDER', balances: { DESO: 2.93 }, usdValue: 0 },
];

/** DeSo Bulls - community holders. No static fallback; API/cache only. */
export const DESO_BULL_WALLETS: WalletData[] = [
  { name: 'Randhir (Me)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'HighKey', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'JordanLintz', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'LukeLintz', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'StarGeezer', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'DesocialWorld', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Edokoevoet', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Gabrielist', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'RobertGraham', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: '0xAustin', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'BenErsing', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Darian_Parrish', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'VishalGulia', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'ZeroToOne', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'anku', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'fllwthrvr', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'PremierNS', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'WhaleDShark', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
];

// Fallback when API fails. BTC/ETH/SOL are fetched from treasuryApi; USDC has no public API.
export const EXTERNAL_TREASURY = {
  btcHoldings: 2_100,
  ethHotWallet: 1_200,
  ethColdWallet: 3_800,
  solColdWallet: 45_000,
  usdcHot: 2_800_000,
  usdcCold: 4_200_000,
  totalUsdc: 7_000_000,
};

// Derived calculations
export function calcMarketCap(data: MarketData) {
  return data.desoTotalSupply * data.desoPrice;
}

export function calcFreeFloat(data: MarketData, ammDeso: number, foundationDeso: number, founderDeso: number) {
  return data.desoTotalSupply - data.desoStaked - ammDeso - foundationDeso - founderDeso;
}

export function calcDusdcBackingRatio(foundationDusdc?: number): number {
  const externalUsdc = EXTERNAL_TREASURY.totalUsdc;
  const totalDusdcSupply = 9_200_000; // approximate
  const nonCirc =
    (foundationDusdc ?? FOUNDATION_WALLETS[0]?.balances.dUSDC ?? 0) + 500_000; // Gringotts + dUSDC_ account
  const requiredBacking = totalDusdcSupply - nonCirc;
  return requiredBacking > 0 ? externalUsdc / requiredBacking : 0;
}

export function calcTreasuryCoverage(data: MarketData) {
  const btcValue = EXTERNAL_TREASURY.btcHoldings * data.btcPrice;
  const marketCap = calcMarketCap(data);
  return btcValue / marketCap;
}

// AMM DESO holdings (for supply distribution) - accepts wallet array from API or fallback to static
export function getAmmDesoTotal(wallets?: { balances: Record<string, number> }[]): number {
  const list = wallets ?? AMM_WALLETS;
  return list.reduce((sum, w) => sum + (w.balances.DESO || 0), 0);
}

// AMM liquidity: USD value of all tokens (DESO, dUSDC, Focus, Openfund)
export function getAmmLiquidityUsd(
  data: MarketData,
  wallets?: { balances: Record<string, number> }[]
): number {
  const list = wallets ?? AMM_WALLETS;
  return list.reduce((sum, w) => {
    const b = w.balances;
    const desoVal = (b.DESO || 0) * data.desoPrice;
    const dusdcVal = b.dUSDC || 0; // 1:1 USD
    const focusVal = (b.Focus || 0) * data.focusPrice;
    const openfundVal = (b.Openfund || 0) * data.openfundPrice;
    return sum + desoVal + dusdcVal + focusVal + openfundVal;
  }, 0);
}

// Historical mock data
export function generateHistoricalData(days: number) {
  const data = [];
  const now = Date.now();
  const dayMs = 86400000;
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * dayMs);
    const noise = () => 0.9 + Math.random() * 0.2;
    const marketCap = 70_500_000 * noise();
    const btcTreasury = 204_540_000 * noise();
    const freeFloat = 3_200_000 * noise();
    const backingRatio = 3.32 * noise();
    data.push({
      date: date.toISOString().split('T')[0],
      marketCap,
      btcTreasury,
      freeFloat,
      backingRatio,
      ammLiquidity: 11_800_000 * noise(),
      stakedSupply: 5_730_000 * noise(),
      desoPrice: 5.78 * noise(),
      btcPrice: 97_400 * noise(),
    });
  }
  return data;
}
