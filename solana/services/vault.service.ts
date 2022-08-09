import {
  BorshService,
  HashService,
  sendTransaction
} from '@coin98/solana-support-library';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction
} from '@solana/web3.js';
import BN from 'bn.js';
import moment from 'moment';
import {
  Schedule,
  Vault,
  VaultInstructionService
} from './vault_instruction.service';

export class VaultService {

  static async createVault(
    connection: Connection,
    payerAccount: Keypair,
    vaultName: string,
    vaultProgramId: PublicKey,
  ): Promise<PublicKey> {

    const transaction = new Transaction()

    const vaultDerivationPath = this.findVaultDerivationPath(vaultName)
    const [vaultAddress,]: [PublicKey, number] = this.findVaultAddress(
      vaultName,
      vaultProgramId,
    )
    const [, signerNonce]: [PublicKey, number] = this.findVaultSignerAddress(
      vaultAddress,
      vaultProgramId
    )

    const createVaultInstruction = VaultInstructionService.createVault(
      payerAccount.publicKey,
      vaultAddress,
      vaultDerivationPath,
      signerNonce,
      vaultProgramId,
    )
    transaction.add(createVaultInstruction)

    const txSign = await sendTransaction(connection, transaction, [
      payerAccount,
    ])
    console.info(`Created Vault ${vaultAddress.toBase58()}`, '---', txSign, '\n')
    return vaultAddress
  }

  static async setVault(
    connection: Connection,
    payerAccount: Keypair,
    vaultAddress: PublicKey,
    memberAddresses: PublicKey[],
    vaultProgramId: PublicKey,
  ): Promise<void> {

    const transaction = new Transaction()

    const setVaultInstruction = VaultInstructionService.setVault(
      payerAccount.publicKey,
      vaultAddress,
      memberAddresses,
      vaultProgramId,
    )
    transaction.add(setVaultInstruction)

    const txSign = await sendTransaction(connection, transaction, [
      payerAccount,
    ])
    console.info(`Updated vault ${vaultAddress.toBase58()} by ${payerAccount.publicKey.toBase58()}`, '---', txSign, '\n')
  }

  static async createSchedule(
    connection: Connection,
    payerAccount: Keypair,
    vaultAddress: PublicKey,
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
  ): Promise<PublicKey> {

    const transaction = new Transaction()

    const [scheduleAddress,]: [PublicKey, number] = this.findScheduleAddress(eventId, vaultProgramId,)

    const createScheduleInstruction = VaultInstructionService.createSchedule(
      payerAccount.publicKey,
      vaultAddress,
      scheduleAddress,
      userCount,
      eventId,
      timestamp,
      merkleRoot,
      useMultiToken,
      receivingTokenMintAddress,
      receivingTokenAccountAddress,
      sendingTokenMintAddress,
      sendingTokenAccountAddress,
      vaultProgramId,
    )
    transaction.add(createScheduleInstruction)

    const txSign = await sendTransaction(connection, transaction, [
      payerAccount,
    ])
    console.info(`Created Schedule ${scheduleAddress.toBase58()}`, '---', txSign, '\n')
    return scheduleAddress
  }

  static async setScheduleStatus(
    connection: Connection,
    payerAccount: Keypair,
    vaultAddress: PublicKey,
    scheduleAddress: PublicKey,
    isActive: boolean,
    vaultProgramId: PublicKey,
  ): Promise<void> {

    const transaction = new Transaction()

    const setScheduleStatusInstruction = VaultInstructionService.setScheduleStatus(
      payerAccount.publicKey,
      vaultAddress,
      scheduleAddress,
      isActive,
      vaultProgramId,
    )
    transaction.add(setScheduleStatusInstruction)

    const txSign = await sendTransaction(connection, transaction, [
      payerAccount,
    ])
    console.info(`Updated schedule ${scheduleAddress.toBase58()} by ${payerAccount.publicKey.toBase58()}`, '---', txSign, '\n')
  }

  static async withdrawSol(
    connection: Connection,
    payerAccount: Keypair,
    vaultAddress: PublicKey,
    recipientAddress: PublicKey,
    amount: BN,
    vaultProgramId: PublicKey,
  ): Promise<void> {

    const vault = await this.getVaultAccountInfo(
      connection,
      vaultAddress,
    )

    const transaction = new Transaction()

    const withdrawSolInstruction = VaultInstructionService.withdrawSol(
      payerAccount.publicKey,
      vaultAddress,
      vault.signer,
      recipientAddress,
      amount,
      vaultProgramId,
    )
    transaction.add(withdrawSolInstruction)

    const txSign = await sendTransaction(connection, transaction, [
      payerAccount,
    ])
    console.info(`Withdrawn ${amount} lamports from vault ${vaultAddress.toBase58()} to ${recipientAddress.toBase58()}`, '---', txSign, '\n')
  }

