#!/usr/bin/env node
/**
 * CCv2 Order Undercut Batch Job
 *
 * Runs every N minutes, checks if your sell order on a specific token (e.g. WhaleDShark)
 * is the lowest. If another user has a lower sell order, cancels yours and places a new
 * one slightly below theirs so you get filled first on market buys.
 *
 * Setup:
 * 1. Copy ccv2-order-undercut.config.example.json to ccv2-order-undercut.config.json
 * 2. Fill in: TRANSPACTOR_PUBLIC_KEY, SEED_HEX, TOKEN_USERNAME, QUANTITY_TO_FILL
 * 3. Run: node scripts/ccv2-order-undercut.mjs
 *
 * Stops when: order gets executed (no more of your orders) or you Ctrl+C.
 */

import { signTx } from 'deso-protocol';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, 'ccv2-order-undercut.config.json');

const DEFAULT_CONFIG = {
  DESO_NODE: 'https://node.deso.org/api/v0',
  INTERVAL_MS: 300000,
  UNDERCUT_PERCENT: 0.5,
  TOKEN_USERNAME: 'WhaleDShark',
  QUOTE_USERNAME: '',
  QUANTITY_TO_FILL: 100,
  OPERATION_TYPE: 'ASK',
  TRANSPACTOR_PUBLIC_KEY: '',
  SEED_HEX: '',
};

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    console.error('Config not found. Copy ccv2-order-undercut.config.example.json to ccv2-order-undercut.config.json');
    process.exit(1);
  }
  const raw = readFileSync(CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return { ...DEFAULT_CONFIG, ...parsed };
}

