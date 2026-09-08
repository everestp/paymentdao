# PayDAO

### Realtime DAO Treasury Governance on Solana with MagicBlock Ephemeral Rollups

> **PayDAO is a decentralized treasury governance protocol that combines Solana's durable settlement layer with MagicBlock Ephemeral Rollups for fast, realtime governance state.**

PayDAO enables groups to collectively manage a shared SOL treasury through proposals and member voting.

The core idea is simple:

**Solana provides durable ownership and settlement.
MagicBlock provides a fast execution environment for active governance state.**

This architecture allows PayDAO to keep the treasury and governance rules anchored to Solana while delegating selected governance accounts to MagicBlock when realtime interaction is needed.

---

## 🏆 Built for BlitzX

PayDAO is designed around a practical problem in decentralized organizations:

> **How can a DAO make treasury decisions quickly without giving up Solana's security and settlement guarantees?**

Traditional on-chain governance can require every state transition to happen directly on the base layer. For highly interactive governance, this can introduce unnecessary latency and transaction overhead.

PayDAO addresses this by selectively delegating governance state to **MagicBlock Ephemeral Rollups**.

The application can operate on delegated governance state during active sessions and explicitly commit that state back to Solana when durable settlement is required.

---

# Why MagicBlock?

MagicBlock is not an additional backend or indexing service in PayDAO.

It is part of the **execution architecture of the protocol itself**.

PayDAO integrates MagicBlock directly into its Anchor program through the Ephemeral Rollups SDK.

The program currently supports:

* Ephemeral Rollup compatibility through `#[ephemeral]`
* Group account delegation
* Proposal account delegation
* Treasury account delegation
* Individual account commits
* Atomic governance-state commits
* Commit + undelegate
* Optional validator selection
* Realtime state mutation through a heartbeat instruction
* Magic Intent Bundle construction for commit operations

This makes MagicBlock a first-class part of PayDAO's governance execution model.

---

# Architecture

```text
                         PAYDAO
                           │
                           ▼
                 ┌─────────────────────┐
                 │   React Frontend    │
                 │                     │
                 │ Groups              │
                 │ Proposals           │
                 │ Voting              │
                 │ Treasury            │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Anchor Program      │
                 │ paydao_proof        │
                 │                     │
                 │ Governance Rules    │
                 │ Treasury Rules      │
                 │ Voting Rules        │
                 │ Delegation          │
                 │ Commit              │
                 └──────────┬──────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
        ┌─────────────────┐   ┌─────────────────────┐
        │     Solana      │   │ MagicBlock          │
        │                 │   │ Ephemeral Rollup     │
        │ Durable State   │◄─►│                     │
        │ Treasury        │   │ Delegated Governance │
        │ Settlement      │   │ Realtime State       │
        │ Ownership       │   │ Fast Execution       │
        └─────────────────┘   └─────────────────────┘
```

### The important architectural boundary

PayDAO does **not** move the entire application to MagicBlock.

Instead, it selectively delegates the accounts that participate in active governance:

```text
Solana
 ├── Durable ownership
 ├── Treasury settlement
 ├── Governance state
 └── Final committed state

MagicBlock Ephemeral Rollup
 ├── Delegated Group
 ├── Delegated Proposal
 ├── Delegated Treasury
 └── Realtime governance mutations
```

This selective delegation keeps the architecture explicit and minimizes unnecessary state movement.

---

# MagicBlock Integration

The Anchor program imports the MagicBlock Ephemeral Rollups SDK:

```rust
use ephemeral_rollups_sdk::anchor::{
    commit,
    delegate,
    ephemeral,
};

use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;
```

The entire program is marked for Ephemeral Rollup compatibility:

```rust
#[ephemeral]
#[program]
pub mod paydao_proof {
    // ...
}
```

This allows the governance program to participate in the Ephemeral Rollup execution model while retaining normal Anchor program structure.

---

# 1. Delegating Governance State

PayDAO explicitly delegates three important account types:

### Group

The Group account represents the DAO itself and contains governance configuration and state.

