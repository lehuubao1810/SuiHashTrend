# Model Bundle (Walrus CID MVP)

Smart-contract package for Sui that manages shared “model bundles”: named blobs pointing to the most recent Walrus CID (or any blob identifier). The package exposes a single module, `model_bundle::model_bundle`, and is meant to be deployed as a shared object that anyone can query while only the owner can mutate.

## Data model
- `Bundle`: `key, store` resource stored as a shared object. Fields: `name`, `owner`, latest `blob` string, and `created_at`/`updated_at` epochs.
- `BundleCreated` & `BlobUpdated` events: emitted on create / mutate so indexers or explorers can track history without reading state.

## Entry functions
| Function | Purpose | Notes |
| --- | --- | --- |
| `create_bundle(name, blob, ctx)` | Initializes a shared `Bundle`. | Uses `transfer::share_object` so everyone can read it. `created_at` and `updated_at` both set to current epoch. |
| `update_blob(&mut bundle, new_blob, ctx)` | Replaces the stored blob ID. | Requires `tx_context::sender(ctx) == bundle.owner`; abort code `1` signals unauthorized updates. Emits `BlobUpdated` with old/new values. |

## View helpers
- `get_latest_blob(&Bundle)`: returns the newest blob ID reference.
- `get_name(&Bundle)`: returns the bundle name.
- `get_owner(&Bundle)`: returns creator address.
- `get_info(&Bundle)`: tuple `(name, owner, blob, created_at, updated_at)` for simple queries.

## Events & indexing
- `BundleCreated` contains `bundle_id`, `name`, `owner`, `blob` — enough to reconstruct metadata from off-chain listeners.
- `BlobUpdated` includes `bundle_id`, `old_blob`, `new_blob`, enabling audit trails of blob rotations.

## Project structure
```
Move.toml                # Package metadata + Sui dependency
sources/model_bundle.move # Core module implementation
tests/model_bundle.move   # Placeholder tests (commented scaffolding)
build/                    # Generated artifacts after `sui move build`
```

## Build, test, publish
```sh
# Compile bytecode
sui move build

# Run package tests (currently only scaffolding)
sui move test

# Publish (requires configured Sui client & gas)
sui client publish --gas-budget <BUDGET>
```

## Extending the module
- Add RBAC or multi-owner support by swapping the single `address owner` field for a capability resource.
- Store history of blob IDs (vector) if you need on-chain versioning instead of event-based history.
- Implement richer validation for `name`/`blob` strings (length, encoding) before storing them.
