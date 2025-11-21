# 🚀 Sui Walrus Data Pipeline

A real-time data pipeline that collects Sui blockchain transactions, batches them, stores on Walrus decentralized storage, and records CIDs on-chain.

## 🏗️ Architecture
```
Sui Blockchain → Polling Service → Buffer → Walrus Storage → On-chain Registry → WebSocket Broadcast
```

## ✨ Features

- ⛓️ Real-time Sui blockchain transaction monitoring
- 🐋 Decentralized storage on Walrus
- 📝 On-chain CID registry using Move smart contracts
- 🔌 WebSocket broadcasting for real-time updates
- 📊 Configurable batching and auto-flush
- 🔧 Admin API endpoints

## 🧠 System Flow & Code Logic

### Runtime Flow
1. **Ingest** – `SuiRealtimeService.pollTransactionsOnce()` queries the Sui RPC, filters interesting digests (`swap`, `mint`, `buy`, `stake`, `nft`, `defi`), and places them into an in-memory buffer.
2. **Persist locally** – When the buffer reaches `BATCH_SIZE` or a manual flush occurs, `flushBuffer()` serializes each transaction to the `transactions/<type>` directory so nothing is lost during restarts.
3. **Model inference (optional)** – `ModelService` can load TensorFlow models from `src/model` and score buffered transactions (`predict`, `predictBatch`) before uploading.
4. **Walrus upload** – `WalrusService.uploadModelFolder()` or `uploadJson()` compresses payloads, pushes them to Walrus testnet via `walrus.writeBlob`, and returns the resulting blob/CID.
5. **On-chain anchoring** – `OnchainService.updateCid()` calls `registry::update_cid` with the Walrus CID so an immutable reference lives on Sui.
6. **Broadcast** – `WsGateway.broadcast()` sends a `new_cid` message (cid, digest, Walrus URL, timestamp) to every subscribed WebSocket client.

### Service Responsibilities
| Service | Key Methods | Purpose |
|---------|-------------|---------|
| `SuiRealtimeService` (`src/sui/sui.service.ts`) | `pollTransactionsOnce`, `flushBuffer`, `getTxHashNewIn1Minute` | Poll Sui, dedupe digests, maintain buffer health, and expose buffer stats/API responses. |
| `WalrusService` (`src/walrus/walrus.service.ts`) | `uploadModelFolder`, `uploadJson`, `getBlobIdFromContract` | Package payloads, interact with Walrus relay/aggregator, and fetch previously stored blobs. |
| `ModelService` (`src/walrus/mode.service.ts`) | `loadAllModels`, `predict`, `predictBatch` | Load TensorFlow models, build features from tx digests, and classify transactions. |
| `OnchainService` (`src/onchain/onchain.service.ts`) | `updateCid`, `getBalance` | Sign Move transactions with the configured keypair and publish Walrus CIDs to the registry contract. |
| `WsGateway` (`src/ws-broadcast/ws.gateway.ts`) | `broadcast`, `handleConnection` | Maintain WebSocket connections and push `new_cid` notifications. |
| REST controllers (`src/sui/sui.controller.ts`, `src/walrus/walrus.controller.ts`, etc.) | `getTxHash`, admin routes | Provide HTTP entry points for status, flush, prediction, and Walrus utilities. |

## 📋 Prerequisites

- Node.js 18+
- Sui CLI (`sui`)
- Sui testnet account with gas tokens

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <your-repo>
cd project
npm install
```

### 2. Setup Environment
```bash
# Copy example env
cp .env.example .env

# Get your private key
npm run script:get-key

# Copy the output to .env file
```

### 3. Deploy Smart Contract
```bash
cd move
sui move build
sui client publish --gas-budget 100000000

# Copy PACKAGE_ID and REGISTRY_OBJECT_ID to .env
```

### 4. Validate Configuration
```bash
npm run script:validate
```

### 5. Test Connections
```bash
npm run script:test
```

### 6. Start Application
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUI_RPC` | Sui RPC endpoint | `https://fullnode.testnet.sui.io:443` |
| `PRIVATE_KEY_HEX` | Your Sui private key (128 chars) | `abc123...` |
| `OWNER_ADDRESS` | Your Sui address | `0xabc...` |
| `PACKAGE_ID` | Deployed package ID | `0x123...` |
| `REGISTRY_OBJECT_ID` | Registry object ID | `0x456...` |
| `WALRUS_NETWORK` | Walrus network | `testnet` |
| `WS_PORT` | WebSocket server port | `8081` |
| `BATCH_SIZE` | Transactions per batch | `100` |
| `BATCH_TIME_MS` | Auto-flush interval | `600000` (10 min) |

## 📡 API Endpoints

### GET `/sui/status`

Get current buffer status and service info.

**Response:**
```json
{
  "service": "Sui Realtime Service",
  "status": "running",
  "buffer": {
    "size": 45,
    "maxSize": 100,
    "lastFlush": "2025-11-09T12:00:00.000Z",
    "isFlushing": false,
    "mode": "polling"
  }
}
```

