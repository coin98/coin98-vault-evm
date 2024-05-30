// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// Interfaces
import "./interfaces/ICoin98VaultNft.sol";
import "./interfaces/ICreditVaultNFT.sol";
import "./interfaces/IVaultConfig.sol";
import "./interfaces/IVRC725.sol";
import "./interfaces/IPriceAggregator.sol";

// Libraries
import "./libraries/AdvancedERC20.sol";
import "./libraries/Payable.sol";
import "./libraries/OwnableUpgradeable.sol";
import "./libraries/Initializable.sol";
import "./libraries/Merkle.sol";
import "./libraries/ReentrancyGuard.sol";

contract Coin98VaultNft is ICoin98VaultNft, Payable, OwnableUpgradeable, ReentrancyGuard {
    using AdvancedERC20 for IERC20;

    uint8 private constant PRICE_CONFIG_DECIMALS = 18;

    mapping(address => bool) private _isAdmins;

    // TokenID -> claimedSchedules
    mapping(uint256 => uint256) private _claimedSchedules;

    // MerkleID -> TokenID
    mapping(uint256 => uint256) private _tokenIds;

    mapping(address => FeeTokenInfo) private _feeTokenInfos;

    // Schedules of the vault
    Schedule[] private _schedules;

    // Merkle root of the vault
    bytes32 private _merkleRoot;
    uint256 private _maxSplitRate;

    address private _token;
    address private _collection;
    address private _feeReceiver;

    event Minted(address indexed to, uint256 indexed merkleId, uint256 totalAlloc);
    event Claimed(address indexed receiver, uint256 indexed tokenId, uint256 scheduleIndex, uint256 amount);
    event Withdrawn(address indexed owner, address indexed recipient, address indexed token, uint256 value);
    event AdminsUpdated(address[] admins, bool[] isActives);
    event Splitted(address indexed receiver, uint256 tokenId, uint256 newTokenId, uint256 rate);
    event FeeUpdated(uint256 fee, address feeToken);

    /** @dev Access Control, only owner and admins are able to access the specified function */
    modifier onlyOwnerOrAdmin() {
        require(owner() == _msgSender() || _isAdmins[_msgSender()], "Ownable: caller is not an admin or an owner");
        _;
    }

    /**
     * @notice Calculate amount of token in base unit based on amount of dollar and price from oracle
     * @param amount amount of dollar in atto (10e-18)
     * @return Amount of token in base unit
     */
    function _attoUSDToWei(
        uint256 amount,
        uint256 tokenPrice,
        uint8 tokenDecimals,
        uint8 priceDecimals
    ) internal pure returns (uint256) {
        if (priceDecimals + tokenDecimals > PRICE_CONFIG_DECIMALS) {
            uint8 decs = priceDecimals + tokenDecimals - PRICE_CONFIG_DECIMALS;
            return (amount * 10 ** decs) / tokenPrice;
        }
        if (priceDecimals + tokenDecimals < PRICE_CONFIG_DECIMALS) {
            uint8 decs = PRICE_CONFIG_DECIMALS - priceDecimals - tokenDecimals;
            return amount / 10 ** decs / tokenPrice;
        }
        return amount / tokenPrice;
    }

    /**
     * @dev Initial vault
     * @param params InitParams of vault
     */
    function __Coin98VaultNft_init(InitParams memory params) external initializer {
        __Ownable_init();

        uint256 totalSchedule = 0;
        for (uint256 i = 0; i < params.schedules.length; i++) {
            totalSchedule += params.schedules[i].percent;
            _schedules.push(params.schedules[i]);
        }

        require(totalSchedule == 10000, "Coin98VaultNft: Schedule not equal to 100 percent");
        require(params.maxSplitRate > 0 && params.maxSplitRate < 10000, "Coin98VaultNft: Invalid split rate");

        _token = params.token;
        _collection = params.collection;
        _merkleRoot = params.merkleRoot;

        require(params.feeTokenAddresses.length == params.feeTokenInfos.length, "Coin98VaultNft: Invalid fee token");
        for (uint256 i = 0; i < params.feeTokenInfos.length; i++) {
            _feeTokenInfos[params.feeTokenAddresses[i]] = params.feeTokenInfos[i];
        }

        _feeReceiver = params.feeReceiver;
        _maxSplitRate = params.maxSplitRate;
    }

    /**
     * @dev Mint the NFT to the receiver
     * @param receiver Address to receive the NFT
     * @param merkleId ID of the NFT
     * @param totalAlloc Total allocation of the NFT
     * @param proofs Merkle proofs
     */
    function mint(address receiver, uint256 merkleId, uint256 totalAlloc, bytes32[] calldata proofs) external {
        bytes32 leaf = keccak256(abi.encodePacked(receiver, merkleId, totalAlloc));
        require(MerkleProof.verify(proofs, _merkleRoot, leaf), "Coin98VaultNft: Invalid proof");
        require(_tokenIds[merkleId] == 0, "Coin98VaultNft: Already minted");

        uint256 tokenId = ICreditVaultNFT(_collection).mint(receiver, totalAlloc);

        _tokenIds[merkleId] = tokenId;

        emit Minted(receiver, merkleId, totalAlloc);
    }

    /**
     * @dev Claim the allocation of the token
     * @param receiver Address to receive the fund
     * @param tokenId ID of the NFT
     * @param scheduleIndex Index of the schedule
     */
    function claim(address receiver, uint256 tokenId, uint256 scheduleIndex) external nonReentrant {
        require(IVRC725(_collection).ownerOf(tokenId) == receiver, "Coin98VaultNft: Receiver not owner of token");
        require(_schedules[scheduleIndex].timestamp <= block.timestamp, "Coin98VaultNft: Schedule not available");
        require(!getClaimed(tokenId, scheduleIndex), "Coin98VaultNft: Already claimed");

        _setClaimed(tokenId, scheduleIndex, true);

        uint256 totalAlloc = ICreditVaultNFT(_collection).getTotalAlloc(tokenId);

        uint256 amount = (totalAlloc * _schedules[scheduleIndex].percent) / 10000;

        uint256 claimedAlloc = ICreditVaultNFT(_collection).getClaimedAlloc(tokenId);

        require(claimedAlloc + amount <= totalAlloc, "Coin98VaultNft: Exceed total allocation");

        ICreditVaultNFT(_collection).updateClaimedAlloc(tokenId, claimedAlloc + amount);

        if (_token == address(0)) {
            (bool success, ) = receiver.call{ value: amount }("");
            require(success, "Coin98VaultNft: Send ETH failed");
        } else {
            IERC20(_token).safeTransfer(receiver, amount);
        }

        emit Claimed(receiver, tokenId, scheduleIndex, amount);
    }

    function split(address receiver, uint256 tokenId, uint256 rate, address feeToken) external payable nonReentrant {
        require(IVRC725(_collection).ownerOf(tokenId) == receiver, "Coin98VaultNft: Not owner of token");
        require(IVRC725(_collection).ownerOf(tokenId) == msg.sender, "Coin98VaultNft: Sender not owner of token");
        require(rate > 0 && rate < 10000, "Coin98VaultNft: Invalid rate");
        require(rate <= _maxSplitRate, "Coin98VaultNft: Exceed max split rate");

        uint256 totalAlloc = ICreditVaultNFT(_collection).getTotalAlloc(tokenId);
        uint256 claimedAlloc = ICreditVaultNFT(_collection).getClaimedAlloc(tokenId);

        uint256 newTotalAlloc = (totalAlloc * rate) / 10000;
        uint256 newClaimedAlloc = (claimedAlloc * rate) / 10000;

        ICreditVaultNFT(_collection).updateTotalAlloc(tokenId, newTotalAlloc);
        ICreditVaultNFT(_collection).updateClaimedAlloc(tokenId, newClaimedAlloc);

        uint256 newToken = ICreditVaultNFT(_collection).mint(receiver, totalAlloc - newTotalAlloc);
        ICreditVaultNFT(_collection).updateClaimedAlloc(newToken, claimedAlloc - newClaimedAlloc);

        _claimedSchedules[newToken] = _claimedSchedules[tokenId];

        uint256 fee;
        (uint256 price, uint8 priceDecimal) = getPrice(feeToken);
        if (_feeTokenInfos[feeToken].feeInUsd > 0) {
            if (feeToken == address(0)) {
                fee = _attoUSDToWei(_feeTokenInfos[feeToken].feeInUsd, price, 18, priceDecimal);
            } else {
                fee = _attoUSDToWei(
                    _feeTokenInfos[feeToken].feeInUsd,
                    price,
                    IERC20(feeToken).decimals(),
                    priceDecimal
                );
            }
        } else {
            fee = _feeTokenInfos[feeToken].feeInToken;
        }

        if (feeToken == address(0)) {
            require(msg.value >= fee, "Coin98VaultNft: Invalid fee amount"); // Checking
        } else {
            IERC20(feeToken).safeTransferFrom(msg.sender, _feeReceiver, fee); // Transfer fee to fee receiver
        }

        emit Splitted(receiver, tokenId, newToken, rate);
    }

    /**
     * @dev withdraw the token in the vault, no limit
     * @param token address of the token, use address(0) to withdraw gas token
     * @param receiver recipient address to receive the fund
     * @param amount amount of fund to withdaw
     */
    function withdraw(address token, address receiver, uint256 amount) public onlyOwner {
        require(receiver != address(0), "Coin98VaultNft: Receiver is zero address");

        uint256 availableAmount;
        if (token == address(0)) {
            availableAmount = address(this).balance;
        } else {
            availableAmount = IERC20(token).balanceOf(address(this));
        }

        require(amount <= availableAmount, "Coin98VaultNft: Not enough balance");

        if (token == address(0)) {
            (bool success, ) = receiver.call{ value: amount }("");
            require(success, "Coin98VaultNft: Send ETH failed");
        } else {
            IERC20(token).safeTransfer(receiver, amount);
        }

        emit Withdrawn(_msgSender(), receiver, token, amount);
    }

    /**
     * @dev withdraw NFT from contract
     * @param token address of the token, use address(0) to withdraw gas token
     * @param receiver recipient address to receive the fund
     * @param tokenId ID of NFT to withdraw
     */
    function withdrawNft(address token, address receiver, uint256 tokenId) public onlyOwner {
        require(receiver != address(0), "Coin98VaultNft: Receiver is zero address");

        IVRC725(token).transferFrom(address(this), receiver, tokenId);

        emit Withdrawn(_msgSender(), receiver, token, 1);
    }

    // SETTERS

    /**
     * @dev Set the admins who can manage the vault
     * @param admins List of admins
     * @param isActives List of status of the admins
     */
    function setAdmins(address[] memory admins, bool[] memory isActives) external virtual onlyOwner {
        require(admins.length == isActives.length, "AdminRole: Invalid input");
        for (uint256 i = 0; i < admins.length; i++) {
            _isAdmins[admins[i]] = isActives[i];
        }

        emit AdminsUpdated(admins, isActives);
    }

    function setMaxSplitRate(uint256 maxSplitRate) external onlyOwner {
        require(maxSplitRate > 0 && maxSplitRate < 10000, "Coin98VaultNft: Invalid split rate");
        _maxSplitRate = maxSplitRate;
    }

    /**
     * @dev Sets the bit at `index` to the boolean `value`.
     * @param tokenId ID of the NFT
     * @param index Index of the schedule
     * @param value is claimed or not
     */
    function _setClaimed(uint256 tokenId, uint256 index, bool value) internal {
        if (value) {
            _claimedSchedules[tokenId] |= 1 << index;
        } else {
            _claimedSchedules[tokenId] &= ~(1 << index);
        }
    }

    // GETTERS

    /**
     * @dev returns the token ID of the merkle ID
     * @param merkleId Merkle index of the merkle tree
     * @return Token ID of the merkle
     */
    function getTokenId(uint256 merkleId) public view returns (uint256) {
        return _tokenIds[merkleId];
    }

    /**
     * @dev returns current admins who can manage the vault
     * @return Status of the admin
     */
    function isAdmin(address admin) public view returns (bool) {
        return _isAdmins[admin];
    }

    /**
     * @dev Get schedules claim of the vault
     * @return List of schedules
     */
    function getSchedules() public view returns (Schedule[] memory) {
        return _schedules;
    }

    /**
     * @dev Get contract address of the collection
     * @return Address of the collection contract
     */
    function getCollectionAddress() public view returns (address) {
        return _collection;
    }

    /**
     * @dev Get contract address of the token
     * @return Address of the token contract
     */
    function getTokenAddress() public view returns (address) {
        return _token;
    }

    /**
     * @dev Get merkle root of the vault
     * @return Merkle root of the vault
     */
    function getMaxSplitRate() public view returns (uint256) {
        return _maxSplitRate;
    }

    /**
     * @dev Returns whether the bit at `index` is set.
     * @param tokenId ID of the NFT
     * @param index Index of the schedule
     * @return Is claimed or not
     */
    function getClaimed(uint256 tokenId, uint256 index) public view returns (bool) {
        return (_claimedSchedules[tokenId] & (1 << index)) != 0;
    }

    /**
     * @dev Get price and decimals by collection ID.
     */
    function getPrice(address token) public view returns (uint256, uint8) {
        require(_feeTokenInfos[token].oracle != address(0), "Coin98VaultNft: Invalid item");
        uint256 price = uint256(IPriceAggregator(_feeTokenInfos[token].oracle).latestAnswer());
        uint8 decimals = IPriceAggregator(_feeTokenInfos[token].oracle).decimals();

        return (price, decimals);
    }
}
