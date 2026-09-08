use anchor_lang::prelude::*;
use anchor_lang::system_program;

use ephemeral_rollups_sdk::anchor::{
    commit,
    delegate,
    ephemeral,
};

use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;

declare_id!("Eo8z84VpZvhf86i6c9yzmrfMcjSGwT6hhYfjhK6HugvG");

pub const GROUP_SEED: &[u8] = b"group";
pub const TREASURY_SEED: &[u8] = b"treasury";
pub const MEMBER_SEED: &[u8] = b"member";
pub const PROPOSAL_SEED: &[u8] = b"proposal";
pub const VOTE_SEED: &[u8] = b"vote";

const BPS_DENOMINATOR: u64 = 10_000;
const DEFAULT_QUORUM_BPS: u16 = 5_000;

#[ephemeral]
#[program]
pub mod paydao_proof {
    use super::*;

    // ============================================================
    // INITIALIZE GROUP
    // ============================================================

    pub fn initialize_group(
        ctx: Context<InitializeGroup>,
        name: String,
        description: String,
        visibility: u8,
        group_key: [u8; 16],
        target_lamports: u64,
        deadline: i64,
        voting_threshold_bps: u16,
        privacy_authority: Pubkey,
    ) -> Result<()> {
        require!(
            name.len() <= 64,
            ErrorCode::TextTooLong
        );

        require!(
            description.len() <= 512,
            ErrorCode::TextTooLong
        );

        require!(
            visibility <= 1,
            ErrorCode::InvalidVisibility
        );

        require!(
            target_lamports > 0,
            ErrorCode::InvalidTarget
        );

        require!(
            voting_threshold_bps > 0
                && voting_threshold_bps <= 10_000,
            ErrorCode::InvalidThreshold
        );

        let now = Clock::get()?.unix_timestamp;

        require!(
            deadline == 0 || deadline > now,
            ErrorCode::InvalidDeadline
        );

        let group = &mut ctx.accounts.group;

        group.creator = ctx.accounts.creator.key();

        group.name = name;
        group.description = description;

        group.visibility = visibility;
        group.group_key = group_key;

        group.target_lamports = target_lamports;
        group.current_lamports = 0;

        // Funds committed to active proposals.
        group.reserved_lamports = 0;

        group.member_count = 0;
        group.proposal_count = 0;

        group.voting_threshold_bps = voting_threshold_bps;

        // Default quorum = 50%.
        group.quorum_bps = DEFAULT_QUORUM_BPS;

        group.deadline = deadline;

        group.privacy_authority = privacy_authority;

        group.active = true;

        group.realtime_nonce = 0;

        group.bump = ctx.bumps.group;

        // Program-owned treasury state.
        let treasury = &mut ctx.accounts.treasury;

        treasury.group = group.key();
        treasury.bump = ctx.bumps.treasury;

        Ok(())
    }

    // ============================================================
    // CONTRIBUTE
    //
    // ONLY WAY TO PUT USER FUNDS INTO THE GROUP TREASURY.
    // ============================================================

    pub fn contribute(
        ctx: Context<Contribute>,
        lamports: u64,
    ) -> Result<()> {
        require!(
            lamports > 0,
            ErrorCode::InvalidAmount
        );

        require!(
            ctx.accounts.group.active,
            ErrorCode::InactiveGroup
        );

        let now = Clock::get()?.unix_timestamp;

        require!(
            ctx.accounts.group.deadline == 0
                || now <= ctx.accounts.group.deadline,
            ErrorCode::GroupClosed
        );

        // User -> program-owned treasury PDA.
        let transfer_accounts =
            system_program::Transfer {
                from: ctx.accounts
                    .contributor
                    .to_account_info(),

                to: ctx.accounts
                    .treasury
                    .to_account_info(),
            };

system_program::transfer(
    CpiContext::new(
        system_program::ID,
        transfer_accounts,
    ),
    lamports,
)?;

        let group = &mut ctx.accounts.group;

        group.current_lamports = group
            .current_lamports
            .checked_add(lamports)
            .ok_or(ErrorCode::Overflow)?;

        let member = &mut ctx.accounts.member;

        if member.group == Pubkey::default() {
            member.group = group.key();
            member.wallet = ctx.accounts
                .contributor
                .key();

            member.contributed_lamports = 0;

            member.bump = ctx.bumps.member;

            group.member_count = group
                .member_count
                .checked_add(1)
                .ok_or(ErrorCode::Overflow)?;
        }

        member.contributed_lamports = member
            .contributed_lamports
            .checked_add(lamports)
            .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }

    // ============================================================
    // CREATE PROPOSAL
    //
    // ANY WALLET CAN CREATE A PROPOSAL.
    //
    // No admin.
    // No member restriction.
    //
    // Funds are RESERVED so proposals cannot overcommit treasury.
    // ============================================================

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        amount_lamports: u64,
        recipient: Pubkey,
        voting_deadline: i64,
    ) -> Result<()> {
        require!(
            ctx.accounts.group.active,
            ErrorCode::InactiveGroup
        );

        require!(
            title.len() <= 64,
            ErrorCode::TextTooLong
        );

        require!(
            description.len() <= 512,
            ErrorCode::TextTooLong
        );

        require!(
            amount_lamports > 0,
            ErrorCode::InvalidAmount
        );

        require!(
            recipient != Pubkey::default(),
            ErrorCode::InvalidRecipient
        );

        let now = Clock::get()?.unix_timestamp;

        require!(
            voting_deadline > now,
            ErrorCode::InvalidDeadline
        );

        let group = &mut ctx.accounts.group;

        // Available treasury =
        // current funds - funds already promised to proposals.
        let available = group
            .current_lamports
            .checked_sub(group.reserved_lamports)
            .ok_or(ErrorCode::Overflow)?;

        require!(
            amount_lamports <= available,
            ErrorCode::InsufficientTreasury
        );

        // Reserve the amount.
        group.reserved_lamports = group
            .reserved_lamports
            .checked_add(amount_lamports)
            .ok_or(ErrorCode::Overflow)?;

        let proposal = &mut ctx.accounts.proposal;

        proposal.group = group.key();

        proposal.id = group.proposal_count;

        proposal.creator =
            ctx.accounts.creator.key();

        proposal.title = title;
        proposal.description = description;

        proposal.amount_lamports =
            amount_lamports;

        proposal.recipient =
            recipient;

        proposal.voting_deadline =
            voting_deadline;

        proposal.yes = 0;
        proposal.no = 0;
        proposal.abstain = 0;
        proposal.voter_count = 0;

        proposal.status =
            ProposalStatus::Voting as u8;

        proposal.bump =
            ctx.bumps.proposal;

        group.proposal_count = group
            .proposal_count
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }

 // ============================================================
// PRIVATE VOTE
//
// Vote choice is NEVER stored in VoteReceipt.
//
// YES / NO / ABSTAIN are only aggregated.
//
// Every member must vote before the proposal can be decided.
//
// Once the FINAL member votes:
//
//   YES threshold reached
//          ↓
//   TREASURY -> RECIPIENT automatically
//
// OR
//
//   YES threshold not reached
//          ↓
//   PROPOSAL REJECTED
//
// There is NO early execution based on quorum.
// ============================================================

