# CCv2 Order Undercut Batch Job

Automatically keeps your sell (or buy) order at the top of the book by undercutting competing orders every 5 minutes.

## Setup

1. Copy the example config:
   ```bash
   cp scripts/ccv2-order-undercut.config.example.json scripts/ccv2-order-undercut.config.json
   ```

2. Edit `scripts/ccv2-order-undercut.config.json`:
   - **TRANSPACTOR_PUBLIC_KEY**: Your DeSo public key (Base58Check)
   - **SEED_HEX**: Your seed hex for signing (keep this secret!)
   - **TOKEN_USERNAME**: Token to trade (e.g. `WhaleDShark`)
   - **QUANTITY_TO_FILL**: Number of tokens in the order
   - **OPERATION_TYPE**: `ASK` (sell) or `BID` (buy)
   - **UNDERCUT_PERCENT**: How much to beat the competitor (default 0.5%)

3. Run the job:
   ```bash
   npm run ccv2-order-undercut
   ```

The job runs every 5 minutes (configurable via `INTERVAL_MS`). It stops when:
- You press Ctrl+C
- Your order gets filled (no more open orders)

## Security

- **Never commit** `ccv2-order-undercut.config.json` (it's in .gitignore)
- The SEED_HEX gives full control of your account. Run only on a trusted machine.
