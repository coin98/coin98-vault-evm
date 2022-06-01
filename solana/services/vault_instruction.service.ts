import * as borsh from '@project-serum/borsh';
import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { BorshService, TOKEN_PROGRAM_ID } from '@coin98/solana-support-library';

export enum ObjType {
  Vault = 1,
  Distribution = 2,
}


interface AcceptOwnershipRequest {
}

const ACCEPT_OWNERSHIP_LAYOUT: borsh.Layout<AcceptOwnershipRequest> = borsh.struct([
])

interface CreateScheduleRequest {
  userCount: number
  eventId: BN
  timestamp: BN
  merkleRoot: Buffer
  receivingTokenMint: PublicKey
  receivingTokenAccount: PublicKey
  sendingTokenMint: PublicKey
  sendingTokenAccount: PublicKey
}

const CREATE_SCHEDULE_LAYOUT: borsh.Layout<CreateScheduleRequest> = borsh.struct([
  borsh.u16('userCount'),
  borsh.u64('eventId'),
  borsh.i64('timestamp'),
  borsh.array(borsh.u8(), 32, 'merkleRoot'),
  borsh.publicKey('receivingTokenMint'),
  borsh.publicKey('receivingTokenAccount'),
  borsh.publicKey('sendingTokenMint'),
  borsh.publicKey('sendingTokenAccount'),
])

interface CreateVaultRequest {
  derivationPath: Buffer
  signerNonce: number
}

const CREATE_VAULT_LAYOUT: borsh.Layout<CreateVaultRequest> = borsh.struct([
  borsh.vecU8('derivationPath'),
  borsh.u8('signerNonce'),
])

interface RedeemTokenRequest {
  index: number
  proofs: Buffer[]
  receivingAmount: BN
  sendingAmount: BN
}

const REDEEM_TOKEN_LAYOUT: borsh.Layout<RedeemTokenRequest> = borsh.struct([
  borsh.u16('index'),
  borsh.vec(borsh.array(borsh.u8(), 32), 'proofs'),
  borsh.u64('receivingAmount'),
  borsh.u64('sendingAmount'),
])

interface RedeemTokenWithFeeRequest {
  index: number
  proofs: Buffer[]
  receivingAmount: BN
  sendingAmount: BN
}

const REDEEM_TOKEN_WITH_FEE_LAYOUT: borsh.Layout<RedeemTokenWithFeeRequest> = borsh.struct([
  borsh.u16('index'),
  borsh.vec(borsh.array(borsh.u8(), 32), 'proofs'),
  borsh.u64('receivingAmount'),
  borsh.u64('sendingAmount'),
])

interface SetScheduleStatusRequest {
  isActive: boolean
}

const SET_SCHEDULE_STATUS_LAYOUT: borsh.Layout<SetScheduleStatusRequest> = borsh.struct([
  borsh.bool('isActive')
])

interface SetVaultRequest {
  admins: PublicKey[]
}

const SET_VAULT_LAYOUT: borsh.Layout<SetVaultRequest> = borsh.struct([
  borsh.vec(borsh.publicKey(), 'admins'),
])

interface TransferOwnershipRequest {
  newOwner: PublicKey
}

const TRANSFER_OWNERSHIP_LAYOUT: borsh.Layout<TransferOwnershipRequest> = borsh.struct([
  borsh.publicKey('newOwner'),
])

interface WithdrawSolRequest {
  amount: BN
}

const WITHDRAW_SOL_LAYOUT: borsh.Layout<WithdrawSolRequest> = borsh.struct([
  borsh.u64('amount'),
])

interface WithdrawTokenRequest {
  amount: BN
}

const WITHDRAW_TOKEN_LAYOUT: borsh.Layout<WithdrawTokenRequest> = borsh.struct([
  borsh.u64('amount'),
])

export interface Schedule {
  objType: number
  signer: PublicKey
  eventId: BN
  vaultId: PublicKey,
  timestamp: BN
  merkleRoot: Buffer
  receivingTokenMint: PublicKey
  receivingTokenAccount: PublicKey
  sendingTokenMint: PublicKey
  sendingTokenAccount: PublicKey
  isActive: boolean
  redemptions: boolean[]
}

const SCHEDULE_LAYOUT: borsh.Layout<Schedule> = borsh.struct([
  borsh.u8('objType'),
  borsh.u64('eventId'),
  borsh.publicKey('vaultId'),
  borsh.i64('timestamp'),
  borsh.vecU8('merkleRoot'),
  borsh.publicKey('receivingTokenMint'),
  borsh.publicKey('receivingTokenAccount'),
  borsh.publicKey('sendingTokenMint'),
  borsh.publicKey('sendingTokenAccount'),
  borsh.bool('isActive'),
  borsh.vec(borsh.bool(), 'redemptions'),
])

export interface Vault {
  objType: number
  signer: PublicKey
  signer_nonce: number
  owner: PublicKey
  newOwner: PublicKey
  admins: PublicKey[]
  isActive: boolean
}

