import { PublicKey } from "@solana/web3.js";
import * as borsh from '@project-serum/borsh';
import BN from "bn.js";
import { HashService } from "@coin98/solana-support-library";
import { MerkleNode, MerkleTree } from "@coin98/solana-support-library";

const LEVEL_ARRAY = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
];

export interface Schedule {
  index: number;
  address: PublicKey;
  sendingAmount: BN;
  receivingAmount: BN;
}

const ScheduleLayout: borsh.Layout<Schedule> = borsh.struct([
  borsh.u16('index'),
  borsh.publicKey('address'),
  borsh.u64('receivingAmount'),
  borsh.u64('sendingAmount'),
])


export class MerkleDistributionService {
  static createTree(schedules: Schedule[]): MerkleTree {
    const hashes = schedules.map((schedule) => {
      return this.computeHash(schedule);
    });
    return new MerkleTree(hashes);
  }

  static print(tree: MerkleTree) {
    const nodes = tree.nodes();
    for (let i = 0; i < nodes.length; i++) {
      const subNodes = nodes[i];
      for (let j = 0; j < subNodes.length; j++) {
        console.debug(this.formatNode(subNodes[j]));
      }
    }
    console.debug("\n");
  }

  static printProof(tree: MerkleTree, index: number) {
    const nodes = tree.nodes();
    const leaf = nodes[0][index];
    const root = tree.root();
    const proofs = [];
    let currentIndex = index;
    for (let i = 0; i < nodes.length - 1; i++) {
      const proof = currentIndex % 2 == 0 ? nodes[i][currentIndex + 1] : nodes[i][currentIndex - 1];
      currentIndex = (currentIndex - (currentIndex % 2)) / 2;
      proofs.push(proof);
    }
    console.debug(`Leaf:\n${this.formatNode(leaf)}`);
    console.debug("Proofs");
    for (let i = 0; i < proofs.length; i++) {
      console.debug(`${this.formatNode(proofs[i])}`);
    }
    console.debug(`Root:\n${this.formatNode(root)}`);
    console.debug("\n");
  }

  static printProof2(index: number, height: number) {
    const proofs = [];
    let currentIndex = index;
    for (let i = 0; i < height - 1; i++) {
      const proof = currentIndex % 2 == 0 ? currentIndex + 1 : currentIndex - 1;
      currentIndex = (currentIndex - (currentIndex % 2)) / 2;
      proofs.push(proof);
    }
    console.debug(`Leaf:\nA${index}`);
    console.debug("Proofs");
    for (let i = 0; i < proofs.length - 1; i++) {
      console.debug(`${LEVEL_ARRAY[i]}${proofs[i]}`);
    }
    console.debug(`Root:\n${LEVEL_ARRAY[height - 2]}0`);
    console.debug("\n");
  }

  static getProof(tree: MerkleTree, index: number): MerkleNode[] {
    const nodes = tree.nodes();
    const proofs = [];
    let currentIndex = index;
    for (let i = 0; i < nodes.length - 1; i++) {
      const proof = currentIndex % 2 == 0 ? nodes[i][currentIndex + 1] : nodes[i][currentIndex - 1];
      currentIndex = (currentIndex - (currentIndex % 2)) / 2;
      proofs.push(proof)
    }

    return proofs;
  }

  static formatNode(node: MerkleNode): string {
    return `${node.row}${node.index}: ${node.hash.toString("hex")}`;
  }

  static computeHash(schedule: Schedule): Buffer {
    const buffer = Buffer.alloc(1000)
    const span = ScheduleLayout.encode(schedule, buffer);
    const serialize = buffer.slice(0, span)

    return HashService.keckka256(serialize);
  }
}