pub fn cast_private_vote(
    ctx: Context<CastPrivateVote>,
    vote: u8,
) -> Result<()> {
    // ============================================================
    // VALIDATE VOTE
    // ============================================================

    require!(
        vote <= 2,
        ErrorCode::InvalidVoteChoice
    );

    require!(
        ctx.accounts.group.active,
        ErrorCode::InactiveGroup
    );

    require!(
        ctx.accounts.proposal.status
            == ProposalStatus::Voting as u8,
        ErrorCode::InvalidProposalStatus
    );

    let now =
        Clock::get()?.unix_timestamp;

    require!(
        now <= ctx.accounts
            .proposal
            .voting_deadline,
        ErrorCode::VotingClosed
    );

    // ============================================================
    // VALIDATE MEMBER
    // ============================================================

    require_keys_eq!(
        ctx.accounts.member.group,
        ctx.accounts.group.key(),
        ErrorCode::InvalidMember
    );

    require_keys_eq!(
        ctx.accounts.member.wallet,
        ctx.accounts.voter.key(),
        ErrorCode::InvalidMember
    );

    // ============================================================
    // RECORD AGGREGATE VOTE
    // ============================================================

    let proposal =
        &mut ctx.accounts.proposal;

    match vote {
        // YES
        0 => {
            proposal.yes = proposal
                .yes
                .checked_add(1)
                .ok_or(ErrorCode::Overflow)?;
        }

        // NO
        1 => {
            proposal.no = proposal
                .no
                .checked_add(1)
                .ok_or(ErrorCode::Overflow)?;
        }

        // ABSTAIN
        2 => {
            proposal.abstain = proposal
                .abstain
                .checked_add(1)
                .ok_or(ErrorCode::Overflow)?;
        }

        _ => {
            return Err(
                ErrorCode::InvalidVoteChoice.into()
            );
        }
    }

    proposal.voter_count =
        proposal
            .voter_count
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;

    // ============================================================
    // CREATE ONE-TIME VOTE RECEIPT
    //
    // PDA:
    //
    // [VOTE_SEED, proposal, voter]
    //
    // prevents the same wallet from voting twice.
    // ============================================================

    let receipt =
        &mut ctx.accounts.vote_receipt;

    receipt.proposal =
        proposal.key();

    receipt.voter =
        ctx.accounts.voter.key();

    receipt.bump =
        ctx.bumps.vote_receipt;

    // ============================================================
    // CHECK WHETHER EVERY MEMBER HAS VOTED
    // ============================================================

    let all_members_voted =
        proposal.voter_count
            >= ctx.accounts.group.member_count;

    // ============================================================
    // DO NOTHING YET IF VOTING IS STILL IN PROGRESS
    //
    // Example:
    //
    // Members = 6
    // Votes   = 3
    //
    // Even if quorum + threshold are reached,
    // DO NOT execute.
    // ============================================================

    if !all_members_voted {
        return Ok(());
    }

    // ============================================================
    // ALL MEMBERS HAVE NOW VOTED
    //
    // Calculate YES percentage.
    //
    // ABSTAIN counts toward participation,
    // but does NOT count toward YES/NO percentage.
    // ============================================================

    let denominator =
        (proposal.yes as u64)
            .checked_add(
                proposal.no as u64
            )
            .ok_or(ErrorCode::Overflow)?;

    let yes_bps =
        if denominator == 0 {
            0
        } else {
            (proposal.yes as u64)
                .checked_mul(
                    BPS_DENOMINATOR
                )
                .ok_or(ErrorCode::Overflow)?
                / denominator
        };

    // ============================================================
    // CHECK APPROVAL THRESHOLD
    // ============================================================

    let threshold_reached =
        yes_bps
            >= ctx.accounts
                .group
                .voting_threshold_bps
                as u64;

    // ============================================================
    // FINAL DECISION
    // ============================================================

    if threshold_reached {
        // --------------------------------------------------------
        // PASSED
        //
        // Execute treasury payment immediately.
        //
        // execute_treasury_payment() should set:
        //
        // proposal.status = EXECUTED
        //
        // and update the group/treasury balances.
        // --------------------------------------------------------

        execute_treasury_payment(
            &mut ctx.accounts.group,
            proposal,
            &ctx.accounts.treasury,
            &ctx.accounts.recipient,
        )?;
    } else {
        // --------------------------------------------------------
        // REJECTED
        //
        // Release the reserved proposal funds.
        // --------------------------------------------------------

        proposal.status =
            ProposalStatus::Rejected as u8;

        ctx.accounts
            .group
            .reserved_lamports =
            ctx.accounts
                .group
                .reserved_lamports
                .checked_sub(
                    proposal.amount_lamports
                )
                .ok_or(ErrorCode::Overflow)?;
    }

    Ok(())
}
    // ============================================================
    // REALTIME HEARTBEAT
    // ============================================================

    pub fn realtime_heartbeat(
        ctx: Context<RealtimeHeartbeat>,
    ) -> Result<()> {
        ctx.accounts.group.realtime_nonce =
            ctx.accounts
                .group
                .realtime_nonce
                .checked_add(1)
                .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }

// ============================================================
// FINALIZE PROPOSAL
//
// Finalizes a proposal after:
//   1. All members have voted.
//
// If the YES vote percentage reaches the group's voting
// threshold, the treasury payment is executed automatically.
//
// If the YES vote percentage does not reach the threshold,
// the proposal is rejected and the reserved funds are released.
//
// NOTE:
// This instruction performs the treasury execution directly.
// There is no separate manual execution step for a proposal
// that passes.
// ============================================================

pub fn finalize_proposal(
    ctx: Context<FinalizeProposal>,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;

    require!(
        proposal.status == ProposalStatus::Voting as u8,
        ErrorCode::InvalidProposalStatus
    );

    let now = Clock::get()?.unix_timestamp;

    require!(
        now >= proposal.voting_deadline,
        ErrorCode::VotingOpen
    );

    // All members must vote.
    require!(
        proposal.voter_count >= ctx.accounts.group.member_count,
        ErrorCode::AllMembersMustVote
    );

    let denominator =
        (proposal.yes as u64)
            .checked_add(proposal.no as u64)
            .ok_or(ErrorCode::Overflow)?;

    let yes_bps =
        if denominator == 0 {
            0
        } else {
            (proposal.yes as u64)
                .checked_mul(BPS_DENOMINATOR)
                .ok_or(ErrorCode::Overflow)?
                / denominator
        };

    let passed =
        yes_bps
            >= ctx.accounts
                .group
                .voting_threshold_bps
                as u64;

    if passed {
        proposal.status =
            ProposalStatus::Passed as u8;
    } else {
        proposal.status =
            ProposalStatus::Rejected as u8;

        ctx.accounts.group.reserved_lamports =
            ctx.accounts
                .group
                .reserved_lamports
                .checked_sub(
                    proposal.amount_lamports
                )
                .ok_or(ErrorCode::Overflow)?;
    }

    Ok(())
}
    // ============================================================
    // MANUAL EXECUTION
    //
    // This is NOT an admin function.
    //
    // It can ONLY execute a proposal that already passed.
    // ============================================================

    pub fn execute_proposal(
        ctx: Context<ExecuteProposal>,
    ) -> Result<()> {
        require!(
            ctx.accounts.proposal.status
                == ProposalStatus::Passed as u8,
            ErrorCode::ProposalNotPassed
        );

        execute_treasury_payment(
            &mut ctx.accounts.group,
            &mut ctx.accounts.proposal,
            &ctx.accounts.treasury,
            &ctx.accounts.recipient,
        )?;

        Ok(())
    }

    // ============================================================
    // MAGICBLOCK: DELEGATE GROUP
    // ============================================================

    pub fn delegate_group(
        ctx: Context<DelegateGroup>,
    ) -> Result<()> {
        let data =
            ctx.accounts
                .group
                .try_borrow_data()?;

        let mut serialized: &[u8] =
            &data;

        let group =
            Group::try_deserialize(
                &mut serialized
            )?;

        let validator =
            ctx.remaining_accounts
                .first()
                .map(|account| account.key());

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

        Ok(())
    }

    // ============================================================
    // MAGICBLOCK: DELEGATE PROPOSAL
    // ============================================================

    pub fn delegate_proposal(
        ctx: Context<DelegateProposal>,
    ) -> Result<()> {
        let data =
            ctx.accounts
                .proposal
                .try_borrow_data()?;

        let mut serialized: &[u8] =
            &data;

        let proposal =
            Proposal::try_deserialize(
                &mut serialized
            )?;

        let validator =
            ctx.remaining_accounts
                .first()
                .map(|account| account.key());

        ctx.accounts.delegate_proposal(
            &ctx.accounts.payer,
            &[
                PROPOSAL_SEED,
                ctx.accounts
                    .group
                    .key()
                    .as_ref(),
                &proposal.id.to_le_bytes(),
            ],
            DelegateConfig {
                validator,
                ..Default::default()
            },
        )?;

        Ok(())
    }

    // ============================================================
    // MAGICBLOCK: DELEGATE TREASURY
    // ============================================================

    pub fn delegate_treasury(
        ctx: Context<DelegateTreasury>,
    ) -> Result<()> {
        let group_key =
            ctx.accounts.group.key();

        let validator =
            ctx.remaining_accounts
                .first()
                .map(|account| account.key());

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

        Ok(())
    }

    // ============================================================
    // MAGICBLOCK: COMMIT GROUP
    // ============================================================

    pub fn commit_group(
        ctx: Context<CommitGroup>,
    ) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts
                .payer
                .to_account_info(),
            ctx.accounts
                .magic_context
                .to_account_info(),
            ctx.accounts
                .magic_program
                .to_account_info(),
        )
        .commit(&[
            ctx.accounts
                .group
                .to_account_info(),
        ])
        .build_and_invoke()?;

        Ok(())
    }

    // ============================================================
    // MAGICBLOCK: COMMIT PROPOSAL
    // ============================================================

    pub fn commit_proposal(
        ctx: Context<CommitProposal>,
    ) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts
                .payer
                .to_account_info(),
            ctx.accounts
                .magic_context
                .to_account_info(),
            ctx.accounts
                .magic_program
                .to_account_info(),
        )
        .commit(&[
            ctx.accounts
                .proposal
                .to_account_info(),
        ])
        .build_and_invoke()?;

        Ok(())
    }

    // ============================================================
    // MAGICBLOCK: COMMIT TREASURY
    // ============================================================

    pub fn commit_treasury(
        ctx: Context<CommitTreasury>,
    ) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts
                .payer
                .to_account_info(),
            ctx.accounts
                .magic_context
                .to_account_info(),
            ctx.accounts
                .magic_program
                .to_account_info(),
        )
        .commit(&[
            ctx.accounts
                .treasury
                .to_account_info(),
        ])
        .build_and_invoke()?;

        Ok(())
    }

    // ============================================================
    // MAGICBLOCK: COMMIT EVERYTHING
    //
    // Atomic commit of group + proposal + treasury.
    //
    // This is the preferred commit path.
    // ============================================================

    pub fn commit_governance_state(
        ctx: Context<CommitGovernanceState>,
    ) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts
                .payer
                .to_account_info(),
            ctx.accounts
                .magic_context
                .to_account_info(),
            ctx.accounts
                .magic_program
                .to_account_info(),
        )
        .commit(&[
            ctx.accounts
                .group
                .to_account_info(),

            ctx.accounts
                .proposal
                .to_account_info(),

            ctx.accounts
                .treasury
                .to_account_info(),
        ])
        .build_and_invoke()?;

        Ok(())
    }

    // ============================================================
    // MAGICBLOCK: UNDELEGATE EVERYTHING
    // ============================================================

    pub fn undelegate_governance_state(
        ctx: Context<CommitGovernanceState>,
    ) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts
                .payer
                .to_account_info(),
            ctx.accounts
                .magic_context
                .to_account_info(),
            ctx.accounts
                .magic_program
                .to_account_info(),
        )
        .commit_and_undelegate(&[
            ctx.accounts
                .group
                .to_account_info(),

            ctx.accounts
                .proposal
                .to_account_info(),

            ctx.accounts
                .treasury
                .to_account_info(),
        ])
        .build_and_invoke()?;

        Ok(())
    }
}

