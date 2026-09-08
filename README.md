# PayDAO

### Realtime DAO Treasury Governance on Solana powered by MagicBlock Ephemeral Rollups

<p align="center">
  <strong>Govern together. Execute automatically. Settle on Solana.</strong>
</p>

<p align="center">
  PayDAO is a decentralized treasury governance protocol that combines
  <strong>Solana</strong> for durable state and settlement with
  <strong>MagicBlock Ephemeral Rollups</strong> for realtime governance execution.
</p>

---

## 🏆 BlitzX Hackathon

PayDAO is built around one question:

> **Can DAO treasury governance be realtime without giving up Solana's programmable security and durable settlement?**

PayDAO approaches this by separating **active governance execution** from **durable settlement**.

Instead of forcing every interactive governance state transition to happen directly on Solana, PayDAO can selectively delegate its governance state to **MagicBlock Ephemeral Rollups**.

The core architecture is:

```text
              ┌─────────────────────┐
              │       PAYDAO        │
              │                     │
              │ DAO Treasury        │
              │ Proposals            │
              │ Voting               │
              │ Governance           │
              └──────────┬──────────┘
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
      ┌──────────────┐       ┌──────────────────┐
      │    SOLANA    │       │    MAGICBLOCK    │
      │              │◄─────►│ Ephemeral Rollup │
      │ Durable State│ commit│                  │
      │ Treasury     │       │ Realtime State   │
      │ Settlement   │       │ Active Governance│
      │ Ownership    │       │ Fast Execution   │
      └──────────────┘       └──────────────────┘
```

**Solana is the durable settlement layer.
MagicBlock is the realtime execution layer.**

---

# Why PayDAO?

DAO treasury management normally involves several problems:

* Governance interactions can be slow.
* Treasury decisions require strict authorization.
* Multiple members need to coordinate around proposals.
* Voting state must prevent duplicate participation.
* Passed proposals still need to be executed.
* Interactive governance is difficult to make feel realtime.

PayDAO combines:

**DAO governance + treasury management + voting + automatic execution + MagicBlock Ephemeral Rollups**

into one on-chain protocol.

---

# Why MagicBlock?

MagicBlock is not used as an external API, database, or centralized backend.

It is integrated directly into the **Anchor program**.

PayDAO uses the MagicBlock Ephemeral Rollups SDK to:

* Mark the program as Ephemeral Rollup compatible
* Delegate DAO Group state
* Delegate Proposal state
* Delegate Treasury state
* Perform realtime governance mutations
* Commit individual accounts
* Atomically commit governance state
* Commit and undelegate governance state
* Optionally target a specific validator
* Build and invoke Magic Intent Bundles

The integration is implemented directly in Rust.

```rust
use ephemeral_rollups_sdk::anchor::{
    commit,
    delegate,
    ephemeral,
};

use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;
```

The program itself is marked:

```rust
#[ephemeral]
#[program]
pub mod paydao_proof {
    // ...
}
```

This makes MagicBlock part of the protocol architecture rather than simply an infrastructure dependency.

---

# Architecture

```text
                         PAYDAO
                           │
                           ▼
                 ┌─────────────────────┐
                 │    React Frontend   │
                 │                     │
                 │ Groups              │
                 │ Proposals           │
                 │ Voting              │
                 │ Treasury            │
                 │ Governance          │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │    Anchor Program   │
                 │     paydao_proof    │
                 │                     │
                 │ Governance Rules    │
                 │ Voting Rules        │
                 │ Treasury Rules      │
                 │ Delegation          │
                 │ Commit              │
                 └──────────┬──────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
        ┌─────────────────┐   ┌─────────────────────┐
        │     SOLANA      │   │     MAGICBLOCK      │
        │                 │   │   Ephemeral Rollup  │
        │ Durable State   │◄─►│                     │
        │ Treasury        │   │ Delegated State     │
        │ Settlement      │   │ Realtime Execution  │
        │ Ownership       │   │ Governance Sessions │
        └─────────────────┘   └─────────────────────┘
```

---

# The Three Core Delegated Accounts

PayDAO explicitly integrates MagicBlock with three governance-critical accounts.

```text
                    DAO
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
      Group       Proposal      Treasury
        │            │            │
        └────────────┼────────────┘
                     │
                     ▼
             MagicBlock ER
```

