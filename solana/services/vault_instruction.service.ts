import {
  BorshService,
  HashService,
  TOKEN_PROGRAM_ID
} from '@coin98/solana-support-library';
import {
  BorshCoder,
  Idl
} from "@project-serum/anchor";
import * as borsh from '@project-serum/borsh';
import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  TransactionInstruction
} from '@solana/web3.js';
import BN from 'bn.js';
import VaultIdl from "../target/idl/coin98_vault.json";

const coder = new BorshCoder(VaultIdl as Idl)

export enum ObjType {
  Vault = 1,
  Distribution = 2,
  DistributionMulti = 3,
}


interface ScheduleDerivationPath {
  eventId: BN
}

const SCHEDULE_DERIVATION_PATH_LAYOUT: borsh.Layout<ScheduleDerivationPath> = borsh.struct([
  borsh.u64('eventId'),
])

interface CreateVaultRequest {
  vaultPath: Buffer
}

interface SetVaultRequest {
  admins: PublicKey[]
}

interface CreateScheduleRequest {
  userCount: number
  eventId: BN
  timestamp: BN
  merkleRoot: Buffer
  useMultiToken: boolean
  receivingTokenMint: PublicKey
  receivingTokenAccount: PublicKey
  sendingTokenMint: PublicKey
  sendingTokenAccount: PublicKey
}

interface SetScheduleStatusRequest {
  isActive: boolean
}

interface WithdrawSolRequest {
  amount: BN
}

interface WithdrawTokenRequest {
  amount: BN
}

interface RedeemTokenRequest {
  index: number
  proofs: Buffer[]
  receivingAmount: BN
  sendingAmount: BN
}

interface RedeemTokenMultiRequest {
  index: number
  proofs: Buffer[]
  receivingTokenMint: PublicKey
  receivingAmount: BN
  sendingAmount: BN
}

interface TransferOwnershipRequest {
  newOwner: PublicKey
}

interface AcceptOwnershipRequest {
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

export class VaultInstructionService {

  static createVault(
    payerAddress: PublicKey,
    vaultAddress: PublicKey,
    vaultPath: Buffer,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {

    const request: CreateVaultRequest = {
      vaultPath,
    }
    const data = coder.instruction.encode('createVault', request)

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

  static setVault(
    rootAddress: PublicKey,
    vaultAddress: PublicKey,
    admins: PublicKey[],
    vaultProgramId: PublicKey,
  ): TransactionInstruction {

    const request: SetVaultRequest = {
      admins,
    }
    const data = coder.instruction.encode('setVault', request)

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

  static createSchedule(
    rootAddress: PublicKey,
    vaultAddress: PublicKey,
    scheduleAddress: PublicKey,
    userCount: number,
    eventId: BN,
    timestamp: BN,
    merkleRoot: Buffer,
    useMultiToken: boolean,
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
      useMultiToken,
      receivingTokenMint: receivingTokenMintAddress,
      receivingTokenAccount: receivingTokenAccountAddress,
      sendingTokenMint: sendingTokenMintAddress,
      sendingTokenAccount: sendingTokenAccountAddress,
    }
    const data = coder.instruction.encode('createSchedule', request)

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
    })
  }

