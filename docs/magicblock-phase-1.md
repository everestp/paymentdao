# PayDAO MagicBlock Phase 1

The repository now contains the real PayDAO contract and a Phase 1 ER lifecycle test. The ER path is intentionally separate from private voting.

## Verified MagicBlock shape

1. Build the PayDAO Anchor program with group initialization, contributions, membership, proposals, aggregate vote settlement, permissionless execution, and Group delegation.
2. Add the current SDK with `cargo add ephemeral-rollups-sdk --features anchor`.
3. Use `#[ephemeral]`, `#[delegate]`, `DelegateConfig`, and `MagicIntentBundleBuilder` from the official example. The current docs say `MagicIntentBundleBuilder` replaces the older commit helper functions.
4. Deploy the program to Solana devnet.
5. Initialize the PDA on the base layer.
6. Delegate the PDA to a pinned devnet ER validator.
7. Send `realtime_heartbeat` to the ER using the ER connection.
8. Read the changed Group PDA from the ER, then commit or commit-and-undelegate it back to Solana.

The repository test currently uses `https://devnet-as.magicblock.app/` and the Asia validator configured in `chain/tests/paydao-proof.ts`. The current docs also list the devnet Router at `https://devnet-router.magicblock.app`, ER endpoints for Asia/EU/US, and a TEE endpoint at `https://devnet-tee.magicblock.app/`.

## Commands

Run these from a new Anchor workspace, not from the Vite app root:

```bash
anchor init paydao-chain
cd paydao-chain
cargo add ephemeral-rollups-sdk --features anchor
anchor build
anchor test --skip-build --skip-deploy --skip-local-validator
```

The official source example is [magicblock-engine-examples/anchor-counter](https://github.com/magicblock-labs/magicblock-engine-examples/tree/main/anchor-counter). The official Anchor walkthrough is [MagicBlock Anchor Guide](https://docs.magicblock.gg/pages/ephemeral-rollups-ers/how-to-guide/anchor).

## PayDAO implementation

- `Group` stores bounded metadata and governance configuration. The SOL treasury is a separate system-owned PDA. Membership, proposals, and vote nullifier receipts are separate accounts.
- Public ER state is suitable for realtime contribution and proposal status updates.
- Private voting must use the PER/TEE flow: delegate sensitive state to the TEE validator, create an `EphemeralPermission`, authorize the voter through the TEE RPC, and expose only an aggregate result after the privacy phase. An ordinary ER does not make votes private.
- Magic Actions can attach a post-commit base-layer instruction, but the action handler must authenticate the injected escrow signer. `#[action]` alone is not an authorization check.
- Final treasury release remains an Anchor instruction that verifies quorum, threshold, deadline, balance, recipient, status, and one-time execution.

## Current frontend boundary

`CreateGroupModal` awaits `AppContext.createGroup`, and `src/chain/paydao.ts` now contains a minimal browser Anchor client for SOL group creation, contribution, and proposal creation. The frontend still does not delegate/read Group state through MagicBlock ER, and the IDL is hand-authored rather than generated. The next frontend change should:

1. generate and ship the Anchor IDL,
2. keep the deployed program ID synchronized with `Anchor.toml`,
3. call `initialize_group` on Solana,
4. confirm the transaction,
5. call the verified `delegate_group` instruction,
6. switch realtime reads to the Magic Router/ER connection, and
7. report the base and ER signatures to the UI.

Do not add private vote fields to public frontend types or activity events.
