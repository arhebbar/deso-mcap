/**
 * Exchange account public keys and metadata.
 * Used for Exchange Accounts classification (excluded from Others).
 * Metadata (Exchange, URL, Nature, Icon) stored for future use.
 */

export interface ExchangeAccountInfo {
  Exchange: string;
  URL: string;
  Nature: string;
  Icon: string;
}

export const EXCHANGE_ACCOUNTS: Record<string, ExchangeAccountInfo> = {
  BC1YLij9e5jYoh5TgD5m6GJrG9d7WEqFqtysubwnZUDnFJsgUvpXNg7: {
    Exchange: 'Ascendex',
    URL: 'https://ascendex.com/',
    Nature: 'Deposits',
    Icon: '/assets/icons/exchanges/ascendex-logo.svg',
  },
  BC1YLh6z1g5oTZfzTRNe7XtWzuWxfzPQdbuFxCzdzwishEevhPu5ZhP: {
    Exchange: 'Ascendex',
    URL: 'https://ascendex.com/',
    Nature: 'Withdrawals',
    Icon: '/assets/icons/exchanges/ascendex-logo.svg',
  },
  BC1YLigdNktFqD2LrK2cAAdm2JkPhs8qJ3RJrC3erhRAU5FcaSntDbh: {
    Exchange: 'Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'Withdrawals',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLfki5fnATeRysFiWZ9BfkSoL9iCxNa43FzCeBL4Tcmj6fXiNStn: {
    Exchange: 'Unknown',
    URL: '',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLhxvk9Z6dHHnXbnawMpaGKGZePPsApVRcLNBCK3J8NAGgVoHpoG: {
    Exchange: 'Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'Deposits',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLi7CWybSunGG2mVCSiHggMqvCKLARiiyqbCBXhKe27iyE42NrY7: {
    Exchange: 'Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'Withdrawals',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLhVZBgtX7Hmipyxiw1BJWyYK7SAq8ej3wNDbc4dHLPNADrMH49C: {
    Exchange: 'Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'Deposits',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLiuhqCJajHG5C3iM4kuqD1tzecVFpyDLC9wisiHwAVYXH5xV9Nj: {
    Exchange: 'Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'Deposits',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLjU48gkK9cbA8h613zcWiDpsnuhsL3jGQ4sNtwnNRvjhWUS5Mdd: {
    Exchange: 'Gate.io',
    URL: 'https://www.gate.io',
    Nature: 'Deposits',
    Icon: '/assets/icons/exchanges/gate.io-logo.svg',
  },
  BC1YLiWcMBv3qFkGFRf2CTAAm193mMt7Cg2F3hDunkcW4xuy16ezUXk: {
    Exchange: 'Gate.io',
    URL: 'https://www.gate.io',
    Nature: 'Withdrawals',
    Icon: '/assets/icons/exchanges/gate.io-logo.svg',
  },
  BC1YLhi3XubpCY2pPbMvBWdTCAGhYHsATuwWssJYFUSUoZa5nUj2Byx: {
    Exchange: 'Gate.io',
    URL: 'https://www.gate.io',
    Nature: 'Deposits',
    Icon: '/assets/icons/exchanges/gate.io-logo.svg',
  },
  BC1YLg37J6koL3xDwUbQMphtf7Hd7xdktNWmiyifi7uZooaMr6N69zN: {
    Exchange: 'Unknown - Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLg4r4TNo3TNXZojaoyLN8LrFXienFkrs271sNa1ot8bvZqkcqzA: {
    Exchange: 'Unknown - Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLiJdshYatyrNmc3Eou8UNnT4HEvZiqBWZjKCYtX8yz13EKbFoCv: {
    Exchange: 'Unknown - Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLhJ4xB4g8vqCerMdfJLgoLkmcqTyfSKoH52GogWDBynMmbPhtRe: {
    Exchange: 'Unknown - Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLghrPnK6QVYRqEMB3JiYF5PZJ5bSp9gxRhUiSBHdVgfk4Z73854: {
    Exchange: 'Unknown - Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLgzW8pajCXtDe8TEoKMGnsevLvjw51LKJnmcYWehde34D5NosfF: {
    Exchange: 'Unknown - Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLjBW4jhgK4hsqxBXtQ9zETYvmoftAZ86grqrEWKAsjJ3sgTmKH2: {
    Exchange: 'Unknown - Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLiAe2ymPLMhYiRSgV9TQFDWEFoMwaZiJmxqZd8zyM1PNKi1kuYa: {
    Exchange: 'Unknown',
    URL: 'https://www.coinbase.com',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLjGBxmLJQFEX9uH3ZrHg8vPua7Y9TsBCAB3FwFUWwAt4caT8DRj: {
    Exchange: 'Unknown - Heroswap USDC / Coinbase',
    URL: 'https://www.coinbase.com',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  // Previously tracked; restored so Exchange totals are preserved
  BC1YLipfFtg2FoVPSAYYuMtRYwrLEsnRPfutBmykewh32vLKvPhdgr6: {
    Exchange: 'Unknown',
    URL: '',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLgjbg1EVGZCX5WszQg8BMJxYqzStyZNoqobJRm73m79i2cca583: {
    Exchange: 'Unknown',
    URL: '',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLgdwUHnGuzbNRJhZsNLQbhzqLdgbfkCKtTnWTq3ZKPy7FtnK4No: {
    Exchange: 'Unknown',
    URL: '',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  // Additional exchange accounts
  BC1YLg73UxUaqhcjXiaqYhacx2MEoQNgzqCNgMdkfEehmcympxetYFG: {
    Exchange: 'Unknown',
    URL: '',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLidTTtpDmZeEFUeeJLXCW4ebz66ajSHY1kBgbQ9Ne3uXLE6hmAU: {
    Exchange: 'Unknown',
    URL: '',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLgS5wjgLrvvxdiKYGdV63Ayw1i9huSagAemSC4umUCLHpLVMAEG: {
    Exchange: 'Unknown',
    URL: '',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLgd3KeWS9FaBuxcFsVZtCphmDFYBvuCGprrPgb8jRj7g34xwnqx: {
    Exchange: 'Unknown',
    URL: '',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLjHB7rUH7q8E4yETBexpFmALC3tE9e27vwJ5rmFNmAwq6mP8f6G: {
    Exchange: 'Unknown',
    URL: '',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLi5YxX5XPjumZUy6bcPjqqr5DyaYN8FAEeJ8uHBNmQuj6gZzAeZ: {
    Exchange: 'Unknown',
    URL: '',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
  BC1YLg9JLtAoShJRivnPeooSnEGV5zL4hMSoMECQcsAvDxV97iniH9P: {
    Exchange: 'MakerTaker',
    URL: '',
    Nature: 'UNKNOWN',
    Icon: '/assets/icons/exchanges/coinbase-logo.svg',
  },
};

export const EXCHANGE_PUBLIC_KEYS = Object.keys(EXCHANGE_ACCOUNTS);

/** Display name for exchange account (e.g. "Exchange (…Dbh)") */
export function getExchangeDisplayName(publicKey: string): string {
  const suffix = publicKey.slice(-3);
  return `Exchange (…${suffix})`;
}
