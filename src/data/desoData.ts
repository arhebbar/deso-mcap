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
  /** Per-validator stake breakdown (from API). */
  stakedByValidator?: Array<{ validatorPk: string; validatorName?: string; amount: number }>;
  /** Net value of CCv1 (Creator Coin v1) holdings in DESO */
  ccv1ValueDeso?: number;
  /** USD value of CCv2 (user-token AMM) holdings attributed to this account from creator-coin holder share */
  ccv2ValueUsd?: number;
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
  btcPrice: 100_000, // Fallback when live API fails; live uses CoinGecko
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
  { name: 'FOCUS_COLD_001', classification: 'FOUNDATION', balances: {}, usdValue: 0 },
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
  { name: 'deso10Mdaubet', classification: 'FOUNDATION', balances: {}, usdValue: 0 },
  { name: 'FOCUS_FLOOR_BID', classification: 'FOUNDATION', balances: {}, usdValue: 0 },
  { name: 'DaoDaoDistributions', classification: 'FOUNDATION', balances: {}, usdValue: 0 },
  { name: 'merlin', classification: 'FOUNDATION', balances: {}, usdValue: 0 },
];

export const AMM_WALLETS: WalletData[] = [
  { name: 'AMM_DESO_24_PlAEU', classification: 'AMM', balances: { dUSDC: 1_410_000, DESO: 96_500 }, usdValue: 1_950_000 },
  { name: 'AMM_DESO_23_GrYpe', classification: 'AMM', balances: { DESO: 1_440_000, dUSDC: 3_000 }, usdValue: 8_330_000 },
  { name: 'AMM_focus_12_nzWku', classification: 'AMM', balances: { Focus: 1_770_000_000 }, usdValue: 601_800 },
  { name: 'AMM_openfund_12_gOR1b', classification: 'AMM', balances: { Openfund: 5_046_000 }, usdValue: 439_000 },
  { name: 'AMM_DESO_19_W5vn0', classification: 'AMM', balances: { DESO: 74_048 }, usdValue: 428_000 },
  { name: 'AMM_openfund_13_1gbih', classification: 'AMM', balances: { Openfund: 1_207_000 }, usdValue: 105_000 },
  /** CCv2 user-token AMM pools. name matches API displayName for merge. Static fallback when API/cache missing; API fills DESO/usdValue. */
  { name: 'WhaleDShark (AMM)', classification: 'AMM', balances: { DESO: 7_458 }, usdValue: 44_000 },
  { name: 'AB (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'Beyside (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: '0xWallStreetBets (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'Dejak (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'ElonTusk (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'Gabrielist (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'Debevic (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'DeSocialWorld (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'Desendor (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'CryptoChrist (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'BountyCoin (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'BSCoin (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'Arnoud (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'AMurloc (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'allindeso (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'excelsacoffee (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'edokoevoet (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'JianYang (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'Kaanha (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'Randhir (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'turts (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'WhaleFud (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'Ribbitz (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'SuchWow (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'StayFocused (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'MayBeam (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'Diamondhand (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
  { name: 'DlANA (AMM)', classification: 'AMM', balances: { DESO: 0 }, usdValue: 0 },
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
  { name: 'Jacobvan_', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'Ashdigital', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'Wintercounter', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'maebeam', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'redpartyhat', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'bluepartyhat', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'FastFreddie', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'JacksonDean', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'TyFischer', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'happy_penguin', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'NOT_AN_AGI', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'STAKE_TO_ME_OR_ELSE', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'REVOLUTIONARY_STAKING', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'simple_man_staking', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'respect_for_yield', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'AmericanStakers', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'UtopianCondition', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'yumyumstake', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'DesoSpaceStation', classification: 'FOUNDER', balances: {}, usdValue: 0 },
  { name: 'SAFU_Stake', classification: 'FOUNDER', balances: {}, usdValue: 0 },
];

/** DeSo Bulls - community holders. No static fallback; API/cache only. */
export const DESO_BULL_WALLETS: WalletData[] = [
  { name: 'Randhir (Me)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'HighKey / JordanLintz / LukeLintz (incl. HighKeyValidator, jacksonlintz)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'StarGeezer (incl. SG_Vault, BeyondSocialValidator)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'DesocialWorld (incl. DeSocialWorldValidator, Edokoevoet)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Gabrielist (incl. gabrielvault)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'RobertGraham', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: '0xAustin (incl. 0xVault)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Krassenstein (incl. Kra_Wallet, HKrassenstein)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Chadix', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Dirham', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'EileenCoyle (incl. EileenVault)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'LuisEddie', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Homey', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'tobiasschmid', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'CreativeG', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'BKPower8', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'rajmal', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'DrMoz', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Gatucu', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'mcMarsh (incl. jemarsh, mcMarshstaking)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'ImJigarShah (incl. thesarcasm)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Johan_Holmberg (incl. J_Vault)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'MrTriplet', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'FedeDM (incl. FedeDM_Guardian)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'SeWiJuga', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'PeeBoy17', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Pixelangelo', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'NFTLegacy', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'ElizabethTubbs', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'ThisDayInMusicHistory (incl. MusicHeals)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'DonBarnhart', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'TangledBrush918 (incl. Tangyshroom)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Moggel', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'ReihanRei (incl. AlecsandrosRei)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'przemyslawdygdon', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Fernando_Pessoa', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'SkhiBridges', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Arnoud', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Silto_Nascao', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'carry2web', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Kaanha', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Stevonagy', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'dennishlewis (incl. desonocode)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'SafetyNet (incl. SafetyNetStaking, SafetyNetFunding, SafetyNetValidator)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'mgoff', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Ugottalovit', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'DesoWomenUnite', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Nordian', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'DOZ', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'markvanzee', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'OliBvault', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Gjoe', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Briandrever', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Pradier', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'StevoNagy', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'erwinwillems', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Exotica_S', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'JohnDWeb3', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'gawergy', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'nathanwells', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'bkat', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'jodybossert', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'JohnJardin (incl. Capatin)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'degen_doge', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'kuririn', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'fisnikee', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'GoldBerry (incl. GoldberryWal)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'ryleesnet (incl. rylee19, ryleesnetvalidator)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: '0xBen_', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Darian_Parrish (incl. DariansWallet)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'VishalGulia (incl. VishalWallet, NIX0057)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'ZeroToOne', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'anku', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'fllwthrvr', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'PremierNS', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'WhaleDShark (incl. WhaleDVault)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'dharmesh', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'hubspot', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Stantontv', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'MayumiJapan', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'SwiftD', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'avrce', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Kunge', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'leojay', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Fungibles', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'NodebitsDAO', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: '100', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Crowd33 (incl. CrowdWallet)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'ChaseSteely', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'CompDec', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'RajLahoti', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'StubbornDad', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'TheBitcloutDog (incl. TheBitcloutDogVault)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'SharkGang (incl. Metaphilosopher, SharkToken, SharkBank, SharkCoin)', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Degen_doge', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'PaulyHart', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'Mher', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
  { name: 'vampirecampfire', classification: 'DESO_BULL', balances: {}, usdValue: 0 },
];

/** Validator usernames considered "Core" (foundation-run). */
export const CORE_VALIDATOR_USERNAMES: string[] = [
  'LazyNina',
  'NOT_AN_AGI',
  'STAKE_TO_ME_OR_ELSE',
  'REVOLUTIONARY_STAKING',
  'simple_man_staking',
  'respect_for_yield',
  'AmericanStakers',
  'UtopianCondition',
  'yumyumstake',
  'DesoSpaceStation',
  'SAFU_Stake',
];

/** Validator usernames considered "Community". */
export const COMMUNITY_VALIDATOR_USERNAMES: string[] = [
  'DesocialWorldValidator',
  'HighKeyValidator',
  'NFTzToken',
  '0xAustinValidator',
  'ryleesnetValidator',
  'SafetyNetValidator',
  'TheItinerantValidator',
  'BeyondSocialValidator',
  'OmegaValidator',
  'SafetyNetFundingValidator',
  'x_dolla_DOT_games',
  'DeSoNoCode',
  'Imperator_co',
  'NameTradeValidator',
  'excelsa',
];

/** Placeholder: DESO locked in Creator Coins v1 AMMs. Set when data available. */
export const CREATOR_COINS_V1_DESO = 0;

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

/** Token name (second segment of AMM_<Token>_*) that are native/DAO, not user creator tokens. Lowercase for case-insensitive match. */
const NATIVE_AMM_TOKENS = new Set(['deso', 'focus', 'openfund']);

/**
 * Canonical list of CCv2 user-token profile names (from AMM_WALLETS).
 * Ensures the circulation table always shows all rows even when cache/API are incomplete.
 */
export function getCCv2ProfileNames(): string[] {
  const out: string[] = [];
  for (const w of AMM_WALLETS) {
    if (w.classification !== 'AMM') continue;
    let profileName: string | null = null;
    if (w.name.endsWith(' (AMM)')) {
      profileName = w.name.slice(0, -7);
    } else if (w.name.startsWith('AMM_')) {
      const part = w.name.split('_')[1];
      profileName = part ?? null;
    }
    if (!profileName || NATIVE_AMM_TOKENS.has(profileName.toLowerCase())) continue;
    out.push(profileName);
  }
  return out;
}

/**
 * Extract CCv2 user-token AMMs from wallet list.
 * Second segment of AMM username = profile name (e.g. AMM_WhaleDShark_76_SWfzF → WhaleDShark).
 * Display name "X (AMM)" also maps to profile X. Native AMMs (DESO, focus, openfund) are excluded.
 */
export function getCCv2UserTokenAmms(wallets: { name: string; classification: string; balances: Record<string, number>; usdValue?: number }[]): { profileName: string; deso: number; usdValue: number }[] {
  const out: { profileName: string; deso: number; usdValue: number }[] = [];
  for (const w of wallets) {
    if (w.classification !== 'AMM') continue;
    let profileName: string | null = null;
    if (w.name.endsWith(' (AMM)')) {
      profileName = w.name.slice(0, -7);
    } else if (w.name.startsWith('AMM_')) {
      const part = w.name.split('_')[1];
      profileName = part ?? null;
    }
    if (!profileName || NATIVE_AMM_TOKENS.has(profileName.toLowerCase())) continue;
    const deso = w.balances?.DESO ?? 0;
    const usdValue = w.usdValue ?? 0;
    out.push({ profileName, deso, usdValue });
  }
  return out;
}

/** CCv2 AMM liquidity – fallback when no wallet-derived CCv2 user-token AMMs (~$130K at $5.9) */
export const CCV2_AMM_DESO = 22_000;

// Derived calculations
export function calcMarketCap(data: MarketData) {
  return data.desoTotalSupply * data.desoPrice;
}

/** Free float = supply minus staked minus AMM/Foundation/Founder *unstaked* DESO (unstaked avoids double-counting staked). */
export function calcFreeFloat(
  data: MarketData,
  ammDesoUnstaked: number,
  foundationDesoUnstaked: number,
  founderDesoUnstaked: number
) {
  return data.desoTotalSupply - data.desoStaked - ammDesoUnstaked - foundationDesoUnstaked - founderDesoUnstaked;
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
      btcPrice: 100_000 * noise(),
    });
  }
  return data;
}
