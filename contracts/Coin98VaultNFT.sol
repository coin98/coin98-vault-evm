// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// Interfaces
import "./interfaces/ICoin98VaultNft.sol";
import "./interfaces/ICollection.sol";
import "./interfaces/IVaultConfig.sol";
import "./interfaces/IVRC725.sol";

// Libraries
import "./libraries/AdvancedERC20.sol";
import "./libraries/Payable.sol";
import "./libraries/OwnableUpgradeable.sol";
import "./libraries/BitMaps.sol";
import "./libraries/Initializable.sol";
import "./libraries/Merkle.sol";
import "./libraries/ReentrancyGuard.sol";

contract Coin98VaultNft is ICoin98VaultNft, Payable, OwnableUpgradeable, ReentrancyGuard {
    using AdvancedERC20 for IERC20;

    address private _factory;

    mapping(address => bool) private _isAdmins;

    // TokenID -> claimedSchedules
    mapping(uint256 => BitMaps.BitMap) private _claimedSchedules; // Store claimed schedules.

    // TokenID -> Allocation
    mapping(uint256 => Allocation) private _allocs;

    // Index -> Schedule
    Schedule[] private _schedules;

    // Merkle root
    bytes32 private _merkleRoot;

    address private _token;
    address private _collection;

    event Minted(address indexed to, uint256 indexed tokenId, uint256 totalAlloc);
    event Claimed(address indexed receiver, uint256 indexed tokenId, uint256 scheduleIndex, uint256 amount);
    event Withdrawn(address indexed owner, address indexed recipient, address indexed token, uint256 value);
    event AdminsUpdated(address[] admins, bool[] isActives);
    event CollectionUpdated(address collection);

    /// @dev Initial vault
    function __Coin98VaultNft_init(InitParams memory params, address collection) external initializer {
        __Ownable_init();

        _token = params.token;
        _collection = collection;
        _merkleRoot = params.merkleRoot;

        for (uint256 i = 0; i < params.schedules.length; i++) {
            _schedules.push(params.schedules[i]);
        }

        _factory = msg.sender;
    }

    /// @dev Access Control, only owner and admins are able to access the specified function
    modifier onlyOwnerOrAdmin() {
        require(owner() == _msgSender() || _isAdmins[msg.sender], "Ownable: caller is not an admin");
        _;
    }

    /**
     * @dev Mint the NFT to the receiver
     * @param to Address to receive the NFT
     * @param tokenId ID of the NFT
     * @param totalAlloc Total allocation of the NFT
     * @param proofs Merkle proofs
     */
    function mint(address to, uint256 tokenId, uint256 totalAlloc, bytes32[] calldata proofs) external {
        bytes32 leaf = keccak256(abi.encodePacked(to, tokenId, totalAlloc));
        require(MerkleProof.verify(proofs, _merkleRoot, leaf), "Coin98VaultNft: Invalid proof");

        ICollection(_collection).mint(to, tokenId);

        _allocs[tokenId].totalAlloc = totalAlloc;

        emit Minted(to, tokenId, totalAlloc);
    }

    /**
     * @dev Claim the allocation of the token
     * @param receiver Address to receive the fund
     * @param tokenId ID of the NFT
     * @param scheduleIndex Index of the schedule
     */
    function claim(address receiver, uint256 tokenId, uint256 scheduleIndex) external nonReentrant {
        require(IVRC725(_collection).ownerOf(tokenId) == receiver, "Coin98VaultNft: Not owner of token");
        require(_schedules[scheduleIndex].timestamp <= block.timestamp, "Coin98VaultNft: Schedule not available");
        require(!BitMaps.get(_claimedSchedules[tokenId], scheduleIndex), "Coin98VaultNft: Already claimed");

        BitMaps.setTo(_claimedSchedules[tokenId], scheduleIndex, true);

        uint256 amount = (_allocs[tokenId].totalAlloc * _schedules[scheduleIndex].percent) / 100;

        _allocs[tokenId].claimedAlloc += amount;

        if (_token == address(0)) {
            (bool success, ) = receiver.call{ value: amount }("");
            require(success, "Coin98VaultNft: Send ETH failed");
        } else {
            IERC20(_token).safeTransfer(receiver, amount);
        }

        emit Claimed(receiver, tokenId, scheduleIndex, amount);
    }

    /// @dev withdraw the token in the vault, no limit
    /// @param token address of the token, use address(0) to withdraw gas token
    /// @param destination recipient address to receive the fund
    /// @param amount amount of fund to withdaw
    function withdraw(address token, address destination, uint256 amount) public onlyOwner {
        require(destination != address(0), "Coin98VaultNft: Destination is zero address");

        uint256 availableAmount;
        if (token == address(0)) {
            availableAmount = address(this).balance;
        } else {
            availableAmount = IERC20(token).balanceOf(address(this));
        }

        require(amount <= availableAmount, "Coin98VaultNft: Not enough balance");

        if (token == address(0)) {
            (bool success, ) = destination.call{ value: amount }("");
            require(success, "Coin98VaultNft: Send ETH failed");
        } else {
            IERC20(token).safeTransfer(destination, amount);
        }

        emit Withdrawn(_msgSender(), destination, token, amount);
    }

    /// @dev withdraw NFT from contract
    /// @param token address of the token, use address(0) to withdraw gas token
    /// @param destination recipient address to receive the fund
    /// @param tokenId ID of NFT to withdraw
    function withdrawNft(address token, address destination, uint256 tokenId) public onlyOwner {
        require(destination != address(0), "Coin98VaultNft: destination is zero address");

        IVRC725(token).transferFrom(address(this), destination, tokenId);

        emit Withdrawn(_msgSender(), destination, token, 1);
    }

    // SETTERS

    /**
     * @dev Set the collection contract address
     * @param collection address of the collection contract
     */
    function setCollection(address collection) external onlyOwnerOrAdmin {
        _collection = collection;

        emit CollectionUpdated(collection);
    }

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

    // GETTERS

    /// @dev returns current admins who can manage the vault
    function isAdmin(address admin) public view returns (bool) {
        return _isAdmins[admin];
    }

    /// @dev address of the factory
    function factory() public view returns (address) {
        return _factory;
    }

    /// @dev Get schedules claim of the vault
    function getSchedules() public view returns (Schedule[] memory) {
        return _schedules;
    }

    /// @dev Get total allocation of a token id
    /// @param tokenId ID of the token
    /// @return Allocation of the token
    function getAlloc(uint256 tokenId) public view returns (Allocation memory) {
        return _allocs[tokenId];
    }

    /// @dev Get total allocation of a token id
    function getTotalAlloc(uint256 tokenId) public view returns (uint256) {
        return _allocs[tokenId].totalAlloc;
    }

    /// @dev Get claimed allocation of a token id
    function getClaimedAlloc(uint256 tokenId) public view returns (uint256) {
        return _allocs[tokenId].claimedAlloc;
    }

    /// @dev Get contract address of the collection
    function getCollectionAddress() public view returns (address) {
        return _collection;
    }

    /// @dev Get contract address of the token
    function getTokenAddress() public view returns (address) {
        return _token;
    }
}