```text
Group
 ├── creator
 ├── group_key
 ├── member_count
 ├── current_lamports
 ├── reserved_lamports
 ├── threshold_bps
 ├── quorum_bps
 ├── voting_deadline
 ├── privacy_authority
 ├── active
 └── realtime_nonce
```

The Group can be delegated to MagicBlock using:

```rust
ctx.accounts.delegate_group(
    &ctx.accounts.payer,
    &[
        GROUP_SEED,
        group.creator.as_ref(),
        &group.group_key,
    ],
    DelegateConfig {
        validator,
        ..Default::default()
    },
)?;
```

The delegation derives the same PDA used by the Solana program and optionally accepts a validator supplied through `remaining_accounts`.

---

# 2. Delegating Proposals

Individual proposals can also be delegated.

Proposal PDAs are derived from:

```text
proposal
+ group
+ proposal_id
```

The program delegates them with:

```rust
ctx.accounts.delegate_proposal(
    &ctx.accounts.payer,
    &[
        PROPOSAL_SEED,
        ctx.accounts.group.key().as_ref(),
        &proposal.id.to_le_bytes(),
    ],
    DelegateConfig {
        validator,
        ..Default::default()
    },
)?;
```

This allows active proposal state to participate in the Ephemeral Rollup execution environment.

---

# 3. Delegating the Treasury

The DAO treasury is another explicitly delegatable account.

Its PDA is derived from:

```text
treasury
+ group
```

The program uses:

```rust
ctx.accounts.delegate_treasury(
    &ctx.accounts.payer,
    &[
        TREASURY_SEED,
        group_key.as_ref(),
    ],
    DelegateConfig {
        validator,
        ..Default::default()
    },
)?;
```

The important design decision is that the treasury is still governed by the Anchor program's authorization and accounting rules.

MagicBlock provides the delegated execution environment; it does not replace PayDAO's treasury logic.

---

# 4. Realtime Governance State

PayDAO includes an explicit realtime state mutation:

```rust
pub fn realtime_heartbeat(
    ctx: Context<RealtimeHeartbeat>,
) -> Result<()> {
    ctx.accounts.group.realtime_nonce =
        ctx.accounts.group.realtime_nonce
            .checked_add(1)
            .ok_or(PayDaoError::ArithmeticOverflow)?;

    Ok(())
}
```

The `realtime_nonce` exists specifically as mutable governance state that can change during an active delegated session.

Conceptually:

```text
Active DAO Session
       │
       ▼
MagicBlock Ephemeral Rollup
       │
       ├── delegated Group
       ├── delegated Proposal
       └── delegated Treasury
       │
       ▼
Realtime state mutations
       │
       ▼
Commit
       │
       ▼
Solana
```

This is the part of PayDAO where MagicBlock provides architectural value beyond simply deploying another Solana program.

---

# 5. Committing State Back to Solana

Delegation is only useful if the resulting state can be reconciled with durable Solana state.

PayDAO therefore implements explicit commit instructions.

For example, a Group can be committed using:

```rust
MagicIntentBundleBuilder::new(
    ctx.accounts.payer.to_account_info(),
    ctx.accounts.magic_context.to_account_info(),
    ctx.accounts.magic_program.to_account_info(),
)
.commit(&[
    ctx.accounts.group.to_account_info(),
])
.build_and_invoke()?;
```

The same mechanism exists for:

* Group
* Proposal
* Treasury

---

# 6. Atomic Governance Commit

PayDAO also provides a stronger commit path for governance state.

Instead of committing three accounts independently, the protocol can commit:

```text
Group
Proposal
Treasury
```

as one governance state bundle.

```rust
MagicIntentBundleBuilder::new(
    ctx.accounts.payer.to_account_info(),
    ctx.accounts.magic_context.to_account_info(),
    ctx.accounts.magic_program.to_account_info(),
)
.commit(&[
    ctx.accounts.group.to_account_info(),
    ctx.accounts.proposal.to_account_info(),
    ctx.accounts.treasury.to_account_info(),
])
.build_and_invoke()?;
```

This is important because these accounts are logically connected.

