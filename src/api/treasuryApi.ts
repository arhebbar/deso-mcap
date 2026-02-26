/**
 * Fetches external treasury balances from blockchain APIs.
 * BTC: mempool.space, ETH: public RPC + ERC20 (USDC, USDT), SOL: Solana RPC + SPL (USDC)
 */

/** Use direct URLs in dev; Vercel rewrites in prod to avoid CORS */
const MEMPOOL_BASE = import.meta.env.DEV ? 'https://mempool.space/api' : '/api/mempool';
const ETH_RPC = import.meta.env.DEV ? 'https://eth.llamarpc.com' : '/api/eth-rpc';
const SOL_RPC = import.meta.env.DEV ? 'https://api.mainnet-beta.solana.com' : '/api/sol-rpc';
const SATOSHI_PER_BTC = 1e8;
const WEI_PER_ETH = 1e18;
const LAMPORTS_PER_SOL = 1e9;
const USDC_DECIMALS = 6;
const USDC_SPL_DECIMALS = 6;

const USDC_ETH = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ETH = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_SOL_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

interface AddressConfig {
  chain: 'BTC' | 'ETH' | 'SOL';
  address: string;
  name: string;
  isAmm: boolean;
}

const ADDRESS_CONFIGS: AddressConfig[] = [
  { chain: 'BTC', address: '1PuXkbwqqwzEYo9SPGyAihAge3e9Lc71b', name: 'Cold Wallet (Foundation)', isAmm: false },
  { chain: 'BTC', address: 'bc1q9hzvw580rwjf5uvqenjjslvu7nytlkskq75gj5', name: 'Cold Wallet (AMM)', isAmm: true },
  { chain: 'BTC', address: '1ARhoSeAjs8acMT7wxgKTzpST3Yyd2oizd', name: 'Hot Wallet (AMM)', isAmm: true },
  { chain: 'ETH', address: '0x27935b18C9CeE83E07afFC3032d8524E079c201e', name: 'Hot Wallet', isAmm: false },
  { chain: 'ETH', address: '0x9Fc97be2e0E44aC2c65742e1F2f4a8F8baBD56E6', name: 'Cold Wallet', isAmm: false },
  { chain: 'SOL', address: 'Gn7DKXMuopjmSfRyV5PAMxQPhodzVyLEFLpiPm6tcdbk', name: 'Hot Wallet (AMM)', isAmm: true },
];

const ETH_FALLBACK: Record<string, { eth: number; usdc: number; usdt: number }> = {
  '0x27935b18C9CeE83E07afFC3032d8524E079c201e': { eth: 9.5, usdc: 50000, usdt: 25000 },
  '0x9Fc97be2e0E44aC2c65742e1F2f4a8F8baBD56E6': { eth: 0.76, usdc: 16000, usdt: 100 },
};
const SOL_FALLBACK: Record<string, { sol: number; usdc: number }> = {
  'Gn7DKXMuopjmSfRyV5PAMxQPhodzVyLEFLpiPm6tcdbk': { sol: 0, usdc: 15600 },
};

const BTC_FALLBACK: Record<string, number> = {
  '1PuXkbwqqwzEYo9SPGyAihAge3e9Lc71b': 2100,
  'bc1q9hzvw580rwjf5uvqenjjslvu7nytlkskq75gj5': 0,
  '1ARhoSeAjs8acMT7wxgKTzpST3Yyd2oizd': 0,
};

export interface TreasuryBalances {
  btcSatoshis: number;
  btcAmount: number;
  ethWei: string;
  ethAmount: number;
  solLamports: number;
  solAmount: number;
}

export interface TreasuryAddressRow {
  chain: 'BTC' | 'ETH' | 'SOL';
  address: string;
  name: string;
  isAmm: boolean;
  holdings: Record<string, number>;
  usdValue: number;
}

/** Static fallback when API fails (CORS, network, etc.) */
export const STATIC_TREASURY_ADDRESSES: TreasuryAddressRow[] = ADDRESS_CONFIGS.map((c) => {
  const holdings: Record<string, number> = {};
  if (c.chain === 'BTC') {
    holdings['BTC'] = BTC_FALLBACK[c.address] ?? 0;
  } else if (c.chain === 'ETH') {
    const fb = ETH_FALLBACK[c.address];
    if (fb) {
      holdings['ETH'] = fb.eth;
      holdings['USDC'] = fb.usdc;
      holdings['USDT'] = fb.usdt;
    }
  } else if (c.chain === 'SOL') {
    const fb = SOL_FALLBACK[c.address];
    if (fb) {
      holdings['SOL'] = fb.sol;
      holdings['USDC'] = fb.usdc;
    }
  }
  return { chain: c.chain, address: c.address, name: c.name, isAmm: c.isAmm, holdings, usdValue: 0 };
});

