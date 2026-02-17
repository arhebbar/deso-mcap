#!/usr/bin/env node
/**
 * Diagnose: Which tracked accounts hold Openfund, Focus, dUSDC, dBTC, dETH, dSOL?
 * And why might DeSo Bulls show zero?
 */
const DESO_NODE = 'https://node.deso.org/api/v0';
const HODLERS_API = 'https://blockproducer.deso.org/api/v0';
const NANOS_PER_DAO = 1e18;

const WALLET_CONFIG = [
  { username: 'Gringotts_Wizarding_Bank', displayName: null },
  { username: 'FOCUS_COLD_000', displayName: null },
  { username: 'FOCUS_COLD_001', displayName: null },
  { username: 'focus', displayName: null },
  { username: 'openfund', displayName: null },
  { username: 'Deso', displayName: null },
  { username: 'AMM_DESO_24_PlAEU', displayName: null },
  { username: 'AMM_DESO_23_GrYpe', displayName: null },
  { username: 'AMM_focus_12_nzWku', displayName: null },
  { username: 'AMM_openfund_12_gOR1b', displayName: null },
  { username: 'AMM_DESO_19_W5vn0', displayName: null },
  { username: 'AMM_openfund_13_1gbih', displayName: null },
  { username: 'Whoami', displayName: null },
  { username: 'Nader', displayName: null },
  { username: 'Mossified', displayName: null },
  { username: 'LazyNina', displayName: null },
  { username: 'Randhir', displayName: 'Randhir (Me)' },
  { username: 'HighKey', displayName: 'HighKey (incl. HighKeyValidator)', mergeKey: 'HighKey' },
  { username: 'JordanLintz', displayName: 'HighKey (incl. HighKeyValidator)', mergeKey: 'HighKey' },
  { username: 'LukeLintz', displayName: 'HighKey (incl. HighKeyValidator)', mergeKey: 'HighKey' },
  { username: 'HighKeyValidator', displayName: 'HighKey (incl. HighKeyValidator)', mergeKey: 'HighKey' },
  { username: 'StarGeezer', displayName: 'StarGeezer (incl. SG_Vault, BeyondSocialValidator)', mergeKey: 'StarGeezer' },
  { username: 'SG_Vault', displayName: 'StarGeezer (incl. SG_Vault, BeyondSocialValidator)', mergeKey: 'StarGeezer' },
  { username: 'BeyondSocialValidator', displayName: 'StarGeezer (incl. SG_Vault, BeyondSocialValidator)', mergeKey: 'StarGeezer' },
  { username: 'DesocialWorld', displayName: null },
  { username: 'Edokoevoet', displayName: null },
  { username: 'Gabrielist', displayName: 'Gabrielist (incl. gabrielvault)', mergeKey: 'Gabrielist' },
  { username: 'gabrielvault', displayName: 'Gabrielist (incl. gabrielvault)', mergeKey: 'Gabrielist' },
  { username: 'RobertGraham', displayName: null },
  { username: '0xAustin', displayName: null },
  { username: '0xBen_', displayName: null },
  { username: 'Darian_Parrish', displayName: 'Darian_Parrish (incl. DariansWallet)', mergeKey: 'Darian_Parrish' },
  { username: 'DariansWallet', displayName: 'Darian_Parrish (incl. DariansWallet)', mergeKey: 'Darian_Parrish' },
  { username: 'VishalGulia', displayName: null },
  { username: 'ZeroToOne', displayName: null },
  { username: 'anku', displayName: null },
  { username: 'fllwthrvr', displayName: null },
  { username: 'PremierNS', displayName: null },
  { username: 'WhaleDShark', displayName: null },
  { username: 'Fernando_Pessoa', displayName: null },
  { username: 'SkhiBridges', displayName: null },
  { username: 'Arnoud', displayName: null },
  { username: 'TangledBrush918', displayName: 'TangledBrush918 (incl. Tangyshroom)', mergeKey: 'TangledBrush918' },
  { username: 'Tangyshroom', displayName: 'TangledBrush918 (incl. Tangyshroom)', mergeKey: 'TangledBrush918' },
  { username: 'ReihanRei', displayName: 'ReihanRei (incl. AlecsandrosRei)', mergeKey: 'ReihanRei' },
  { username: 'AlecsandrosRei', displayName: 'ReihanRei (incl. AlecsandrosRei)', mergeKey: 'ReihanRei' },
  { username: 'mcMarsh', displayName: 'mcMarsh (incl. jemarsh)', mergeKey: 'mcMarsh' },
  { username: 'mcMarshstaking', displayName: 'mcMarsh (incl. jemarsh)', mergeKey: 'mcMarsh' },
  { username: 'jemarsh', displayName: 'mcMarsh (incl. jemarsh)', mergeKey: 'mcMarsh' },
  { username: 'dennishlewis', displayName: 'dennishlewis (incl. desonocode)', mergeKey: 'dennishlewis' },
  { username: 'desonocode', displayName: 'dennishlewis (incl. desonocode)', mergeKey: 'dennishlewis' },
  { username: 'SafetyNet', displayName: 'SafetyNet', mergeKey: 'SafetyNet' },
  { username: 'SafetyNetStaking', displayName: 'SafetyNet', mergeKey: 'SafetyNet' },
  { username: 'SafetyNetFunding', displayName: 'SafetyNet', mergeKey: 'SafetyNet' },
  { username: 'SafetyNetValidator', displayName: 'SafetyNet', mergeKey: 'SafetyNet' },
  { username: 'Silto_Nascao', displayName: null },
  { username: 'carry2web', displayName: null },
  { username: 'Kaanha', displayName: null },
  { username: 'Stevonagy', displayName: null },
  { username: 'mgoff', displayName: null },
  { username: 'Ugottalovit', displayName: null },
  { username: 'DesoWomenUnite', displayName: null },
  { username: 'Nordian', displayName: null },
  { username: 'DOZ', displayName: null },
  { username: 'markvanzee', displayName: null },
  { username: 'OliBvault', displayName: null },
  { username: 'Gjoe', displayName: null },
  { username: 'Briandrever', displayName: null },
  { username: 'Pradier', displayName: null },
  { username: 'StevoNagy', displayName: null },
  { username: 'erwinwillems', displayName: null },
  { username: 'Exotica_S', displayName: null },
  { username: 'JohnDWeb3', displayName: null },
  { username: 'gawergy', displayName: null },
  { username: 'nathanwells', displayName: null },
  { username: 'bkat', displayName: null },
  { username: 'jodybossert', displayName: null },
  { username: 'JohnJardin', displayName: 'JohnJardin (incl. Capatin)', mergeKey: 'JohnJardin' },
  { username: 'Capatin', displayName: 'JohnJardin (incl. Capatin)', mergeKey: 'JohnJardin' },
  { username: 'degen_doge', displayName: null },
  { username: 'kuririn', displayName: null },
  { username: 'fisnikee', displayName: null },
  { username: 'GoldBerry', displayName: 'GoldBerry (incl. GoldberryWal)', mergeKey: 'GoldBerry' },
  { username: 'GoldberryWal', displayName: 'GoldBerry (incl. GoldberryWal)', mergeKey: 'GoldBerry' },
  { username: 'ryleesnet', displayName: 'ryleesnet (incl. rylee19, ryleesnetvalidator)', mergeKey: 'ryleesnet' },
  { username: 'rylee19', displayName: 'ryleesnet (incl. rylee19, ryleesnetvalidator)', mergeKey: 'ryleesnet' },
  { username: 'ryleesnetvalidator', displayName: 'ryleesnet (incl. rylee19, ryleesnetvalidator)', mergeKey: 'ryleesnet' },
  { username: 'ChaseSteely', displayName: null },
  { username: 'CompDec', displayName: null },
  { username: 'RajLahoti', displayName: null },
  { username: 'StubbornDad', displayName: null },
  { username: 'TheBitcloutDog', displayName: null },
  { username: 'SharkGang', displayName: 'SharkGang (incl. Metaphilosopher, SharkToken, SharkBank, SharkCoin)', mergeKey: 'SharkGang' },
  { username: 'Metaphilosopher', displayName: 'SharkGang (incl. Metaphilosopher, SharkToken, SharkBank, SharkCoin)', mergeKey: 'SharkGang' },
  { username: 'SharkToken', displayName: 'SharkGang (incl. Metaphilosopher, SharkToken, SharkBank, SharkCoin)', mergeKey: 'SharkGang' },
  { username: 'SharkBank', displayName: 'SharkGang (incl. Metaphilosopher, SharkToken, SharkBank, SharkCoin)', mergeKey: 'SharkGang' },
  { username: 'SharkCoin', displayName: 'SharkGang (incl. Metaphilosopher, SharkToken, SharkBank, SharkCoin)', mergeKey: 'SharkGang' },
  { username: 'Degen_doge', displayName: null },
  { username: 'PaulyHart', displayName: null },
  { username: 'Mher', displayName: null },
  { username: 'vampirecampfire', displayName: null },
];