## Group

The Group represents the DAO itself.

It contains governance configuration and realtime state including:

* Creator
* Group identifier
* Member count
* Current treasury balance
* Reserved treasury balance
* Voting threshold
* Quorum configuration
* Voting deadline
* Privacy authority
* Active state
* Realtime nonce

---

## Proposal

A Proposal represents a treasury decision.

It contains information such as:

* Proposal ID
* Group
* Creator
* Recipient
* Requested amount
* Description
* Proposal status
* Vote counts
* Voter count
* Deadline
* Reserved treasury amount

---

## Treasury

The Treasury represents the group's SOL-controlled treasury account.

Treasury accounting tracks:

```text
current_lamports
reserved_lamports
```

The program controls treasury payments through its own authorization logic.

---

# MagicBlock Integration

## 1. Delegate Group

PayDAO exposes:

```text
delegate_group
```

The instruction derives the Group PDA and delegates it to MagicBlock.

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

The validator can optionally be supplied through `remaining_accounts`.

---

# 2. Delegate Proposal

Active proposals can be delegated using:

```text
delegate_proposal
```

The proposal PDA is derived from:

```text
proposal
+ group
+ proposal_id
```

and delegated through the MagicBlock SDK.

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

---

# 3. Delegate Treasury

The DAO Treasury can also be delegated.

Its PDA is derived from:

```text
treasury
+ group
```

and delegated with:

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

The treasury does not become uncontrolled by delegation.

The PayDAO Anchor program still defines how treasury funds can be moved.

---

# Realtime Governance

PayDAO includes explicit realtime state that can be mutated while governance state is active.

The Group contains:

```text
realtime_nonce
```

The program exposes:

```text
realtime_heartbeat
```

which increments that value.

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

This provides a concrete realtime state transition for the delegated governance environment.

The architecture becomes:

```text
Solana
   │
   │ delegate
   ▼
MagicBlock Ephemeral Rollup
   │
   ├── Group
   ├── Proposal
   └── Treasury
   │
   ▼
Realtime governance mutations
   │
   ▼
Commit
   │
   ▼
Solana
```

---

# Commit Back to Solana

Delegation is only one half of the architecture.

PayDAO also provides explicit mechanisms to commit delegated state back to Solana.

The Magic Intent Bundle Builder is used for this:

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

Individual commit instructions exist for:

* Group
* Proposal
* Treasury

---

# Atomic Governance Commit

Because Group, Proposal, and Treasury are logically connected, PayDAO also supports an atomic governance-state commit.

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

This commits:

```text
┌──────────────┐
│    Group     │
├──────────────┤
│   Proposal   │
├──────────────┤
│   Treasury   │
└──────────────┘
       │
       ▼
Magic Intent Bundle
       │
       ▼
     Solana
```

This is particularly useful because a governance decision can affect all three accounts.

---

# Commit + Undelegate

PayDAO can also commit governance state and return it to the normal Solana lifecycle.

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

The lifecycle is:

```text
              SOLANA
                 │
              delegate
                 │
                 ▼
       MAGICBLOCK EPHEMERAL
             ROLLUP
                 │
                 │
        Active Governance
                 │
                 ▼
              commit
                 │
                 ▼
              SOLANA
                 │
                 ▼
          Durable State
```

Or:

```text
delegate
   ↓
execute
   ↓
commit + undelegate
   ↓
Solana durable state
```

---

# 🗳️ How Voting Works

PayDAO's governance flow is designed around member-controlled treasury decisions.

The voting lifecycle is:

```text
Proposal Created
       │
       ▼
Treasury Funds Reserved
       │
       ▼
Voting Begins
       │
       ▼
Member Submits Vote
       │
       ▼
VoteReceipt PDA Created
       │
       ▼
Aggregate Vote Updated
       │
       ▼
All Required Members Voted?
       │
       ├──────── NO ────────► Continue Voting
       │
       ▼
      YES
       │
       ▼
Calculate Approval
       │
       ├──────── Threshold Not Met
       │                │
       │                ▼
       │          Reject Proposal
       │                │
       │                ▼
       │        Release Reservation
       │
       ▼
Threshold Reached
       │
       ▼
Automatic Treasury Execution
       │
       ▼
SOL Transfer
       │
       ▼
Proposal = Executed
```

