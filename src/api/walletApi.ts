/**
 * Fetches wallet balances from DeSo blockchain API.
 * Uses get-hodlers-for-public-key with token Username (openfund, focus, dusdc, etc.) to fetch holders
 * of each token, then filters for our tracked users (Foundation, Team, DeSo Bulls).
 * LastPublicKeyBase58Check in requests is a pagination cursor (last hodler from previous page), not a tracked account.
 * Uses blockproducer.deso.org for get-hodlers (same as Openfund: https://openfund.com/d/openfund)
 */

import { CORE_VALIDATOR_USERNAMES, COMMUNITY_VALIDATOR_USERNAMES, getCCv2UserTokenAmms } from '@/data/desoData';

import { getGraphqlUrl } from '@/api/graphqlEndpoint';

/** Use Vite proxy in dev, Vercel rewrites in prod to avoid CORS */
const DESO_NODE = import.meta.env.DEV ? '/deso-api' : '/api/deso';
const HODLERS_API = import.meta.env.DEV ? '/deso-hodlers' : '/api/deso-hodlers';

/**
 * POST get-hodlers-for-public-key; on 404 try DESO_NODE (blockproducer may be unavailable).
 * Never calls the API when Username is missing or blank (prevents "Username incomplete" errors).
 */
async function fetchHodlers(body: Record<string, unknown>): Promise<Response> {
  const username = body.Username;
  if (username == null || (typeof username === 'string' && !username.trim())) {
    return new Response(JSON.stringify({}), { status: 400, statusText: 'Username required' });
  }
  let res = await fetch(`${HODLERS_API}/get-hodlers-for-public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 404) {
    res = await fetch(`${DESO_NODE}/get-hodlers-for-public-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  return res;
}
const NANOS_PER_DESO = 1e9;
/** DAO coins (Openfund, Focus, dUSDC, etc.) use 1e18 decimals like ERC-20 */
const NANOS_PER_DAO_COIN = 1e18;

export interface WalletConfig {
  username: string;
  displayName?: string;
  classification: 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL' | 'CORE_AFFILIATED' | 'EXCHANGE';
  /** When set, multiple configs with same mergeKey are combined into one entry */
  mergeKey?: string;
  /** When set, use this public key directly instead of looking up by username (for accounts with no username) */
  publicKeyBase58Check?: string;
}

export interface StakedByValidator {
  validatorPk: string;
  validatorName?: string;
  amount: number;
}

export interface WalletData {
  name: string;
  /** When set, used as canonical label (e.g. "Beyside (AMM)"); strip " (AMM)" for API username where needed */
  displayName?: string;
  classification: 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL' | 'CORE_AFFILIATED' | 'EXCHANGE';
  balances: Record<string, number>;
  usdValue: number;
  desoStaked?: number;
  desoUnstaked?: number;
  /** Per-validator stake breakdown (for StakedDesoTable grouping) */
  stakedByValidator?: StakedByValidator[];
  /** Net value of CCv1 (Creator Coin v1) holdings in DESO, from GraphQL creatorCoinBalances */
  ccv1ValueDeso?: number;
  /** USD value of CCv2 user-token holdings (share of creator-coin AMM pools attributed to this account) */
  ccv2ValueUsd?: number;
  /** Public key (base58) for explorer link and copy; set for single-pk wallets (Exchange, Core Affiliated, etc.) */
  publicKey?: string;
}

const WALLET_CONFIG: WalletConfig[] = [
  // Foundation
  { username: 'Gringotts_Wizarding_Bank', classification: 'FOUNDATION' },
  { username: 'focus', classification: 'FOUNDATION' },
  { username: 'openfund', classification: 'FOUNDATION' },
  { username: 'Deso', classification: 'FOUNDATION' },
  { username: 'deso10Mdaubet', classification: 'FOUNDATION' },
  { username: 'DaoDaoDistributions', classification: 'FOUNDATION' },
  { username: 'merlin', classification: 'FOUNDATION' },
  // AMM + Holding Accounts (includes FOCUS cold and floor bid)
  { username: 'FOCUS_COLD_000', classification: 'AMM' },
  { username: 'FOCUS_COLD_001', classification: 'AMM' },
  { username: 'Focus_Floor_Bid', classification: 'AMM' },
  { username: 'AMM_DESO_24_PlAEU', classification: 'AMM' },
  { username: 'AMM_DESO_23_GrYpe', classification: 'AMM' },
  { username: 'AMM_focus_12_nzWku', classification: 'AMM' },
  { username: 'AMM_openfund_12_gOR1b', classification: 'AMM' },
  { username: 'AMM_DESO_19_W5vn0', classification: 'AMM' },
  { username: 'AMM_openfund_13_1gbih', classification: 'AMM' },
  { username: 'AMM_WhaleDShark_76_SWfzF', displayName: 'WhaleDShark (AMM)', classification: 'AMM' },
  { username: 'AMM_AB_781_Cy9T5', displayName: 'AB (AMM)', classification: 'AMM' },
  { username: 'AMM_Beyside_1325_BZp5t', displayName: 'Beyside (AMM)', classification: 'AMM' },
  { username: 'AMM_0xWallStree_546_Y1I5C', displayName: '0xWallStreetBets (AMM)', classification: 'AMM' },
  { username: 'AMM_Dejak_1272_2U5qG', displayName: 'Dejak (AMM)', classification: 'AMM' },
  { username: 'AMM_ElonTusk_29_K82Od', displayName: 'ElonTusk (AMM)', classification: 'AMM' },
  { username: 'AMM_gabrielist_251_eNQur', displayName: 'Gabrielist (AMM)', classification: 'AMM' },
  { username: 'AMM_Debevic_650_S6HoR', displayName: 'Debevic (AMM)', classification: 'AMM' },
  { username: 'AMM_DeSocialWorl_69_fajqs', displayName: 'DeSocialWorld (AMM)', classification: 'AMM' },
  { username: 'AMM_Desendor_231_9KQT0', displayName: 'Desendor (AMM)', classification: 'AMM' },
  { username: 'AMM_CryptoChri_1237_F7a2X', displayName: 'CryptoChrist (AMM)', classification: 'AMM' },
  { username: 'AMM_BountyCoin_90_98Jiz', displayName: 'BountyCoin (AMM)', classification: 'AMM' },
  { username: 'AMM_BSCoin_614_stVeY', displayName: 'BSCoin (AMM)', classification: 'AMM' },
  { username: 'AMM_Arnoud_78_vlWda', displayName: 'Arnoud (AMM)', classification: 'AMM' },
  { username: 'AMM_AMurloc_230_pyWkk', displayName: 'AMurloc (AMM)', classification: 'AMM' },
  { username: 'AMM_allindeso_254_7xYIB', displayName: 'allindeso (AMM)', classification: 'AMM' },
  { username: 'AMM_excelsacoff_740_NRb8m', displayName: 'excelsacoffee (AMM)', classification: 'AMM' },
  { username: 'AMM_edokoevoet_747_LO4V9', displayName: 'edokoevoet (AMM)', classification: 'AMM' },
  { username: 'AMM_JianYang_192_O9O5z', displayName: 'JianYang (AMM)', classification: 'AMM' },
  { username: 'AMM_Kaanha_1291_SEf0P', displayName: 'Kaanha (AMM)', classification: 'AMM' },
  { username: 'AMM_Randhir_1258_oOyq3', displayName: 'Randhir (AMM)', classification: 'AMM' },
  { username: 'AMM_turts_173_iVwFT', displayName: 'turts (AMM)', classification: 'AMM' },
  { username: 'AMM_WhaleFUD_647_O32R1', displayName: 'WhaleFud (AMM)', classification: 'AMM' },
  { username: 'AMM_Ribbitz_797_U4TpV', displayName: 'Ribbitz (AMM)', classification: 'AMM' },
  { username: 'AMM_SuchWow_517_I8QMY', displayName: 'SuchWow (AMM)', classification: 'AMM' },
  { username: 'AMM_StayFocused_459_ttRC4', displayName: 'StayFocused (AMM)', classification: 'AMM' },
  { username: 'AMM_MayBeam_39_3DArZ', displayName: 'MayBeam (AMM)', classification: 'AMM' },
  { username: 'AMM_Diamondhand_163_e8Umf', displayName: 'Diamondhand (AMM)', classification: 'AMM' },
  { username: 'AMM_DlANA_233_4EZFG', displayName: 'DlANA (AMM)', classification: 'AMM' },
  // Founding Team
  { username: 'Whoami', classification: 'FOUNDER' },
  { username: 'Nader', classification: 'FOUNDER' },
  { username: 'Mossified', classification: 'FOUNDER' },
  { username: 'LazyNina', classification: 'FOUNDER' },
  { username: 'Jacobvan_', classification: 'FOUNDER' },
  { username: 'Ashdigital', classification: 'FOUNDER' },
  { username: 'Wintercounter', classification: 'FOUNDER' },
  { username: 'maebeam', classification: 'FOUNDER' },
  { username: 'redpartyhat', classification: 'FOUNDER' },
  { username: 'bluepartyhat', displayName: 'bluepartyhat (incl. …bNLy, …j5kp)', classification: 'FOUNDER', mergeKey: 'bluepartyhat' },
  { username: '', displayName: 'bluepartyhat (incl. …bNLy, …j5kp)', classification: 'FOUNDER', mergeKey: 'bluepartyhat', publicKeyBase58Check: 'BC1YLfgco8qmMEzdgqZV97ZMsdcETHUVTMShtHaUkwLfcoUG6ThbNLy' },
  { username: '', displayName: 'bluepartyhat (incl. …bNLy, …j5kp)', classification: 'FOUNDER', mergeKey: 'bluepartyhat', publicKeyBase58Check: 'BC1YLiAGWgtWVVHEaUACsWWRZBvCZbsDHw4wkvSGnEYhS2H5WZjj5kp' },
  { username: 'FastFreddie', classification: 'FOUNDER' },
  { username: 'JacksonDean', classification: 'FOUNDER' },
  { username: 'TyFischer', classification: 'FOUNDER' },
  { username: 'happy_penguin', classification: 'FOUNDER' },
  // Core Validators (Core Team)
  { username: 'NOT_AN_AGI', classification: 'FOUNDER' },
  { username: 'STAKE_TO_ME_OR_ELSE', classification: 'FOUNDER' },
  { username: 'REVOLUTIONARY_STAKING', classification: 'FOUNDER' },
  { username: 'simple_man_staking', classification: 'FOUNDER' },
  { username: 'respect_for_yield', classification: 'FOUNDER' },
  { username: 'AmericanStakers', classification: 'FOUNDER' },
  { username: 'UtopianCondition', classification: 'FOUNDER' },
  { username: 'yumyumstake', classification: 'FOUNDER' },
  { username: 'DesoSpaceStation', classification: 'FOUNDER' },
  { username: 'SAFU_Stake', classification: 'FOUNDER' },
  // DeSo Bulls (same fetch method as Foundation/Founder)
  { username: 'Randhir', displayName: 'Randhir (Me)', classification: 'DESO_BULL', mergeKey: 'Randhir' },
  { username: 'RandhirStakingWallet', displayName: 'Randhir (Me)', classification: 'DESO_BULL', mergeKey: 'Randhir' },
  { username: 'Twinstars', displayName: 'Randhir (Me)', classification: 'DESO_BULL', mergeKey: 'Randhir' },
  { username: 'desoscams', displayName: 'Randhir (Me)', classification: 'DESO_BULL', mergeKey: 'Randhir' },
  { username: 'Bhagyasri', displayName: 'Randhir (Me)', classification: 'DESO_BULL', mergeKey: 'Randhir' },
  { username: 'HighKey', displayName: 'HighKey / JordanLintz / LukeLintz (incl. HighKeyValidator)', classification: 'DESO_BULL', mergeKey: 'HighKey' },
  { username: 'JordanLintz', displayName: 'HighKey / JordanLintz / LukeLintz (incl. HighKeyValidator)', classification: 'DESO_BULL', mergeKey: 'HighKey' },
  { username: 'jacksonlintz', displayName: 'HighKey / JordanLintz / LukeLintz (incl. HighKeyValidator)', classification: 'DESO_BULL', mergeKey: 'HighKey' },
  { username: 'LukeLintz', displayName: 'HighKey / JordanLintz / LukeLintz (incl. HighKeyValidator)', classification: 'DESO_BULL', mergeKey: 'HighKey' },
  { username: 'HighKeyValidator', displayName: 'HighKey / JordanLintz / LukeLintz (incl. HighKeyValidator)', classification: 'DESO_BULL', mergeKey: 'HighKey' },
  { username: 'StarGeezer', displayName: 'StarGeezer (incl. SG_Vault, BeyondSocialValidator, StarGeezerCore, BeyondSocial)', classification: 'DESO_BULL', mergeKey: 'StarGeezer' },
  { username: 'SG_Vault', displayName: 'StarGeezer (incl. SG_Vault, BeyondSocialValidator, StarGeezerCore, BeyondSocial)', classification: 'DESO_BULL', mergeKey: 'StarGeezer' },
  { username: 'BeyondSocialValidator', displayName: 'StarGeezer (incl. SG_Vault, BeyondSocialValidator, StarGeezerCore, BeyondSocial)', classification: 'DESO_BULL', mergeKey: 'StarGeezer' },
  { username: 'StarGeezerCore', displayName: 'StarGeezer (incl. SG_Vault, BeyondSocialValidator, StarGeezerCore, BeyondSocial)', classification: 'DESO_BULL', mergeKey: 'StarGeezer' },
  { username: 'BeyondSocial', displayName: 'StarGeezer (incl. SG_Vault, BeyondSocialValidator, StarGeezerCore, BeyondSocial)', classification: 'DESO_BULL', mergeKey: 'StarGeezer' },
  { username: 'DesocialWorld', displayName: 'DesocialWorld (incl. DeSocialWorldValidator, Edokoevoet)', classification: 'DESO_BULL', mergeKey: 'DesocialWorld' },
  { username: 'DesocialWorldValidator', displayName: 'DesocialWorld (incl. DeSocialWorldValidator, Edokoevoet)', classification: 'DESO_BULL', mergeKey: 'DesocialWorld' },
  { username: 'Edokoevoet', displayName: 'DesocialWorld (incl. DeSocialWorldValidator, Edokoevoet)', classification: 'DESO_BULL', mergeKey: 'DesocialWorld' },
  { username: 'Gabrielist', displayName: 'Gabrielist (incl. gabrielvault)', classification: 'DESO_BULL', mergeKey: 'Gabrielist' },
  { username: 'gabrielvault', displayName: 'Gabrielist (incl. gabrielvault)', classification: 'DESO_BULL', mergeKey: 'Gabrielist' },
  { username: 'RobertGraham', displayName: 'RobertGraham (incl. ButtSniffer, VaultForMe)', classification: 'DESO_BULL', mergeKey: 'RobertGraham' },
  { username: 'ButtSniffer', displayName: 'RobertGraham (incl. ButtSniffer, VaultForMe)', classification: 'DESO_BULL', mergeKey: 'RobertGraham' },
  { username: 'VaultForMe', displayName: 'RobertGraham (incl. ButtSniffer, VaultForMe)', classification: 'DESO_BULL', mergeKey: 'RobertGraham' },
  { username: 'Richwolfru007', classification: 'DESO_BULL' },
  { username: '0xAustin', displayName: '0xAustin (incl. 0xVault)', classification: 'DESO_BULL', mergeKey: '0xAustin' },
  { username: '0xVault', displayName: '0xAustin (incl. 0xVault)', classification: 'DESO_BULL', mergeKey: '0xAustin' },
  { username: '0xAustinValidator', displayName: '0xAustin (incl. 0xVault)', classification: 'DESO_BULL', mergeKey: '0xAustin' },
  { username: '0xBen_', classification: 'DESO_BULL' },
  { username: 'Darian_Parrish', displayName: 'Darian_Parrish (incl. DariansWallet)', classification: 'DESO_BULL', mergeKey: 'Darian_Parrish' },
  { username: 'DariansWallet', displayName: 'Darian_Parrish (incl. DariansWallet)', classification: 'DESO_BULL', mergeKey: 'Darian_Parrish' },
  { username: 'VishalGulia', displayName: 'VishalGulia (incl. VishalWallet, NIX0057)', classification: 'DESO_BULL', mergeKey: 'VishalGulia' },
  { username: 'VishalWallet', displayName: 'VishalGulia (incl. VishalWallet, NIX0057)', classification: 'DESO_BULL', mergeKey: 'VishalGulia' },
  { username: 'NIX0057', displayName: 'VishalGulia (incl. VishalWallet, NIX0057)', classification: 'DESO_BULL', mergeKey: 'VishalGulia' },
  { username: '', displayName: 'VishalGulia (incl. VishalWallet, NIX0057)', classification: 'DESO_BULL', mergeKey: 'VishalGulia', publicKeyBase58Check: 'BC1YLgJHczW24n5kQYJYiw6MoFbg2CmDRf4bWxWRE7znVaRfT27V5kE' },
  { username: 'ZeroToOne', displayName: 'ZeroToOne (incl. …nzdk, …Y3PW4)', classification: 'DESO_BULL', mergeKey: 'ZeroToOne' },
  { username: '', displayName: 'ZeroToOne (incl. …nzdk, …Y3PW4)', classification: 'DESO_BULL', mergeKey: 'ZeroToOne', publicKeyBase58Check: 'BC1YLjW2ZrS2mTEur1vwER78XoKFpjDN8T7TLr1ueag7QVCoYHhnzdk' },
  { username: '', displayName: 'ZeroToOne (incl. …nzdk, …Y3PW4)', classification: 'DESO_BULL', mergeKey: 'ZeroToOne', publicKeyBase58Check: 'BC1YLiFisNRb3c2tuMRZ2MXuPNUQbf4J4ynpBU4iy6k3xWKwrkY3PW4' },
  { username: 'anku', classification: 'DESO_BULL' },
  { username: 'fllwthrvr', classification: 'DESO_BULL' },
  { username: 'PremierNS', classification: 'DESO_BULL' },
  { username: 'WhaleDShark', displayName: 'WhaleDShark (incl. WhaleDVault, WhaleDShark2, deepblue1)', classification: 'DESO_BULL', mergeKey: 'WhaleDShark' },
  { username: 'WhaleDVault', displayName: 'WhaleDShark (incl. WhaleDVault, WhaleDShark2, deepblue1)', classification: 'DESO_BULL', mergeKey: 'WhaleDShark' },
  { username: 'WhaleDShark2', displayName: 'WhaleDShark (incl. WhaleDVault, WhaleDShark2, deepblue1)', classification: 'DESO_BULL', mergeKey: 'WhaleDShark' },
  { username: 'deepblue1', displayName: 'WhaleDShark (incl. WhaleDVault, WhaleDShark2, deepblue1)', classification: 'DESO_BULL', mergeKey: 'WhaleDShark' },
  { username: '', displayName: 'WhaleDShark (incl. WhaleDVault, WhaleDShark2, deepblue1)', classification: 'DESO_BULL', mergeKey: 'WhaleDShark', publicKeyBase58Check: 'BC1YLgbQcbJhnqhcAYaND9PPprE5f4ME9Dn3SfVAVc2gQxVToha5yMc' },
  { username: 'dharmesh', displayName: 'dharmesh (incl. linked)', classification: 'DESO_BULL', mergeKey: 'dharmesh' },
  { username: 'linked', displayName: 'dharmesh (incl. linked)', classification: 'DESO_BULL', mergeKey: 'dharmesh' },
  { username: 'hubspot', classification: 'DESO_BULL' },
  { username: 'Stantontv', classification: 'DESO_BULL' },
  { username: 'MayumiJapan', classification: 'DESO_BULL' },
  { username: 'SwiftD', classification: 'DESO_BULL' },
  { username: 'avrce', classification: 'DESO_BULL' },
  { username: 'Kunge', classification: 'DESO_BULL' },
  { username: 'leojay', classification: 'DESO_BULL' },
  { username: 'Fungibles', classification: 'DESO_BULL' },
  { username: 'NodebitsDAO', classification: 'DESO_BULL' },
  { username: '100', classification: 'DESO_BULL' },
  { username: 'Crowd33', displayName: 'Crowd33 (incl. CrowdWallet)', classification: 'DESO_BULL', mergeKey: 'Crowd33' },
  { username: 'CrowdWallet', displayName: 'Crowd33 (incl. CrowdWallet)', classification: 'DESO_BULL', mergeKey: 'Crowd33' },
  // Long-term community members
  { username: 'Krassenstein', displayName: 'Krassenstein (incl. Kra_Wallet, HKrassenstein)', classification: 'DESO_BULL', mergeKey: 'Krassenstein' },
  { username: 'Kra_Wallet', displayName: 'Krassenstein (incl. Kra_Wallet, HKrassenstein)', classification: 'DESO_BULL', mergeKey: 'Krassenstein' },
  { username: 'HKrassenstein', displayName: 'Krassenstein (incl. Kra_Wallet, HKrassenstein)', classification: 'DESO_BULL', mergeKey: 'Krassenstein' },
  { username: 'Chadix', classification: 'DESO_BULL' },
  { username: 'Dirham', classification: 'DESO_BULL' },
  { username: 'EileenCoyle', displayName: 'EileenCoyle (incl. EileenVault)', classification: 'DESO_BULL', mergeKey: 'EileenCoyle' },
  { username: 'EileenVault', displayName: 'EileenCoyle (incl. EileenVault)', classification: 'DESO_BULL', mergeKey: 'EileenCoyle' },
  { username: 'LuisEddie', classification: 'DESO_BULL' },
  { username: 'Homey', classification: 'DESO_BULL' },
  { username: 'tobiasschmid', classification: 'DESO_BULL' },
  { username: 'CreativeG', classification: 'DESO_BULL' },
  { username: 'BKPower8', classification: 'DESO_BULL' },
  { username: 'rajmal', classification: 'DESO_BULL' },
  { username: 'DrMoz', classification: 'DESO_BULL' },
  { username: 'Gatucu', classification: 'DESO_BULL' },
  { username: 'mcMarsh', displayName: 'mcMarsh (incl. jemarsh, mcMarshstaking)', classification: 'DESO_BULL', mergeKey: 'mcMarsh' },
  { username: 'mcMarshstaking', displayName: 'mcMarsh (incl. jemarsh, mcMarshstaking)', classification: 'DESO_BULL', mergeKey: 'mcMarsh' },
  { username: 'jemarsh', displayName: 'mcMarsh (incl. jemarsh, mcMarshstaking)', classification: 'DESO_BULL', mergeKey: 'mcMarsh' },
  { username: 'ImJigarShah', displayName: 'ImJigarShah (incl. thesarcasm)', classification: 'DESO_BULL', mergeKey: 'ImJigarShah' },
  { username: 'thesarcasm', displayName: 'ImJigarShah (incl. thesarcasm)', classification: 'DESO_BULL', mergeKey: 'ImJigarShah' },
  { username: 'Johan_Holmberg', displayName: 'Johan_Holmberg (incl. J_Vault)', classification: 'DESO_BULL', mergeKey: 'Johan_Holmberg' },
  { username: 'J_Vault', displayName: 'Johan_Holmberg (incl. J_Vault)', classification: 'DESO_BULL', mergeKey: 'Johan_Holmberg' },
  { username: 'MrTriplet', classification: 'DESO_BULL' },
  { username: 'FedeDM', displayName: 'FedeDM (incl. FedeDM_Guardian)', classification: 'DESO_BULL', mergeKey: 'FedeDM' },
  { username: 'FedeDM_Guardian', displayName: 'FedeDM (incl. FedeDM_Guardian)', classification: 'DESO_BULL', mergeKey: 'FedeDM' },
  { username: 'SeWiJuga', classification: 'DESO_BULL' },
  { username: 'PeeBoy17', classification: 'DESO_BULL' },
  { username: 'Pixelangelo', classification: 'DESO_BULL' },
  { username: 'NFTLegacy', classification: 'DESO_BULL' },
  { username: 'ElizabethTubbs', classification: 'DESO_BULL' },
  { username: 'ThisDayInMusicHistory', displayName: 'ThisDayInMusicHistory (incl. MusicHeals)', classification: 'DESO_BULL', mergeKey: 'ThisDayInMusicHistory' },
  { username: 'MusicHeals', displayName: 'ThisDayInMusicHistory (incl. MusicHeals)', classification: 'DESO_BULL', mergeKey: 'ThisDayInMusicHistory' },
  { username: 'DonBarnhart', classification: 'DESO_BULL' },
  { username: 'TangledBrush918', displayName: 'TangledBrush918 (incl. Tangyshroom)', classification: 'DESO_BULL', mergeKey: 'TangledBrush918' },
  { username: 'Tangyshroom', displayName: 'TangledBrush918 (incl. Tangyshroom)', classification: 'DESO_BULL', mergeKey: 'TangledBrush918' },
  { username: 'Moggel', displayName: 'Moggel (incl. BlastingBull67, SinisterSwine666)', classification: 'DESO_BULL', mergeKey: 'Moggel' },
  { username: 'BlastingBull67', displayName: 'Moggel (incl. BlastingBull67, SinisterSwine666)', classification: 'DESO_BULL', mergeKey: 'Moggel' },
  { username: 'SinisterSwine666', displayName: 'Moggel (incl. BlastingBull67, SinisterSwine666)', classification: 'DESO_BULL', mergeKey: 'Moggel' },
  { username: 'ReihanRei', displayName: 'ReihanRei (incl. AlecsandrosRei)', classification: 'DESO_BULL', mergeKey: 'ReihanRei' },
  { username: 'AlecsandrosRei', displayName: 'ReihanRei (incl. AlecsandrosRei)', classification: 'DESO_BULL', mergeKey: 'ReihanRei' },
  { username: 'przemyslawdygdon', classification: 'DESO_BULL' },
  { username: 'Fernando_Pessoa', classification: 'DESO_BULL' },
  { username: 'SkhiBridges', classification: 'DESO_BULL' },
  { username: 'Arnoud', classification: 'DESO_BULL' },
  { username: 'Silto_Nascao', classification: 'DESO_BULL' },
  { username: 'carry2web', classification: 'DESO_BULL' },
  { username: 'Kaanha', classification: 'DESO_BULL' },
  { username: 'jgalmeida', classification: 'DESO_BULL' },
  { username: 'DCNY', classification: 'DESO_BULL' },
  { username: 'NathanHeffelman', classification: 'DESO_BULL' },
  { username: 'loveneeshmalik', classification: 'DESO_BULL' },
  { username: 'arturopops', classification: 'DESO_BULL' },
  { username: 'Stevonagy', classification: 'DESO_BULL' },
  { username: 'dennishlewis', displayName: 'dennishlewis (incl. desonocode)', classification: 'DESO_BULL', mergeKey: 'dennishlewis' },
  { username: 'desonocode', displayName: 'dennishlewis (incl. desonocode)', classification: 'DESO_BULL', mergeKey: 'dennishlewis' },
  { username: 'SafetyNet', displayName: 'SafetyNet (incl. SafetyNetStaking, SafetyNetFunding, SafetyNetValidator)', classification: 'DESO_BULL', mergeKey: 'SafetyNet' },
  { username: 'SafetyNetStaking', displayName: 'SafetyNet (incl. SafetyNetStaking, SafetyNetFunding, SafetyNetValidator)', classification: 'DESO_BULL', mergeKey: 'SafetyNet' },
  { username: 'SafetyNetFunding', displayName: 'SafetyNet (incl. SafetyNetStaking, SafetyNetFunding, SafetyNetValidator)', classification: 'DESO_BULL', mergeKey: 'SafetyNet' },
  { username: 'SafetyNetValidator', displayName: 'SafetyNet (incl. SafetyNetStaking, SafetyNetFunding, SafetyNetValidator)', classification: 'DESO_BULL', mergeKey: 'SafetyNet' },
  { username: 'mgoff', classification: 'DESO_BULL' },
  { username: 'Ugottalovit', classification: 'DESO_BULL' },
  { username: 'DesoWomenUnite', classification: 'DESO_BULL' },
  { username: 'Nordian', classification: 'DESO_BULL' },
  { username: 'DOZ', classification: 'DESO_BULL' },
  { username: 'markvanzee', classification: 'DESO_BULL' },
  { username: 'OliBvault', classification: 'DESO_BULL' },
  { username: 'Gjoe', displayName: 'Gjoe (incl. …uvPgw)', classification: 'DESO_BULL', mergeKey: 'Gjoe' },
  { username: '', displayName: 'Gjoe (incl. …uvPgw)', classification: 'DESO_BULL', mergeKey: 'Gjoe', publicKeyBase58Check: 'BC1YLg7fLKpJWm9Sd4e1vPmsEFNCWQ11yCMBMc5hdgBk1BznfvuvPgw' },
  { username: 'Briandrever', classification: 'DESO_BULL' },
  { username: 'Pradier', classification: 'DESO_BULL' },
  { username: 'StevoNagy', classification: 'DESO_BULL' },
  { username: 'erwinwillems', classification: 'DESO_BULL' },
  { username: 'Exotica_S', classification: 'DESO_BULL' },
  { username: 'JohnDWeb3', classification: 'DESO_BULL' },
  { username: 'gawergy', classification: 'DESO_BULL' },
  { username: 'nathanwells', classification: 'DESO_BULL' },
  { username: 'bkat', classification: 'DESO_BULL' },
  { username: 'jodybossert', classification: 'DESO_BULL' },
  { username: 'JohnJardin', displayName: 'JohnJardin (incl. Capatin)', classification: 'DESO_BULL', mergeKey: 'JohnJardin' },
  { username: 'Capatin', displayName: 'JohnJardin (incl. Capatin)', classification: 'DESO_BULL', mergeKey: 'JohnJardin' },
  { username: 'degen_doge', classification: 'DESO_BULL' },
  { username: 'kuririn', classification: 'DESO_BULL' },
  { username: 'fisnikee', classification: 'DESO_BULL' },
  { username: 'GoldBerry', displayName: 'GoldBerry (incl. GoldberryWal)', classification: 'DESO_BULL', mergeKey: 'GoldBerry' },
  { username: 'GoldberryWal', displayName: 'GoldBerry (incl. GoldberryWal)', classification: 'DESO_BULL', mergeKey: 'GoldBerry' },
  { username: 'ryleesnet', displayName: 'ryleesnet (incl. rylee19, ryleesnetvalidator)', classification: 'DESO_BULL', mergeKey: 'ryleesnet' },
  { username: 'rylee19', displayName: 'ryleesnet (incl. rylee19, ryleesnetvalidator)', classification: 'DESO_BULL', mergeKey: 'ryleesnet' },
  { username: 'ryleesnetvalidator', displayName: 'ryleesnet (incl. rylee19, ryleesnetvalidator)', classification: 'DESO_BULL', mergeKey: 'ryleesnet' },
  { username: 'ChaseSteely', classification: 'DESO_BULL' },
  { username: 'CompDec', classification: 'DESO_BULL' },
  { username: 'RajLahoti', classification: 'DESO_BULL' },
  { username: 'StubbornDad', classification: 'DESO_BULL' },
  { username: 'TheBitcloutDog', displayName: 'TheBitcloutDog (incl. TheBitcloutDogVault)', classification: 'DESO_BULL', mergeKey: 'TheBitcloutDog' },
  { username: 'TheBitcloutDogVault', displayName: 'TheBitcloutDog (incl. TheBitcloutDogVault)', classification: 'DESO_BULL', mergeKey: 'TheBitcloutDog' },
  { username: 'SharkGang', displayName: 'SharkGang (incl. Metaphilosopher, SharkToken, SharkBank, SharkCoin)', classification: 'DESO_BULL', mergeKey: 'SharkGang' },
  { username: 'Metaphilosopher', displayName: 'SharkGang (incl. Metaphilosopher, SharkToken, SharkBank, SharkCoin)', classification: 'DESO_BULL', mergeKey: 'SharkGang' },
  { username: 'SharkToken', displayName: 'SharkGang (incl. Metaphilosopher, SharkToken, SharkBank, SharkCoin)', classification: 'DESO_BULL', mergeKey: 'SharkGang' },
  { username: 'SharkBank', displayName: 'SharkGang (incl. Metaphilosopher, SharkToken, SharkBank, SharkCoin)', classification: 'DESO_BULL', mergeKey: 'SharkGang' },
  { username: 'SharkCoin', displayName: 'SharkGang (incl. Metaphilosopher, SharkToken, SharkBank, SharkCoin)', classification: 'DESO_BULL', mergeKey: 'SharkGang' },
  { username: 'Degen_doge', classification: 'DESO_BULL' },
  { username: 'PaulyHart', classification: 'DESO_BULL' },
  { username: 'Mher', classification: 'DESO_BULL' },
  { username: 'vampirecampfire', classification: 'DESO_BULL' },
  // ykshine and shine2445 (DeSo Bulls)
  { username: 'ykshine', displayName: 'ykshine (incl. shine2445)', classification: 'DESO_BULL', mergeKey: 'ykshine' },
  { username: 'shine2445', displayName: 'ykshine (incl. shine2445)', classification: 'DESO_BULL', mergeKey: 'ykshine' },
  { username: 'michelvanlinschooten', classification: 'DESO_BULL' },
  { username: 'TheLego3072', classification: 'DESO_BULL' },
  { username: 'BRENDANTADLER', classification: 'DESO_BULL' },
  { username: 'Moshehogeg', classification: 'DESO_BULL' },
  { username: 'AltcoinUSA', classification: 'DESO_BULL' },
  { username: 'Alisuliman', classification: 'DESO_BULL' },
  { username: 'Dario_Ryu_Alioto', classification: 'DESO_BULL' },
  { username: '', displayName: 'DeSo Bull (…eg4es)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiRhbpc7aypyVxtsxaNWiB3yyP6f9wxsz2px2cHTs55VT7eg4es' },
  { username: '', displayName: 'DeSo Bull (…fgvPi)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgwopktaB5AFqR5dc3So288vZNhtKi4zp1QGLJmXGXYX5mfgvPi' },
  { username: '', displayName: 'DeSo Bull (…n2ZY)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgQkyaEw1Y4mSY2xe88FfAhEkg9wHbnZq1vU72QV1foP3J7n2ZY' },
  // Focus/Openfund holders + top DESO (find-holders-to-add script)
  { username: '', displayName: 'DeSo Bull (…4b7kXY)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLixWsyuiEsT6ozD2H3eupsWPhw4zYPynPfD1hVuKbV4Xp4b7kXY' },
  { username: '', displayName: 'DeSo Bull (…Ga8gkG)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiy4PJSw18A1Re2eBJAATrVErWDBGC5jpfszzDBKorb6zGa8gkG' },
  { username: '', displayName: 'DeSo Bull (…8zoNYY)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfn4nKxmifZPXrJydNzjBZTm4aSorE8obPGnemJtwBuSh8zoNYY' },
  { username: '', displayName: 'DeSo Bull (…hvvw6v)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLghNWoR9G81AvT5vZSa1zi9U8vbmL7L5xA5QTFz4HhAZ3hvvw6v' },
  { username: '', displayName: 'DeSo Bull (…XQk7T8)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLh3Q8aspGuSqeh7ph7w8JaATUy5xEDsWkRetxR1BQV3KzXQk7T8' },
  { username: '', displayName: 'DeSo Bull (…65BTQR)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgmCsnSpkm4UmzTz5M6mrLRXidD43cv8NCbPybXp1dbpL65BTQR' },
  { username: '', displayName: 'DeSo Bull (…hNip9i)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhAAi6DP8QU9QWu6JdxUNk76gqNePDu6JWeDEanr3STp7hNip9i' },
  { username: '', displayName: 'DeSo Bull (…pU5isw)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLidpWYwa6uUszuUD4ZLN9JnxEvVa2K7yD4Dn5bMV54u2YpU5isw' },
  { username: '', displayName: 'DeSo Bull (…fRg9P1)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhV5AT5QBRMxTWYaQRXsoGXYpz4fG9sKGwxLPhgci2pKwfRg9P1' },
  { username: '', displayName: 'DeSo Bull (…PdwLtx)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfzVgSjZ25Jzaw5y8qY4JpFS4aPZA12WLSf1KtFK35vXPPdwLtx' },
  { username: '', displayName: 'DeSo Bull (…3Tk7XB)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgdp7sJujbGs5VGHjjqVKjhe1He9xFiSiT2aDUVHMWv9i3Tk7XB' },
  { username: '', displayName: 'DeSo Bull (…7mBMW7)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj9Ld8sppWu58oMFEGdAx6CDAeC8mzwKfWfzpjwxAyUjr7mBMW7' },
  { username: '', displayName: 'DeSo Bull (…QZM1SJ)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLh5xALAdWoS7qcMu2fYGAyYWz2odfnLR68ugCPXDVuT5YQZM1SJ' },
  { username: '', displayName: 'DeSo Bull (…ZMuckn)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLi5TAuKMdcbCxMjn6BqysV1wMhRsTY2oph7gyiNGAfrNgZMuckn' },
  { username: '', displayName: 'DeSo Bull (…ZSD8Uh)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhqykp8AsDdchQ3xr8ySk6E81fGeZGSxwdioTaMdhyzt3ZSD8Uh' },
  { username: '', displayName: 'DeSo Bull (…XzUt34)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgBpWd9WbuAEJP8hqJuCboJGKymEyYMgKNpVpVLCMqmwrXzUt34' },
  { username: '', displayName: 'DeSo Bull (…vZuft3)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfhawT8GPqoYjzVJFb8phcwoFoc1QHopgF6AK8n87vDXPvZuft3' },
  { username: '', displayName: 'DeSo Bull (…peN7u8)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfmSHs7GSJ4uBJ8eM9AF5aqCkdQgNojrTKmrAhSRrwR3XpeN7u8' },
  { username: '', displayName: 'DeSo Bull (…7cnJYn)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjKa4vaZiarKPxNFor1Lfm8VoNxWZxyrqLh4pcuYj2BEo7cnJYn' },
  { username: '', displayName: 'DeSo Bull (…3CjwoS)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgUU57aMVyfmrprFZicifoaH5QD8WdBWxtw5PWusD4Spe3CjwoS' },
  { username: '', displayName: 'DeSo Bull (…RLCUht)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLi88dDt3FqZTr1v8VL1fnwTuKCDcYCQW5wYAdN6z2HKAhRLCUht' },
  { username: '', displayName: 'DeSo Bull (…6ysWBy)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfoBazPJCiMJyMLwE8uTnQ8JbYoHuHaAvhwzxms3nmHnM6ysWBy' },
  { username: '', displayName: 'DeSo Bull (…jNCscP)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfjjbrCBVffurMp2Tdgtxq5na1rijkTam8FDaGXh4sGqMjNCscP' },
  { username: '', displayName: 'DeSo Bull (…rBcJzs)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfmFnjX9D4Hy4a3uETXHm5LH3VCpda32GRPf7cfHpycVYrBcJzs' },
  { username: '', displayName: 'DeSo Bull (…XxA4Ev)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfitC55Fvy2ru24w1F4h9FYvL5CwqghJJeP43qhxiMiQMXxA4Ev' },
  { username: '', displayName: 'DeSo Bull (…vQ1G91)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiTNp84xUmaDBxtEMoc7H45QKu3d775pMa2bT2qHBiqmRvQ1G91' },
  { username: '', displayName: 'DeSo Bull (…HECbPi)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgoaDz1CtGVtxDRAHE5bfyPXNNJAdRnzbXapigsVVxRK5HECbPi' },
  { username: '', displayName: 'DeSo Bull (…gnaabr)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhDodML1kSrTkG5yCHm2Bvg1Yq3FDHLB97YASf9hP4P7Kgnaabr' },
  { username: '', displayName: 'DeSo Bull (…wQUXbL)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgU4kGEkj4QepnZ5tTBrAfbGVkvpiUPVkcZUARsn4MQ4xwQUXbL' },
  { username: '', displayName: 'DeSo Bull (…BoBRgQ)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLixSUwAzHobC2nqgtWkXUroLHPVRnpSt19oaKPSJuWG47BoBRgQ' },
  { username: '', displayName: 'DeSo Bull (…QbsKgH)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgWo2Qk7FWyci97xL3qXriMD1sTaV2kLabHDX6s1xNupBQbsKgH' },
  { username: '', displayName: 'DeSo Bull (…Rp6t2x)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLihEmEZdLv8ph2SKyHVdYqpSJcWmYJwKikfvBiFr5mBHaRp6t2x' },
  { username: '', displayName: 'DeSo Bull (…4MYfFx)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgraviZ8dMTTu9DUihTQwbBu4n3JqbTvLTkiYfLEUEGZC4MYfFx' },
  { username: '', displayName: 'DeSo Bull (…hH7bMY)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgs6uEeLu1M2T124SspqV44MM9TtFaC8sqPp2Ro5vyQzQhH7bMY' },
  { username: '', displayName: 'DeSo Bull (…2ZT4pr)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhCT9baFRz4gVTgAzJhG5eFqQPj5Z1hMT9WUkwQtsLm2p2ZT4pr' },
  { username: '', displayName: 'DeSo Bull (…vmfbYJ)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjDWtYvZBTMXieQxjbScG2nmzHKYUaVkTHgXdHPA2Ls1yvmfbYJ' },
  { username: '', displayName: 'DeSo Bull (…vu2uvW)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhyqeXE8R1rhB1gfwTM77Z4ypJWpuSGkyNh3Z4DSXgNHUvu2uvW' },
  { username: '', displayName: 'DeSo Bull (…5ZrcvU)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLh12La3Je4RmYCW14SbvhNN1Mdv15MyhZXMJBD31DKpvk5ZrcvU' },
  { username: '', displayName: 'DeSo Bull (…bmuUpY)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhuSy7JJ65DEnqU13PVBNhQyRE3Zv1FpxnzKWFnMAT8HBbmuUpY' },
  { username: '', displayName: 'DeSo Bull (…bc5k4Q)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhLktWeqhgwHavzFkCMnCSBXdTeTDKUBZQMXBiGb9TTU6bc5k4Q' },
  { username: '', displayName: 'DeSo Bull (…BVxjB4)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLg5G6X79ZTPvjSsYrMP5VCN2yYJgDLPEqYw2e7TkgmG1iBVxjB4' },
  { username: '', displayName: 'DeSo Bull (…n8N3Me)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiwpvaCF2PjNNATdxPUcxsxfMhCCX6TEpBsHGaURqVWazn8N3Me' },
  { username: '', displayName: 'DeSo Bull (…Y8MUvp)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiAmQZNR2t9jrivs4XAmnywrovPBWaRFnRBvhESw7G6GJY8MUvp' },
  { username: '', displayName: 'DeSo Bull (…3SRBEz)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgzjXwiMni2GHxpKeAg4C51r8mD8UVkqC3f818vTcoizM3SRBEz' },
  { username: '', displayName: 'DeSo Bull (…V89jyN)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLibhMd5eoEuf5MQa8Sz8TPkkQk42TJXZBSPybRTXg2ViPV89jyN' },
  { username: '', displayName: 'DeSo Bull (…T5SLvf)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLggR5rQxJrFS1v7s4wTYh9MsuB5vjZvM2884SMYgkm5x8T5SLvf' },
  { username: '', displayName: 'DeSo Bull (…iLV5oC)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLh59ALyiWiPbFk3dKQnF1L6jUE1veSVppb4Fx9CyMWbZfiLV5oC' },
  { username: '', displayName: 'DeSo Bull (…rzsvvk)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj8TZmYShY9wuXAbxyeWdYsrQ4xc8MXf4twS1WW8tuqMjrzsvvk' },
  { username: '', displayName: 'DeSo Bull (…Xdv8HM)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhrtXCwbVbE8tE6kZQprxcQiK2ovYjthtb44Y4jPKDK51Xdv8HM' },
  { username: '', displayName: 'DeSo Bull (…m3SNCg)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiaKo7QgQwWTw3i9XJiyknpzHjp423m1HWCzYyTTn9FQ6m3SNCg' },
  { username: '', displayName: 'DeSo Bull (…wv6BFS)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhbaQsorsut5cCtZQ5dyzWc7Nkce6tVk2vT28SoHm4qonwv6BFS' },
  { username: '', displayName: 'DeSo Bull (…raJpRr)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLixHLxJght9VPiT4HPJ32WunsnxeFBTA21r9V46hWExdPraJpRr' },
  { username: '', displayName: 'DeSo Bull (…weW2PB)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLg6UoMoVFTmHar6Z92GBaxJA5ehoppQ8SbyA3Ztcak8PaweW2PB' },
  { username: '', displayName: 'DeSo Bull (…VXZXZe)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiVB6hdAiHqUvR5j3hmyR4c5yj7tetPzG3DYCzH7VYtXBVXZXZe' },
  { username: '', displayName: 'DeSo Bull (…3mn1VC)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLg4ehgvLC8YzYmzRnf2ocED5XtZwfNkDtYN8WUm3TxTqg3mn1VC' },
  { username: '', displayName: 'DeSo Bull (…fZ7dKC)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLie8bqKw3zAUt9hgGTaG5PGgKVCkr4Yjum3XDBMgLyR1EfZ7dKC' },
  { username: '', displayName: 'DeSo Bull (…kJ3uMz)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgKxXszRSqMWYfcwB8HkDyUDiCGMc53uoJAS3VPn4cFkukJ3uMz' },
  { username: '', displayName: 'DeSo Bull (…TcoEKj)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhnfAQiPTZj6kVLfD7Fe3KMofsa1sFMmsY5SAzC3ZCARsTcoEKj' },
  { username: '', displayName: 'DeSo Bull (…nu2wkZ)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhf6AfUEqqyKv7VTUbhs1Ee6db37mLPkWieJgQRCbXfzDnu2wkZ' },
  { username: '', displayName: 'DeSo Bull (…Bohqc4)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgdg8vnLaSnorX3x1KQuJtmKndC4mAVFJXWtmHsU7QvtgBohqc4' },
  { username: '', displayName: 'DeSo Bull (…g7DAjh)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjDtP2MMmvAHofbGzWbZYtABTtT2hvqy9kjK35UPtHfn9g7DAjh' },
  { username: '', displayName: 'DeSo Bull (…vnkKuN)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjR8Q5t9XWWFq2QQQpSqSrSxUgA2WxCuBK9t8vEj4U7jUvnkKuN' },
  { username: '', displayName: 'DeSo Bull (…xArMPj)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiKB9mLBnKPvj1eAjWRRZAi1t7P6LrcnAS5gVKV619qhXxArMPj' },
  { username: '', displayName: 'DeSo Bull (…LD14Ag)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj382oHt8B54TeMbegvHH7jpxoP7ocALYCPTgMncS4KuPLD14Ag' },
  { username: '', displayName: 'DeSo Bull (…3M7BUd)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiruv4iWRofZm5np6RjiMHmDHDaEuiALisswvGZcez9Pq3M7BUd' },
  { username: '', displayName: 'DeSo Bull (…1XRvjU)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgDFFwKVw1HFmTukvCUVFvGHsW9aSXPywRWs3R8BLzN5S1XRvjU' },
  { username: '', displayName: 'DeSo Bull (…BVRETu)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgY8i74RUoQ9cBkX8TucHEANvPkUJCpoTPmf5ryA3X7tzBVRETu' },
  { username: '', displayName: 'DeSo Bull (…YDV9HJ)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfk4E66W1NBsga7qzYXXJrUmatrzbDziVHpGq4k9tApnQYDV9HJ' },
  { username: '', displayName: 'DeSo Bull (…BNefS3)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgDyD5vPD6tDv1Mw8L7AZsWfewhsn58ai53DRLDVWjpuMBNefS3' },
  { username: '', displayName: 'DeSo Bull (…3kcoRz)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhcRwjrEaVoKCfoxgViAC8fRQb9WBirQDrTmpUfE3238q3kcoRz' },
  { username: '', displayName: 'DeSo Bull (…xRT4VB)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgNWe2ZjwpzZqgPg2TF6vwq3PiNwMTaQi8xiwJJi4CvABxRT4VB' },
  { username: '', displayName: 'DeSo Bull (…MwNea6)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhEURgy8ZFC1aRVnBiwGMnvke4tUefsRQxUy4ymk4N2PfMwNea6' },
  { username: '', displayName: 'DeSo Bull (…ohvwd4)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgyqGFS197gdBinchomd9pEyny6yQMpvYHWxU6CCet8yFohvwd4' },
  { username: '', displayName: 'DeSo Bull (…vtMT6x)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgEy5MMb7K9Gn4zeT5TRwsu3GoYcrZmWSRB3kEDbBrXT2vtMT6x' },
  { username: '', displayName: 'DeSo Bull (…Xzw3Yz)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhAJb2hZbn2z6rnwrAPGeUUmxpooNKasiRNVizN9MkytTXzw3Yz' },
  { username: '', displayName: 'DeSo Bull (…JTqCoL)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgVaB79kqJKQukL1ugw39bHf19FoC5MNoXVhMMXCbAWAKJTqCoL' },
  { username: '', displayName: 'DeSo Bull (…YHg54r)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhfWRwgrPmVLPgAcTPxnWwXkvS3cJXDdrAoT5A6qP2kuRYHg54r' },
  { username: '', displayName: 'DeSo Bull (…Hz4MrL)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj4qjR6aKt1UpSq8HxtSJ8ETwCwWujDCn8pnFBRHcyrjBHz4MrL' },
  { username: '', displayName: 'DeSo Bull (…8gpSiy)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhv2fpxorLvQNkLUxsswDEjKfDNMYJM18YcdDUGn33DDr8gpSiy' },
  { username: '', displayName: 'DeSo Bull (…e1xVHw)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiVng85x776Z8vPGY3JgCZyHhUHNyqFfVfaWG7TMi6hfte1xVHw' },
  { username: '', displayName: 'DeSo Bull (…A2FfC6)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLi9cT8dedvSVfSgKzEipx2fuX4ruXW3aun8PsQY2RkWkyA2FfC6' },
  { username: '', displayName: 'DeSo Bull (…cwk8Ct)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgg5JivWUUGuvZwMdCrtmic9YgmC7S6XXnwwtwzVZAbrrcwk8Ct' },
  { username: '', displayName: 'DeSo Bull (…HiWpUA)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj3GWwGoPyWQiW7ffFGZxX8BkJYt8DMq5YPBzh9VDFXEwHiWpUA' },
  { username: '', displayName: 'DeSo Bull (…vYXqJX)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLi8k9v1EaX4h8aFi41972FX6ZZdDM33RM4jciFtSJRhKKvYXqJX' },
  { username: '', displayName: 'DeSo Bull (…ajForU)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfy8eHpAXpMxd5GKwwWvhjjkq8TANAYVey2bS3eRbCL1KajForU' },
  { username: '', displayName: 'DeSo Bull (…fb7jCr)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgRJGZPQ4HPoJiX4vpoMscaFuRVzz1758qvdeNPcs1ofDfb7jCr' },
  { username: '', displayName: 'DeSo Bull (…FLjWVo)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj6XW6hPa6J8xuU7sCFdhoZKGV6VcGt4HSpxHMzr4rSG6FLjWVo' },
  { username: '', displayName: 'DeSo Bull (…YrXQSu)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiVgoBZn8Ucpo7boQH8vQC3HMzs5biGP8ZS9giiQMfRgDYrXQSu' },
  { username: '', displayName: 'DeSo Bull (…cpLzjs)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLifjX9TaE5AP5dVzoaGdZsczDvFwTvAyF48nWFo3mBumCcpLzjs' },
  { username: '', displayName: 'DeSo Bull (…dZtccg)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjRM6hFpJVQpTHKw3NYje1V7vvdLRP18f8hbL1mBEAgSSdZtccg' },
  { username: '', displayName: 'DeSo Bull (…aX399p)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhykva17HtDJ15GTNGrog5UDuDTuVDuhGXuBLbETxMh5LaX399p' },
  { username: '', displayName: 'DeSo Bull (…M8Vgjh)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjQqWmRDdtjmZ5Sbp4cB28zGT5G6qwxXH4X9TrxacS3uaM8Vgjh' },
  { username: '', displayName: 'DeSo Bull (…nEMbzt)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgmiGAhD3x9y9m5FFGS6kyi7gS8CY9TdoaCpwBxtT2G7CnEMbzt' },
  { username: '', displayName: 'DeSo Bull (…F3Wjr1)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjEwDgw6qrndpfKSrahRe1ewCnj6BynKPgogzCNHjnWeyF3Wjr1' },
  { username: '', displayName: 'DeSo Bull (…1LLSUp)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhqEhWvNnwW9TBqXURFqwkdpUYKrMVgTHQzopF5rRBDcD1LLSUp' },
  { username: '', displayName: 'DeSo Bull (…5tasHb)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiKj43v3otS45EMrTBTRJdUcjtneNMjReXnqbMAshrvi45tasHb' },
  { username: '', displayName: 'DeSo Bull (…c9dPxW)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgLu3J4EUf7xXZ2KmT332tLboPxXZS8cE4wJY7ifx8Ccsc9dPxW' },
  { username: '', displayName: 'DeSo Bull (…znmLgX)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgVcU5orfchdvtaz2CgJYwPtH19VA2T2MDRk2x5dqpuKPznmLgX' },
  { username: '', displayName: 'DeSo Bull (…Ga7YBH)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgNvixqVFnbQY8wTqybaPvYkWYbTEwXciNkYHwsWP53f7Ga7YBH' },
  { username: '', displayName: 'DeSo Bull (…88JdHs)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhTjjL7DKgd5PgW3f9dy1PUAC246VUYab9kBB2MiFTDnF88JdHs' },
  { username: '', displayName: 'DeSo Bull (…jUSQfn)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLipmeBoK6ypq55e9RFSQ4bUEVcQ3GM1PE2j75oCdS1NcEjUSQfn' },
  { username: '', displayName: 'DeSo Bull (…FaqLTy)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhbqSLuMcw7E9TSUE9YLfMFJaaETosbqN67xSB9h4EC9sFaqLTy' },
  { username: '', displayName: 'DeSo Bull (…mrpe4k)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLibYeYowUaxW7QimDbW7Xh9F4nc5GdrfXDLxkLS26ctdYmrpe4k' },
  { username: '', displayName: 'DeSo Bull (…qnuGeP)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiQr188QqaSpywf6rm8X2hxv3j2B5FskmmLtvuRaFKgqSqnuGeP' },
  { username: '', displayName: 'DeSo Bull (…PYehuz)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLixi9S66cD2sBq8MUHj1SCo8Yr5cDqHPtCBz7CYungDsvPYehuz' },
  { username: '', displayName: 'DeSo Bull (…DM8vJC)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj8uJoDGwqHNwWdE53BxsUB3RG5mdtwXVw9FQQNxt67RvDM8vJC' },
  { username: '', displayName: 'DeSo Bull (…t1Kyj3)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLguEz51K1FuvqTu31LCN28exyxVx98obF2bzrqrpmh4dTt1Kyj3' },
  { username: '', displayName: 'DeSo Bull (…uaaNGG)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj3KV6rV5MjELkvekwQ6YZHuzbxSe5xsNzD9h1sxxhG7guaaNGG' },
  { username: '', displayName: 'DeSo Bull (…ovyzzk)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj6s1yTKhVQDYigZP5rLVCPw65zD5MSPuTq8LD53nKsMXovyzzk' },
  { username: '', displayName: 'DeSo Bull (…Mq4Ybz)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfyT6fz6QTaNhVBMzTPNXWBaVfEJonPawRFoShCEtGyzwMq4Ybz' },
  { username: '', displayName: 'DeSo Bull (…mTsk4h)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhqEdfGgPTrq7VFboLgdkfZEb85MmBkqzrLtnHfbCU67MmTsk4h' },
  { username: '', displayName: 'DeSo Bull (…ka5N5S)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj2aZQSpi3dMXeK6km8mmzmWmYSV7ayYabBEiLHTvo264ka5N5S' },
  { username: '', displayName: 'DeSo Bull (…AAEYSE)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhX2eV7DXn21v8GGseK49An24GoSeHghmDrPGGAQ2HKzFAAEYSE' },
  { username: '', displayName: 'DeSo Bull (…Q1jZFL)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjLVj2jCbqsi1LTC7cpwdrnSZcpxgQhKquL77Sgk1kavVQ1jZFL' },
  { username: '', displayName: 'DeSo Bull (…1YG17F)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgDizzX9H4MQL2DiyRfLqyWd2bFqzCZwbgUtBqSjaCRb51YG17F' },
  { username: '', displayName: 'DeSo Bull (…JqT3KC)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjAcG6LKPXZ8xXkXGYVnxHpdfDHYwtA4aW7ArZ9FrhjtCJqT3KC' },
  { username: '', displayName: 'DeSo Bull (…JgwbdY)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhNWAziM3JhvYWiPypeJ9ndNAwugKf3yAL9AjovkHBtbSJgwbdY' },
  { username: '', displayName: 'DeSo Bull (…JRJzmy)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjVVDGqjkAg7ZrzonH8tBk1LHKSfaUtpxbSUVa9ttToM8JRJzmy' },
  { username: '', displayName: 'DeSo Bull (…H71mgy)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLh1jMBkPvP51n2pnmeruLysQ8Ymaant6jt8smJeJtiYBkH71mgy' },
  { username: '', displayName: 'DeSo Bull (…HCCG8k)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhSJ3nAw4SwBL3rJDPPJtW9YWsEsGDj9FrDD2ac75UsaiHCCG8k' },
  { username: '', displayName: 'DeSo Bull (…b3n19P)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfsLrGtUnXTqxk2ks4yryeBad2GhfiHeRgKbapxZquQmLb3n19P' },
  { username: '', displayName: 'DeSo Bull (…ZXiSSk)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjFQPYMyd2XmdJ4WLAuawNWmMYCYv65dwGVpsJjfXjcTsZXiSSk' },
  { username: '', displayName: 'DeSo Bull (…XErdEc)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgVLn4Kp9uJUvMtp79LVxWd5qdnk8tRoZdiSv1WmkDefdXErdEc' },
  { username: '', displayName: 'DeSo Bull (…eBtzva)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhBw4SV2kU8cjLPW2cJBcdwV3oXwVSScAWK5js3uFiedneBtzva' },
  { username: '', displayName: 'DeSo Bull (…g1KsPn)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfrc9NF5qM1WNqUVFgr6RnEAVkdn9X899KcFNZxozv5pag1KsPn' },
  { username: '', displayName: 'DeSo Bull (…y1yXDg)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfg6RFHGXsKzZFyEKUmJ869eBeXMKH2xiuxrPw1ZuBxVRy1yXDg' },
  { username: '', displayName: 'DeSo Bull (…TxJ8XW)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLh9DrmDqjcB7UtCp4HMt1wmFzKJ1rsX6SWWZFndx9gTE1TxJ8XW' },
  { username: '', displayName: 'DeSo Bull (…8heUMd)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiN1oAE5YZDon92eW3kFmWMQFAowJ9TtJXzk5B8S67vAa8heUMd' },
  { username: '', displayName: 'DeSo Bull (…JvYfGM)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLi2SU6w44dvzhhxjQowXpym4FdQdBkPYCkLBswgw98NQoJvYfGM' },
  { username: '', displayName: 'DeSo Bull (…AebSfi)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLihgBZXYhtjpJNY1xkMejWwx1NpuMr592in6V6dquMtepAebSfi' },
  { username: '', displayName: 'DeSo Bull (…7RdfYT)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfniDiewVaiL3vbQgRETdZ5Xhy6QtgweHoa9FM7Ruu4Jb7RdfYT' },
  { username: '', displayName: 'DeSo Bull (…Qzu49C)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhSGcUPXnhLawyi7PANgwsm5vqdVFwt5sKgvvMSq3YWgzQzu49C' },
  { username: '', displayName: 'DeSo Bull (…ddxF2m)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLisiNqujHABnWiwjPD9JsmVUB52H4zS4PSRK77QEH6bEaddxF2m' },
  { username: '', displayName: 'DeSo Bull (…LQg9Av)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfrxZj223fTJkmT59w7rWPJbFdE6SVkFdVRHkYUa1B1fgLQg9Av' },
  { username: '', displayName: 'DeSo Bull (…4wCTK4)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjGLTPvptakKEWJKDcTobg1tgD1n59Zj1swNyftv2Bhwc4wCTK4' },
  { username: '', displayName: 'DeSo Bull (…P6hr11)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgMkCdp3FChP9FGdXf8PYi1iDv3vK4qQAVUQvoVRAGkssP6hr11' },
  { username: '', displayName: 'DeSo Bull (…c8EKdD)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgN1HbVtznBNWaBQD3iqgmTXM8m4MGvHUiatSxEZEWmAkc8EKdD' },
  { username: '', displayName: 'DeSo Bull (…uUhwv2)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLifrrLC6W4YSZvoeFyG9G2W2yMYz2ikqUYN8RVebSK3mxuUhwv2' },
  { username: '', displayName: 'DeSo Bull (…y3kZJ7)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfnKZY4czGrS3z3z6zZFaFuDNKwZvaNhTZpFXhCRXs2guy3kZJ7' },
  { username: '', displayName: 'DeSo Bull (…mLtLi1)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLg7X9nX9w57dMEcGWc5X5A24Ncxsc4QqYpB42SMHNyTfomLtLi1' },
  { username: '', displayName: 'DeSo Bull (…w5HaXy)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgr8TrZf5Vh9yN1AnYssd5JzZLxKZA5fWjXbxjFApNs8Ww5HaXy' },
  { username: '', displayName: 'DeSo Bull (…Ko7Lac)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiytMB8KraJA5y1jbeai4xgGLjAPGvYDSqDYNCygaQsuEKo7Lac' },
  { username: '', displayName: 'DeSo Bull (…3HYUJJ)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhbk2WcmrzYoYn7XcPAnWsyhhMKiGC8MS4CrRdbbHTaWB3HYUJJ' },
  { username: '', displayName: 'DeSo Bull (…N66GYT)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLh5rFQqfjmANKdqwc6eCJk82BeHiwQSy8D18tLwgCPrV3N66GYT' },
  { username: '', displayName: 'DeSo Bull (…Jdo3Dz)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjKF8ryyYFPP8bL9mkcyDrt44ZC6ZmfPrRPE4MXnzpx3BJdo3Dz' },
  { username: '', displayName: 'DeSo Bull (…Vf1LTp)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhZKyAuwkejVNB1UrUuKm8S92os8UMEB6MgYhoQv1PkvtVf1LTp' },
  { username: '', displayName: 'DeSo Bull (…B4MxyQ)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLftSqcG2MNZuTyMPCEJneCU6LCZp3EFYdukEX8ZKF6MCGB4MxyQ' },
  { username: '', displayName: 'DeSo Bull (…rfZSXG)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgP8qJrZjBCT28tBhAZAVnNDTYBqpUJmyYxsCNbaaTnuTrfZSXG' },
  { username: '', displayName: 'DeSo Bull (…cdWrgR)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgvThCj852wvHcUQuxujnWeAtonVw1G1VFPJQz54E5Q6hcdWrgR' },
  { username: '', displayName: 'DeSo Bull (…gEWDrR)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLicpkYLaBoEc9n8tBsaTRqxKXfo2PdA3yh3ktET13Y4RogEWDrR' },
  { username: '', displayName: 'DeSo Bull (…FChgUj)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhn2SUj4e8Ufffmku6rexstQQuVw3ugY4jVc847SnkCNtFChgUj' },
  { username: '', displayName: 'DeSo Bull (…vj3kFv)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhAocefc6rZyNwbfCKMK6buATMrhGiAUxjy9K4Y1c5SY2vj3kFv' },
  { username: '', displayName: 'DeSo Bull (…nyqbE5)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfwApmP4GdSUZt4wbsbzuWffHBTWqkB65ACEoNWw77D1RnyqbE5' },
  { username: '', displayName: 'DeSo Bull (…1ewyEi)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj583NHVhqvqH8cNnKnSh3wzbMZHASuf8WW5pB1G5i3Ws1ewyEi' },
  { username: '', displayName: 'DeSo Bull (…wp6nPX)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLh2Uhnq6b5QmKgeRmamF3nF35skHm22vTWz2XB6uSejgywp6nPX' },
  { username: '', displayName: 'DeSo Bull (…FbsYpv)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfuzBNyWS5TdUg9JgB17djDXK6obkC93VxozhMF5zQEzxFbsYpv' },
  { username: '', displayName: 'DeSo Bull (…Y2GeAn)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiWcmcndy2mCUsp4JVnpdmJKpf19DmjdhJp6y4Y3gZyAoY2GeAn' },
  { username: '', displayName: 'DeSo Bull (…JRy4d9)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgL84SmvzQdx9kUW4VFHrUn4BRUqYXWoQwDhMDuSTi4RpJRy4d9' },
  { username: '', displayName: 'DeSo Bull (…47deyJ)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhytCgKtup3N2QYuufPeAdzNQvERyPngm8rZLWk4NKK2o47deyJ' },
  { username: '', displayName: 'DeSo Bull (…pzYQwR)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiq8rdCqX7AAaTVAUJ7m8H9QKKtAvDBwPNa5RqWPrNWBtpzYQwR' },
  { username: '', displayName: 'DeSo Bull (…caYuCf)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiiq45Xv4m4r1YuRJErd4ezQ4PoNpwoFfhKa2sLKFZB3ccaYuCf' },
  { username: '', displayName: 'DeSo Bull (…QmwyPb)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLh9TGvv2a7ehw3Q1kuR7B934z4QyJEn3GuvzndGYLNyHAQmwyPb' },
  { username: '', displayName: 'DeSo Bull (…Xt5ruw)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhbZo1LdV26CX6t37SC7VGwtDfNQT99mxzHgyzWcaAJbtXt5ruw' },
  { username: '', displayName: 'DeSo Bull (…JJzi9e)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgF9Tt85ADrL4QiyX6xSGwGrqFWnLr9b5Mt8hfdk54Tg1JJzi9e' },
  { username: '', displayName: 'DeSo Bull (…z9jgNM)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLg4qFM5bGPhZdvPE6g2xc5dNtXgJAJwJi1NQEYbqtxqi9z9jgNM' },
  { username: '', displayName: 'DeSo Bull (…e723C5)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhaPxuMkDVvfjKgJQtQrd3ee3CBZteoJuSkZQmFtqSgnNe723C5' },
  { username: '', displayName: 'DeSo Bull (…LXvMjp)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhTA7JD7uMtBY4iPYMKUhkJ3LeicscPKhoA1dt98cdpoYLXvMjp' },
  { username: '', displayName: 'DeSo Bull (…gjq8eV)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhHDsy6ncZck8zmoAFJq45hYNn6W3baRk7u2uCLaFk12Ggjq8eV' },
  { username: '', displayName: 'DeSo Bull (…KGg6kH)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj4Bpa1LYQp366z5CsQdJ9MBSiiepSaaY9AhP5URE4MYzKGg6kH' },
  { username: '', displayName: 'DeSo Bull (…SWBcxD)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiydcQFSQ9r1EHg2JZ2Dz6nxTUerds2NeVevAGq7xeXmLSWBcxD' },
  { username: '', displayName: 'DeSo Bull (…B8wBMm)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhwfRR19w1w4iqNfBKTuc2iHTtyy9oYWxVEqJBTnChMfCB8wBMm' },
  { username: '', displayName: 'DeSo Bull (…jrqNBL)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhyZoc6hVsKZb7F8c8vJ6zNG8hqJ5BDNq2pNaRaL4HLufjrqNBL' },
  { username: '', displayName: 'DeSo Bull (…KFzrfd)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhXuVkAYSNAS2XY8AMos2QxpXwnTUxWUp3mfnJbeSKX5CKFzrfd' },
  { username: '', displayName: 'DeSo Bull (…S6T6o6)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiqiEwzKMzf9qUDSFfgBuhCoKGN36fD3odHpY16etfvBaS6T6o6' },
  { username: '', displayName: 'DeSo Bull (…CQUAgv)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgVZUkfG29UDuZQH2zBZQPF7zWXtDMDfNke6ZKw438KGeCQUAgv' },
  { username: '', displayName: 'DeSo Bull (…QqoR3k)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj3WqzHvV7mYdMKQxSgV2m5fAsN1VnzXAx4T6wxZx8eqoQqoR3k' },
  { username: '', displayName: 'DeSo Bull (…X3H3tH)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLickbhdFWkKcZPpJw1C7ysMJt4KgqrzRUXUzzC21xYwoUX3H3tH' },
  { username: '', displayName: 'DeSo Bull (…V7WzV1)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhzsh1dMu8JDmZGs6CFgAHBxiq5QycF9UVdYh7oXbmnUxV7WzV1' },
  { username: '', displayName: 'DeSo Bull (…Mw9RVY)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiUt3iQG4QY8KHLPXP8LznyFp3k9vFTg2mhhu76d1Uu2WMw9RVY' },
  { username: '', displayName: 'DeSo Bull (…6Av44x)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLg5EH9cGVZqmk2Zia6y5fukMr7sFZY1pRdcdh7jtUThwM6Av44x' },
  { username: '', displayName: 'DeSo Bull (…dTEexU)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhebEdoBiDLXd8pyWNdmabq6DbyVo7KpwufWKmfcTyyigdTEexU' },
  { username: '', displayName: 'DeSo Bull (…KEHWDg)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfwprzwzL8HRhPZSTMtPPCQFb5yxHGg2AssRu6fBgmraGKEHWDg' },
  { username: '', displayName: 'DeSo Bull (…8qwWUU)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgSFCenPtDrKVi6ritNJ8ayfbECS6JppBuA97Ba86vJuB8qwWUU' },
  { username: '', displayName: 'DeSo Bull (…GYtAbT)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiJZbfwkYfMxH57kWxXupSYvKvig3C11dgLwCFdZiLut5GYtAbT' },
  { username: '', displayName: 'DeSo Bull (…YJ7q9Q)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiAfXkEEzYUQPvwASUvSLPHEW3PuEhRQLSmmVmMcDwU5QYJ7q9Q' },
  { username: '', displayName: 'DeSo Bull (…wTodrT)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLjRZ5z7jqwQ43c8G36zbiJZ6MALSYvvbDEetve9BCytJtwTodrT' },
  { username: '', displayName: 'DeSo Bull (…mCwhLc)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLi42YhykckXwLBJDGfCXX3mjhfSxEGRkWcnaAjNk9sbFgmCwhLc' },
  { username: '', displayName: 'DeSo Bull (…9XnJdp)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfknrAC4mCptj9vdknrKDPLmWLJNsaQK4rzAywwDoLoT89XnJdp' },
  { username: '', displayName: 'DeSo Bull (…cG5g2n)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLfnZduHdmABv6n8SMXt16LNRCrUP31bSjwCQ7ys5q6UHkcG5g2n' },
  { username: '', displayName: 'DeSo Bull (…ERr1fn)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLgx99hmEufkjAFWR5FKYmWTZL8xCRwxUNFiSsCQxL42UKERr1fn' },
  { username: '', displayName: 'DeSo Bull (…ouZBsL)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhkxA1CQ2o1qw593yzfcA9DbvciUMABggHUa4NFvKcageouZBsL' },
  { username: '', displayName: 'DeSo Bull (…qtQmEi)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhdU7jXd2cKQA5bVqobuDpGrcqYox526VZnUQEBFJ8k2QqtQmEi' },
  { username: '', displayName: 'DeSo Bull (…MH4QzD)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLghdy8ZXfbaAAKoHXBjsexYRR5WnJbg67quuWK5NsYPXdMH4QzD' },
  { username: '', displayName: 'DeSo Bull (…iDSGkV)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhuysV2Rw6uevVxtYn96fDPGsqs3vFGfz9qFX466TU5ngiDSGkV' },
  { username: '', displayName: 'DeSo Bull (…7UfhaQ)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLj9yE1ehqZfVRtyfHjQKeK252RGtkrGvukQEHwW4Ecs3y7UfhaQ' },
  { username: '', displayName: 'DeSo Bull (…rWBzxV)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiiq21kx1RMpYVdxGNYrMcXeJXQZsHJYDoP5ZmnDzV3D4rWBzxV' },
  { username: '', displayName: 'DeSo Bull (…LT8tLW)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLhUb7WUeebZNhPxmoRXg4dFdFV4DpJe7mtRP3VWqs19RALT8tLW' },
  { username: '', displayName: 'DeSo Bull (…7ossbw)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiR6pmSk5X14BpZ7sT4Ar3xJobjWLWXFYHVkkfkcodk4N7ossbw' },
  { username: '', displayName: 'DeSo Bull (…3hagvP)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiMqfCKAjceXa6JU1JtncvoyhNBMs5LYqEWzJp2ARpNnT3hagvP' },
  { username: '', displayName: 'DeSo Bull (…3TwHEF)', classification: 'DESO_BULL', publicKeyBase58Check: 'BC1YLiuuDXrgiCehor1TdT2A1zQfmBnLRgVAnDUxrnBtxEdHr3TwHEF' },
  // No Source/Core
  // No Source/Core merged into Foundation
  { username: '', displayName: 'Foundation (…fJ9)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLitz3fid4UWR337TPRerkLaFAx55i8XktzU58idKMReciCBDfJ9' },
  { username: '', displayName: 'Foundation (…KeBo)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLjAkTwNw5AKy1TCHT8qjZjmdEojvtNpB7wgFdguZ78scMu3KeBo' },
  { username: '', displayName: 'Foundation (…BHFF)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLhFidFPHVcNGq674VgQxjJgzsjgZZDCiZdTnyHGFzgc34BCBHFF' },
  { username: '', displayName: 'Foundation (…1weS)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLhnXnSKcM4pYxwU3a24bigPJx9LL2gjrmj6mPfv5c771w5B1weS' },
  { username: '', displayName: 'Foundation (…aWbs)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLffz4MC2HZzZdgCahbcBac8Vrsr6mUEDEMrGEkaFr2ux9UqaWbs' },
  { username: '', displayName: 'Foundation (…umt3n)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLirfuVnByxfQk5kwNKyk13oa28mDxb42Uiw9My9LrhMgTkumt3n' },
  { username: '', displayName: 'Foundation (…nfhL)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLiYxGdXeuPc3QMzgBv26EwfxrpwemdGxGZAZbh5qXgf7DennfhL' },
  { username: 'Da5id', classification: 'FOUNDATION' },
  { username: '', displayName: 'Foundation (…JKo6)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLiBj1K5DwKKVTYPHzHTPYBaNPDv678PN7kKHwRqjH91KgDKJKo6' },
  { username: '', displayName: 'Foundation (…oEkb)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLfnQurEcFMCaPsmgtnzjDSzNCSCjYYvVLyvWvmYL6nnfrFHoEkb' },
  { username: '', displayName: 'Foundation (…tX2PQ)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLgFoqrAB6oSDSuvW8tUv2g1gTjmNtd1uNiCyXELEXRwWe5tX2PQ' },
  { username: '', displayName: 'Foundation (…3513Mv)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLicyGzKNk7huWXVTrb3q2JENZJuhsMMtYS6hesSdKqz5v3513Mv' },
  { username: '', displayName: 'Foundation (…tt5od)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLj99RQCX73ZRzZv3ddWBPKDoo69HZLRpAxo3RFcmraodt6tt5od' },
  { username: '', displayName: 'Foundation (…N6aC)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLfuPKvErRtLmVB1mBkiyEDpFUDR5V66y4U5vh1RgpTweCyTN6aC' },
  { username: '', displayName: 'Foundation (…s2FG)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLj33GgSeuPtX24gxccAEmiKkMAcCKkC7dRnq88WcaVooTrKs2FG' },
  { username: '', displayName: 'Foundation (…C3Cr)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLfjqZFJnXxJtGeUdtsakKqSQvfvPSRXLs2697RcQHnuZCbiC3Cr' },
  { username: '', displayName: 'Foundation (…U6MG1)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLj3NjV2vZt7wUoirjUdKzCvLaBDLotPeymxRZ1Rik2JLyYU6MG1' },
  { username: '', displayName: 'Foundation (…nwP3)', classification: 'FOUNDATION', publicKeyBase58Check: 'BC1YLimRmPcdUK8aZ7KDZQEsk5vbcowGVPeXxa6fV1Lxnr7Pz63nwP3' },
  // Core Affiliated
  { username: '', displayName: 'Core Affiliated (…AqLQ)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLgfGoeE5U7REoLFFzKYS6nGUFZ1rfP2KJmr6BCr8iMEaNU6AqLQ' },
  { username: '', displayName: 'Core Affiliated (…QMP)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLjHNE39QZ8fSPevE6FU99VuyFepe6AswhvFJiu2bqQ4PX3nFQMP' },
  { username: '', displayName: 'Core Affiliated (…rDbi)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLh4eK3VuiorNyU1izDNcearJUXPLuTsA9pUndaceZmeAo7jrDbi' },
  { username: '', displayName: 'Core Affiliated (…ujne)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLhWPt6nGTLmsNkbGFHfspcfnRgaEVEbNygVty22oTVF3a1zujne' },
  { username: '', displayName: 'Core Affiliated (…jNKJ)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLg4J5Nf1cEL38LSChFRjd9Ez54wSdk4KCEqD3aMjzSBhMPejNKJ' },
  { username: '', displayName: 'Core Affiliated (…uP4n)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLfj5eLLgiBNDh4f9oq2gUozB77rNefyvknKL1rpujFsAgfAuP4n' },
  { username: '', displayName: 'Core Affiliated (…CYKc)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLjMAwU3dA7SRhHZycb6LkP9q9qES7sy5GzR1NF2f2GtSjuvCYKc' },
  { username: '', displayName: 'Core Affiliated (…8u5UD)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLiRK7iBoQN2W8nfwX7ysW1ush4PCdJQBFADm45BLHCBoxk8u5UD' },
  { username: '', displayName: 'Core Affiliated (…2nX4)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLhvDos1L72JBxvGPDz95m86Yz2NEg6CzCZE89Fooac5pTSP2nX4' },
  { username: '', displayName: 'Core Affiliated (…3rQq)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLh1ciH11ueQLuyyEfQTku7Rcpnzr2f28eTpDATqADJmdeUQ3rQq' },
  { username: '', displayName: 'Core Affiliated (…smAT7)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLgrgVmRGp1SyqCBMKGUTP8mrnA5qEW2TFADEsads9y2Q3wsmAT7' },
  { username: '', displayName: 'Core Affiliated (…ib9b2)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLihPpDbdKYhzUWBqiD12mXGbQnUehhGo9JpxRjmNdTVuaSwi9b2' },
  { username: '', displayName: 'Core Affiliated (…eTXb)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLj797rLyQJPxEPvWBy9iM5mpCTSdfsXb2LmSAa3TRcLEoTWeTXb' },
  { username: '', displayName: 'Core Affiliated (…W3Av)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLgyjPzY82hWq2yuBsPPf5cyg9MsGfJqbFfED1GfEKgJDW9eW3Av' },
  // Core stakers >10K DESO (added via find-core-stakers-untagged script)
  { username: '', displayName: 'Core Affiliated (…WGJcRB)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLfy71NgUsFxfJasAG9LRMvoQNETUzGN8pTL1JTbx9V9ZKWGJcRB' },
  { username: '', displayName: 'Core Affiliated (…q8Rk6e)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLicgJDPWpdrDqraBFY88KVT5hhR5mNQyp91UxcHZaiNZTq8Rk6e' },
  { username: '', displayName: 'Core Affiliated (…j6KtKT)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLjUMZKY7EhmprWrwGGzheWDYmycsi7fscEv5fDhPUoPkQj6KtKT' },
  { username: '', displayName: 'Core Affiliated (…zdEDLh)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLiVa1mw8cdybukppFQ1BZNFTAguXxMdSEPAPMhphaxzYnzdEDLh' },
  { username: '', displayName: 'Core Affiliated (…MGqGwi)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLiVBmAgha4QTS6Zuozh2KSpZroj5GMFuxDqGkd6GKX81hMGqGwi' },
  { username: '', displayName: 'Core Affiliated (…iPw7xK)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLizmu5H9EuXDWQ64RoGqtxtbvfG8PGyU9UGa3byoDv8LYiPw7xK' },
  { username: '', displayName: 'Core Affiliated (…GccU5z)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLhreWZ8Uz96MQ6Pb1zRRJWqG4LJTpRoM4eYZSaT9ocDQvGccU5z' },
  { username: '', displayName: 'Core Affiliated (…iYoViU)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLhbFgnXoM9sRWGtGZrsNFDGBwuyzzZ6KRpJqaNr8JAreciYoViU' },
  { username: '', displayName: 'Core Affiliated (…GfjYYY)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLfizappwz4xGZrkiTrZqq1xbEyMLbx5V8nsPar7sUYHGJGfjYYY' },
  { username: '', displayName: 'Core Affiliated (…AQhWca)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLiQ4yBcdQzHN6P72Cs2pziiErgDqBgixwoXoMw59ruxriAQhWca' },
  { username: '', displayName: 'Core Affiliated (…PfhKS1)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLjEEGH72UpVX3XxiHfEVFDAiwftDyneRXVeMMCjUAhxatPfhKS1' },
  { username: '', displayName: 'Core Affiliated (…aQzcdw)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLgJr3H33D6rBh5gLCfK2qEnfZarEAKUdKKpa8LE6WzvtcaQzcdw' },
  { username: '', displayName: 'Core Affiliated (…eeEfJW)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLi1bwfdVbLF765aYCRjhZwSvgW8C4QG2sRKSjB7wkzxYReeEfJW' },
  { username: '', displayName: 'Core Affiliated (…oRpZW3)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLhRNeYCE75nvpovXGvd9thK8n1YpMKPwbadNcaF7kDF7poRpZW3' },
  { username: '', displayName: 'Core Affiliated (…og4FaX)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLim1fAGRStqBC1eGxVJcmR9ciq4gaQwyicVt6BQ2xC9Loog4FaX' },
  { username: '', displayName: 'Core Affiliated (…4nEgcf)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLjPSrko4HN9FwCLNVA6hZDzi8tJ9BM56L1tdqX56Zfpoi4nEgcf' },
  { username: '', displayName: 'Core Affiliated (…D6PZuu)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLgX4nVQajeupsPm8XnKqNUsW7q5HrCkXBpyAKgdT2bi3LD6PZuu' },
  { username: '', displayName: 'Core Affiliated (…Krw3tU)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLh3bTY5rn7WgomThT8RboXhAtiFHUeHwqNrmVdbrWeD9cKrw3tU' },
  { username: '', displayName: 'Core Affiliated (…jCRNX5)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLhtNrkv3eLUkpf8dP9sSz2d2gcnSMVkKFG38sA9Zgg5BUjCRNX5' },
  { username: '', displayName: 'Core Affiliated (…8a57fY)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLiYcyX9XdaXz3EFChhd4gEfREaiUtskTrpxsj8zcAeTVr8a57fY' },
  { username: '', displayName: 'Core Affiliated (…gPcYis)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLftXh9jWVn5fitUvniY83AcN7kG4Pem54db2CzqT2jaHsgPcYis' },
  { username: '', displayName: 'Core Affiliated (…rV8BjX)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLhB5AuAMND47kWXDRUQ4u5PGNDhCbA7Tky1d6ZDGY7iiWrV8BjX' },
  { username: '', displayName: 'Core Affiliated (…7MiKMt)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLhnTZLR8NLcFwSXzjQ5bhYL1HT4FhJNpdKM5LW3bFME2g7MiKMt' },
  { username: '', displayName: 'Core Affiliated (…QqjVHm)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLiFHzcDSe4YNTcyGwF1vudZeb5dpFEDcKxywZzVRWUGwwQqjVHm' },
  { username: '', displayName: 'Core Affiliated (…dzXG2X)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLgSpbC7ZpJXRX6iz1Kevg2RNQ6DgF7MptgeM7ScnWp38XdzXG2X' },
  { username: '', displayName: 'Core Affiliated (…MWFhnc)', classification: 'CORE_AFFILIATED', publicKeyBase58Check: 'BC1YLgFqmEQVbTz123GHExc2empfbEtbWDbdqgrxz3uqbwte6MWFhnc' },
  { username: '2times', classification: 'CORE_AFFILIATED' },
  { username: 'tickerpump', classification: 'CORE_AFFILIATED' },
  // Exchange Accounts (excluded from Others)
  { username: '', displayName: 'Exchange (…Dbh)', classification: 'EXCHANGE', publicKeyBase58Check: 'BC1YLigdNktFqD2LrK2cAAdm2JkPhs8qJ3RJrC3erhRAU5FcaSntDbh' },
  { username: '', displayName: 'Exchange (…hdgr6)', classification: 'EXCHANGE', publicKeyBase58Check: 'BC1YLipfFtg2FoVPSAYYuMtRYwrLEsnRPfutBmykewh32vLKvPhdgr6' },
  { username: '', displayName: 'Exchange (…poG)', classification: 'EXCHANGE', publicKeyBase58Check: 'BC1YLhxvk9Z6dHHnXbnawMpaGKGZePPsApVRcLNBCK3J8NAGgVoHpoG' },
  { username: '', displayName: 'Exchange (…NrY7)', classification: 'EXCHANGE', publicKeyBase58Check: 'BC1YLi7CWybSunGG2mVCSiHggMqvCKLARiiyqbCBXhKe27iyE42NrY7' },
  { username: '', displayName: 'Exchange (…H49C)', classification: 'EXCHANGE', publicKeyBase58Check: 'BC1YLhVZBgtX7Hmipyxiw1BJWyYK7SAq8ej3wNDbc4dHLPNADrMH49C' },
  { username: '', displayName: 'Exchange (…V9Nj)', classification: 'EXCHANGE', publicKeyBase58Check: 'BC1YLiuhqCJajHG5C3iM4kuqD1tzecVFpyDLC9wisiHwAVYXH5xV9Nj' },
  { username: '', displayName: 'Exchange (…a583)', classification: 'EXCHANGE', publicKeyBase58Check: 'BC1YLgjbg1EVGZCX5WszQg8BMJxYqzStyZNoqobJRm73m79i2cca583' },
  { username: '', displayName: 'Exchange (…9zN)', classification: 'EXCHANGE', publicKeyBase58Check: 'BC1YLg37J6koL3xDwUbQMphtf7Hd7xdktNWmiyifi7uZooaMr6N69zN' },
  { username: '', displayName: 'Exchange (…Mdd)', classification: 'EXCHANGE', publicKeyBase58Check: 'BC1YLjU48gkK9cbA8h613zcWiDpsnuhsL3jGQ4sNtwnNRvjhWUS5Mdd' },
  { username: '', displayName: 'Exchange (…K4No)', classification: 'EXCHANGE', publicKeyBase58Check: 'BC1YLgdwUHnGuzbNRJhZsNLQbhzqLdgbfkCKtTnWTq3ZKPy7FtnK4No' },
];

async function desoPost(endpoint: string, body: object): Promise<unknown> {
  const res = await fetch(`${DESO_NODE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DeSo API ${endpoint}: ${res.status}`);
  return res.json();
}

/** Public keys of Foundation, AMM, Core Team, DeSo Bulls. Used to exclude from Others (avoid double-count). */
export async function fetchTrackedPublicKeys(): Promise<Set<string>> {
  const pks = new Set<string>();
  for (const c of WALLET_CONFIG) {
    if (c.publicKeyBase58Check) {
      pks.add(c.publicKeyBase58Check);
    }
  }
  const usernameConfigs = WALLET_CONFIG.filter((c) => !c.publicKeyBase58Check);
  const results = await runBatched(usernameConfigs, 5, async (config) => {
    try {
      const res = (await desoPost('/get-single-profile', {
        Username: config.username,
      })) as { Profile?: { PublicKeyBase58Check?: string } };
      const pk = res.Profile?.PublicKeyBase58Check;
      return pk ? { pk } : undefined;
    } catch {
      return undefined;
    }
  });
  for (const r of results.values()) {
    if (r?.pk) pks.add(r.pk);
  }
  return pks;
}

/** Map of publicKey -> classification for all tracked accounts. Used for Early Block Rewardees Category column. */
export async function fetchTrackedClassifications(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const c of WALLET_CONFIG) {
    if (c.publicKeyBase58Check) {
      map.set(c.publicKeyBase58Check, c.classification);
    }
  }
  const usernameConfigs = WALLET_CONFIG.filter((c) => !c.publicKeyBase58Check);
  const results = await runBatched(usernameConfigs, 5, async (config) => {
    try {
      const res = (await desoPost('/get-single-profile', {
        Username: config.username,
      })) as { Profile?: { PublicKeyBase58Check?: string } };
      const pk = res.Profile?.PublicKeyBase58Check;
      return pk ? { pk, classification: config.classification } : undefined;
    } catch {
      return undefined;
    }
  });
  for (const r of results.values()) {
    if (r?.pk && r?.classification) map.set(r.pk, r.classification);
  }
  return map;
}