  static async withdrawToken(
    connection: Connection,
    payerAccount: Keypair,
    vaultAddress: PublicKey,
    senderAddress: PublicKey,
    recipientAddress: PublicKey,
    amount: BN,
    vaultProgramId: PublicKey,
  ): Promise<void> {

    const vault = await this.getVaultAccountInfo(
      connection,
      vaultAddress,
    )

    const transaction = new Transaction()

    const withdrawTokenInstruction = VaultInstructionService.withdrawToken(
      payerAccount.publicKey,
      vaultAddress,
      vault.signer,
      senderAddress,
      recipientAddress,
      amount,
      vaultProgramId,
    )
    transaction.add(withdrawTokenInstruction)

    const txSign = await sendTransaction(connection, transaction, [
      payerAccount,
    ])
    console.info(`Withdrawn ${amount} token units from vault ${vaultAddress.toBase58()} to ${recipientAddress.toBase58()}`, '---', txSign, '\n')
  }

  static async redeem(
    connection: Connection,
    payerAccount: Keypair,
    vaultAddress: PublicKey,
    scheduleAddress: PublicKey,
    index: number,
    proofs: Buffer[],
    receivingAmount: BN,
    sendingAmount: BN,
    recipientAddress: PublicKey,
    feePaymentAddress: PublicKey,
    vaultProgramId: PublicKey,
  ): Promise<void> {

    const vault = await this.getVaultAccountInfo(
      connection,
      vaultAddress,
    )
    const schedule = await this.getScheduleAccountInfo(
      connection,
      scheduleAddress,
    )

    const transaction = new Transaction()

    const redeemInstruction = VaultInstructionService.redeemToken(
      vaultAddress,
      scheduleAddress,
      index,
      proofs,
      receivingAmount,
      sendingAmount,
      vault.signer,
      schedule.receivingTokenAccount,
      schedule.sendingTokenAccount,
      payerAccount.publicKey,
      recipientAddress,
      feePaymentAddress,
      vaultProgramId,
    )
    transaction.add(redeemInstruction)

    const txSign = await sendTransaction(connection, transaction, [
      payerAccount,
    ])
    console.info(`Redeemed token for user ${payerAccount.publicKey.toBase58()} in schedule ${scheduleAddress.toBase58()}`, '---', txSign, '\n')
  }

  static async transferOwnership(
    connection: Connection,
    payerAccount: Keypair,
    newOwnerAddress: PublicKey,
    vaultAddress: PublicKey,
    vaultProgramId: PublicKey,
  ): Promise<void> {

    const transaction = new Transaction()

    const transferOwnershipInstruction = VaultInstructionService.transferOwnership(
      payerAccount.publicKey,
      vaultAddress,
      newOwnerAddress,
      vaultProgramId,
    )

    transaction.add(transferOwnershipInstruction)

    const txSign = await sendTransaction(connection, transaction, [
      payerAccount,
    ])
    console.info(`Address ${newOwnerAddress.toBase58()} is appointed as new owner of Vault ${vaultAddress.toBase58()}`, '---', txSign, '\n')
  }

  static async acceptOwnership(
    connection: Connection,
    payerAccount: Keypair,
    vaultAddress: PublicKey,
    vaultProgramId: PublicKey,
  ): Promise<void> {

    const transaction = new Transaction()

    const acceptOwnershipInstruction = VaultInstructionService.acceptOwnership(
      payerAccount.publicKey,
      vaultAddress,
      vaultProgramId,
    )

    transaction.add(acceptOwnershipInstruction)

    const txSign = await sendTransaction(connection, transaction, [
      payerAccount,
    ])
    console.info(`Address ${payerAccount.publicKey.toBase58()} accepted as new owner of Vault ${vaultAddress.toBase58()}`, '---', txSign, '\n')
  }

  static async getScheduleAccountInfo(
    connection: Connection,
    scheduleAddress: PublicKey,
  ): Promise<Schedule> {
    const accountInfo = await connection.getAccountInfo(scheduleAddress)
    const data = VaultInstructionService.decodeScheduleData(accountInfo.data)
    const [signerAddress,] = this.findRootSignerAddress(
      accountInfo.owner,
    )
    data.signer = signerAddress
    return data
  }

  static async getVaultAccountInfo(
    connection: Connection,
    vaultAddress: PublicKey,
  ): Promise<Vault> {
    const accountInfo = await connection.getAccountInfo(vaultAddress)
    const data = VaultInstructionService.decodeVaultData(accountInfo.data)
    const [signerAddress,] = this.findVaultSignerAddress(
      vaultAddress,
      accountInfo.owner,
    )
    data.signer = signerAddress
    return data
  }