---

# 🔒 Vote Choice Privacy

PayDAO separates the **individual vote choice** from the public aggregate voting result.

The proposal maintains aggregate values:

```text
YES
NO
ABSTAIN
TOTAL VOTERS
```

The `VoteReceipt` PDA is derived from:

```text
VOTE_SEED
+ proposal
+ voter
```

This prevents a wallet from submitting multiple votes for the same proposal.

The current receipt tracks the voter, but **does not store the selected YES/NO/ABSTAIN choice as a field**.

Therefore:

> **PayDAO does not expose an individual YES/NO/ABSTAIN value through the VoteReceipt itself; the proposal exposes aggregate voting results.**

### Important distinction

The current implementation should **not** be described as cryptographically anonymous voting.

The voter's public key is stored in the VoteReceipt.

So PayDAO currently provides **vote-choice separation from the participation receipt**, rather than full wallet anonymity.

A future cryptographic voting layer could provide stronger anonymity if required.

---

# 👤 Who Can Vote?

A voter must have a valid Member PDA for the DAO.

The voting instruction validates:

```text
Wallet
  │
  ▼
Member PDA
  │
  ├── Missing → Reject
  │
  ▼
Proposal active?
  │
  ├── No → Reject
  │
  ▼
VoteReceipt exists?
  │
  ├── Yes → Reject duplicate vote
  │
  ▼
Accept vote
```

---

# Can the Proposal Creator Vote?

Yes — **if the proposal creator is also a DAO member**.

Proposal creation itself is permissionless in the current implementation.

However, voting requires membership.

Therefore:

```text
Proposal Creator
      │
      ├── DAO Member
      │      │
      │      ▼
      │    CAN VOTE
      │
      └── Not a Member
             │
             ▼
          CANNOT VOTE
```

This distinction is enforced by the voting instruction.

---

# ⚡ Automatic Treasury Execution

One of PayDAO's key features is that the final vote can trigger treasury execution directly from the program.

After the vote is recorded, PayDAO evaluates the aggregate voting result.

If the required threshold is reached:

```text
cast_private_vote()
        │
        ▼
Aggregate vote updated
        │
        ▼
Threshold satisfied
        │
        ▼
execute_treasury_payment()
        │
        ├── Transfer SOL
        ├── Update treasury balance
        ├── Update reserved balance
        └── Mark proposal Executed
```

There is no centralized backend responsible for deciding whether the treasury should execute.

The frontend does not have authority to bypass the governance rules.

The Anchor program performs the actual treasury payment.

---

# Example

Imagine a DAO with five members voting on:

```text
Proposal
──────────────
Recipient: Treasury-approved destination
Amount:    10 SOL
Members:   5
```

Votes:

```text
Member 1 → YES
Member 2 → YES
Member 3 → NO
Member 4 → YES
Member 5 → YES
```

Aggregate state:

```text
YES:       4
NO:        1
ABSTAIN:   0
Voters:    5
```

If the configured threshold is satisfied:

```text
Final Vote
    │
    ▼
Threshold Reached
    │
    ▼
Proposal Passed
    │
    ▼
execute_treasury_payment()
    │
    ▼
10 SOL transferred
    │
    ▼
Proposal = Executed
```

The complete lifecycle becomes:

> **Vote → Validate → Decide → Execute → Settle**

---

# 💰 Treasury Model

The treasury is controlled by the program.

Users contribute SOL through:

```text
contribute
```

The flow is:

```text
Contributor
     │
     ▼
contribute()
     │
     ├── Transfer SOL
     ├── Update current_lamports
     ├── Create/update Member PDA
     └── Update member_count
     │
     ▼
Treasury PDA
```

---

# Proposal Treasury Reservation

When a proposal is created, the requested treasury amount is reserved.

```text
Treasury
──────────────
Current Funds
Reserved Funds
Available Funds
```

This gives the governance system accounting state around pending proposals.

If a proposal does not pass, the reserved amount can be released.

If it executes, the treasury accounting is updated as part of the payment.

---

# 🏦 Treasury Settlement

The actual treasury payment is handled by:

```text
execute_treasury_payment
```

The helper:

1. Transfers SOL from the program-controlled Treasury PDA
2. Sends funds to the proposal recipient
3. Updates `current_lamports`
4. Updates `reserved_lamports`
5. Marks the proposal as `Executed`

The frontend cannot simply call an arbitrary transfer and bypass this process.

---

# Governance State Model

```text
                    GROUP
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
       Members     Proposals    Treasury
                      │
                      ▼
                    Votes
                      │
                      ▼
                VoteReceipt
                      │
                      ▼
              Aggregate Result
                      │
             ┌────────┴────────┐
             ▼                 ▼
          Rejected            Passed
             │                 │
             ▼                 ▼
      Release Reserve    Treasury Execute
                               │
                               ▼
                           Executed
```

---

# Program Instructions

| Instruction                   | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `initialize_group`            | Creates a DAO group and treasury                        |
| `contribute`                  | Adds SOL to the treasury and creates/updates membership |
| `create_proposal`             | Creates a treasury proposal                             |
| `cast_private_vote`           | Validates and records a member vote                     |
| `finalize_proposal`           | Finalizes proposal status after voting conditions       |
| `execute_proposal`            | Executes an already-passed proposal                     |
| `realtime_heartbeat`          | Mutates realtime governance state                       |
| `delegate_group`              | Delegates Group to MagicBlock                           |
| `delegate_proposal`           | Delegates Proposal to MagicBlock                        |
| `delegate_treasury`           | Delegates Treasury to MagicBlock                        |
| `commit_group`                | Commits Group state                                     |
| `commit_proposal`             | Commits Proposal state                                  |
| `commit_treasury`             | Commits Treasury state                                  |
| `commit_governance_state`     | Atomically commits Group + Proposal + Treasury          |
| `undelegate_governance_state` | Commits and undelegates governance state                |

---

# 🔐 Security Model

PayDAO keeps critical governance rules inside the Anchor program.

## PDA-Based State

The protocol uses deterministic PDAs for:

```text
Group
Treasury
Member
Proposal
VoteReceipt
```

---

## Treasury Control

Treasury funds are controlled through program logic.

Users cannot simply withdraw arbitrary treasury funds.

---

## Duplicate Vote Protection

The VoteReceipt PDA:

```text
vote + proposal + voter
```

prevents duplicate participation for the same proposal.

---

## Membership Validation

Voting requires a valid Member account.

---

## Proposal Reservation

Proposal creation reserves treasury funds before the proposal can consume them.

---

## Recipient Integrity

The proposal recipient is part of the proposal state and is used during treasury execution.

---

## Arithmetic Safety

The program uses checked arithmetic for important state mutations such as:

* Treasury balances
* Reserved balances
* Member counts
* Proposal counters
* Realtime nonce

---

# MagicBlock Security Boundary

MagicBlock does not replace PayDAO's governance rules.

The responsibilities are separated:

```text
┌─────────────────────────────────────┐
│             SOLANA                  │
│                                     │
│ Durable ownership                   │
│ Program authority                  │
│ Treasury settlement                │
│ Final committed state              │
└──────────────────┬──────────────────┘
                   │
                   │
┌──────────────────▼──────────────────┐
│          MAGICBLOCK ER              │
│                                     │
│ Delegated execution                │
│ Active governance state             │
│ Realtime mutations                  │
└─────────────────────────────────────┘
```

MagicBlock provides the execution environment.

PayDAO defines the governance protocol.

---

# Frontend

PayDAO uses a React-based frontend designed around DAO interaction.

## Stack

* React 18
* TypeScript
* Vite
* Tailwind CSS
* Framer Motion
* Lucide
* React Router
* Anchor
* `@solana/web3.js`
* Solana Wallet Adapter

The frontend provides interfaces for:

```text
Dashboard
Groups
Treasury
Proposals
Voting
Governance Activity
```

The application communicates with the Solana program through the connected wallet.

---

# No Centralized Backend

PayDAO does not depend on a Go backend for its core protocol.

The architecture is intentionally simplified:

```text
                 User
                  │
                  ▼
             React App
                  │
                  ▼
          Solana Wallet
                  │
                  ▼
           Anchor Program
             /        \
            /          \
           ▼            ▼
       Solana       MagicBlock
       Base Layer      ER
```

This means the core governance and treasury lifecycle is not dependent on a centralized application server.

---

# Technology Stack

