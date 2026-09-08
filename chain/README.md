# PayDAO MagicBlock proof

This is the PayDAO on-chain core: initialize a group and treasury on Solana, delegate the Group PDA to a MagicBlock ER, mutate delegated realtime state, accept SOL contributions that create membership, create member proposals, record PER/TEE aggregate votes, finalize permissionlessly, and execute passed proposals from the treasury.

## Prerequisites

Install the versions currently listed by the MagicBlock docs:

- Solana CLI
- Rust
- Anchor
- Node.js and Yarn

The repository does not currently include `anchor` or `solana` binaries, so the commands below are ready to run after installing that toolchain.

## Setup

```bash
cd chain
yarn install
anchor build
```

If the SDK dependency needs to be refreshed against the current release, run:

```bash
cargo add ephemeral-rollups-sdk --features anchor
```

## Run the proof

Configure a funded devnet wallet in `Anchor.toml`, then run:

```bash
solana config set --url https://api.devnet.solana.com
solana airdrop 2
anchor build
anchor deploy --provider.cluster devnet
anchor test --skip-build --skip-deploy --skip-local-validator
```

The integration test uses the devnet Asia ER validator listed in the official MagicBlock quickstart. Set `VALIDATOR` to another validator identity when needed.

## What success looks like

The test creates a Group PDA, delegates it, increments the Group realtime nonce on the ER, commits and undelegates it, contributes SOL, creates a proposal, records an aggregate vote through the configured privacy authority, finalizes it, and executes the treasury transfer. The test requires a funded devnet wallet.

The program intentionally does not expose individual vote choices. The `record_vote_aggregate` instruction is restricted to `Group.privacy_authority`, which must be a PER/TEE-controlled signer in the private-voting deployment. Ordinary ER execution is realtime but public.

## Official references

- [MagicBlock Anchor guide](https://docs.magicblock.gg/pages/ephemeral-rollups-ers/how-to-guide/anchor)
- [MagicBlock ER quickstart](https://docs.magicblock.gg/pages/ephemeral-rollups-ers/how-to-guide/quickstart)
- [MagicBlock delegation lifecycle](https://docs.magicblock.gg/pages/ephemeral-rollups-ers/introduction/ephemeral-rollup)
- [MagicBlock PER quickstart](https://docs.magicblock.gg/pages/private-ephemeral-rollups-pers/how-to-guide/quickstart)
