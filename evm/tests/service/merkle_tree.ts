import Web3 from 'web3'

const LEVEL_ARRAY = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']
const SIZE_ARRAY = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096]

export interface MerkleNode {
    row: string
    index: number
    hash: Buffer
}

export class MerkleTree {

    private _height!: number
    private _nodes: MerkleNode[][]
    private _root: MerkleNode

    constructor(hashes: Buffer[]) {
        // detect tree height
        for (let i = 0; i < SIZE_ARRAY.length; i++) {
            if (SIZE_ARRAY[i] >= hashes.length) {
                this._height = i + 1
                break
            }
        }

        while (hashes.length < SIZE_ARRAY[this._height - 1]) {
            hashes.push(Buffer.from(new Array<number>(32)))
        }

        const leafNodes = hashes.map((hash, i) => {
            return <MerkleNode>{
                row: LEVEL_ARRAY[0],
                index: i,
                hash: hash
            }
        })

        this._nodes = [leafNodes]
        for (let i = 1; i < this._height; i++) {
            const subNodes = this._nodes[i - 1]
            const newNodes: MerkleNode[] = []
            for (let j = 0; j < subNodes.length; j += 2) {
                const hash0 = subNodes[j].hash.toString('hex')
                const hash1 = subNodes[j + 1].hash.toString('hex')
                const web3 = new Web3()
                const tempHash = hash0 <= hash1
                    ? web3.utils.soliditySha3('0x' + hash0, '0x' + hash1)
                    : web3.utils.soliditySha3('0x' + hash1, '0x' + hash0)
                const newHash = Buffer.from(tempHash.substring(2), 'hex')
                newNodes.push(
                    <MerkleNode>{
                        row: LEVEL_ARRAY[i],
                        index: j / 2,
                        hash: newHash,
                    }
                )
            }
            this._nodes.push(newNodes)
        }

        this._root = this._nodes[this._height - 1][0]
    }

    height(): number {
        return this._height
    }

    nodes(): MerkleNode[][] {
        return this._nodes
    }

    root(): MerkleNode {
        return this._root
    }
}