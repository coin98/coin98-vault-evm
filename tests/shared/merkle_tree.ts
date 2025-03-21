
import { Hasher } from './hasher';

const LEVEL_ARRAY = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
const SIZE_ARRAY = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];

export interface MerkleNode {
  row: string;
  index: number;
  hash: Buffer;
}

export class MerkleTreeKeccak {
  private _tree: MerkleTree;

  constructor(hashes: Buffer[]) {
    this._tree = new MerkleTree(hashes, Hasher.keccak256);
  }

  height(): number {
    return this._tree.height();
  }

  nodes(): MerkleNode[][] {
    return this._tree.nodes();
  }

  root(): MerkleNode {
    return this._tree.root();
  }

  proofs(index: number): MerkleNode[] {
    return this._tree.proofs(index);
  }
}

export class MerkleTreeSha256 {
  private _tree: MerkleTree;

  constructor(hashes: Buffer[]) {
    this._tree = new MerkleTree(hashes, Hasher.sha256);
  }

  height(): number {
    return this._tree.height();
  }

  nodes(): MerkleNode[][] {
    return this._tree.nodes();
  }

  root(): MerkleNode {
    return this._tree.root();
  }

  proofs(index: number): MerkleNode[] {
    return this._tree.proofs(index);
  }
}

class MerkleTree {
  private _height: number;
  private _nodes: MerkleNode[][];
  private _root: MerkleNode;

  constructor(hashes: Buffer[], hashFn: (input: Buffer) => Buffer) {
    // detect tree height
    this._height = 0;
    for (let i = 0; i < SIZE_ARRAY.length; i++) {
      if (SIZE_ARRAY[i] >= hashes.length) {
        this._height = i + 1;
        break;
      }
    }

    while (hashes.length < SIZE_ARRAY[this._height - 1]) {
      hashes.push(Buffer.from(new Array<number>(32)));
    }

    const leafNodes = hashes.map((hash, i) => {
      return <MerkleNode>{
        row: LEVEL_ARRAY[0],
        index: i,
        hash: hash,
      };
    });

    this._nodes = [leafNodes];
    for (let i = 1; i < this._height; i++) {
      const subNodes = this._nodes[i - 1];
      const newNodes: MerkleNode[] = [];
      for (let j = 0; j < subNodes.length; j += 2) {
        const hash0: Buffer = subNodes[j].hash;
        const hash1: Buffer = subNodes[j + 1].hash;
        const newHash: Buffer = hash0.compare(hash1) <= 0
          ? hashFn(Buffer.concat([hash0, hash1]))
          : hashFn(Buffer.concat([hash1, hash0]));
        newNodes.push(<MerkleNode>{
          row: LEVEL_ARRAY[i],
          index: j / 2,
          hash: newHash,
        });
      }
      this._nodes.push(newNodes);
    }

    this._root = this._nodes[this._height - 1][0];
  }

  height(): number {
    return this._height;
  }

  nodes(): MerkleNode[][] {
    return this._nodes;
  }

  root(): MerkleNode {
    return this._root;
  }

  proofs(index: number): MerkleNode[] {
    const nodes = this._nodes;
    const proofs: MerkleNode[] = [];
    let currentIndex = index;
    for (let i = 0; i < nodes.length - 1; i++) {
      const proof = currentIndex % 2 == 0 ? nodes[i][currentIndex + 1] : nodes[i][currentIndex - 1];
      currentIndex = (currentIndex - (currentIndex % 2)) / 2;
      proofs.push(proof);
    }

    return proofs;
  }
}
