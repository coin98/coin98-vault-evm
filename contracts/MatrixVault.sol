// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./Coin98VaultV2.sol";
import "./lib/Token.sol";

contract MatrixVault is Coin98VaultV2 {
    using AdvancedERC20 for IERC20;

    //  (Event ID => Index ID => NFT ID => Claimed))
    mapping(uint256 => mapping(uint256 => mapping(uint256 => bool))) internal _isClaimedByToken;

    event RedeemedForCollectionHolder(
        uint256 indexed eventId,
        address receiver,
        address collectionAddress,
        uint256 index,
        uint256 timestamp,
        uint256 tokenId,
        uint256 receivingAmount,
        uint256 sendingAmount
    );

    event RedeemedForSpecificTokenHolder(
        uint256 indexed eventId,
        address receiver,
        address collectionAddress,
        uint256 index,
        uint256 timestamp,
        uint256 tokenId,
        uint256 receivingAmount,
        uint256 sendingAmount
    );

    function _setTokenClaimed(uint256 eventId, uint256 index, uint256 tokenId) internal {
        _isClaimedByToken[eventId][index][tokenId] = true;
    }

    function _redeemForCollectionHolder(
        uint256 eventId,
        address receiver,
        uint256 timestamp,
        address collectionAddress,
        uint256 tokenId,
        uint256 receivingAmount,
        uint256 sendingAmount,
        bytes32 node,
        bytes32[] calldata proofs
    ) internal {
        uint256 fee = IVaultConfig(_factory).fee();
        uint256 gasLimit = IVaultConfig(_factory).gasLimit();

        require(collectionAddress != address(0), "C98Vault: Invalid collection");
        require(receiver != address(0), "C98Vault: Invalid receiver");
        require(IERC721(collectionAddress).ownerOf(tokenId) == receiver, "C98Vault: Invalid owner");
        require(timestamp <= block.timestamp, "C98Vault: Schedule locked");

        EventData memory eventData = _eventDatas[eventId];
        require(eventData.isActive > 0, "C98Vault: Invalid event");

        require(MerkleProof.verify(proofs, eventData.merkleRoot, node), "C98Vault: Invalid proof");

        {
            uint256 availableAmount;
            if (eventData.receivingToken == address(0)) {
                availableAmount = address(this).balance;
            } else {
                availableAmount = IERC20(eventData.receivingToken).balanceOf(address(this));
            }

            require(receivingAmount <= availableAmount, "C98Vault: Insufficient token");
        }

        if (fee > 0) {
            require(_msgValue() >= fee, "C98Vault: Insufficient fee");
            uint256 reward = IVaultConfig(_factory).ownerReward();
            uint256 finalFee = fee - reward;
            (bool success, ) = _factory.call{value: finalFee, gas: gasLimit}("");
            require(success, "C98Vault: Unable to charge fee");
        }

        if (sendingAmount > 0) {
            if (eventData.sendingToken == address(0)) {
                require(sendingAmount + fee <= _msgValue(), "C98Vault: Insufficient native sending amount");
            } else {
                IERC20(eventData.sendingToken).safeTransferFrom(_msgSender(), address(this), sendingAmount);
            }
        }

        if (eventData.receivingToken == address(0)) {
            (bool success, ) = receiver.call{value: receivingAmount, gas: gasLimit}("");
            require(success, "C98Vault: Send ETH failed");
        } else {
            IERC20(eventData.receivingToken).safeTransfer(receiver, receivingAmount);
        }
    }

    function redeemForCollectionHolder(
        uint256 eventId,
        address receiver,
        uint256 index,
        uint256 timestamp,
        address collectionAddress,
        uint256 tokenId,
        uint256 receivingAmount,
        uint256 sendingAmount,
        bytes32[] calldata proofs
    ) public payable {
        require(!_isClaimedByToken[eventId][index][tokenId], "C98Vault: Token is claimed");
        uint256 zero = 0;
        bytes32 node = keccak256(
            abi.encodePacked(index, timestamp, collectionAddress, zero, receivingAmount, sendingAmount)
        );

        _redeemForCollectionHolder(
            eventId,
            receiver,
            timestamp,
            collectionAddress,
            tokenId,
            receivingAmount,
            sendingAmount,
            node,
            proofs
        );

        _setTokenClaimed(eventId, index, tokenId);

        emit RedeemedForCollectionHolder(
            eventId,
            receiver,
            collectionAddress,
            index,
            timestamp,
            tokenId,
            receivingAmount,
            sendingAmount
        );
    }

    function redeemForSpecificTokenHolder(
        uint256 eventId,
        address receiver,
        uint256 index,
        uint256 timestamp,
        address collectionAddress,
        uint256 tokenId,
        uint256 receivingAmount,
        uint256 sendingAmount,
        bytes32[] calldata proofs
    ) public payable {
        require(!isRedeemed(eventId, index), "C98Vault: Event is redeemed");

        bytes32 node = keccak256(
            abi.encodePacked(index, timestamp, collectionAddress, tokenId, receivingAmount, sendingAmount)
        );
        _redeemForCollectionHolder(
            eventId,
            receiver,
            timestamp,
            collectionAddress,
            tokenId,
            receivingAmount,
            sendingAmount,
            node,
            proofs
        );
        _setRedemption(eventId, index);

        emit RedeemedForSpecificTokenHolder(
            eventId,
            receiver,
            collectionAddress,
            index,
            timestamp,
            tokenId,
            receivingAmount,
            sendingAmount
        );
    }
}
