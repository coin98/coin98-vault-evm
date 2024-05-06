// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./lib/ERC721.sol";
import "./lib/BitMaps.sol";
import "./lib/Merkle.sol";
import "./lib/Upgradable.sol";

abstract contract VaultNFT is ERC721, OwnableUpgradeable {
    // TokenID -> claimedAlloc
    mapping(uint256 => uint256) public claimedAlloc; // Total allocation token user claimed

    // TokenID -> claimedSchedules
    mapping(uint256 => BitMaps.BitMap) internal claimedSchedules; // Store claimed schedules.

    // TokenID -> total allocation token user can claim
    mapping(uint256 => uint256) totalAlloc; // Total allocation token user can claim

    bool public isActive;

    bytes32 public merkleRoot;

    function __VaultNFT_init() internal {
        __ERC721_init("VaultNFT", "VNFT");
        isActive = true;
    }

    function mint(bytes32[] calldata proofs, address to, uint256 tokenId, uint256 _totalAlloc) external {
        bytes32 leaf = keccak256(abi.encode(to, tokenId, _totalAlloc));
        require(MerkleProof.verify(proofs, merkleRoot, leaf), "VaultNFT: Invalid proof");
        _mint(to, tokenId);
        totalAlloc[tokenId] = _totalAlloc;
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        require(merkleRoot == 0, "VaultNFT: Already initialized");
        require(merkleRoot != _merkleRoot, "VaultNFT: Same merkle root");
        require(_merkleRoot != 0, "VaultNFT: Invalid merkle root");
        merkleRoot = _merkleRoot;
    }

    // GETTERS
    function getClaimedAlloc(uint256 tokenId) external view returns (uint256) {
        return claimedAlloc[tokenId];
    }

    function gettotalAlloc(uint256 tokenId) external view returns (uint256) {
        return totalAlloc[tokenId];
    }
}