### POST `/sui/flush`

Manually trigger buffer flush.

**Response:**
```json
{
  "message": "Manual flush triggered",
  "buffer": { ... }
}
```

## 🔌 WebSocket API

Connect to `ws://localhost:8081`

**Message Format:**
```json
{
  "type": "new_cid",
  "cid": "blob_id_from_walrus",
  "digest": "sui_transaction_digest",
  "count": 100,
  "walrusUrl": "https://aggregator.walrus-testnet.walrus.space/v1/...",
  "timestamp": "2025-11-09T12:00:00.000Z"
}
```

**Example Client:**
```javascript
const ws = new WebSocket('ws://localhost:8081');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New CID:', data.cid);
  console.log('View data:', data.walrusUrl);
};
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Manual Testing
```bash
# 1. Check environment
npm run script:validate

# 2. Test connections
npm run script:test

# 3. Check service status
curl http://localhost:3000/sui/status

# 4. Trigger manual flush
curl -X POST http://localhost:3000/sui/flush

# 5. Connect WebSocket client
wscat -c ws://localhost:8081
```

## 📊 Data Flow

1. **Polling** – `SuiRealtimeService.pollTransactionsOnce()` runs every few seconds, paging through the Sui RPC cursor.
2. **Filtering** – `isTargetTx()` and `detectTxType()` keep only swap/mint/buy/stake/NFT/DeFi digests; dedupe occurs with `processedTxs`.
3. **Buffering** – Matching events enter the in-memory buffer (`buffer.push`) and are exposed via `/sui/status` or `getTxHashNewIn1Minute()`.
4. **Auto-flush** – `flushBuffer()` runs when:
   - Buffer size hits `BATCH_SIZE`
   - `BATCH_TIME_MS` elapses since `lastFlush`
   - `/sui/flush` (manual) or any admin script calls `manualFlush()`
   Every flush persists JSON snapshots under `transactions/<type>`.
5. **Upload** – The persisted batches (or zipped `model/`) are sent to Walrus using `WalrusService.uploadModelFolder()` / `uploadJson()`, returning a blob ID (CID).
6. **On-chain** – `OnchainService.updateCid()` signs and submits the Walrus CID through the Move registry contract so any consumer can verify provenance.
7. **Broadcast** – `WsGateway.broadcast()` notifies each WebSocket client (UI dashboards, alert bots, etc.) with the CID, digest count, and Walrus viewer URL.

## 🔐 Security

⚠️ **IMPORTANT**: 
- Never commit `.env` file
- Use testnet only for development
- Rotate keys regularly
- Monitor gas usage

## 📁 Project Structure
```
project/
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   ├── onchain/             # On-chain interaction
│   ├── walrus/              # Walrus storage
│   ├── sui/                 # Sui blockchain monitoring
│   └── ws-broadcast/        # WebSocket broadcasting
├── move/                    # Move smart contracts
├── scripts/                 # Utility scripts
└── .env                     # Configuration (not in git)
```

### Folder Responsibilities
| Path | Contents | Notes |
|------|----------|-------|
| `src/main.ts`, `src/app.module.ts` | NestJS bootstrap & DI wiring | Loads ConfigModule, initializes Sui/Walrus modules, and starts HTTP + WS servers. |
| `src/sui` | `sui.service.ts`, `sui.controller.ts` | Polls Sui RPC, buffers txs, exposes `/sui/*` APIs for status and manual fetching. |
| `src/walrus` | `walrus.service.ts`, `walrus.controller.ts`, `mode.service.ts` | Wraps Walrus publisher/aggregator APIs, hosts TensorFlow inference helpers, and exposes admin endpoints. |
| `src/onchain` | `onchain.service.ts`, helpers | Signs Move calls (registry updates, balance checks) using the configured Ed25519 keypair. |
| `src/ws-broadcast` | `ws.gateway.ts` | WebSocket gateway broadcasting new Walrus blobs to connected clients. |
| `model` | TF SavedModel artifacts (`model.json`, shards) | Uploaded as ZIP blobs and loaded by `ModelService`. |
| `transactions` | Runtime-generated JSON files grouped by tx type | Acts as a durable local queue before Walrus upload. |
| `script` | Verification/dev scripts (`script:get-key`, etc.) | Automates environment validation and key extraction. |

## 🐛 Troubleshooting

### "PRIVATE_KEY_HEX is not set"
Run `npm run script:get-key` and copy output to `.env`

### "Registry object not found"
Deploy the Move contract first:
```bash
cd move && sui client publish --gas-budget 100000000
```

### "Insufficient gas"
Get testnet tokens:
```bash
sui client faucet
```

### WebSocket connection fails
Check `WS_PORT` in `.env` and ensure no other service uses that port

### Walrus upload fails
- Walrus testnet might be down (check status)
- Verify `WALRUS_NETWORK=testnet` in `.env`

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read contributing guidelines first.

## 📞 Support

- GitHub Issues: <your-repo>/issues
- Discord: [Your Discord]
- Email: your@email.com