  static findVaultDerivationPath(
    identifier: string
  ): Buffer {
    return HashService.sha256(identifier)
  }

  static findScheduleDerivationPath(
    eventId: BN
  ): Buffer {
    return VaultInstructionService.findScheduleDerivationPath(
      eventId,
    )
  }

  static findRootSignerAddress(
    vaultProgramId: PublicKey,
  ): [PublicKey, number] {
    return VaultInstructionService.findRootSignerAddress(
      vaultProgramId,
    )
  }

  static findVaultAddress(
    params: string | Buffer,
    vaultProgramId: PublicKey,
  ): [PublicKey, number] {
    const derivationPath = (typeof(params) === 'string')
      ? this.findVaultDerivationPath(params)
      : params
    return VaultInstructionService.findVaultAddress(
      derivationPath,
      vaultProgramId,
    )
  }

  static findVaultSignerAddress(
    vaultAddress: PublicKey,
    vaultProgramId: PublicKey,
  ): [PublicKey, number] {
    return VaultInstructionService.findVaultSignerAddress(
      vaultAddress,
      vaultProgramId,
    )
  }

  static findScheduleAddress(
    eventId: BN,
    vaultProgramId: PublicKey,
  ) : [PublicKey, number] {
    return VaultInstructionService.findScheduleAddress(
      eventId,
      vaultProgramId,
    )
  }

  static findScheduleSignerAddress(
    scheduleAddress: PublicKey,
    vaultProgramId: PublicKey,
  ): [PublicKey, number] {
    return VaultInstructionService.findScheduleSignerAddress(
      scheduleAddress,
      vaultProgramId,
    )
  }

  static async printScheduleAccountInfo(connection: Connection, scheduleAddress: PublicKey,): Promise<void> {
    const accountData = await this.getScheduleAccountInfo(connection, scheduleAddress)
    console.info('--- SCHEDULE ACCOUNT INFO ---')
    console.info(`Address:                 ${scheduleAddress.toBase58()} --- ${scheduleAddress.toBuffer().toString('hex')}`)
    console.info(`Signer:                  ${accountData.signer.toBase58()} --- ${accountData.signer.toBuffer().toString('hex')}`)
    console.info(`Event ID:                ${accountData.eventId.toString()}`)
    console.info(`Vault ID:                ${accountData.vaultId.toBase58()} --- ${accountData.vaultId.toBuffer().toString('hex')}`)
    console.info(`Unlock timestamp:        ${moment(accountData.timestamp.toNumber() * 1000).format('dddd, MMMM Do YYYY, hh:mm:ss')} -- ${accountData.timestamp}`)
    console.info(`Receiving Token Mint:    ${accountData.receivingTokenMint.toBase58()} --- ${accountData.receivingTokenMint.toBuffer().toString('hex')}`)
    console.info(`Receiving Token Account: ${accountData.receivingTokenAccount.toBase58()} --- ${accountData.receivingTokenAccount.toBuffer().toString('hex')}`)
    console.info(`Sending Token Mint:      ${accountData.sendingTokenMint.toBase58()} --- ${accountData.sendingTokenMint.toBuffer().toString('hex')}`)
    console.info(`Sending Token Account:   ${accountData.sendingTokenAccount.toBase58()} --- ${accountData.sendingTokenAccount.toBuffer().toString('hex')}`)
    console.info(`Is Active:               ${accountData.isActive}`)
    console.info(`Redemptions:             ${accountData.redemptions.map(x => { return x }).join(' ')}`)
    console.info('')
  }

  static async printVaultAccountInfo(connection: Connection, vaultAddress: PublicKey): Promise<void> {
    const accountData = await this.getVaultAccountInfo(connection, vaultAddress)
    console.info('--- VAULT ACCOUNT INFO ---')
    console.info(`Address:   ${vaultAddress.toBase58()} --- ${vaultAddress.toBuffer().toString('hex')}`)
    console.info(`Signer:    ${accountData.signer.toBase58()} --- ${accountData.signer.toBuffer().toString('hex')}`)
    console.info(`Nonce:     ${accountData.signer_nonce}`)
    console.info(`Owner:     ${accountData.owner.toBase58()} --- ${accountData.owner.toBuffer().toString('hex')}`)
    console.info(`New Owner: ${accountData.newOwner.toBase58()} --- ${accountData.newOwner.toBuffer().toString('hex')}`)
    console.info(`Admins:    ${accountData.admins.map(x => { return `pubkey: ${x.toBase58()} --- ${x.toBuffer().toString('hex')}` }).join('\n           ')}`)
    console.info('')
  }
}
