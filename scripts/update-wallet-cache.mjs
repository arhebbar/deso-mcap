#!/usr/bin/env node
/**
 * One-time script: fetch staked DESO + full wallet data for all app accounts,
 * then write cache JSON. Run in browser console on the app to apply.
 *
 * Usage: node scripts/update-wallet-cache.mjs
 * Output: scripts/wallet-cache.json + instructions for browser console
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DESO_NODE = 'https://node.deso.org/api/v0';
const HODLERS_API = 'https://blockproducer.deso.org/api/v0';
const NANOS_PER_DESO = 1e9;
const NANOS_PER_DAO_COIN = 1e18;

const WALLET_CONFIG = [
  { username: 'Gringotts_Wizarding_Bank', classification: 'FOUNDATION' },
  { username: 'FOCUS_COLD_000', classification: 'FOUNDATION' },
  { username: 'FOCUS_COLD_001', classification: 'FOUNDATION' },
  { username: 'focus', classification: 'FOUNDATION' },
  { username: 'openfund', classification: 'FOUNDATION' },
  { username: 'Deso', classification: 'FOUNDATION' },
  { username: 'AMM_DESO_24_PlAEU', classification: 'AMM' },
  { username: 'AMM_DESO_23_GrYpe', classification: 'AMM' },
  { username: 'AMM_focus_12_nzWku', classification: 'AMM' },
  { username: 'AMM_openfund_12_gOR1b', classification: 'AMM' },
  { username: 'AMM_DESO_19_W5vn0', classification: 'AMM' },
  { username: 'AMM_openfund_13_1gbih', classification: 'AMM' },
  { username: 'Whoami', classification: 'FOUNDER' },
  { username: 'Nader', classification: 'FOUNDER' },
  { username: 'Mossified', classification: 'FOUNDER' },
  { username: 'LazyNina', classification: 'FOUNDER' },
  { username: 'Jacobvan_', classification: 'FOUNDER' },
  { username: 'Ashdigital', classification: 'FOUNDER' },
  { username: 'Wintercounter', classification: 'FOUNDER' },
  { username: 'maebeam', classification: 'FOUNDER' },
  { username: 'redpartyhat', classification: 'FOUNDER' },
  { username: 'bluepartyhat', classification: 'FOUNDER' },
  { username: 'FastFreddie', classification: 'FOUNDER' },
  { username: 'JacksonDean', classification: 'FOUNDER' },
  { username: 'TyFischer', classification: 'FOUNDER' },
  { username: 'happy_penguin', classification: 'FOUNDER' },
  { username: 'Randhir', displayName: 'Randhir (Me)', classification: 'DESO_BULL' },
  { username: 'HighKey', classification: 'DESO_BULL', mergeKey: 'HighKey' },
  { username: 'JordanLintz', classification: 'DESO_BULL', mergeKey: 'HighKey' },
  { username: 'LukeLintz', classification: 'DESO_BULL', mergeKey: 'HighKey' },
  { username: 'HighKeyValidator', classification: 'DESO_BULL', mergeKey: 'HighKey' },
  { username: 'StarGeezer', classification: 'DESO_BULL', mergeKey: 'StarGeezer' },
  { username: 'SG_Vault', classification: 'DESO_BULL', mergeKey: 'StarGeezer' },
  { username: 'BeyondSocialValidator', classification: 'DESO_BULL', mergeKey: 'StarGeezer' },
  { username: 'DesocialWorld', classification: 'DESO_BULL' },
  { username: 'Edokoevoet', classification: 'DESO_BULL' },
  { username: 'Gabrielist', classification: 'DESO_BULL', mergeKey: 'Gabrielist' },
  { username: 'gabrielvault', classification: 'DESO_BULL', mergeKey: 'Gabrielist' },
  { username: 'RobertGraham', classification: 'DESO_BULL' },
  { username: '0xAustin', classification: 'DESO_BULL' },
  { username: '0xBen_', classification: 'DESO_BULL' },
  { username: 'Darian_Parrish', classification: 'DESO_BULL', mergeKey: 'Darian_Parrish' },
  { username: 'DariansWallet', classification: 'DESO_BULL', mergeKey: 'Darian_Parrish' },
  { username: 'VishalGulia', classification: 'DESO_BULL' },
  { username: 'ZeroToOne', classification: 'DESO_BULL' },
  { username: 'anku', classification: 'DESO_BULL' },
  { username: 'fllwthrvr', classification: 'DESO_BULL' },
  { username: 'PremierNS', classification: 'DESO_BULL' },
  { username: 'WhaleDShark', classification: 'DESO_BULL' },
  { username: 'Fernando_Pessoa', classification: 'DESO_BULL' },
  { username: 'SkhiBridges', classification: 'DESO_BULL' },
  { username: 'Arnoud', classification: 'DESO_BULL' },
  { username: 'TangledBrush918', classification: 'DESO_BULL', mergeKey: 'TangledBrush918' },
  { username: 'Tangyshroom', classification: 'DESO_BULL', mergeKey: 'TangledBrush918' },
  { username: 'ReihanRei', classification: 'DESO_BULL', mergeKey: 'ReihanRei' },
  { username: 'AlecsandrosRei', classification: 'DESO_BULL', mergeKey: 'ReihanRei' },
  { username: 'mcMarsh', classification: 'DESO_BULL', mergeKey: 'mcMarsh' },
  { username: 'mcMarshstaking', classification: 'DESO_BULL', mergeKey: 'mcMarsh' },
  { username: 'jemarsh', classification: 'DESO_BULL', mergeKey: 'mcMarsh' },
  { username: 'dennishlewis', classification: 'DESO_BULL', mergeKey: 'dennishlewis' },
  { username: 'desonocode', classification: 'DESO_BULL', mergeKey: 'dennishlewis' },
  { username: 'SafetyNet', classification: 'DESO_BULL', mergeKey: 'SafetyNet' },
  { username: 'SafetyNetStaking', classification: 'DESO_BULL', mergeKey: 'SafetyNet' },
  { username: 'SafetyNetFunding', classification: 'DESO_BULL', mergeKey: 'SafetyNet' },
  { username: 'SafetyNetValidator', classification: 'DESO_BULL', mergeKey: 'SafetyNet' },
  { username: 'Silto_Nascao', classification: 'DESO_BULL' },
  { username: 'carry2web', classification: 'DESO_BULL' },
  { username: 'Kaanha', classification: 'DESO_BULL' },
  { username: 'Stevonagy', classification: 'DESO_BULL' },
  { username: 'mgoff', classification: 'DESO_BULL' },
  { username: 'Ugottalovit', classification: 'DESO_BULL' },
  { username: 'DesoWomenUnite', classification: 'DESO_BULL' },
  { username: 'Nordian', classification: 'DESO_BULL' },
  { username: 'DOZ', classification: 'DESO_BULL' },
  { username: 'markvanzee', classification: 'DESO_BULL' },
  { username: 'OliBvault', classification: 'DESO_BULL' },
  { username: 'Gjoe', classification: 'DESO_BULL' },
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
  { username: 'JohnJardin', classification: 'DESO_BULL', mergeKey: 'JohnJardin' },
  { username: 'Capatin', classification: 'DESO_BULL', mergeKey: 'JohnJardin' },
  { username: 'degen_doge', classification: 'DESO_BULL' },
  { username: 'kuririn', classification: 'DESO_BULL' },
  { username: 'fisnikee', classification: 'DESO_BULL' },
  { username: 'GoldBerry', classification: 'DESO_BULL', mergeKey: 'GoldBerry' },
  { username: 'GoldberryWal', classification: 'DESO_BULL', mergeKey: 'GoldBerry' },
  { username: 'ryleesnet', classification: 'DESO_BULL', mergeKey: 'ryleesnet' },
  { username: 'rylee19', classification: 'DESO_BULL', mergeKey: 'ryleesnet' },
  { username: 'ryleesnetvalidator', classification: 'DESO_BULL', mergeKey: 'ryleesnet' },
  { username: 'ChaseSteely', classification: 'DESO_BULL' },
  { username: 'CompDec', classification: 'DESO_BULL' },
  { username: 'RajLahoti', classification: 'DESO_BULL' },
  { username: 'StubbornDad', classification: 'DESO_BULL' },
  { username: 'TheBitcloutDog', classification: 'DESO_BULL' },
  { username: 'SharkGang', classification: 'DESO_BULL', mergeKey: 'SharkGang' },
  { username: 'Metaphilosopher', classification: 'DESO_BULL', mergeKey: 'SharkGang' },
  { username: 'SharkToken', classification: 'DESO_BULL', mergeKey: 'SharkGang' },
  { username: 'SharkBank', classification: 'DESO_BULL', mergeKey: 'SharkGang' },
  { username: 'SharkCoin', classification: 'DESO_BULL', mergeKey: 'SharkGang' },
  { username: 'Degen_doge', classification: 'DESO_BULL' },
  { username: 'PaulyHart', classification: 'DESO_BULL' },
  { username: 'Mher', classification: 'DESO_BULL' },
  { username: 'vampirecampfire', classification: 'DESO_BULL' },
];

const TOKEN_USERNAMES = [
  { username: 'openfund', tokenName: 'Openfund' },
  { username: 'focus', tokenName: 'Focus' },
  { username: 'dUSDC_', tokenName: 'dUSDC' },
  { username: 'dBTC', tokenName: 'dBTC' },
  { username: 'dETH', tokenName: 'dETH' },
  { username: 'dSOL', tokenName: 'dSOL' },
];

const MIN_HOLDING_USD = 10;
const HODLERS_PAGE_SIZE = 200;
const TOKEN_PRICE_USD = {
  Openfund: 0.087,
  Focus: 0.00034,
  dUSDC: 1,
  dBTC: 97_400,
  dETH: 2_640,
  dSOL: 196,
};

async function desoPost(base, endpoint, body) {
  const res = await fetch(`${base}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${endpoint}: ${res.status}`);
  return res.json();
}

function parseDaoBalance(entry) {
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    return Number(BigInt('0x' + hex)) / NANOS_PER_DAO_COIN;
  }
  if (entry.BalanceNanos != null) return entry.BalanceNanos / NANOS_PER_DAO_COIN;
  return 0;
}

async function fetchTokenHolders(tokenUsername, tokenName) {
  const out = new Map();
  const priceUsd = TOKEN_PRICE_USD[tokenName] ?? 0;
  try {
    let lastKey = '';
    for (;;) {
      const data = await desoPost(HODLERS_API, '/get-hodlers-for-public-key', {
        Username: tokenUsername,
        LastPublicKeyBase58Check: lastKey,
        NumToFetch: HODLERS_PAGE_SIZE,
        FetchAll: false,
        IsDAOCoin: true,
      });
      const hodlers = data?.Hodlers ?? [];
      const withBalance = hodlers
        .filter((h) => h.HODLerPublicKeyBase58Check)
        .map((h) => ({ h, amt: parseDaoBalance(h) }))
        .filter((x) => x.amt > 0)
        .sort((a, b) => b.amt - a.amt);
      for (const { h, amt } of withBalance) {
        const pk = h.HODLerPublicKeyBase58Check;
        out.set(pk, (out.get(pk) ?? 0) + amt);
      }
      const minBalanceInPage = withBalance.length ? withBalance[withBalance.length - 1].amt : Infinity;
      lastKey = data?.LastPublicKeyBase58Check ?? '';
      const minUsd = priceUsd > 0 && minBalanceInPage !== Infinity ? minBalanceInPage * priceUsd : Infinity;
      if (hodlers.length < HODLERS_PAGE_SIZE || !lastKey || minUsd < MIN_HOLDING_USD) break;
    }
  } catch (e) {
    console.warn(`Token ${tokenName}:`, e.message);
  }
  return out;
}

async function fetchStakedByPublicKey(publicKeys) {
  const stakedByPk = new Map();
  const BATCH = 5;
  for (let i = 0; i < publicKeys.length; i += BATCH) {
    const batch = publicKeys.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (pk) => {
        try {
          const data = await desoPost(DESO_NODE, '/get-stake-entries-for-public-key', {
            PublicKeyBase58Check: pk,
          });
          const staked = (data?.StakeEntries ?? []).reduce(
            (sum, e) => sum + (e.StakeNanos ?? 0),
            0
          );
          return { pk, staked: staked / NANOS_PER_DESO };
        } catch {
          return { pk, staked: 0 };
        }
      })
    );
    for (const { pk, staked } of results) {
      if (staked > 0) stakedByPk.set(pk, staked);
    }
  }
  return stakedByPk;
}

async function runBatched(items, batchSize, fn) {
  const results = new Map();
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(fn));
    for (let j = 0; j < batch.length; j++) {
      const r = settled[j];
      if (r.status === 'fulfilled' && r.value !== undefined) results.set(batch[j], r.value);
    }
  }
  return results;
}

async function main() {
  console.log('Fetching profiles...');
  const profileResults = await runBatched(WALLET_CONFIG, 5, async (config) => {
    try {
      const res = await desoPost(DESO_NODE, '/get-single-profile', { Username: config.username });
      const pk = res?.Profile?.PublicKeyBase58Check;
      if (pk) return { pk, config };
    } catch {}
    return undefined;
  });

  const trackedByPk = new Map();
  for (const v of profileResults.values()) {
    if (v?.pk && v?.config) {
      trackedByPk.set(v.pk, {
        displayName: v.config.displayName ?? v.config.username,
        classification: v.config.classification,
      });
    }
  }
  const publicKeys = Array.from(trackedByPk.keys());
  console.log(`Resolved ${publicKeys.length} accounts`);

  console.log('Fetching token holders...');
  const tokenHoldingsByPk = new Map();
  for (const { username, tokenName } of TOKEN_USERNAMES) {
    const holders = await fetchTokenHolders(username, tokenName);
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

  console.log('Fetching DESO balances + staked...');
  let usersList = [];
  try {
    const usersRes = await desoPost(DESO_NODE, '/get-users-stateless', {
      PublicKeysBase58Check: publicKeys,
      SkipForLeaderboard: false,
      IncludeBalance: true,
    });
    usersList = usersRes?.UserList ?? [];
  } catch (e) {
    console.warn('get-users-stateless:', e.message);
  }

  const stakedByPk = await fetchStakedByPublicKey(publicKeys);

  const stakeByPk = new Map();
  for (const pk of publicKeys) {
    const user = usersList.find((u) => u.PublicKeyBase58Check === pk);
    const balanceNanos = user?.BalanceNanos ?? 0;
    const desoBalanceNanos = user?.DESOBalanceNanos ?? balanceNanos;
    const lockedNanos = user?.LockedBalanceNanos;
    const spendable = desoBalanceNanos / NANOS_PER_DESO;
    let staked = stakedByPk.get(pk) ?? 0;
    if (staked === 0 && lockedNanos != null) {
      staked = lockedNanos / NANOS_PER_DESO;
    } else if (staked === 0 && balanceNanos > 0 && desoBalanceNanos < balanceNanos) {
      staked = (balanceNanos - desoBalanceNanos) / NANOS_PER_DESO;
    }
    stakeByPk.set(pk, { unstaked: spendable, staked });
  }

  const results = [];
  for (const pk of publicKeys) {
    const meta = trackedByPk.get(pk);
    const balances = {};
    const tokenMap = tokenHoldingsByPk.get(pk);
    if (tokenMap) {
      for (const [token, amt] of tokenMap) {
        if (amt > 0) balances[token] = amt;
      }
    }
    const stakeData = stakeByPk.get(pk);
    const user = usersList.find((u) => u.PublicKeyBase58Check === pk);
    let desoBalance;
    if (stakeData) {
      desoBalance = stakeData.unstaked + stakeData.staked;
    } else {
      desoBalance = (user?.DESOBalanceNanos ?? user?.BalanceNanos ?? 0) / NANOS_PER_DESO;
    }
    if (desoBalance > 0) balances['DESO'] = desoBalance;
    if (meta.displayName === 'focus' && balances.Focus) delete balances.Focus;

    results.push({
      name: meta.displayName,
      classification: meta.classification,
      balances,
      usdValue: 0,
      desoStaked: stakeData?.staked,
      desoUnstaked: stakeData?.unstaked,
    });
  }

  const CACHE_VERSION = 9;
  const cache = {
    data: results,
    timestamp: Date.now(),
    version: CACHE_VERSION,
  };

  const outPath = join(__dirname, 'wallet-cache.json');
  writeFileSync(outPath, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`\nWrote ${outPath}`);

  const totalStaked = results.reduce((s, r) => s + (r.desoStaked ?? 0), 0);
  const withStaked = results.filter((r) => (r.desoStaked ?? 0) > 0);
  console.log(`\nStaked DESO: ${totalStaked.toFixed(2)} total across ${withStaked.length} accounts`);
  for (const w of withStaked) {
    console.log(`  ${w.name}: ${(w.desoStaked ?? 0).toFixed(2)} staked`);
  }

  console.log(`
To update the cache in the app:
1. Open https://deso-mcap.vercel.app (or your local dev server)
2. Open DevTools (F12) → Console
3. Copy the contents of scripts/wallet-cache.json, then run:
   const cache = <paste the JSON>;
   localStorage.setItem('deso-wallet-cache', JSON.stringify(cache));
   location.reload();
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