const BTC_ADDRESSES = ADDRESS_CONFIGS.filter((c) => c.chain === 'BTC').map((c) => c.address);
const ETH_ADDRESSES = ADDRESS_CONFIGS.filter((c) => c.chain === 'ETH').map((c) => c.address);

async function fetchBtcBalance(): Promise<number> {
  let totalSatoshis = 0;
  for (const addr of BTC_ADDRESSES) {
    try {
      const res = await fetch(`${MEMPOOL_BASE}/address/${addr}`);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
      };
      const funded = data.chain_stats?.funded_txo_sum ?? 0;
      const spent = data.chain_stats?.spent_txo_sum ?? 0;
      totalSatoshis += funded - spent;
    } catch {
      // leave as 0 for failed address
    }
  }
  return totalSatoshis;
}

async function fetchEthBalance(): Promise<{ wei: string; amount: number }> {
  let totalWei = BigInt(0);
  for (const addr of ETH_ADDRESSES) {
    try {
      const res = await fetch(ETH_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [addr, 'latest'],
          id: 1,
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { result?: string };
      const hex = data.result ?? '0x0';
      totalWei += BigInt(hex);
    } catch {
      // leave as 0 for failed address
    }
  }
  const amount = Number(totalWei) / WEI_PER_ETH;
  return { wei: totalWei.toString(), amount };
}

async function fetchSolBalance(): Promise<{ lamports: number; amount: number }> {
  const solAddrs = ADDRESS_CONFIGS.filter((c) => c.chain === 'SOL').map((c) => c.address);
  let totalLamports = 0;
  for (const addr of solAddrs) {
    try {
      const res = await fetch(SOL_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getBalance',
          params: [addr],
          id: 1,
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { result?: { value?: number } };
      totalLamports += data.result?.value ?? 0;
    } catch {
      // leave as 0
    }
  }
  return { lamports: totalLamports, amount: totalLamports / LAMPORTS_PER_SOL };
}

export async function fetchTreasuryBalances(): Promise<TreasuryBalances> {
  const [btcSatoshis, ethResult, solResult] = await Promise.all([
    fetchBtcBalance(),
    fetchEthBalance(),
    fetchSolBalance(),
  ]);

  return {
    btcSatoshis,
    btcAmount: btcSatoshis / SATOSHI_PER_BTC,
    ethWei: ethResult.wei,
    ethAmount: ethResult.amount,
    solLamports: solResult.lamports,
    solAmount: solResult.amount,
  };
}

async function fetchBtcBalanceForAddress(addr: string): Promise<number> {
  try {
    const res = await fetch(`${MEMPOOL_BASE}/address/${addr}`);
    if (!res.ok) return 0;
    const data = (await res.json()) as {
      chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
    };
    const funded = data.chain_stats?.funded_txo_sum ?? 0;
    const spent = data.chain_stats?.spent_txo_sum ?? 0;
    return funded - spent;
  } catch {
    return 0;
  }
}

async function fetchEthBalanceForAddress(addr: string): Promise<number> {
  try {
    const res = await fetch(ETH_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [addr, 'latest'],
        id: 1,
      }),
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { result?: string };
    const hex = data.result ?? '0x0';
    return Number(BigInt(hex)) / WEI_PER_ETH;
  } catch {
    return 0;
  }
}

async function fetchErc20Balance(addr: string, tokenAddr: string, decimals: number): Promise<number> {
  try {
    const res = await fetch(ETH_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          { to: tokenAddr, data: '0x70a08231' + addr.replace(/^0x/, '').toLowerCase().padStart(64, '0') },
          'latest',
        ],
        id: 1,
      }),
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { result?: string };
    const hex = data.result ?? '0x0';
    return Number(BigInt(hex)) / 10 ** decimals;
  } catch {
    return 0;
  }
}