const VAULT_LAYOUT: borsh.Layout<Vault> = borsh.struct([
  borsh.u8('objType'),
  borsh.u8('signer_nonce'),
  borsh.publicKey('owner'),
  borsh.publicKey('newOwner'),
  borsh.vec<PublicKey>(borsh.publicKey(), 'admins'),
  borsh.bool('isActive'),
])

export class VaultInstructionService {

  static acceptOwnership(
    newOwnerAddress: PublicKey,
    vaultAddress: PublicKey,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {
    const request: AcceptOwnershipRequest = {
    }
    const data: Buffer = BorshService.anchorSerialize(
      'accept_ownership',
      ACCEPT_OWNERSHIP_LAYOUT,
      request,
      32,
    )
    const keys: AccountMeta[] = [
      { pubkey: newOwnerAddress, isSigner: true, isWritable: false },
      { pubkey: vaultAddress, isSigner: false, isWritable: true },
    ]

    return new TransactionInstruction({
      data,
      keys,
      programId: vaultProgramId,
    })
  }

  static createSchedule(
    rootAddress: PublicKey,
    vaultAddress: PublicKey,
    scheduleAddress: PublicKey,
    userCount: number,
    eventId: BN,
    timestamp: BN,
    merkleRoot: Buffer,
    receivingTokenMintAddress: PublicKey,
    receivingTokenAccountAddress: PublicKey,
    sendingTokenMintAddress: PublicKey,
    sendingTokenAccountAddress: PublicKey,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {
    const request: CreateScheduleRequest = {
      userCount,
      eventId,
      timestamp,
      merkleRoot,
      receivingTokenMint: receivingTokenMintAddress,
      receivingTokenAccount: receivingTokenAccountAddress,
      sendingTokenMint: sendingTokenMintAddress,
      sendingTokenAccount: sendingTokenAccountAddress,
    }

    const data: Buffer = BorshService.anchorSerialize(
      'create_schedule',
      CREATE_SCHEDULE_LAYOUT,
      request,
      2500,
    )

    const keys: AccountMeta[] = [
      { pubkey: rootAddress, isSigner: true, isWritable: false },
      { pubkey: vaultAddress, isSigner: false, isWritable: false, },
      { pubkey: scheduleAddress, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false, },
    ]

    return new TransactionInstruction({
      data,
      keys,
      programId: vaultProgramId,
    });
  }

  static createVault(
    payerAddress: PublicKey,
    vaultAddress: PublicKey,
    vaultPath: Buffer,
    signerNonce: number,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {
    const request: CreateVaultRequest = {
      derivationPath: vaultPath,
      signerNonce,
    }
    const data: Buffer = BorshService.anchorSerialize(
      'create_vault',
      CREATE_VAULT_LAYOUT,
      request,
      200,
    )
    const keys: AccountMeta[] = [
      { pubkey: payerAddress, isSigner: true, isWritable: false },
      { pubkey: vaultAddress, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false, },
    ]

    return new TransactionInstruction({
      data,
      keys,
      programId: vaultProgramId,
    })
  }

  static decodeScheduleData(
    data: Buffer
  ): Schedule {
    return BorshService.anchorDeserialize(SCHEDULE_LAYOUT, data)
  }

  static decodeVaultData(
    data: Buffer
  ): Vault {
    return BorshService.anchorDeserialize(VAULT_LAYOUT, data)
  }

  static redeemToken(
    vaultAddress: PublicKey,
    scheduleAddress: PublicKey,
    index: number,
    proofs: Buffer[],
    receivingAmount: BN,
    sendingAmount: BN,
    vaultSignerAddress: PublicKey,
    vaultToken0Address: PublicKey,
    userAddress: PublicKey,
    userToken0Address: PublicKey,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {
    const request: RedeemTokenRequest = {
      index,
      proofs,
      receivingAmount,
      sendingAmount,
    }

    const data: Buffer = BorshService.anchorSerialize(
      'redeem_token',
      REDEEM_TOKEN_LAYOUT,
      request,
      512,
    )
    const keys: AccountMeta[] = [
      { pubkey: vaultAddress, isSigner: false, isWritable: false },
      { pubkey: scheduleAddress, isSigner: false, isWritable: true },
      { pubkey: vaultSignerAddress, isSigner: false, isWritable: true },
      { pubkey: vaultToken0Address, isSigner: false, isWritable: true },
      { pubkey: userAddress, isSigner: true, isWritable: false },
      { pubkey: userToken0Address, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]

    return new TransactionInstruction({
      data,
      keys,
      programId: vaultProgramId,
    })
  }
  static redeemTokenWithFee(
    vaultAddress: PublicKey,
    scheduleAddress: PublicKey,
    index: number,
    proofs: Buffer[],
    receivingAmount: BN,
    sendingAmount: BN,
    vaultSignerAddress: PublicKey,
    vaultToken0Address: PublicKey,
    vaultToken1Address: PublicKey,
    userAddress: PublicKey,
    userToken0Address: PublicKey,
    userToken1Address: PublicKey,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {
    const request: RedeemTokenWithFeeRequest = {
      index,
      proofs,
      receivingAmount,
      sendingAmount,
    }
    const data: Buffer = BorshService.anchorSerialize(
      'redeem_token_with_fee',
      REDEEM_TOKEN_WITH_FEE_LAYOUT,
      request,
      512,
    )
    const keys: AccountMeta[] = [
      { pubkey: vaultAddress, isSigner: false, isWritable: false },
      { pubkey: scheduleAddress, isSigner: false, isWritable: true },
      { pubkey: vaultSignerAddress, isSigner: false, isWritable: true },
      { pubkey: vaultToken0Address, isSigner: false, isWritable: true },
      { pubkey: vaultToken1Address, isSigner: false, isWritable: true },
      { pubkey: userAddress, isSigner: true, isWritable: false },
      { pubkey: userToken0Address, isSigner: false, isWritable: true },
      { pubkey: userToken1Address, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]

    return new TransactionInstruction({
      data,
      keys,
      programId: vaultProgramId,
    })
  }

  static setScheduleStatus(
    vaultAddress: PublicKey,
    rootAddress: PublicKey,
    scheduleAddress: PublicKey,
    isActive: boolean,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {
    const request: SetScheduleStatusRequest = {
      isActive,
    }
    const data: Buffer = BorshService.anchorSerialize(
      'set_schedule_status',
      SET_SCHEDULE_STATUS_LAYOUT,
      request,
      25,
    )
    const keys: AccountMeta[] = [
      { pubkey: rootAddress, isSigner: true, isWritable: false },
      { pubkey: vaultAddress, isSigner: false, isWritable: false },
      { pubkey: scheduleAddress, isSigner: false, isWritable: true },
    ]

    return new TransactionInstruction({
      data,
      keys,
      programId: vaultProgramId,
    });
  }

  static setVault(
    rootAddress: PublicKey,
    vaultAddress: PublicKey,
    admins: PublicKey[],
    vaultProgramId: PublicKey,
  ): TransactionInstruction {
    const request: SetVaultRequest = {
      admins,
    }
    const data: Buffer = BorshService.anchorSerialize(
      'set_vault',
      SET_VAULT_LAYOUT,
      request,
      500,
    )
    const keys: AccountMeta[] = [
      { pubkey: rootAddress, isSigner: true, isWritable: false },
      { pubkey: vaultAddress, isSigner: false, isWritable: true },
    ]

    return new TransactionInstruction({
      data,
      keys,
      programId: vaultProgramId,
    })
  }

  static transferOwnership(
    ownerAddress: PublicKey,
    vaultAddress: PublicKey,
    newOwner: PublicKey,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {
    const request: TransferOwnershipRequest = {
      newOwner,
    }
    const data: Buffer = BorshService.anchorSerialize(
      'transfer_ownership',
      TRANSFER_OWNERSHIP_LAYOUT,
      request,
      64,
    )
    const keys: AccountMeta[] = [
      { pubkey: ownerAddress, isSigner: true, isWritable: false },
      { pubkey: vaultAddress, isSigner: false, isWritable: true },
    ]

    return new TransactionInstruction({
      data,
      keys,
      programId: vaultProgramId,
    })
  }

  static withdrawSol(
    ownerAddress: PublicKey,
    vaultAddress: PublicKey,
    vaultSignerAddress: PublicKey,
    recipientAddress: PublicKey,
    amount: BN,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {
    const request: WithdrawSolRequest = {
      amount,
    }
    const data: Buffer = BorshService.anchorSerialize(
      'withdraw_sol',
      WITHDRAW_SOL_LAYOUT,
      request,
      32,
    )
    const keys: AccountMeta[] = [
      { pubkey: ownerAddress, isSigner: true, isWritable: false },
      { pubkey: vaultAddress, isSigner: false, isWritable: false },
      { pubkey: vaultSignerAddress, isSigner: false, isWritable: true },
      { pubkey: recipientAddress, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]

    return new TransactionInstruction({
      data,
      keys,
      programId: vaultProgramId,
    })
  }

  static withdrawToken(
    ownerAddress: PublicKey,
    vaultAddress: PublicKey,
    vaultSignerAddress: PublicKey,
    senderAddress: PublicKey,
    recipientAddress: PublicKey,
    amount: BN,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {
    const request: WithdrawTokenRequest = {
      amount,
    }
    const data: Buffer = BorshService.anchorSerialize(
      'withdraw_token',
      WITHDRAW_TOKEN_LAYOUT,
      request,
      32,
    )
    const keys: AccountMeta[] = [
      { pubkey: ownerAddress, isSigner: true, isWritable: false },
      { pubkey: vaultAddress, isSigner: false, isWritable: false },
      { pubkey: vaultSignerAddress, isSigner: false, isWritable: false },
      { pubkey: senderAddress, isSigner: false, isWritable: true },
      { pubkey: recipientAddress, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]

    return new TransactionInstruction({
      data,
      keys,
      programId: vaultProgramId,
    })
  }
}
