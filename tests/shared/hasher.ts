import {
  enc,
  SHA256
} from 'crypto-js';
import create from 'keccak';

export class Hasher {
  static keccak256(input: string | Buffer): Buffer {
    return create('keccak256').update(input).digest();
  }

  static sha256(input: string | Buffer): Buffer {
    if (typeof input == 'string') {
      return Buffer.from(SHA256(input).toString(), 'hex');
    }
    const words = enc.Hex.parse(input.toString('hex'));
    return Buffer.from(SHA256(words).toString(), 'hex');
  }
}