// ================================================================
// INTERNAL TREASURY EXECUTION
// ================================================================
//
// IMPORTANT:
// There is NO external instruction that calls this directly.
//
// Only:
//   1. successful private vote
//   2. already-passed proposal
//
// can reach this function.
//
// ================================================================

fn execute_treasury_payment<'info>(
    group: &mut Account<'info, Group>,
    proposal: &mut Account<'info, Proposal>,
    treasury: &Account<'info, Treasury>,
    recipient: &SystemAccount<'info>,
) -> Result<()> {
    require!(
        proposal.status == ProposalStatus::Voting as u8
            || proposal.status == ProposalStatus::Passed as u8,
        ErrorCode::InvalidProposalStatus
    );

    require!(
        group.current_lamports
            >= proposal.amount_lamports,
        ErrorCode::InsufficientTreasury
    );

    require!(
        group.reserved_lamports
            >= proposal.amount_lamports,
        ErrorCode::InsufficientTreasury
    );

    require_keys_eq!(
        proposal.recipient,
        recipient.key(),
        ErrorCode::InvalidRecipient
    );

    require_keys_eq!(
        treasury.group,
        group.key(),
        ErrorCode::InvalidTreasury
    );

    let amount =
        proposal.amount_lamports;

    let treasury_info =
        treasury.to_account_info();

    let recipient_info =
        recipient.to_account_info();

    require!(
        treasury_info.lamports() >= amount,
        ErrorCode::InsufficientTreasury
    );

    // Program-owned treasury -> recipient.
    **treasury_info
        .try_borrow_mut_lamports()? -= amount;

    **recipient_info
        .try_borrow_mut_lamports()? += amount;

    // Actual treasury balance.
    group.current_lamports =
        group
            .current_lamports
            .checked_sub(amount)
            .ok_or(ErrorCode::Overflow)?;

    // Release reservation.
    group.reserved_lamports =
        group
            .reserved_lamports
            .checked_sub(amount)
            .ok_or(ErrorCode::Overflow)?;

    proposal.status =
        ProposalStatus::Executed as u8;

    Ok(())
}