A proposal affects governance state.

Governance affects treasury reservations.

Treasury state reflects the financial result.

Keeping these accounts together during a commit gives PayDAO an explicit **atomic governance-state synchronization path**.

---

# 7. Commit + Undelegate

PayDAO also supports returning delegated governance state to the normal Solana lifecycle.

```rust
MagicIntentBundleBuilder::new(
    ctx.accounts.payer.to_account_info(),
    ctx.accounts.magic_context.to_account_info(),
    ctx.accounts.magic_program.to_account_info(),
)
.commit_and_undelegate(&[
    ctx.accounts.group.to_account_info(),
    ctx.accounts.proposal.to_account_info(),
    ctx.accounts.treasury.to_account_info(),
])
.build_and_invoke()?;
```

The lifecycle becomes:

```text
                 ┌───────────────┐
                 │    Solana     │
                 │ Durable State │
                 └───────┬───────┘
                         │
                    delegate
                         │
                         ▼
              ┌────────────────────┐
              │    MagicBlock      │
              │ Ephemeral Rollup   │
              │                    │
              │ Active Governance  │
              └─────────┬──────────┘
                        │
                  commit / commit
                   + undelegate
                        │
                        ▼
                 ┌───────────────┐
                 │    Solana     │
                 │ Durable State │
                 └───────────────┘
```

---

# Governance Model

PayDAO uses explicit on-chain accounts and PDA-based ownership.

## Group

A Group represents a DAO.

It stores:

* Creator
* Group identifier
* Member count
* Treasury accounting
* Reserved funds
* Voting threshold
* Quorum configuration
* Voting deadline configuration
* Privacy authority
* Active state
* Realtime nonce

---

## Member

Each participating wallet can have a Member PDA.

Membership is associated with the group and wallet.

Members are used by the voting instruction to verify that the voter belongs to the group.

---

## Proposal

A Proposal represents a treasury decision.

A proposal contains information such as:

* Proposal ID
* Group
* Creator
* Recipient
* Requested amount
* Description
* Voting state
* Vote counts
* Voter count
* Deadline
* Reserved treasury amount

### Proposal creation

An important property of the current program is that **proposal creation is open to any wallet**.

The `create_proposal` instruction does not require the creator to be a group member.

Voting is different: `cast_private_vote` requires a valid Member account for the voter.

---

# Treasury Safety Model

PayDAO does not allow arbitrary wallets to directly withdraw treasury funds.

The treasury is controlled by the Anchor program.

Funds enter through:

```text
Contributor
     │
     ▼
Treasury PDA
     │
     ▼
Group accounting
```

When a proposal is created, the requested amount is reserved:

```text
Treasury
 ├── current_lamports
 └── reserved_lamports
```

This prevents proposal accounting from being disconnected from available treasury funds.

---

# Contribution Flow

```text
User
 │
 │ contribute()
 ▼
Treasury PDA
 │
 ├── transfer SOL
 ├── update current_lamports
 ├── create/update Member PDA
 └── update member_count
```

The `contribute` instruction is the program's treasury entry point for SOL contributions.

---

# Voting Flow

```text
                 Proposal
                    │
                    ▼
             Voting is active?
                    │
                    ▼
             Is voter a member?
                    │
                    ▼
             VoteReceipt PDA
                    │
                    ▼
       ┌────────────┼────────────┐
       │            │            │
      YES           NO         ABSTAIN
       │            │            │
       └────────────┼────────────┘
                    ▼
              Aggregate votes
                    │
                    ▼
             Threshold check
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       Passed              Rejected
          │                   │
          ▼                   ▼
     Treasury payment     Reservation
                            released
```

The program prevents the same wallet from voting multiple times on the same proposal through a deterministic `VoteReceipt` PDA:

```text
vote
+ proposal
+ voter
```

---

# Voting and Privacy

PayDAO's voting instruction is named `cast_private_vote`, but privacy should be understood precisely.

The program does **not** claim cryptographic voter anonymity.

The current implementation:

