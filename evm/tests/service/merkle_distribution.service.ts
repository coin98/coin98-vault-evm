import BN from 'bn.js';
import Web3 from 'web3';
import { MerkleNode, MerkleTree } from './merkle_tree';

const LEVEL_ARRAY = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']

export interface Schedule {
  index: number
  address: Buffer
  receivingId: number
  receivingAmount: BN
  sendingAmount: BN
}

export class MerkleDistributionService {

  static createTree(
    schedules: Schedule[]
  ): MerkleTree {
    const hashes = schedules.map(schedule => {
      console.log('schedule')
      return this.computeHash(schedule)
    })
    return new MerkleTree(hashes)
  }

  static print(tree: MerkleTree) {
    const nodes = tree.nodes()
    for(let i = 0; i < nodes.length; i++) {
      const subNodes = nodes[i]
      for(let j = 0; j < subNodes.length; j++) {
        console.info(this.formatNode(subNodes[j]))
      }
    }
    console.info('\n')
  }

  static printProof(tree: MerkleTree, index: number) {
    const nodes = tree.nodes()
    console.log('nodes',nodes);
    const leaf = nodes[0][index]
    const root = tree.root()
    const proofs = []
    let currentIndex = index
    for(let i = 0; i < nodes.length - 1; i++) {
      const proof = currentIndex % 2 == 0
        ? nodes[i][currentIndex + 1]
        : nodes[i][currentIndex - 1]
      currentIndex = (currentIndex - (currentIndex % 2)) / 2
      proofs.push(proof)
    }
    console.info(`Leaf:\n${this.formatNode(leaf)}`)
    console.info('Proofs')
    for(let i = 0; i < proofs.length; i++) {
      console.info(`${this.formatNode(proofs[i])}`)
    }
    console.info(`Root:\n${this.formatNode(root)}`)
    console.info('\n')
    return proofs;
  }

  static printProof2(index: number, height: number) {
    const proofs = []
    let currentIndex = index
    for(let i = 0; i < height - 1; i++) {
      const proof = currentIndex % 2 == 0
        ? currentIndex + 1
        : currentIndex - 1
      currentIndex = (currentIndex - (currentIndex % 2)) / 2
      proofs.push(proof)
    }
    console.info(`Leaf:\nA${index}`)
    console.info('Proofs')
    for(let i = 0; i < proofs.length - 1; i++) {
      console.info(`${LEVEL_ARRAY[i]}${proofs[i]}`)
    }
    console.info(`Root:\n${LEVEL_ARRAY[height - 2]}0`)
    console.info('\n')
  }

  static formatNode(node: MerkleNode): string {
    return `${node.row}${node.index}: ${node.hash.toString('hex')}`
  }

  static computeHash(schedule: Schedule): Buffer {
    const web3 = new Web3()
    const hash = web3.utils.soliditySha3(schedule.index, `0x${schedule.address.toString('hex')}`,schedule.receivingId , schedule.receivingAmount.toNumber(), schedule.sendingAmount.toNumber())
    return Buffer.from(hash.substring(2), 'hex')
  }
}