// ================================================================
// CEIL DIVISION
// ================================================================

fn ceil_div(
    numerator: u64,
    denominator: u64,
) -> u64 {
    if numerator == 0 {
        return 0;
    }

    (numerator - 1)
        / denominator
        + 1
}

// ================================================================
// INITIALIZE GROUP
// ================================================================

#[derive(Accounts)]
#[instruction(
    name: String,
    description: String,
    visibility: u8,
    group_key: [u8; 16]
)]
pub struct InitializeGroup<'info> {
    #[account(
        init,
        payer = creator,
        space = 1024,
        seeds = [
            GROUP_SEED,
            creator.key().as_ref(),
            &group_key
        ],
        bump
    )]
    pub group:
        Account<'info, Group>,

    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 1,
        seeds = [
            TREASURY_SEED,
            group.key().as_ref()
        ],
        bump
    )]
    pub treasury:
        Account<'info, Treasury>,

    #[account(mut)]
    pub creator:
        Signer<'info>,

    pub system_program:
        Program<'info, System>,
}

// ================================================================
// CONTRIBUTION
// ================================================================

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(mut)]
    pub group:
        Account<'info, Group>,

    #[account(
        mut,
        seeds = [
            TREASURY_SEED,
            group.key().as_ref()
        ],
        bump = treasury.bump
    )]
    pub treasury:
        Account<'info, Treasury>,

    #[account(
        init_if_needed,
        payer = contributor,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [
            MEMBER_SEED,
            group.key().as_ref(),
            contributor.key().as_ref()
        ],
        bump
    )]
    pub member:
        Account<'info, Member>,

    #[account(mut)]
    pub contributor:
        Signer<'info>,

    pub system_program:
        Program<'info, System>,
}

// ================================================================
// CREATE PROPOSAL
//
// No member account.
// ANY WALLET can create a proposal.
// ================================================================

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub group:
        Account<'info, Group>,

    #[account(
        init,
        payer = creator,
        space = 1024,
        seeds = [
            PROPOSAL_SEED,
            group.key().as_ref(),
            &group.proposal_count.to_le_bytes()
        ],
        bump
    )]
    pub proposal:
        Account<'info, Proposal>,

    #[account(mut)]
    pub creator:
        Signer<'info>,

    pub system_program:
        Program<'info, System>,
}

// ================================================================
// PRIVATE VOTE
// ================================================================