* Stores aggregate Yes/No/Abstain counts on the Proposal
* Creates a VoteReceipt for each voter
* Stores the voter public key in the receipt
* Does not store the individual vote choice inside the VoteReceipt

Therefore, the architecture separates **vote-choice storage** from **voter participation tracking**, but it should not be interpreted as fully anonymous governance.

MagicBlock is also **not** the privacy mechanism in PayDAO.

---

# Proposal Finalization

After the voting period and required participation conditions are satisfied, a proposal can be finalized.

The program determines whether the proposal passes based on its voting rules.

A passed proposal becomes eligible for execution.

```text
Voting
  │
  ▼
Finalize Proposal
  │
  ├── Passed
  │     │
  │     ▼
  │  Execute Proposal
  │
  └── Rejected
        │
        ▼
   Release Reserved Funds
```

The current implementation can also execute the treasury payment directly when the final vote causes the proposal to reach the required threshold.

---

# Treasury Settlement

The actual treasury payment is performed by the program's internal:

```text
execute_treasury_payment
```

This function:

1. Transfers SOL from the program-controlled Treasury PDA
2. Sends it to the immutable proposal recipient
3. Updates treasury accounting
4. Updates reserved funds
5. Marks the proposal as executed

MagicBlock does not replace this business logic.

The governance rules remain defined by the PayDAO Anchor program.

---

# Core Program Instructions

| Instruction                   | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| `initialize_group`            | Create DAO group and treasury                 |
| `contribute`                  | Deposit SOL and establish/update membership   |
| `create_proposal`             | Create treasury proposal                      |
| `cast_private_vote`           | Cast a member vote                            |
| `finalize_proposal`           | Determine final proposal status               |
| `execute_proposal`            | Execute a passed proposal                     |
| `realtime_heartbeat`          | Mutate realtime governance state              |
| `delegate_group`              | Delegate Group to MagicBlock                  |
| `delegate_proposal`           | Delegate Proposal to MagicBlock               |
| `delegate_treasury`           | Delegate Treasury to MagicBlock               |
| `commit_group`                | Commit Group state                            |
| `commit_proposal`             | Commit Proposal state                         |
| `commit_treasury`             | Commit Treasury state                         |
| `commit_governance_state`     | Atomically commit Group + Proposal + Treasury |
| `undelegate_governance_state` | Commit and undelegate governance state        |

---

# MagicBlock Account Contexts

The integration uses the SDK's delegation and commit account macros.

### Delegation

```rust
#[delegate]
#[derive(Accounts)]
pub struct DelegateGroup<'info> {
    pub payer: Signer<'info>,

    /// CHECK: MagicBlock delegated account.
    #[account(mut, del)]
    pub group: UncheckedAccount<'info>,
}
```

Equivalent delegation contexts exist for:

```text
DelegateGroup
DelegateProposal
DelegateTreasury
```

### Commit

PayDAO defines:

```text
CommitGroup
CommitProposal
CommitTreasury
CommitGovernanceState
```

The final context contains all three governance accounts:

```rust
#[commit]
#[derive(Accounts)]
pub struct CommitGovernanceState<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub group: Account<'info, Group>,

    #[account(mut)]
    pub proposal: Account<'info, Proposal>,

    #[account(mut)]
    pub treasury: Account<'info, Treasury>,
}
```

This makes the MagicBlock integration visible directly at the program-account level rather than hiding it behind an external service.

---

# Why This Architecture?

## Without an Ephemeral Execution Layer

A highly interactive governance application would need every state mutation to operate directly through the base-layer execution path.

That can make realtime interaction less attractive.

## With MagicBlock

PayDAO can selectively move active governance state into an Ephemeral Rollup:

```text
                 BASE LAYER
                  Solana
                    │
                 delegate
                    ▼
             MAGICBLOCK ER
                    │
          Active governance
                    │
                 commit
                    ▼
                 Solana
```

The important point is **selective delegation**, not replacing Solana.

---

# Security Boundaries

PayDAO intentionally keeps important protocol rules inside the Anchor program.

### PDA-controlled state

The protocol derives deterministic accounts for:

```text
Group
Treasury
Member
Proposal
VoteReceipt
```

### Treasury authority

Treasury payments are performed through program-controlled logic rather than allowing arbitrary users to transfer treasury funds.

### Vote replay protection

A deterministic VoteReceipt prevents a wallet from submitting multiple votes for the same proposal.

### Proposal reservation

Proposal creation reserves treasury funds before governance completion.

### Immutable recipient

The proposal recipient is used as the destination of the eventual treasury payment rather than allowing the destination to be changed during execution.

---

# Frontend

PayDAO's frontend is a React application designed around realtime DAO interaction.

### Stack

* React 18
* TypeScript
* Vite
* Tailwind CSS
* Framer Motion
* Lucide
* React Router
* Solana Web3.js
* Anchor
* Solana Wallet Adapter

The frontend provides interfaces for:

```text
Dashboard
   │
   ├── Groups
   ├── Treasury
   ├── Proposals
   ├── Voting
   └── Governance activity
```

The frontend communicates directly with the Solana program and wallet.

---

# Technology Stack

## Blockchain

* Solana
* Anchor
* Rust

## Realtime Execution

* MagicBlock
* Ephemeral Rollups SDK
* Magic Intent Bundle Builder

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Framer Motion
* Solana Wallet Adapter

## Development

* Rust / Cargo
* Anchor CLI
* Solana CLI
* Node.js
* npm

---

# Project Structure

```text
paydao/
│
├── programs/
│   └── paydao-proof/
│       └── src/
│           └── lib.rs
│
├── app/
│   ├── components/
│   ├── pages/
│   ├── chain/
│   ├── hooks/
│   └── types/
│
├── idl/
│   └── paydao_proof.json
│
├── migrations/
│
├── Anchor.toml
├── Cargo.toml
├── package.json
└── README.md
```

---

# Program Configuration

### Network

```text
Solana Devnet
```

### Program ID

```text
Eo8z84VpZvhf86i6c9yzmrfMcjSGwT6hhYfjhK6HugvG
```

---

# Local Development

## Prerequisites

Install:

* Node.js
* Rust
* Cargo
* Solana CLI
* Anchor CLI
* A Solana-compatible wallet

Verify:

```bash
node --version
rustc --version
cargo --version
solana --version
anchor --version
```

---

## Clone

```bash
git clone <your-repository-url>
cd paydao
```

Install frontend dependencies:

```bash
npm install
```

---

## Configure Solana

```bash
solana config set --url devnet
```

Make sure your wallet is configured:

```bash
solana address
```

---

## Build the Program

```bash
anchor build
```

---

## Deploy

```bash
anchor deploy
```

After deployment, verify that the generated program ID matches:

```text
Eo8z84VpZvhf86i6c9yzmrfMcjSGwT6hhYfjhK6HugvG
```

---

## Start the Frontend

```bash
npm run dev
```

Then open the local development URL shown by Vite.

---

# Suggested BlitzX Demo

The strongest demo path is to show the complete lifecycle rather than only the UI.

### 1. Create a DAO

```text
Initialize Group
       │
       ▼
Group PDA + Treasury PDA
```

### 2. Fund the Treasury

```text
Wallet
  │
  ▼
Contribute SOL
  │
  ▼
Treasury
```

### 3. Create a Proposal

```text
Proposal
 ├── recipient
 ├── amount
 └── description
```

### 4. Delegate Active Governance

Show:

```text
Group → MagicBlock
Proposal → MagicBlock
Treasury → MagicBlock
```

### 5. Demonstrate Realtime State

Execute the realtime heartbeat and show the governance state changing while delegated.

### 6. Vote

Members cast:

```text
YES
NO
ABSTAIN
```

### 7. Commit Governance State

Use the atomic commit:

```text
Group
Proposal
Treasury
      │
      ▼
Magic Intent Bundle
      │
      ▼
Solana
```

### 8. Execute Treasury Payment

A passed proposal can then settle its treasury payment through the program.

---

# What Makes PayDAO Different?

PayDAO is not simply:

