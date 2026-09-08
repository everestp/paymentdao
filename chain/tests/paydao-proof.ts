import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { randomBytes } from "crypto";

const DEVNET_ASIA_VALIDATOR = "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57";
const GROUP_SEED = "group";
const TREASURY_SEED = "treasury";
const MEMBER_SEED = "member";
const PROPOSAL_SEED = "proposal";
const VOTE_SEED = "vote";

function providerFromEnv(endpoint: string, wsEndpoint?: string) {
  return new anchor.AnchorProvider(new web3.Connection(endpoint, { wsEndpoint, commitment: "confirmed" }), anchor.Wallet.local(), { commitment: "confirmed" });
}

describe("paydao", () => {
  const baseProvider = anchor.AnchorProvider.env();
  anchor.setProvider(baseProvider);
  const erProvider = providerFromEnv(process.env.EPHEMERAL_PROVIDER_ENDPOINT || "https://devnet-as.magicblock.app/", process.env.EPHEMERAL_WS_ENDPOINT || "wss://devnet-as.magicblock.app/");
  const program: any = anchor.workspace.paydaoProof;
  const erProgram: any = new anchor.Program(program.idl, erProvider);
  const wallet = baseProvider.wallet.publicKey;
  const groupKey = randomBytes(16);
  const [group] = web3.PublicKey.findProgramAddressSync([Buffer.from(GROUP_SEED), wallet.toBuffer(), groupKey], program.programId);
  const [treasury] = web3.PublicKey.findProgramAddressSync([Buffer.from(TREASURY_SEED), group.toBuffer()], program.programId);
  const [member] = web3.PublicKey.findProgramAddressSync([Buffer.from(MEMBER_SEED), group.toBuffer(), wallet.toBuffer()], program.programId);

  it("creates, funds, governs, executes, and uses the ER lifecycle", async () => {
    await program.methods.initializeGroup("PayDAO test group", "A real group account", 0, Array.from(groupKey), new anchor.BN(1_000_000_000), new anchor.BN(0), 6000, wallet).accounts({ group, treasury, creator: wallet, systemProgram: web3.SystemProgram.programId }).rpc();

    const delegateTx = await program.methods.delegateGroup().accounts({ payer: wallet, group }).remainingAccounts([{ pubkey: new web3.PublicKey(process.env.VALIDATOR || DEVNET_ASIA_VALIDATOR), isSigner: false, isWritable: false }]).transaction();
    await baseProvider.sendAndConfirm(delegateTx, [], { commitment: "confirmed", skipPreflight: true });

    const heartbeatTx = await erProgram.methods.realtimeHeartbeat().accounts({ group }).transaction();
    heartbeatTx.feePayer = erProvider.wallet.publicKey;
    heartbeatTx.recentBlockhash = (await erProvider.connection.getLatestBlockhash()).blockhash;
    await erProvider.sendAndConfirm(await erProvider.wallet.signTransaction(heartbeatTx), []);

    const undelegateTx = await erProgram.methods.undelegateGroup().accounts({ payer: erProvider.wallet.publicKey, group }).transaction();
    undelegateTx.feePayer = erProvider.wallet.publicKey;
    undelegateTx.recentBlockhash = (await erProvider.connection.getLatestBlockhash()).blockhash;
    await erProvider.sendAndConfirm(await erProvider.wallet.signTransaction(undelegateTx), []);

    await program.methods.contribute(new anchor.BN(1_000_000_000)).accounts({ group, treasury, member, contributor: wallet, systemProgram: web3.SystemProgram.programId }).rpc();
    const proposalId = new anchor.BN(0);
    const [proposal] = web3.PublicKey.findProgramAddressSync([Buffer.from(PROPOSAL_SEED), group.toBuffer(), proposalId.toArrayLike(Buffer, "le", 8)], program.programId);
    await program.methods.createProposal("Fund audit", "Pay for the security audit", new anchor.BN(500_000_000), wallet, new anchor.BN(Math.floor(Date.now() / 1000) + 3600)).accounts({ group, member, proposal, creator: wallet, systemProgram: web3.SystemProgram.programId }).rpc();

    const nullifier = randomBytes(32);
    const [voteReceipt] = web3.PublicKey.findProgramAddressSync([Buffer.from(VOTE_SEED), proposal.toBuffer(), nullifier], program.programId);
    await program.methods.recordVoteAggregate(Array.from(nullifier), 1, 0, 0).accounts({ group, proposal, voteReceipt, authority: wallet, systemProgram: web3.SystemProgram.programId }).rpc();
    await program.methods.finalizeProposal().accounts({ group, proposal }).rpc();
    await program.methods.executeProposal().accounts({ group, proposal, treasury, recipient: wallet, systemProgram: web3.SystemProgram.programId }).rpc();
  });
});