  static setScheduleStatus(
    rootAddress: PublicKey,
    vaultAddress: PublicKey,
    scheduleAddress: PublicKey,
    isActive: boolean,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {

    const request: SetScheduleStatusRequest = {
      isActive,
    }
    const data = coder.instruction.encode('setScheduleStatus', request)

    const keys: AccountMeta[] = [
      { pubkey: rootAddress, isSigner: true, isWritable: false },
      { pubkey: vaultAddress, isSigner: false, isWritable: false },
      { pubkey: scheduleAddress, isSigner: false, isWritable: true },
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
    const data = coder.instruction.encode('withdrawSol', request)

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
    const data = coder.instruction.encode('withdrawToken', request)

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

  static redeemToken(
    vaultAddress: PublicKey,
    scheduleAddress: PublicKey,
    index: number,
    proofs: Buffer[],
    receivingAmount: BN,
    sendingAmount: BN,
    vaultSignerAddress: PublicKey,
    vaultVestingTokenAddress: PublicKey,
    vaultFeeTokenAddress: null | PublicKey,
    userAddress: PublicKey,
    userVestingTokenAddress: PublicKey,
    userFeeTokenAddress: null | PublicKey,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {

    const request: RedeemTokenRequest = {
      index,
      proofs,
      receivingAmount,
      sendingAmount,
    }
    const data = coder.instruction.encode('redeemToken', request)

    let extraAccounts: AccountMeta[] = []
    if(vaultFeeTokenAddress != null) {
      extraAccounts.push({ pubkey: vaultFeeTokenAddress, isSigner: false, isWritable: true })
    }
    if(userFeeTokenAddress != null) {
      extraAccounts.push({ pubkey: userFeeTokenAddress, isSigner: false, isWritable: true })
    }
    const keys: AccountMeta[] = [
      { pubkey: vaultAddress, isSigner: false, isWritable: false },
      { pubkey: scheduleAddress, isSigner: false, isWritable: true },
      { pubkey: vaultSignerAddress, isSigner: false, isWritable: true },
      { pubkey: vaultVestingTokenAddress, isSigner: false, isWritable: true },
      { pubkey: userAddress, isSigner: true, isWritable: false },
      { pubkey: userVestingTokenAddress, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ...extraAccounts
    ]

    return new TransactionInstruction({
      data,
      keys,
      programId: vaultProgramId,
    })
  }
  static redeemTokenMulti(
    vaultAddress: PublicKey,
    scheduleAddress: PublicKey,
    index: number,
    proofs: Buffer[],
    receivingTokenMintAddress: PublicKey,
    receivingAmount: BN,
    sendingAmount: BN,
    vaultSignerAddress: PublicKey,
    vaultVestingTokenAddress: PublicKey,
    vaultFeeTokenAddress: null | PublicKey,
    userAddress: PublicKey,
    userVestingTokenAddress: PublicKey,
    userFeeTokenAddress: null | PublicKey,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {

    const request: RedeemTokenMultiRequest = {
      index,
      proofs,
      receivingTokenMint: receivingTokenMintAddress,
      receivingAmount,
      sendingAmount,
    }
    const data = coder.instruction.encode('redeemTokenMulti', request)

    let extraAccounts: AccountMeta[] = []
    if(vaultFeeTokenAddress != null) {
      extraAccounts.push({ pubkey: vaultFeeTokenAddress, isSigner: false, isWritable: true })
    }
    if(userFeeTokenAddress != null) {
      extraAccounts.push({ pubkey: userFeeTokenAddress, isSigner: false, isWritable: true })
    }
    const keys: AccountMeta[] = [
      { pubkey: vaultAddress, isSigner: false, isWritable: false },
      { pubkey: scheduleAddress, isSigner: false, isWritable: true },
      { pubkey: vaultSignerAddress, isSigner: false, isWritable: true },
      { pubkey: vaultVestingTokenAddress, isSigner: false, isWritable: true },
      { pubkey: userAddress, isSigner: true, isWritable: false },
      { pubkey: userVestingTokenAddress, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
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
    const data = coder.instruction.encode('transferOwnership', request)
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

  static acceptOwnership(
    newOwnerAddress: PublicKey,
    vaultAddress: PublicKey,
    vaultProgramId: PublicKey,
  ): TransactionInstruction {
    const request: AcceptOwnershipRequest = {
    }
    const data = coder.instruction.encode('acceptOwnership', request)
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

  static decodeScheduleData(
    data: Buffer
  ): Schedule {
    return coder.accounts.decode('Schedule', data)
  }

  static decodeVaultData(
    data: Buffer
  ): Vault {
    return coder.accounts.decode('Vault', data)
  }

  static findScheduleDerivationPath(
    eventId: BN
  ): Buffer {
    const data = <ScheduleDerivationPath>{
      eventId,
    }
    return BorshService.serialize(
      SCHEDULE_DERIVATION_PATH_LAYOUT,
      data,
      16,
    )
  }

  static findRootSignerAddress(
    vaultProgramId: PublicKey,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        HashService.sha256('Signer').slice(0, 8),
        HashService.sha256('global').slice(0, 8),
      ],
      vaultProgramId,
    )
  }

  static findVaultAddress(
    derivationPath: Buffer,
    vaultProgramId: PublicKey,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        HashService.sha256('Vault').slice(0, 8),
        derivationPath,
      ],
      vaultProgramId,
    )
  }

  static findVaultSignerAddress(
    vaultAddress: PublicKey,
    vaultProgramId: PublicKey,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        HashService.sha256('Signer').slice(0, 8),
        vaultAddress.toBuffer(),
      ],
      vaultProgramId,
    )
  }

  static findScheduleAddress(
    eventId: BN,
    vaultProgramId: PublicKey,
  ): [PublicKey, number] {
    const derivationPath = this.findScheduleDerivationPath(eventId)
    return PublicKey.findProgramAddressSync(
      [
        HashService.sha256('Schedule').slice(0, 8),
        derivationPath,
      ],
      vaultProgramId,
    )
  }

  static findScheduleSignerAddress(
    scheduleAddress: PublicKey,
    vaultProgramId: PublicKey,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        HashService.sha256('Signer').slice(0, 8),
        scheduleAddress.toBuffer(),
      ],
      vaultProgramId,
    )
  }
}