async function desoPost(base, endpoint, body) {
  const res = await fetch(`${base}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${endpoint}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getPublicKey(base, username) {
  const data = await desoPost(base, '/get-single-profile', { Username: username });
  const pk = data?.Profile?.PublicKeyBase58Check;
  if (!pk) throw new Error(`No profile for ${username}`);
  return pk;
}

async function fetchOrderBook(base, tokenCreator, quoteCreator) {
  const data = await desoPost(base, '/get-dao-coin-limit-orders', {
    DAOCoin1CreatorPublicKeyBase58CheckOrUsername: tokenCreator,
    DAOCoin2CreatorPublicKeyBase58CheckOrUsername: quoteCreator,
  });
  return data.Orders ?? [];
}

async function fetchTransactorOrders(base, transactor) {
  const data = await desoPost(base, '/get-transactor-dao-coin-limit-orders', {
    TransactorPublicKeyBase58CheckOrUsername: transactor,
  });
  return data.Orders ?? [];
}

async function constructCreateOrder(base, params) {
  const data = await desoPost(base, '/create-dao-coin-limit-order', {
    ...params,
    MinFeeRateNanosPerKB: params.MinFeeRateNanosPerKB ?? 1500,
  });
  if (!data.TransactionHex) throw new Error('No TransactionHex');
  return data.TransactionHex;
}

async function constructCancelOrder(base, params) {
  const data = await desoPost(base, '/cancel-dao-coin-limit-order', {
    ...params,
    MinFeeRateNanosPerKB: params.MinFeeRateNanosPerKB ?? 1500,
  });
  if (!data.TransactionHex) throw new Error('No TransactionHex');
  return data.TransactionHex;
}

async function submitTransaction(base, signedHex) {
  const data = await desoPost(base, '/submit-transaction', { TransactionHex: signedHex });
  if (data.TxnHashHex) return data.TxnHashHex;
  throw new Error(data.error || 'Submit failed');
}

async function runIteration(config) {
  const base = config.DESO_NODE;
  const tokenPk = config.TOKEN_USERNAME.startsWith('BC1Y') ? config.TOKEN_USERNAME : await getPublicKey(base, config.TOKEN_USERNAME);
  const quotePk = config.QUOTE_USERNAME || '';

  const [orderBook, myOrders] = await Promise.all([
    fetchOrderBook(base, tokenPk, quotePk),
    fetchTransactorOrders(base, config.TRANSPACTOR_PUBLIC_KEY),
  ]);

  const myOrdersForPair = myOrders.filter((o) => {
    const buying = o.BuyingDAOCoinCreatorPublicKeyBase58Check || '';
    const selling = o.SellingDAOCoinCreatorPublicKeyBase58Check || '';
    const matchesTokenDeso = (buying === tokenPk && selling === '') || (selling === tokenPk && buying === '');
    return matchesTokenDeso;
  });

  if (myOrdersForPair.length === 0) {
    console.log(`[${new Date().toISOString()}] No open orders for ${config.TOKEN_USERNAME}/DESO. Job may stop if order was filled.`);
    return false;
  }

  const opType = config.OPERATION_TYPE || 'ASK';
  const myRelevantOrders = myOrdersForPair.filter((o) => o.OperationType === opType);
  if (myRelevantOrders.length === 0) {
    console.log(`[${new Date().toISOString()}] No ${opType} orders for this pair.`);
    return true;
  }

  const myOrder = myRelevantOrders[0];
  const otherOrders = orderBook.filter((o) => o.OperationType === opType && o.TransactorPublicKeyBase58Check !== config.TRANSPACTOR_PUBLIC_KEY);

  if (opType === 'ASK') {
    const bestSell = otherOrders.length ? otherOrders.reduce((a, b) => (a.ExchangeRateCoinsToSellPerCoinToBuy < b.ExchangeRateCoinsToSellPerCoinToBuy ? a : b)) : null;
    if (!bestSell) {
      console.log(`[${new Date().toISOString()}] Your sell is already the lowest. No action.`);
      return true;
    }
    if (myOrder.ExchangeRateCoinsToSellPerCoinToBuy <= bestSell.ExchangeRateCoinsToSellPerCoinToBuy) {
      console.log(`[${new Date().toISOString()}] Your sell (${myOrder.ExchangeRateCoinsToSellPerCoinToBuy}) is already lower. No action.`);
      return true;
    }
    const newRate = bestSell.ExchangeRateCoinsToSellPerCoinToBuy * (1 - (config.UNDERCUT_PERCENT / 100));
    console.log(`[${new Date().toISOString()}] Beating competitor: ${bestSell.ExchangeRateCoinsToSellPerCoinToBuy} -> ${newRate.toFixed(6)}`);

    const qty = config.QUANTITY_TO_FILL ?? myOrder.QuantityToFill;
    const cancelHex = await constructCancelOrder(base, {
      TransactorPublicKeyBase58Check: config.TRANSPACTOR_PUBLIC_KEY,
      CancelOrderID: myOrder.OrderID,
    });
    const signedCancel = await signTx(cancelHex, config.SEED_HEX);
    await submitTransaction(base, signedCancel);
    console.log(`${new Date().toISOString()} Cancelled order ${myOrder.OrderID}`);

    const createHex = await constructCreateOrder(base, {
      TransactorPublicKeyBase58Check: config.TRANSPACTOR_PUBLIC_KEY,
      BuyingDAOCoinCreatorPublicKeyBase58CheckOrUsername: quotePk || '',
      SellingDAOCoinCreatorPublicKeyBase58CheckOrUsername: tokenPk,
      ExchangeRateCoinsToSellPerCoinToBuy: newRate,
      QuantityToFill: qty,
      OperationType: 'ASK',
    });
    const signedCreate = await signTx(createHex, config.SEED_HEX);
    const hash = await submitTransaction(base, signedCreate);
    console.log(`${new Date().toISOString()} Placed new order: ${hash}`);
  } else {
    const bestBid = otherOrders.length ? otherOrders.reduce((a, b) => (a.ExchangeRateCoinsToSellPerCoinToBuy > b.ExchangeRateCoinsToSellPerCoinToBuy ? a : b)) : null;
    if (!bestBid) {
      console.log(`[${new Date().toISOString()}] Your buy is already the highest. No action.`);
      return true;
    }
    if (myOrder.ExchangeRateCoinsToSellPerCoinToBuy >= bestBid.ExchangeRateCoinsToSellPerCoinToBuy) {
      console.log(`[${new Date().toISOString()}] Your buy is already higher. No action.`);
      return true;
    }
    const newRate = bestBid.ExchangeRateCoinsToSellPerCoinToBuy * (1 + (config.UNDERCUT_PERCENT / 100));
    console.log(`[${new Date().toISOString()}] Beating competitor: ${bestBid.ExchangeRateCoinsToSellPerCoinToBuy} -> ${newRate.toFixed(6)}`);

    const qty = config.QUANTITY_TO_FILL ?? myOrder.QuantityToFill;
    const cancelHex = await constructCancelOrder(base, {
      TransactorPublicKeyBase58Check: config.TRANSPACTOR_PUBLIC_KEY,
      CancelOrderID: myOrder.OrderID,
    });
    const signedCancel = await signTx(cancelHex, config.SEED_HEX);
    await submitTransaction(base, signedCancel);
    console.log(`${new Date().toISOString()} Cancelled order ${myOrder.OrderID}`);

    const createHex = await constructCreateOrder(base, {
      TransactorPublicKeyBase58Check: config.TRANSPACTOR_PUBLIC_KEY,
      BuyingDAOCoinCreatorPublicKeyBase58CheckOrUsername: tokenPk,
      SellingDAOCoinCreatorPublicKeyBase58CheckOrUsername: quotePk || '',
      ExchangeRateCoinsToSellPerCoinToBuy: newRate,
      QuantityToFill: qty,
      OperationType: 'BID',
    });
    const signedCreate = await signTx(createHex, config.SEED_HEX);
    const hash = await submitTransaction(base, signedCreate);
    console.log(`${new Date().toISOString()} Placed new order: ${hash}`);
  }

  return true;
}

async function main() {
  const config = loadConfig();
  if (!config.TRANSPACTOR_PUBLIC_KEY || !config.SEED_HEX) {
    console.error('TRANSPACTOR_PUBLIC_KEY and SEED_HEX are required in config.');
    process.exit(1);
  }

  console.log(`CCv2 Order Undercut Job | Token: ${config.TOKEN_USERNAME} | Interval: ${config.INTERVAL_MS / 1000}s`);
  console.log('Press Ctrl+C to stop.\n');

  let running = true;
  const run = async () => {
    while (running) {
      try {
        const cont = await runIteration(config);
        if (!cont) break;
      } catch (err) {
        console.error(`${new Date().toISOString()} Error:`, err.message);
      }
      await new Promise((r) => setTimeout(r, config.INTERVAL_MS));
    }
  };

  process.on('SIGINT', () => {
    running = false;
    console.log('\nStopped.');
    process.exit(0);
  });

  await run();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
