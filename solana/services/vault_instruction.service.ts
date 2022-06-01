import { BorshCoder, Idl } from "@project-serum/anchor"
import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { TOKEN_PROGRAM_ID } from '@coin98/solana-support-library';
import VaultIdl from "../target/idl/coin98_vault.json"

const coder = new BorshCoder(VaultIdl as Idl)

export enum ObjType {
  Vault = 1,
  Distribution = 2,
}


interface AcceptOwnershipRequest {
}

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

interface CreateVaultRequest {
  derivationPath: Buffer
  signerNonce: number
}

interface RedeemTokenRequest {
  index: number
  proofs: Buffer[]
  receivingAmount: BN
  sendingAmount: BN
}

interface RedeemTokenWithFeeRequest {
  index: number
  proofs: Buffer[]
  receivingAmount: BN
  sendingAmount: BN
}

interface SetScheduleStatusRequest {
  isActive: boolean
}

interface SetVaultRequest {
  admins: PublicKey[]
}

interface TransferOwnershipRequest {
  newOwner: PublicKey
}

interface WithdrawSolRequest {
  amount: BN
}

interface WithdrawTokenRequest {
  amount: BN
}

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

export interface Vault {
  objType: number
  signer: PublicKey
  signer_nonce: number
  owner: PublicKey
  newOwner: PublicKey
  admins: PublicKey[]
  isActive: boolean
}

export class VaultInstructionService {

  static acceptOwnership(
    newOwnerAddress: PublicKey,
    vaultAddress: PublicKey,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {
    const request: AcceptOwnershipRequest = {
    }
    const data = coder.instruction.encode("acceptOwnership", request)
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

    const data = coder.instruction.encode("createSchedule", request)

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
    const data = coder.instruction.encode("createVault", request)
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
    return coder.accounts.decode("Schedule", data)
  }

  static decodeVaultData(
    data: Buffer
  ): Vault {
    return coder.accounts.decode("Vault", data)
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

    const data = coder.instruction.encode("redeemToken", request)
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
    const data = coder.instruction.encode("redeemTokenWithFee", request)
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
    const data = coder.instruction.encode("setScheduleStatus", request)
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
    const data = coder.instruction.encode("setVault", request)
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
    const data = coder.instruction.encode("transferOwnership", request)
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
    const data = coder.instruction.encode("withdrawSol", request)
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
    const data = coder.instruction.encode("withdrawToken", request)
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