### Blockchain

* Solana
* Anchor
* Rust

### Realtime Execution

* MagicBlock Ephemeral Rollups
* `ephemeral_rollups_sdk`
* Magic Intent Bundle Builder

### Frontend

* React 18
* TypeScript
* Vite
* Tailwind CSS
* Framer Motion
* Lucide
* React Router

### Solana Client

* `@coral-xyz/anchor`
* `@solana/web3.js`
* Solana Wallet Adapter

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

## Network

```text
Solana Devnet
```

## Program ID

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
* Solana-compatible wallet

Verify:

```bash
node --version
rustc --version
cargo --version
solana --version
anchor --version
```

---

# Clone the Repository

```bash
git clone <repository-url>
cd paydao
```

Install dependencies:

```bash
npm install
```

---

# Configure Solana

```bash
solana config set --url devnet
```

Check the configured wallet:

```bash
solana address
```

Make sure the wallet has enough Devnet SOL for development and testing.

---

# Build

```bash
anchor build
```

---

# Deploy

```bash
anchor deploy
```

Verify that the deployed program ID matches:

```text
Eo8z84VpZvhf86i6c9yzmrfMcjSGwT6hhYfjhK6HugvG
```

---

# Run Frontend

```bash
npm run dev
```

Open the Vite development URL displayed in the terminal.

---

# 🧪 BlitzX Demo Flow

For the strongest demonstration, run the protocol from creation to settlement.

## Step 1 — Create DAO

```text
initialize_group
      │
      ├── Group PDA
      └── Treasury PDA
```

---

## Step 2 — Fund Treasury

Contribute SOL:

```text
Wallet
  │
  ▼
contribute()
  │
  ▼
Treasury
```

Membership is established as part of contribution.

---

## Step 3 — Create Proposal

Create a treasury proposal:

```text
Recipient
Amount
Description
Deadline
```

The requested treasury amount becomes reserved.

---

## Step 4 — Delegate Governance

Demonstrate the MagicBlock integration:

```text
Group      ──► MagicBlock
Proposal   ──► MagicBlock
Treasury   ──► MagicBlock
```

---

## Step 5 — Demonstrate Realtime State

Call:

```text
realtime_heartbeat
```

and show the realtime governance state changing.

This demonstrates that the delegated Group state is participating in realtime execution.

---

## Step 6 — Vote

Members vote:

```text
YES
NO
ABSTAIN
```

Each member receives one VoteReceipt per proposal.

---

## Step 7 — Reach Threshold

Once the voting conditions and configured threshold are satisfied:

```text
Vote
 │
 ▼
Threshold
 │
 ▼
Proposal Passed
```

---

## Step 8 — Automatic Execution

The program can immediately call:

```text
execute_treasury_payment
```

from the final vote path.

```text
Final Vote
    │
    ▼
Threshold Reached
    │
    ▼
Treasury Payment
    │
    ▼
Proposal Executed
```

---

## Step 9 — Commit Governance State

Demonstrate:

```text
Group
Proposal
Treasury
   │
   ▼
Magic Intent Bundle
   │
   ▼
Commit
   │
   ▼
Solana
```

This demonstrates the complete MagicBlock lifecycle.

---

# End-to-End Protocol

The entire PayDAO architecture can be summarized as:

```text
                    USER
                     │
                     ▼
                React App
                     │
                     ▼
                Solana Wallet
                     │
                     ▼
              Anchor Program
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
     SOLANA                 MAGICBLOCK ER
        │                         │
        │                    Delegated State
        │                         │
        │                    ┌────┴────┐
        │                    │         │
        │                  Group   Proposal
        │                    │         │
        │                    └────┬────┘
        │                         │
        │                     Treasury
        │                         │
        │                         ▼
        │                   Active Voting
        │                         │
        │                         ▼
        │                   Vote Aggregation
        │                         │
        │                         ▼
        │                    Threshold Check
        │                         │
        │              ┌──────────┴──────────┐
        │              │                     │
        │           Rejected               Passed
        │              │                     │
        │              ▼                     ▼
        │       Release Reserve       Auto Execute
        │                                    │
        │                                    ▼
        │                             Treasury Payment
        │                                    │
        └───────────────────────┬────────────┘
                                │
                              Commit
                                │
                                ▼
                             SOLANA
                                │
                                ▼
                        Durable Settlement
```