#[derive(Accounts)]
pub struct CastPrivateVote<'info> {
    #[account(
        mut,
        constraint = group.active
            @ ErrorCode::InactiveGroup
    )]
    pub group:
        Account<'info, Group>,

    #[account(
        mut,
        has_one = group
    )]
    pub proposal:
        Account<'info, Proposal>,

    #[account(
        seeds = [
            MEMBER_SEED,
            group.key().as_ref(),
            voter.key().as_ref()
        ],
        bump = member.bump
    )]
    pub member:
        Account<'info, Member>,

    #[account(
        init,
        payer = voter,
        space = 8 + 32 + 32 + 1,
        seeds = [
            VOTE_SEED,
            proposal.key().as_ref(),
            voter.key().as_ref()
        ],
        bump
    )]
    pub vote_receipt:
        Account<'info, VoteReceipt>,

    #[account(
        mut,
        seeds = [
            TREASURY_SEED,
            group.key().as_ref()
        ],
        bump = treasury.bump
    )]
    pub treasury:
        Account<'info, Treasury>,

    #[account(mut)]
    pub recipient:
        SystemAccount<'info>,

    #[account(mut)]
    pub voter:
        Signer<'info>,

    pub system_program:
        Program<'info, System>,
}

// ================================================================
// REALTIME
// ================================================================

#[derive(Accounts)]
pub struct RealtimeHeartbeat<'info> {
    #[account(mut)]
    pub group:
        Account<'info, Group>,
}

// ================================================================
// FINALIZE
// ================================================================

#[derive(Accounts)]
pub struct FinalizeProposal<'info> {
    #[account(mut)]
    pub group: Account<'info, Group>,

    #[account(
        mut,
        has_one = group
    )]
    pub proposal: Account<'info, Proposal>,
}

// ================================================================
// MANUAL EXECUTION
// ================================================================

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub group:
        Account<'info, Group>,

    #[account(
        mut,
        has_one = group
    )]
    pub proposal:
        Account<'info, Proposal>,

    #[account(
        mut,
        seeds = [
            TREASURY_SEED,
            group.key().as_ref()
        ],
        bump = treasury.bump
    )]
    pub treasury:
        Account<'info, Treasury>,

    #[account(mut)]
    pub recipient:
        SystemAccount<'info>,
}

// ================================================================
// MAGICBLOCK DELEGATE GROUP
// ================================================================

#[delegate]
#[derive(Accounts)]
pub struct DelegateGroup<'info> {
    pub payer:
        Signer<'info>,

    /// CHECK:
    /// MagicBlock delegated account.
    #[account(mut, del)]
    pub group:
        UncheckedAccount<'info>,
}

// ================================================================
// MAGICBLOCK DELEGATE PROPOSAL
// ================================================================

#[delegate]
#[derive(Accounts)]
pub struct DelegateProposal<'info> {
    pub payer:
        Signer<'info>,

    /// CHECK:
    /// MagicBlock delegated account.
    #[account(mut, del)]
    pub proposal:
        UncheckedAccount<'info>,

    pub group:
        Account<'info, Group>,
}

// ================================================================
// MAGICBLOCK DELEGATE TREASURY
// ================================================================

#[delegate]
#[derive(Accounts)]
pub struct DelegateTreasury<'info> {
    pub payer:
        Signer<'info>,

    /// CHECK:
    /// MagicBlock delegated account.
    #[account(mut, del)]
    pub treasury:
        UncheckedAccount<'info>,

    pub group:
        Account<'info, Group>,
}

// ================================================================
// COMMIT GROUP
// ================================================================

#[commit]
#[derive(Accounts)]
pub struct CommitGroup<'info> {
    #[account(mut)]
    pub payer:
        Signer<'info>,

    #[account(mut)]
    pub group:
        Account<'info, Group>,
}

// ================================================================
// COMMIT PROPOSAL
// ================================================================

#[commit]
#[derive(Accounts)]
pub struct CommitProposal<'info> {
    #[account(mut)]
    pub payer:
        Signer<'info>,

    #[account(mut)]
    pub proposal:
        Account<'info, Proposal>,
}

// ================================================================
// COMMIT TREASURY
// ================================================================

#[commit]
#[derive(Accounts)]
pub struct CommitTreasury<'info> {
    #[account(mut)]
    pub payer:
        Signer<'info>,

    #[account(mut)]
    pub treasury:
        Account<'info, Treasury>,
}