> "A DAO frontend on Solana."

The protocol is built around the distinction between **durable settlement** and **active governance execution**.

```text
                 PAYDAO
                    │
       ┌────────────┴────────────┐
       │                         │
       ▼                         ▼
    SOLANA                   MAGICBLOCK
       │                         │
 Durable state              Active state
 Treasury                   Delegated accounts
 Settlement                 Realtime mutations
 Ownership                  Fast execution
       │                         │
       └────────────┬────────────┘
                    │
                    ▼
             DAO GOVERNANCE
```

This gives PayDAO a clear path toward more interactive decentralized organizations without abandoning Solana as the settlement layer.

---

# Design Principles

### 1. Solana remains the source of durable settlement

The treasury and protocol rules are defined by the Solana program.

### 2. MagicBlock is used where realtime execution matters

Only selected governance accounts are delegated.

### 3. Delegation is explicit

PayDAO exposes explicit instructions for:

```text
delegate
commit
commit + undelegate
```

### 4. Governance state can be committed atomically

Group, Proposal, and Treasury can be synchronized together.

### 5. Business logic remains on-chain

Treasury accounting, voting validation, proposal state transitions, and payment execution remain part of the Anchor program.

---

# Current Scope

The current implementation includes:

* DAO/group creation
* SOL treasury contributions
* Member account creation
* Proposal creation
* Treasury reservation
* Member voting
* Vote receipts
* Vote aggregation
* Proposal finalization
* Treasury proposal execution
* MagicBlock Ephemeral Rollup integration
* Group delegation
* Proposal delegation
* Treasury delegation
* Realtime governance state mutation
* Individual state commits
* Atomic governance-state commit
* Commit + undelegate

---

# Roadmap

The architecture leaves room for additional MagicBlock-powered governance features.

### Realtime Governance Sessions

Allow active proposals to maintain a richer realtime execution session.

### Richer Governance Events

Expand realtime state beyond the current heartbeat mechanism.

### Advanced Voting Privacy

Introduce a dedicated cryptographic privacy mechanism if anonymous voting becomes a protocol requirement.

### More Delegated State

Evaluate additional governance accounts that benefit from Ephemeral Rollup execution.

### Production Deployment

Move from the current Devnet/hackathon environment toward audited production deployment.

---

# Important Implementation Notes

PayDAO deliberately does not claim capabilities that are not implemented in the current program.

### MagicBlock is not the privacy layer

The current voting implementation does not provide cryptographic anonymity.

### Proposal creation is permissionless

Any wallet can currently create a proposal.

### Voting requires membership

The voter must have a valid Member account associated with the group.

### Quorum configuration exists

The Group stores `quorum_bps`, but the currently shown finalization logic primarily relies on voting participation and threshold conditions rather than using quorum as an independent decision rule.

### Proposal execution is explicit

Finalizing a proposal and executing a treasury payment are separate concepts, although the final vote path can trigger execution when the threshold is reached.

These boundaries are intentional and make the current protocol easier to reason about and extend.

---

# The Core Idea

PayDAO's architecture can be summarized in one sentence:

> **Use Solana for what must be durable, and MagicBlock for what benefits from realtime execution.**

The result is a DAO treasury system where governance can become more interactive without turning the Ephemeral Rollup into a replacement for the underlying blockchain.

```text
                ┌──────────────────────┐
                │       PAYDAO         │
                │                      │
                │  DAO Treasury        │
                │  Governance          │
                │  Voting              │
                └──────────┬───────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌──────────────┐        ┌────────────────┐
       │    SOLANA    │        │   MAGICBLOCK   │
       │              │        │                │
       │ Durable      │◄──────►│ Ephemeral      │
       │ Settlement   │ commit │ Execution      │
       │ Treasury     │        │ Realtime State │
       │ Ownership    │        │ Governance     │
       └──────────────┘        └────────────────┘
```

## PayDAO

**Decentralized treasury governance, designed for realtime execution.**

Built with **Solana + Anchor + MagicBlock Ephemeral Rollups**.

---

## License

Add the project's chosen license here before public production release.