async function fetchSolUsdcBalance(addr: string): Promise<number> {
  try {
    const res = await fetch(SOL_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'getTokenAccountsByOwner',
        params: [
          addr,
          { mint: USDC_SOL_MINT },
          { encoding: 'jsonParsed' },
        ],
        id: 1,
      }),
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { result?: { value?: Array<{ account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmount?: number } } } } } }> } };
    const accounts = data.result?.value ?? [];
    let total = 0;
    for (const acc of accounts) {
      total += acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Fetches per-address treasury balances for BTC, ETH, and SOL.
 */
export async function fetchTreasuryBalancesPerAddress(): Promise<TreasuryAddressRow[]> {
  const rows: TreasuryAddressRow[] = [];

  for (const config of ADDRESS_CONFIGS) {
    const holdings: Record<string, number> = {};
    let usdValue = 0;

    if (config.chain === 'BTC') {
      const satoshis = await fetchBtcBalanceForAddress(config.address);
      const btc = satoshis / SATOSHI_PER_BTC;
      const fallback = BTC_FALLBACK[config.address];
      holdings['BTC'] = btc > 0 ? btc : fallback ?? 0;
      usdValue = 0;
    } else if (config.chain === 'ETH') {
      const [eth, usdc, usdt] = await Promise.all([
        fetchEthBalanceForAddress(config.address),
        fetchErc20Balance(config.address, USDC_ETH, USDC_DECIMALS),
        fetchErc20Balance(config.address, USDT_ETH, USDC_DECIMALS),
      ]);
      const fallback = ETH_FALLBACK[config.address];
      holdings['ETH'] = eth > 0 ? eth : fallback?.eth ?? 0;
      holdings['USDC'] = usdc > 0 ? usdc : fallback?.usdc ?? 0;
      holdings['USDT'] = usdt > 0 ? usdt : fallback?.usdt ?? 0;
      usdValue = 0;
    } else if (config.chain === 'SOL') {
      const [solRes, usdc] = await Promise.all([
        fetch(SOL_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'getBalance',
            params: [config.address],
            id: 1,
          }),
        }).then((r) => r.json() as Promise<{ result?: { value?: number } }>),
        fetchSolUsdcBalance(config.address),
      ]);
      const sol = (solRes.result?.value ?? 0) / LAMPORTS_PER_SOL;
      const fallback = SOL_FALLBACK[config.address];
      holdings['SOL'] = sol > 0 ? sol : fallback?.sol ?? 0;
      holdings['USDC'] = usdc > 0 ? usdc : fallback?.usdc ?? 0;
      usdValue = 0;
    }

    rows.push({
      chain: config.chain,
      address: config.address,
      name: config.name,
      isAmm: config.isAmm,
      holdings,
      usdValue,
    });
  }

  return rows;
}

/** Tx from mempool address txs/chain */
interface MempoolTx {
  txid: string;
  vin?: Array<{ prevout?: { value: number; scriptpubkey_address?: string } }>;
  vout?: Array<{ value: number; scriptpubkey_address?: string }>;
  status?: { block_time?: number };
}

/**
 * Fetches historical BTC holdings by replaying full transaction history.
 * Returns Map<date YYYY-MM-DD, btcAmount> for each date in the range.
 * Fetches all txs (paginate until done), replays from genesis to get correct cumulative balances.
 */
export async function fetchBtcHistoricalHoldings(
  days: number
): Promise<Map<string, number>> {
  const addr = BTC_ADDRESSES[0] ?? '';
  if (!addr) return new Map();

  const allTxs: MempoolTx[] = [];
  let lastTxid: string | null = null;
  const maxPages = 200;

  try {
    for (let i = 0; i < maxPages; i++) {
      const url = lastTxid
        ? `${MEMPOOL_BASE}/address/${addr}/txs/chain?last_txid=${lastTxid}`
        : `${MEMPOOL_BASE}/address/${addr}/txs/chain`;
      const res = await fetch(url);
      if (!res.ok) break;
      const txs = (await res.json()) as MempoolTx[];
      if (txs.length === 0) break;
      allTxs.push(...txs);
      lastTxid = txs[txs.length - 1]?.txid ?? null;
      if (txs.length < 25) break;
    }

    const sortedTxs = [...allTxs].sort(
      (a, b) => (a.status?.block_time ?? 0) - (b.status?.block_time ?? 0)
    );

    let balanceSatoshis = 0;
    const events: { date: string; balance: number }[] = [];

    for (const tx of sortedTxs) {
      let received = 0;
      let spent = 0;
      for (const v of tx.vout ?? []) {
        if (v.scriptpubkey_address === addr) received += v.value;
      }
      for (const v of tx.vin ?? []) {
        const prev = v.prevout;
        if (prev?.scriptpubkey_address === addr) spent += prev.value;
      }
      balanceSatoshis += received - spent;
      const blockTime = tx.status?.block_time;
      if (blockTime) {
        const date = new Date(blockTime * 1000).toISOString().split('T')[0];
        events.push({ date, balance: balanceSatoshis / SATOSHI_PER_BTC });
      }
    }

    const currentBtc = await fetchBtcBalance().catch(() => 0);
    const currentAmount = currentBtc / SATOSHI_PER_BTC;

    const today = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 86400 * 1000).toISOString().split('T')[0];

    const balanceByDate = new Map<string, number>();
    let lastBalance = 0;
    let ei = 0;

    const startMs = new Date(startDate + 'T00:00:00Z').getTime();
    const endMs = new Date(today + 'T00:00:00Z').getTime();
    for (let t = startMs; t <= endMs; t += 86400000) {
      const dateStr = new Date(t).toISOString().split('T')[0];
      while (ei < events.length && events[ei].date <= dateStr) {
        lastBalance = events[ei].balance;
        ei++;
      }
      balanceByDate.set(dateStr, lastBalance);
    }
    balanceByDate.set(today, currentAmount);

    return balanceByDate;
  } catch {
    return new Map();
  }
}