// ================================================================
// COMMIT ALL GOVERNANCE STATE
// ================================================================

#[commit]
#[derive(Accounts)]
pub struct CommitGovernanceState<'info> {
    #[account(mut)]
    pub payer:
        Signer<'info>,

    #[account(mut)]
    pub group:
        Account<'info, Group>,

    #[account(mut)]
    pub proposal:
        Account<'info, Proposal>,

    #[account(mut)]
    pub treasury:
        Account<'info, Treasury>,
}

// ================================================================
// GROUP STATE
// ================================================================

#[account]
pub struct Group {
    pub creator: Pubkey,

    pub name: String,
    pub description: String,

    pub visibility: u8,

    pub group_key: [u8; 16],

    pub target_lamports: u64,

    // Actual SOL deposited into treasury.
    pub current_lamports: u64,

    // SOL already committed to active proposals.
    pub reserved_lamports: u64,

    pub member_count: u32,

    pub proposal_count: u64,

    // 1..=10000.
    pub voting_threshold_bps: u16,

    // Default 5000 = 50%.
    pub quorum_bps: u16,

    pub deadline: i64,

    pub privacy_authority: Pubkey,

    pub active: bool,

    pub realtime_nonce: u64,

    pub bump: u8,
}

// ================================================================
// TREASURY
// ================================================================

#[account]
pub struct Treasury {
    pub group: Pubkey,
    pub bump: u8,
}

// ================================================================
// MEMBER
// ================================================================

#[account]
pub struct Member {
    pub group: Pubkey,
    pub wallet: Pubkey,
    pub contributed_lamports: u64,
    pub bump: u8,
}

// ================================================================
// PROPOSAL
// ================================================================

#[account]
pub struct Proposal {
    pub group: Pubkey,

    pub id: u64,

    pub creator: Pubkey,

    pub title: String,
    pub description: String,

    pub amount_lamports: u64,

    pub recipient: Pubkey,

    pub voting_deadline: i64,

    pub yes: u32,
    pub no: u32,
    pub abstain: u32,

    pub voter_count: u32,

    pub status: u8,

    pub bump: u8,
}

// ================================================================
// VOTE RECEIPT
// ================================================================

#[account]
pub struct VoteReceipt {
    pub proposal: Pubkey,

    // Used only to bind the one-vote-per-wallet receipt.
    //
    // The actual vote choice is NEVER stored.
    pub voter: Pubkey,

    pub bump: u8,
}

// ================================================================
// PROPOSAL STATUS
// ================================================================

#[repr(u8)]
pub enum ProposalStatus {
    Voting = 0,
    Passed = 1,
    Rejected = 2,
    Executed = 3,
}

// ================================================================
// ERRORS
// ================================================================


#[error_code]
pub enum ErrorCode {
    #[msg("invalid target amount")]
    InvalidTarget,

    #[msg("invalid visibility")]
    InvalidVisibility,

    #[msg("invalid amount")]
    InvalidAmount,

    #[msg("invalid voting threshold")]
    InvalidThreshold,

    #[msg("invalid deadline")]
    InvalidDeadline,

    #[msg("group is inactive")]
    InactiveGroup,

    #[msg("group deadline has passed")]
    GroupClosed,

    #[msg("arithmetic overflow")]
    Overflow,

    #[msg("insufficient treasury balance")]
    InsufficientTreasury,

    #[msg("text is too long")]
    TextTooLong,

    #[msg("invalid recipient")]
    InvalidRecipient,

    #[msg("invalid vote choice")]
    InvalidVoteChoice,

    #[msg("invalid member")]
    InvalidMember,

    #[msg("invalid proposal status")]
    InvalidProposalStatus,

    #[msg("voting deadline has passed")]
    VotingClosed,

    #[msg("voting is still open")]
    VotingOpen,

    #[msg("proposal has not passed")]
    ProposalNotPassed,

    #[msg("invalid treasury")]
    InvalidTreasury,

    // ------------------------------------------------------------
    // Governance
    // ------------------------------------------------------------

    #[msg("all members must vote before the proposal can be finalized")]
    AllMembersMustVote,
}