const TOKENS = [
  { username: 'openfund', tokenName: 'Openfund' },
  { username: 'focus', tokenName: 'Focus' },
  { username: 'dUSDC_', tokenName: 'dUSDC' },
  { username: 'dBTC', tokenName: 'dBTC' },
  { username: 'dETH', tokenName: 'dETH' },
  { username: 'dSOL', tokenName: 'dSOL' },
];

function parseDaoBalance(entry) {
  if (entry.BalanceNanosUint256) {
    const hex = entry.BalanceNanosUint256.replace(/^0x/, '');
    return Number(BigInt('0x' + hex)) / NANOS_PER_DAO;
  }
  return (entry.BalanceNanos ?? 0) / NANOS_PER_DAO;
}

async function fetchHodlers(tokenUsername, maxPages = 20) {
  const out = new Map();
  let lastKey = '';
  for (let p = 0; p < maxPages; p++) {
    const res = await fetch(`${HODLERS_API}/get-hodlers-for-public-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Username: tokenUsername,
        LastPublicKeyBase58Check: lastKey,
        NumToFetch: 200,
        IsDAOCoin: true,
      }),
    });
    if (!res.ok) break;
    const data = await res.json();
    const hodlers = data?.Hodlers ?? [];
    for (const h of hodlers) {
      const pk = h.HODLerPublicKeyBase58Check;
      if (pk) {
        const amt = parseDaoBalance(h);
        if (amt > 0) out.set(pk, (out.get(pk) ?? 0) + amt);
      }
    }
    lastKey = data?.LastPublicKeyBase58Check ?? '';
    if (hodlers.length < 200 || !lastKey) break;
  }
  return out;
}

async function main() {
  console.log('1. Resolving public keys for all tracked accounts...\n');
  const usernameToPk = new Map();
  for (const c of WALLET_CONFIG) {
    try {
      const res = await fetch(`${DESO_NODE}/get-single-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Username: c.username }),
      });
      const data = await res.json();
      const pk = data?.Profile?.PublicKeyBase58Check;
      if (pk) usernameToPk.set(c.displayName || c.username, pk);
    } catch (e) {
      console.log('  Failed:', c.username, e.message);
    }
  }
  console.log('  Resolved', usernameToPk.size, 'accounts\n');

  console.log('2. Fetching hodlers for each token (first 20 pages each)...\n');
  const pkToHoldings = new Map(); // pk -> { Openfund: amt, Focus: amt, ... }
  for (const { username, tokenName } of TOKENS) {
    process.stdout.write(`   ${tokenName}... `);
    const holders = await fetchHodlers(username);
    console.log(holders.size, 'holders');
    for (const [pk, amt] of holders) {
      let m = pkToHoldings.get(pk);
      if (!m) {
        m = {};
        pkToHoldings.set(pk, m);
      }
      m[tokenName] = amt;
    }
  }

  console.log('\n3. Which tracked accounts hold which tokens?\n');
  const tokens = ['Openfund', 'Focus', 'dUSDC', 'dBTC', 'dETH', 'dSOL'];
  for (const [displayName, pk] of usernameToPk) {
    const holdings = pkToHoldings.get(pk) ?? {};
    const hasAny = tokens.some((t) => (holdings[t] ?? 0) > 0);
    if (hasAny) {
      const parts = tokens.map((t) => {
        const a = holdings[t] ?? 0;
        return a > 0 ? `${t}:${a >= 1000 ? (a / 1000).toFixed(1) + 'K' : a.toFixed(0)}` : null;
      }).filter(Boolean);
      console.log('  ', displayName.padEnd(25), parts.join(' | '));
    }
  }

  console.log('\n4. DeSo Bulls specifically:');
  const desoBulls = ['Randhir (Me)', 'HighKey (incl. HighKeyValidator)', 'StarGeezer (incl. SG_Vault, BeyondSocialValidator)', 'DesocialWorld', 'Edokoevoet', 'Gabrielist (incl. gabrielvault)', 'RobertGraham', '0xAustin', '0xBen_', 'Darian_Parrish (incl. DariansWallet)', 'VishalGulia', 'ZeroToOne', 'anku', 'fllwthrvr', 'PremierNS', 'WhaleDShark', 'Fernando_Pessoa', 'SkhiBridges', 'Arnoud', 'Silto_Nascao', 'mcMarsh (incl. jemarsh)', 'carry2web', 'Kaanha', 'Stevonagy', 'dennishlewis (incl. desonocode)', 'SafetyNet', 'TangledBrush918 (incl. Tangyshroom)', 'ReihanRei (incl. AlecsandrosRei)', 'mgoff', 'Ugottalovit', 'DesoWomenUnite', 'Nordian', 'DOZ', 'markvanzee', 'OliBvault', 'Gjoe', 'Briandrever', 'Pradier', 'StevoNagy', 'erwinwillems', 'Exotica_S', 'JohnDWeb3', 'gawergy', 'nathanwells', 'bkat', 'jodybossert', 'JohnJardin (incl. Capatin)', 'degen_doge', 'Degen_doge', 'kuririn', 'fisnikee', 'GoldBerry (incl. GoldberryWal)', 'ryleesnet (incl. rylee19, ryleesnetvalidator)', 'ChaseSteely', 'CompDec', 'RajLahoti', 'StubbornDad', 'TheBitcloutDog', 'SharkGang (incl. Metaphilosopher, SharkToken, SharkBank, SharkCoin)', 'PaulyHart', 'Mher', 'vampirecampfire'];
  for (const name of desoBulls) {
    const pk = usernameToPk.get(name);
    if (!pk) {
      console.log('  ', name, '- NO PROFILE (pk not resolved)');
      continue;
    }
    const holdings = pkToHoldings.get(pk) ?? {};
    const parts = tokens.map((t) => {
      const a = holdings[t] ?? 0;
      return a > 0 ? `${t}:${a >= 1000 ? (a / 1000).toFixed(1) + 'K' : a.toFixed(0)}` : null;
    }).filter(Boolean);
    console.log('  ', name.padEnd(20), parts.length ? parts.join(' | ') : 'NONE (zero in first 20 pages)');
  }
}

main().catch(console.error);