---

# What Makes PayDAO Different?

PayDAO is not simply another DAO dashboard.

The protocol combines three important properties:

### 1. Programmable Treasury Governance

Treasury funds are governed by an Anchor program rather than a centralized operator.

### 2. Realtime Execution

MagicBlock Ephemeral Rollups provide a dedicated execution environment for delegated governance state.

### 3. Automatic Settlement

When the final governance conditions are satisfied, the program can execute the treasury payment directly.

Together:

```text
Realtime Governance
        +
Programmable Treasury
        +
Automatic Execution
        +
Solana Settlement
```

form the core PayDAO architecture.

---

# Why Selective Delegation?

PayDAO deliberately does not attempt to move everything into the Ephemeral Rollup.

Instead:

```text
              Solana
                 │
       Durable governance state
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
      Group            Treasury
        │                 │
        └───────┬─────────┘
                │
             Proposal
                │
                ▼
          MagicBlock ER
```

Only governance state that benefits from active execution is delegated.

This creates a clear separation between:

**durability** and **realtime execution**.

---

# Current Implementation

The current PayDAO implementation includes:

* DAO/group creation
* SOL treasury contributions
* Member creation
* Permissionless proposal creation
* Treasury reservation
* Member voting
* Vote receipts
* Aggregate voting
* Proposal finalization
* Automatic treasury execution from the final vote path
* Explicit proposal execution
* MagicBlock Ephemeral Rollup compatibility
* Group delegation
* Proposal delegation
* Treasury delegation
* Realtime heartbeat state
* Individual account commits
* Atomic governance-state commits
* Commit + undelegate

---

# Implementation Boundaries

PayDAO intentionally documents what the current implementation does and does not provide.

### Voting Privacy

The current implementation separates vote choice from the VoteReceipt, but the voter's public key is stored.

Therefore it is **not full cryptographic anonymous voting**.

### Proposal Creation

Any wallet can currently create a proposal.

### Voting

Voting requires DAO membership.

### Quorum

The Group stores `quorum_bps`, but the currently shown decision logic primarily uses participation and threshold conditions rather than quorum as an independent decision rule.

### Execution

The final vote can trigger automatic execution when the configured threshold is satisfied.

`finalize_proposal` and `execute_proposal` also exist as explicit lifecycle instructions.

### MagicBlock

MagicBlock is used for delegated execution and realtime state.

It is not presented as the privacy mechanism.

---

# Future Roadmap

## Cryptographically Private Voting

Add a dedicated cryptographic voting mechanism for stronger voter anonymity.

## Rich Realtime Governance

Expand realtime state beyond the current heartbeat into richer governance sessions.

## Advanced Governance Policies

Support:

* Multiple approval strategies
* Time-weighted voting
* Token-weighted voting
* Delegated voting
* Multi-stage proposals

## Expanded MagicBlock State

Evaluate additional governance accounts and interactions that benefit from Ephemeral Rollup execution.

## Production Hardening

Before mainnet deployment:

* Formal security review
* Program audit
* Extensive integration tests
* Economic attack analysis
* Failure/recovery testing
* Mainnet operational monitoring

---

# The PayDAO Thesis

DAOs should not have to choose between:

```text
Realtime UX
      OR
Blockchain settlement
```

PayDAO is built around:

```text
                 PAYDAO
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
     SOLANA                 MAGICBLOCK
        │                       │
        │                       │
 Durable Settlement       Realtime Execution
 Treasury                 Active Governance
 Ownership                Delegated State
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
             AUTOMATIC GOVERNANCE
                    │
                    ▼
             TREASURY SETTLEMENT
```

**Solana provides the durable foundation.**

**MagicBlock provides the realtime execution environment.**

**PayDAO connects the two into a programmable DAO treasury system.**

---

# 🚀 One-Line Summary

> **PayDAO is a Solana DAO treasury protocol that uses MagicBlock Ephemeral Rollups for realtime governance and automatically executes approved treasury decisions through on-chain program logic.**

---

# Built With

**Solana · Anchor · Rust · MagicBlock Ephemeral Rollups · React · TypeScript · Vite · Tailwind CSS**

---

## License

Add the project's selected open-source license before public production release.