const STAKE_ENTRIES_QUERY = `
  query GetStakeEntries($pks: [String!]!, $after: Cursor) {
    stakeEntries(first: 100, filter: { staker: { publicKey: { in: $pks } } }, after: $after) {
      nodes {
        stakerPkid
        stakeAmountNanos
        validatorEntry { account { publicKey } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const LOCKED_STAKE_ENTRIES_QUERY = `
  query GetLockedStakeEntries($pks: [String!]!, $after: Cursor) {
    lockedStakeEntries(first: 100, filter: { staker: { publicKey: { in: $pks } } }, after: $after) {
      nodes {
        stakerPkid
        lockedAmountNanos
        validatorEntry { account { publicKey } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const ALL_STAKE_ENTRIES_QUERY = `
  query GetAllStakeEntries($after: Cursor) {
    stakeEntries(first: 100, after: $after) {
      nodes {
        stakerPkid
        stakeAmountNanos
        validatorEntry { account { publicKey } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const ALL_LOCKED_STAKE_ENTRIES_QUERY = `
  query GetAllLockedStakeEntries($after: Cursor) {
    lockedStakeEntries(first: 100, after: $after) {
      nodes {
        stakerPkid
        lockedAmountNanos
        validatorEntry { account { publicKey } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

/** Stake entries ordered by stake amount DESC – for adding top stakers to Others for review. */
const STAKE_ENTRIES_BY_AMOUNT_QUERY = `
  query StakeEntriesByAmount($first: Int!, $after: Cursor) {
    stakeEntries(first: $first, after: $after, orderBy: STAKE_AMOUNT_NANOS_DESC) {
      nodes {
        stakerPkid
        stakeAmountNanos
        validatorEntry { account { publicKey } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const CREATOR_COIN_BALANCES_SINGLE_QUERY = `
  query CreatorCoinBalancesSingle($pk: String!, $after: Cursor) {
    creatorCoinBalances(first: 500, filter: { holder: { publicKey: { equalTo: $pk } } }, after: $after) {
      nodes { totalValueNanos }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

type StakeEntry = { validatorPk: string; amount: number };

/** Fetch CCv1 (Creator Coin v1) net value in DESO per public key via GraphQL.
 * Sums totalValueNanos/1e9 for each holder (same method as randhir-ccv1.mjs).
 * Per-user queries avoid statement timeout; runs 5 in parallel. */
async function fetchCcV1ValueByPublicKey(
  publicKeys: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (publicKeys.length === 0) return out;

  const CONCURRENCY = 5;
  for (let i = 0; i < publicKeys.length; i += CONCURRENCY) {
    const batch = publicKeys.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (pk) => {
        let total = 0;
        let after: string | null = null;
        do {
          const res = await fetch(getGraphqlUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: CREATOR_COIN_BALANCES_SINGLE_QUERY,
              variables: { pk, after },
            }),
          });
          if (!res.ok) return { pk, total: 0 };
          const data = (await res.json()) as {
            data?: {
              creatorCoinBalances?: {
                nodes?: Array<{ totalValueNanos?: string }>;
                pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
              };
            };
            errors?: Array<{ message?: string }>;
          };
          if (data?.errors?.length) return { pk, total };
          const nodes = data?.data?.creatorCoinBalances?.nodes ?? [];
          for (const n of nodes) {
            total += parseFloat(n.totalValueNanos ?? '0') / NANOS_PER_DESO;
          }
          const conn = data?.data?.creatorCoinBalances;
          after = conn?.pageInfo?.hasNextPage ? (conn?.pageInfo?.endCursor ?? null) : null;
        } while (after);
        return { pk, total };
      })
    );
    for (const { pk, total } of results) {
      if (total > 0) out.set(pk, total);
    }
  }

  return out;
}

const CCV1_ACCOUNTS_QUERY = `
  query CCv1Accounts($first: Int!, $after: Cursor) {
    accounts(first: $first, after: $after, filter: { desoLockedNanos: { greaterThan: "0" } }, orderBy: DESO_LOCKED_NANOS_DESC) {
      nodes { desoLockedNanos }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

/** CCv1 Holdings table: creators with DESO locked, price, coins in circulation */
const CCV1_HOLDINGS_QUERY = `
  query CCv1Holdings($first: Int!, $after: Cursor) {
    accounts(first: $first, after: $after, filter: { desoLockedNanos: { greaterThan: "0" } }, orderBy: DESO_LOCKED_NANOS_DESC) {
      nodes {
        username
        desoLockedNanos
        coinPriceDesoNanos
        ccCoinsInCirculationNanos
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

/** Top DESO balance holders (unstaked DESO). Filter by min balance to cover a big chunk of Unstaked DESO. */
const DESO_BALANCES_QUERY = `
  query DesoBalances($first: Int!, $after: Cursor, $filter: DesoBalanceFilter) {
    desoBalances(first: $first, after: $after, orderBy: BALANCE_NANOS_DESC, filter: $filter) {
      nodes { balanceNanos publicKey }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
`;

/** Fetch ALL stake entries (orderBy STAKE_AMOUNT_NANOS_DESC), aggregate by staker. For adding to Others for review/classification. */
export async function fetchStakeEntriesTopStakers(limit: number = 50_000): Promise<Array<{ pk: string; staked: number }>> {
  const byStaker = new Map<string, number>();
  let after: string | null = null;
  const PAGE_SIZE = 100;
  const MAX_PAGES = 500; // Safety: ~50K stake entries

  const runQuery = async (query: string, variables: { first: number; after: string | null }) => {
    const res = await fetch(getGraphqlUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      data?: { stakeEntries?: { nodes?: Array<{ stakerPkid?: string; stakeAmountNanos?: string }>; pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } } };
      errors?: Array<{ message?: string }>;
    };
  };

  for (let page = 0; page < MAX_PAGES; page++) {
    let data = await runQuery(STAKE_ENTRIES_BY_AMOUNT_QUERY, { first: PAGE_SIZE, after });
    if (data?.errors?.length) {
      data = await runQuery(ALL_STAKE_ENTRIES_QUERY, { after } as { first: number; after: string | null });
    }
    if (!data || data?.errors?.length) break;
    const nodes = data?.data?.stakeEntries?.nodes ?? [];
    for (const n of nodes) {
      const pk = n.stakerPkid ?? '';
      const nanos = Number(n.stakeAmountNanos ?? 0);
      if (pk && nanos > 0) {
        byStaker.set(pk, (byStaker.get(pk) ?? 0) + nanos);
      }
    }
    const conn = data?.data?.stakeEntries;
    const hasNext = conn?.pageInfo?.hasNextPage ?? false;
    after = hasNext ? (conn?.pageInfo?.endCursor ?? null) : null;
    if (!hasNext || nodes.length === 0) break;
    if (after) await new Promise((r) => setTimeout(r, 100));
  }

  return Array.from(byStaker.entries())
    .map(([pk, nanos]) => ({ pk, staked: nanos / NANOS_PER_DESO }))
    .sort((a, b) => b.staked - a.staked)
    .slice(0, limit);
}

/** Fetch total NET CCv1 (DESO locked in Creator Coins v1) via GraphQL.
 * Ordered by desoLockedNanos DESC so top creators come first (~99% in first 10K).
 * @param limit - Optional. Stop after N creators for fast ~99% approx (e.g. 10000). */
export async function fetchCCv1NetworkTotalDeso(limit?: number): Promise<number> {
  const PAGE_SIZE = 1000;
  const RETRIES = 3;
  let totalNanos = 0n;
  let count = 0;
  let after: string | null = null;

  do {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < RETRIES; attempt++) {
      try {
        const res = await fetch(getGraphqlUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: CCV1_ACCOUNTS_QUERY,
            variables: { first: PAGE_SIZE, after },
          }),
        });
        const text = await res.text();
        let data: { data?: { accounts?: { nodes?: Array<{ desoLockedNanos?: string }>; pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } } }; errors?: Array<{ message?: string }> };
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Invalid JSON: ${text.slice(0, 200)}`);
        }
        if (data?.errors?.length) throw new Error(JSON.stringify(data.errors));
        const conn = data?.data?.accounts;
        const nodes = conn?.nodes ?? [];
        for (const n of nodes) {
          totalNanos += BigInt(n.desoLockedNanos ?? '0');
          count++;
        }
        after = conn?.pageInfo?.hasNextPage ? (conn?.pageInfo?.endCursor ?? null) : null;
        if (limit != null && count >= limit) after = null;
        break;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
    }
    if (lastError) throw lastError;
    if (after) await new Promise((r) => setTimeout(r, 300));
  } while (after);

  return Number(totalNanos) / NANOS_PER_DESO;
}

export interface CCv1HoldingRow {
  username: string | null;
  desoLockedNanos: string;
  desoLocked: number;
  coinPriceDesoNanos: string | null;
  coinPriceDeso: number | null;
  ccCoinsInCirculationNanos: string | null;
  ccCoinsInCirculation: number | null;
  /** True when creator coin has zero coins in circulation – effectively fully reserved. */
  isReserved: boolean;
}

type CCv1HoldingsNode = {
  username?: string | null;
  desoLockedNanos?: string;
  coinPriceDesoNanos?: string | null;
  ccCoinsInCirculationNanos?: string | null;
};

function parseCCv1HoldingsNodes(nodes: CCv1HoldingsNode[]): CCv1HoldingRow[] {
  return nodes.map((n) => {
    const desoLockedNanos = n.desoLockedNanos ?? '0';
    const desoLocked = Number(desoLockedNanos) / NANOS_PER_DESO;
    const coinPriceDesoNanos = n.coinPriceDesoNanos ?? null;
    const coinPriceDeso = coinPriceDesoNanos != null ? Number(coinPriceDesoNanos) / NANOS_PER_DESO : null;
    const ccCoinsInCirculationNanos = n.ccCoinsInCirculationNanos ?? null;
    const ccCoinsInCirculation =
      ccCoinsInCirculationNanos != null ? Number(ccCoinsInCirculationNanos) / 1e9 : null;
    const isReserved = ccCoinsInCirculation === 0;
    return {
      username: n.username ?? null,
      desoLockedNanos,
      desoLocked,
      coinPriceDesoNanos,
      coinPriceDeso,
      ccCoinsInCirculationNanos,
      ccCoinsInCirculation,
      isReserved,
    };
  });
}

/** Fetch a single page of CCv1 holdings (for cache background job). */
export async function fetchCCv1HoldingsPage(
  first: number,
  after: string | null
): Promise<{ rows: CCv1HoldingRow[]; hasNextPage: boolean; endCursor: string | null }> {
  const res = await fetch(getGraphqlUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: CCV1_HOLDINGS_QUERY,
      variables: { first, after },
    }),
  });
  if (!res.ok) return { rows: [], hasNextPage: false, endCursor: null };
  const data = (await res.json()) as {
    data?: {
      accounts?: {
        nodes?: CCv1HoldingsNode[];
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
      };
    };
    errors?: Array<{ message?: string }>;
  };
  if (data?.errors?.length) return { rows: [], hasNextPage: false, endCursor: null };
  const nodes: CCv1HoldingsNode[] = data?.data?.accounts?.nodes ?? [];
  const pageInfo = data?.data?.accounts?.pageInfo;
  return {
    rows: parseCCv1HoldingsNodes(nodes),
    hasNextPage: pageInfo?.hasNextPage ?? false,
    endCursor: pageInfo?.hasNextPage ? (pageInfo?.endCursor ?? null) : null,
  };
}

/** Fetch top creator coins by DESO locked (paginates until limit). */
export async function fetchCCv1Holdings(limit: number = 200): Promise<CCv1HoldingRow[]> {
  const PAGE_SIZE = 100;
  const rows: CCv1HoldingRow[] = [];
  let after: string | null = null;

  do {
    const { rows: pageRows, hasNextPage, endCursor } = await fetchCCv1HoldingsPage(PAGE_SIZE, after);
    rows.push(...pageRows);
    if (rows.length >= limit) break;
    after = hasNextPage ? endCursor : null;
    if (after) await new Promise((r) => setTimeout(r, 200));
  } while (after);

  return rows.slice(0, limit);
}

export interface DesoBalanceNode {
  publicKey: string;
  balanceNanos: string;
  balanceDeso: number;
}

/** Fetch top DESO balance holders (min balance filter ~0.25 DESO / ~$1). Excludes no one here; caller filters tracked. */
export async function fetchDesoBalancesTopHolders(
  first: number = 500,
  minBalanceNanos: number = 250_000_000
): Promise<DesoBalanceNode[]> {
  const res = await fetch(getGraphqlUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: DESO_BALANCES_QUERY,
      variables: {
        first,
        filter: { balanceNanos: { greaterThan: String(minBalanceNanos) } },
      },
    }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    data?: {
      desoBalances?: {
        nodes?: Array<{ publicKey?: string; balanceNanos?: string }>;
        totalCount?: number;
      };
    };
    errors?: Array<{ message?: string }>;
  };
  if (data?.errors?.length) return [];
  const nodes = data?.data?.desoBalances?.nodes ?? [];
  return nodes
    .filter((n) => n.publicKey)
    .map((n) => ({
      publicKey: n.publicKey!,
      balanceNanos: n.balanceNanos ?? '0',
      balanceDeso: Number(n.balanceNanos ?? '0') / NANOS_PER_DESO,
    }));
}

async function fetchAllStakeNodes(
  query: string,
  variables: { pks: string[]; after?: string | null }
): Promise<Array<{ stakerPk: string; validatorPk: string; amountNanos: number }>> {
  const all: Array<{ stakerPk: string; validatorPk: string; amountNanos: number }> = [];
  let after: string | null = variables.after ?? null;
  const pks = variables.pks;
  if (pks.length === 0) return all;

  const amountKey = query.includes('lockedAmountNanos') ? 'lockedAmountNanos' : 'stakeAmountNanos';
  const connKey = query.includes('lockedStakeEntries') ? 'lockedStakeEntries' : 'stakeEntries';

  do {
    const res = await fetch(getGraphqlUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { ...variables, after } }),
    });
    if (!res.ok) break;
    const data = (await res.json()) as {
      data?: Record<string, {
        nodes?: Array<{
          stakerPkid?: string;
          stakeAmountNanos?: string;
          lockedAmountNanos?: string;
          validatorEntry?: { account?: { publicKey?: string } };
        }>;
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
      }>;
    };
    const conn = data?.data?.[connKey];
    const nodes = conn?.nodes ?? [];
    for (const n of nodes) {
      const stakerPk = n.stakerPkid ?? '';
      const vPk = n.validatorEntry?.account?.publicKey ?? '';
      const nanos = Number((n as Record<string, string>)[amountKey] ?? 0);
      if (stakerPk && vPk && nanos > 0) {
        all.push({ stakerPk, validatorPk: vPk, amountNanos: nanos });
      }
    }
    const hasNext = conn?.pageInfo?.hasNextPage ?? false;
    after = hasNext ? (conn?.pageInfo?.endCursor ?? null) : null;
  } while (after);

  return all;
}

async function fetchAllStakeNodesUnfiltered(
  query: string,
  variables: { after?: string | null }
): Promise<Array<{ stakerPk: string; validatorPk: string; amountNanos: number }>> {
  const all: Array<{ stakerPk: string; validatorPk: string; amountNanos: number }> = [];
  let after: string | null = variables.after ?? null;
  const amountKey = query.includes('lockedAmountNanos') ? 'lockedAmountNanos' : 'stakeAmountNanos';
  const connKey = query.includes('lockedStakeEntries') ? 'lockedStakeEntries' : 'stakeEntries';

  do {
    const res = await fetch(getGraphqlUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { after } }),
    });
    if (!res.ok) break;
    const data = (await res.json()) as {
      data?: Record<string, {
        nodes?: Array<{
          stakerPkid?: string;
          stakeAmountNanos?: string;
          lockedAmountNanos?: string;
          validatorEntry?: { account?: { publicKey?: string } };
        }>;
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
      }>;
    };
    const conn = data?.data?.[connKey];
    const nodes = conn?.nodes ?? [];
    for (const n of nodes) {
      const stakerPk = n.stakerPkid ?? '';
      const vPk = n.validatorEntry?.account?.publicKey ?? '';
      const nanos = Number((n as Record<string, string>)[amountKey] ?? 0);
      if (stakerPk && vPk && nanos > 0) {
        all.push({ stakerPk, validatorPk: vPk, amountNanos: nanos });
      }
    }
    const hasNext = conn?.pageInfo?.hasNextPage ?? false;
    after = hasNext ? (conn?.pageInfo?.endCursor ?? null) : null;
  } while (after);

  return all;
}

/**
 * Fetch staked DESO per user per validator via DeSo GraphQL API.
 * Uses stakeEntries (active) + lockedStakeEntries (cooldown) with in filter for entire list.
 */
async function fetchStakedByPublicKey(
  publicKeys: string[]
): Promise<Map<string, StakeEntry[]>> {
  const stakedByPk = new Map<string, Map<string, number>>();

  const [activeNodes, lockedNodes] = await Promise.all([
    fetchAllStakeNodes(STAKE_ENTRIES_QUERY, { pks: publicKeys }),
    fetchAllStakeNodes(LOCKED_STAKE_ENTRIES_QUERY, { pks: publicKeys }),
  ]);

  for (const { stakerPk, validatorPk, amountNanos } of [...activeNodes, ...lockedNodes]) {
    let byValidator = stakedByPk.get(stakerPk);
    if (!byValidator) {
      byValidator = new Map();
      stakedByPk.set(stakerPk, byValidator);
    }
    byValidator.set(validatorPk, (byValidator.get(validatorPk) ?? 0) + amountNanos);
  }

  const result = new Map<string, StakeEntry[]>();
  for (const [pk, byValidator] of stakedByPk) {
    const entries: StakeEntry[] = [];
    for (const [vPk, nanos] of byValidator) {
      entries.push({ validatorPk: vPk, amount: nanos / NANOS_PER_DESO });
    }
    if (entries.length > 0) result.set(pk, entries);
  }
  return result;
}

/** Total staked DESO per public key (sum across validators). For desoBalances top holders. */
export async function getStakedTotalByPublicKeys(publicKeys: string[]): Promise<Map<string, number>> {
  const byPk = await fetchStakedByPublicKey(publicKeys);
  const out = new Map<string, number>();
  for (const [pk, entries] of byPk) {
    const total = entries.reduce((s, e) => s + e.amount, 0);
    if (total > 0) out.set(pk, total);
  }
  return out;
}

/** Fetch DESO balance (total) per public key for untracked wallets. Used by Free Float to show accurate holdings. */
export async function fetchBalancesForPublicKeys(
  publicKeys: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (publicKeys.length === 0) return out;
  const BATCH = 100;
  for (let i = 0; i < publicKeys.length; i += BATCH) {
    const batch = publicKeys.slice(i, i + BATCH);
    try {
      const res = (await desoPost('/get-users-stateless', {
        PublicKeysBase58Check: batch,
        SkipForLeaderboard: true,
        IncludeBalance: true,
      })) as {
        UserList?: Array<{
          PublicKeyBase58Check?: string;
          BalanceNanos?: number;
          DESOBalanceNanos?: number;
        }>;
      };
      for (const u of res.UserList ?? []) {
        const pk = u.PublicKeyBase58Check;
        if (!pk) continue;
        const balanceNanos = u.DESOBalanceNanos ?? u.BalanceNanos ?? 0;
        out.set(pk, balanceNanos / NANOS_PER_DESO);
      }
    } catch {
      // ignore failed batch
    }
  }
  return out;
}

/** Resolve public keys to usernames via get-users-stateless (ProfileEntryResponse.Username). Exported for Token Holdings Others. Batches to avoid API limits (~100 keys/request). */
export async function fetchUsernamesForPks(pks: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (pks.length === 0) return map;
  const BATCH = 100;
  for (let i = 0; i < pks.length; i += BATCH) {
    const batch = pks.slice(i, i + BATCH);
    try {
      const res = (await desoPost('/get-users-stateless', {
        PublicKeysBase58Check: batch,
        SkipForLeaderboard: true,
        IncludeBalance: false,
      })) as { UserList?: Array<{ PublicKeyBase58Check?: string; ProfileEntryResponse?: { Username?: string }; Profile?: { Username?: string } }> };
      for (const u of res.UserList ?? []) {
        const pk = u.PublicKeyBase58Check;
        const username = u.ProfileEntryResponse?.Username ?? u.Profile?.Username;
        if (pk && username) map.set(pk, username);
      }
    } catch {
      // ignore failed batch
    }
  }
  return map;
}

export interface AllStakedDesoRow {
  stakerPk: string;
  stakerName: string;
  /** True if staker has a username (tracked or from chain); false if public key only */
  hasUsername: boolean;
  /** CORE_AFFILIATED, EXCHANGE are grouped with community in StakedDesoTable */
  classification: 'FOUNDATION' | 'AMM' | 'FOUNDER' | 'DESO_BULL' | 'CORE_AFFILIATED' | 'EXCHANGE' | 'COMMUNITY';
  amount: number;
  validatorPk: string;
  validatorName?: string;
}

export type ValidatorType = 'core' | 'community';

export interface AllStakedDesoBucket {
  validatorKey: string;
  validatorName: string;
  validatorType: ValidatorType;
  foundation: AllStakedDesoRow[];
  community: AllStakedDesoRow[];
  total: number;
}

function getValidatorType(validatorName: string): ValidatorType {
  const core = new Set(CORE_VALIDATOR_USERNAMES.map((u) => u.toLowerCase()));
  const community = new Set(COMMUNITY_VALIDATOR_USERNAMES.map((u) => u.toLowerCase()));
  const name = validatorName.toLowerCase();
  if (core.has(name)) return 'core';
  if (community.has(name)) return 'community';
  return 'community'; // default unknown to community
}

/**
 * Fetch ALL stake entries (no filter) for the Staked DESO table.
 * Untracked stakers are classified as Community.
 */
export async function fetchAllStakedDeso(): Promise<AllStakedDesoBucket[]> {
  const trackedByPk = new Map<string, { displayName: string; classification: WalletConfig['classification']; mergeKey?: string }>();

  // Add public-key-only accounts first
  for (const config of WALLET_CONFIG) {
    if (config.publicKeyBase58Check) {
      trackedByPk.set(config.publicKeyBase58Check, {
        displayName: config.displayName ?? (config.username || 'Unknown'),
        classification: config.classification,
        mergeKey: config.mergeKey,
      });
    }
  }

  // Fetch profiles for username-based accounts
  const usernameConfigs = WALLET_CONFIG.filter((c) => !c.publicKeyBase58Check);
  const profileResults = await runBatched(usernameConfigs, 5, async (config) => {
    try {
      const profileRes = (await desoPost('/get-single-profile', {
        Username: config.username,
      })) as { Profile?: { PublicKeyBase58Check?: string } };
      const pk = profileRes.Profile?.PublicKeyBase58Check;
      if (pk) return { pk, config };
      return undefined;
    } catch {
      return undefined;
    }
  });
  for (const { pk, config } of profileResults.values()) {
    if (pk && config) {
      trackedByPk.set(pk, {
        displayName: config.displayName ?? config.username,
        classification: config.classification,
        mergeKey: config.mergeKey,
      });
    }
  }

  const [activeNodes, lockedNodes] = await Promise.all([
    fetchAllStakeNodesUnfiltered(ALL_STAKE_ENTRIES_QUERY, {}),
    fetchAllStakeNodesUnfiltered(ALL_LOCKED_STAKE_ENTRIES_QUERY, {}),
  ]);

  const byValidatorStaker = new Map<string, Map<string, number>>();
  for (const { stakerPk, validatorPk, amountNanos } of [...activeNodes, ...lockedNodes]) {
    let byStaker = byValidatorStaker.get(validatorPk);
    if (!byStaker) {
      byStaker = new Map();
      byValidatorStaker.set(validatorPk, byStaker);
    }
    byStaker.set(stakerPk, (byStaker.get(stakerPk) ?? 0) + amountNanos);
  }

  const allValidatorPks = Array.from(byValidatorStaker.keys());
  const allStakerPks = new Set<string>();
  for (const byStaker of byValidatorStaker.values()) {
    for (const pk of byStaker.keys()) allStakerPks.add(pk);
  }
  const untrackedPks = Array.from(allStakerPks).filter((pk) => !trackedByPk.has(pk));

  const [validatorNames, stakerNames] = await Promise.all([
    fetchUsernamesForPks(allValidatorPks),
    fetchUsernamesForPks(untrackedPks),
  ]);

  const buckets: AllStakedDesoBucket[] = [];
  for (const [validatorPk, byStaker] of byValidatorStaker) {
    const validatorName = validatorNames.get(validatorPk) ?? `Validator ${validatorPk.slice(0, 8)}…`;
    const foundation: AllStakedDesoRow[] = [];
    const community: AllStakedDesoRow[] = [];
    let total = 0;

    // Build rows, merging by mergeKey when present
    const byMergeKey = new Map<string, { stakerPk: string; stakerName: string; hasUsername: boolean; classification: AllStakedDesoRow['classification']; amount: number }>();
    for (const [stakerPk, amountNanos] of byStaker) {
      const amount = amountNanos / NANOS_PER_DESO;
      total += amount;
      const tracked = trackedByPk.get(stakerPk);
      const stakerName = tracked?.displayName ?? stakerNames.get(stakerPk) ?? `${stakerPk.slice(0, 8)}…`;
      const hasUsername = !!tracked || stakerNames.has(stakerPk);
      const classification = tracked
        ? tracked.classification
        : ('COMMUNITY' as const);
      const key = tracked?.mergeKey ?? stakerPk;
      const existing = byMergeKey.get(key);
      if (existing) {
        existing.amount += amount;
      } else {
        byMergeKey.set(key, { stakerPk, stakerName, hasUsername, classification, amount });
      }
    }
    const rows: AllStakedDesoRow[] = Array.from(byMergeKey.values()).map((r) => ({
      stakerPk: r.stakerPk,
      stakerName: r.stakerName,
      hasUsername: r.hasUsername,
      classification: r.classification,
      amount: r.amount,
      validatorPk,
      validatorName,
    }));
    rows.sort((a, b) => b.amount - a.amount);
    for (const r of rows) {
      if (r.classification === 'FOUNDATION' || r.classification === 'AMM' || r.classification === 'FOUNDER') {
        foundation.push(r);
      } else {
        community.push(r);
      }
    }

    const validatorType = getValidatorType(validatorName);
    buckets.push({
      validatorKey: validatorPk,
      validatorName,
      validatorType,
      foundation,
      community,
      total,
    });
  }

  // Sort: Core first (by total desc), then Community (by total desc)
  buckets.sort((a, b) => {
    if (a.validatorType !== b.validatorType) return a.validatorType === 'core' ? -1 : 1;
    return b.total - a.total;
  });
  return buckets;
}

/**
 * Fetch creator coin (CCv2) holders via get-hodlers-for-public-key with IsDAOCoin: false.
 * Returns map of holder publicKey -> balance in nanos (for share ratio; totalSupply = sum of values).
 * creatorUsername should be the display name portion excluding " (AMM)" (from getCCv2UserTokenAmms).
 */
async function fetchCreatorCoinHolders(creatorUsername: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!creatorUsername?.trim()) return out;
  try {
    let lastKey = '';
    for (;;) {
      const res = await fetchHodlers({
        Username: creatorUsername,
        LastPublicKeyBase58Check: lastKey,
        NumToFetch: 200,
        FetchAll: false,
        IsDAOCoin: false,
      });
      if (!res.ok) break;
      const data = (await res.json()) as {
        Hodlers?: Array<{
          HODLerPublicKeyBase58Check?: string;
          BalanceNanos?: number;
          BalanceNanosUint256?: string;
        }>;
        LastPublicKeyBase58Check?: string;
      };
      const hodlers = data?.Hodlers ?? [];
      for (const h of hodlers) {
        const pk = h.HODLerPublicKeyBase58Check;
        if (!pk) continue;
        const nanos = parseCreatorCoinBalanceNanos(h);
        if (nanos > 0) out.set(pk, (out.get(pk) ?? 0) + nanos);
      }
      lastKey = data?.LastPublicKeyBase58Check ?? '';
      if (hodlers.length < 200 || !lastKey) break;
    }
  } catch {
    // ignore
  }
  return out;
}

function parseCreatorCoinBalanceNanos(entry: { BalanceNanos?: number; BalanceNanosUint256?: string }): number {
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    return Number(BigInt('0x' + hex));
  }
  return entry.BalanceNanos ?? 0;
}

/** Token creator usernames for get-hodlers-for-public-key (fetches all holders of that token) */
const TOKEN_USERNAMES: { username: string; tokenName: string }[] = [
  { username: 'openfund', tokenName: 'Openfund' },
  { username: 'focus', tokenName: 'Focus' },
  { username: 'dUSDC_', tokenName: 'dUSDC' },
  { username: 'dBTC', tokenName: 'dBTC' },
  { username: 'dETH', tokenName: 'dETH' },
  { username: 'dSOL', tokenName: 'dSOL' },
];

/** Stop pagination when smallest balance in page is below this USD value (hodlers are sorted by balance desc) */
const MIN_HOLDING_USD = 10;
const HODLERS_PAGE_SIZE = 200;

/** Approximate token prices for early-stop threshold (from desoData) */
const TOKEN_PRICE_USD: Record<string, number> = {
  Openfund: 0.087,
  Focus: 0.00034,
  dUSDC: 1,
  dBTC: 97_400,
  dETH: 2_640,
  dSOL: 196,
};

/**
 * Fetch holders of a token via get-hodlers-for-public-key with Username (token creator).
 * Sorts each page by balance descending before processing (avoids stopping too early if API order varies).
 * Stops when smallest balance in page is below MIN_HOLDING_USD.
 * Uses LastPublicKeyBase58Check only as pagination cursor (not querying that account).
 */
async function fetchTokenHolders(
  tokenUsername: string,
  tokenName: string
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!tokenUsername?.trim()) return out;
  const priceUsd = TOKEN_PRICE_USD[tokenName] ?? 0;
  try {
    let lastKey = '';
    for (;;) {
      const res = await fetchHodlers({
        Username: tokenUsername,
        LastPublicKeyBase58Check: lastKey,
        NumToFetch: HODLERS_PAGE_SIZE,
        FetchAll: false,
        IsDAOCoin: true,
      });
      if (!res.ok) break;
      const data = (await res.json()) as {
        Hodlers?: Array<{
          HODLerPublicKeyBase58Check?: string;
          BalanceNanos?: number;
          BalanceNanosUint256?: string;
        }>;
        LastPublicKeyBase58Check?: string;
      };
      const hodlers = data?.Hodlers ?? [];
      // Sort by balance descending so we process largest first; min is last (avoids stopping too early if API order varies)
      const withBalance = hodlers
        .filter((h) => h.HODLerPublicKeyBase58Check)
        .map((h) => ({ h, amt: parseDaoBalance(h) }))
        .filter((x) => x.amt > 0)
        .sort((a, b) => b.amt - a.amt);
      for (const { h, amt } of withBalance) {
        const pk = h.HODLerPublicKeyBase58Check!;
        out.set(pk, (out.get(pk) ?? 0) + amt);
      }
      const minBalanceInPage = withBalance.length > 0 ? withBalance[withBalance.length - 1].amt : Infinity;
      lastKey = data?.LastPublicKeyBase58Check ?? '';
      const minUsd = priceUsd > 0 && minBalanceInPage !== Infinity ? minBalanceInPage * priceUsd : Infinity;
      if (hodlers.length < HODLERS_PAGE_SIZE || !lastKey || minUsd < MIN_HOLDING_USD) break;
    }
  } catch {
    // ignore
  }
  return out;
}

function parseDaoBalance(entry: { BalanceNanos?: number; BalanceNanosUint256?: string }): number {
  const divisor = NANOS_PER_DAO_COIN; // 1e18 for all DAO coins (Openfund, Focus, dUSDC, etc.)
  // Prefer BalanceNanosUint256 - preserves full precision (440788 vs 3.47); BalanceNanos (number) loses precision
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    const nanos = BigInt('0x' + hex);
    return Number(nanos) / divisor;
  }
  if (entry.BalanceNanos != null) return entry.BalanceNanos / divisor;
  return 0;
}

/** Openfund + Focus balances per holder PK. Used by Token Holdings Others rows. */
export interface OpenfundFocusByPk {
  Openfund: number;
  Focus: number;
}

/**
 * Fetch Openfund and Focus holder maps, return combined map of pk -> {Openfund, Focus}.
 * Used by Token Holdings to show Openfund/Focus for Others (free-float, desoBalances) rows.
 */
export async function fetchOpenfundFocusHolderMap(): Promise<Map<string, OpenfundFocusByPk>> {
  const [openfundHolders, focusHolders] = await Promise.all([
    fetchTokenHolders('openfund', 'Openfund'),
    fetchTokenHolders('focus', 'Focus'),
  ]);
  const out = new Map<string, OpenfundFocusByPk>();
  const allPks = new Set([...openfundHolders.keys(), ...focusHolders.keys()]);
  for (const pk of allPks) {
    const openfund = openfundHolders.get(pk) ?? 0;
    const focus = focusHolders.get(pk) ?? 0;
    if (openfund > 0 || focus > 0) {
      out.set(pk, { Openfund: openfund, Focus: focus });
    }
  }
  return out;
}

/** Run up to N promises at a time */
async function runBatched<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R | undefined>
): Promise<Map<T, R>> {
  const results = new Map<T, R>();
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(fn));
    for (let j = 0; j < batch.length; j++) {
      const r = settled[j];
      if (r.status === 'fulfilled' && r.value !== undefined) {
        results.set(batch[j], r.value);
      }
    }
  }
  return results;
}

export async function fetchWalletBalances(): Promise<WalletData[]> {
  // 1. Build tracked users: publicKey -> { displayName, classification, mergeKey? }
  const trackedByPk = new Map<string, { displayName: string; classification: WalletConfig['classification']; mergeKey?: string }>();

  // Add public-key-only accounts first (no username lookup)
  for (const config of WALLET_CONFIG) {
    if (config.publicKeyBase58Check) {
      trackedByPk.set(config.publicKeyBase58Check, {
        displayName: config.displayName ?? (config.username || 'Unknown'),
        classification: config.classification,
        mergeKey: config.mergeKey,
      });
    }
  }

  // Fetch profiles for username-based accounts (5 at a time)
  const usernameConfigs = WALLET_CONFIG.filter((c) => !c.publicKeyBase58Check);
  const profileResults = await runBatched(usernameConfigs, 5, async (config) => {
    try {
      const profileRes = (await desoPost('/get-single-profile', {
        Username: config.username,
      })) as { Profile?: { PublicKeyBase58Check?: string } };
      const pk = profileRes.Profile?.PublicKeyBase58Check;
      if (pk) return { pk, config };
      return undefined;
    } catch {
      return undefined;
    }
  });
  for (const { pk, config } of profileResults.values()) {
    if (pk && config) {
      trackedByPk.set(pk, {
        displayName: config.displayName ?? config.username,
        classification: config.classification,
        mergeKey: config.mergeKey,
      });
    }
  }

  const publicKeys = Array.from(trackedByPk.keys());

  // 2. Fetch all holders for each token in parallel (Openfund, Focus, dUSDC, etc.)
  const tokenHoldingsByPk = new Map<string, Map<string, number>>();
  const holderMaps = await Promise.all(
    TOKEN_USERNAMES.map(({ username, tokenName }) => fetchTokenHolders(username, tokenName))
  );
  for (let i = 0; i < TOKEN_USERNAMES.length; i++) {
    const { tokenName } = TOKEN_USERNAMES[i];
    const holders = holderMaps[i];
    for (const [hodlerPk, amt] of holders) {
      if (trackedByPk.has(hodlerPk) && amt > 0) {
        let m = tokenHoldingsByPk.get(hodlerPk);
        if (!m) {
          m = new Map();
          tokenHoldingsByPk.set(hodlerPk, m);
        }
        m.set(tokenName, (m.get(tokenName) ?? 0) + amt);
      }
    }
  }

  // 3. Fetch DESO (unstaked + staked) for all tracked users
  type UserBalance = {
    PublicKeyBase58Check?: string;
    BalanceNanos?: number;
    DESOBalanceNanos?: number;
    /** Some node builds include locked/staked balance; Staked ≈ Total - Spendable */
    LockedBalanceNanos?: number;
  };
  let usersList: UserBalance[] = [];
  if (publicKeys.length > 0) {
    try {
      const usersRes = (await desoPost('/get-users-stateless', {
        PublicKeysBase58Check: publicKeys,
        SkipForLeaderboard: false,
        IncludeBalance: true,
      })) as { UserList?: UserBalance[] };
      usersList = usersRes.UserList ?? [];
    } catch {
      // ignore
    }
  }

  const [stakedByPk, ccv1ByPk] = await Promise.all([
    fetchStakedByPublicKey(publicKeys),
    fetchCcV1ValueByPublicKey(publicKeys),
  ]);
  const allValidatorPks = new Set<string>();
  for (const entries of stakedByPk.values()) {
    for (const e of entries) allValidatorPks.add(e.validatorPk);
  }
  const validatorNames = await fetchUsernamesForPks(Array.from(allValidatorPks));
  const stakeByPk = new Map<string, { unstaked: number; staked: number; stakedByValidator: StakedByValidator[] }>();
  for (const pk of publicKeys) {
    const user = usersList.find((u) => u.PublicKeyBase58Check === pk);
    const balanceNanos = user?.BalanceNanos ?? 0;
    const desoBalanceNanos = user?.DESOBalanceNanos ?? balanceNanos;
    const lockedNanos = user?.LockedBalanceNanos;
    const spendable = desoBalanceNanos / NANOS_PER_DESO;
    const entries = stakedByPk.get(pk) ?? [];
    let staked = entries.reduce((s, e) => s + e.amount, 0);
    if (staked === 0 && lockedNanos != null) {
      staked = lockedNanos / NANOS_PER_DESO;
    } else if (staked === 0 && balanceNanos > 0 && desoBalanceNanos < balanceNanos) {
      staked = (balanceNanos - desoBalanceNanos) / NANOS_PER_DESO;
    }
    const stakedByValidator: StakedByValidator[] = entries.map((e) => ({
      ...e,
      validatorName: validatorNames.get(e.validatorPk),
    }));
    stakeByPk.set(pk, { unstaked: spendable, staked, stakedByValidator });
  }

  // 4. Build results (group by mergeKey when present)
  const groupKeyToPks = new Map<string, string[]>();
  for (const pk of publicKeys) {
    const meta = trackedByPk.get(pk)!;
    const key = meta.mergeKey ?? pk;
    const arr = groupKeyToPks.get(key) ?? [];
    arr.push(pk);
    groupKeyToPks.set(key, arr);
  }

  const results: WalletData[] = [];
  const pksPerResult: string[][] = [];
  for (const [groupKey, pksInGroup] of groupKeyToPks) {
    pksPerResult.push(pksInGroup);
    const meta = trackedByPk.get(pksInGroup[0])!;
    const balances: Record<string, number> = {};

    for (const pk of pksInGroup) {
      const tokenMap = tokenHoldingsByPk.get(pk);
      if (tokenMap) {
        for (const [token, amt] of tokenMap) {
          if (amt > 0) balances[token] = (balances[token] ?? 0) + amt;
        }
      }
    }

    let totalUnstaked = 0;
    let totalStaked = 0;
    const stakedByValidatorMap = new Map<string, number>();
    for (const pk of pksInGroup) {
      const stakeData = stakeByPk.get(pk);
      const user = usersList.find((u) => u.PublicKeyBase58Check === pk);
      if (stakeData) {
        totalUnstaked += stakeData.unstaked;
        totalStaked += stakeData.staked;
        for (const e of stakeData.stakedByValidator) {
          stakedByValidatorMap.set(e.validatorPk, (stakedByValidatorMap.get(e.validatorPk) ?? 0) + e.amount);
        }
      } else {
        const desoNanos = user?.DESOBalanceNanos ?? user?.BalanceNanos ?? 0;
        totalUnstaked += desoNanos / NANOS_PER_DESO;
      }
    }
    const desoBalance = totalUnstaked + totalStaked;
    if (desoBalance > 0) balances['DESO'] = desoBalance;

    if (meta.displayName === 'focus' && balances.Focus) {
      delete balances.Focus;
    }

    const stakedByValidator: StakedByValidator[] = Array.from(stakedByValidatorMap.entries()).map(
      ([validatorPk, amount]) => ({ validatorPk, validatorName: validatorNames.get(validatorPk), amount })
    );

    const ccv1ValueDeso = pksInGroup.reduce((s, pk) => s + (ccv1ByPk.get(pk) ?? 0), 0);

    results.push({
      name: meta.displayName,
      displayName: meta.displayName,
      classification: meta.classification,
      balances,
      usdValue: 0,
      desoStaked: totalStaked > 0 ? totalStaked : undefined,
      desoUnstaked: totalUnstaked > 0 ? totalUnstaked : undefined,
      stakedByValidator: stakedByValidator.length > 0 ? stakedByValidator : undefined,
      ccv1ValueDeso: ccv1ValueDeso > 0 ? ccv1ValueDeso : undefined,
      publicKey: pksInGroup.length === 1 ? pksInGroup[0] : undefined,
    });
  }

  // 5. CCv2 user-token AMMs: attribute pool value to accounts by creator-coin holder share
  const ccv2Amms = getCCv2UserTokenAmms(results);
  const ccv2ValueByPk = new Map<string, number>();
  for (const amm of ccv2Amms) {
    const holders = await fetchCreatorCoinHolders(amm.profileName);
    const totalNanos = [...holders.values()].reduce((s, n) => s + n, 0);
    if (totalNanos === 0) continue;
    for (const [pk, nanos] of holders) {
      const share = nanos / totalNanos;
      ccv2ValueByPk.set(pk, (ccv2ValueByPk.get(pk) ?? 0) + share * amm.usdValue);
    }
  }
  for (let i = 0; i < results.length; i++) {
    const pks = pksPerResult[i];
    const ccv2Usd = pks.reduce((s, pk) => s + (ccv2ValueByPk.get(pk) ?? 0), 0);
    if (ccv2Usd > 0) results[i].ccv2ValueUsd = ccv2Usd;
  }

  return results;
}

export { WALLET_CONFIG };

/** Map display name to username for /u/:username links */
export function getUsernameForLink(displayName: string): string {
  const config = WALLET_CONFIG.find(
    (c) => (c.displayName ?? c.username) === displayName
  );
  return config?.username ?? displayName;
}
