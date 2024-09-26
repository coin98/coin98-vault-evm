// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

 contract ERC20Token is ERC20("Test1","TEST"),Ownable {
    // @notice Creates `_amount` token to `_to`. Must only be called by the owner (MasterChef).
	function mint(address _to, uint256 _amount) public onlyOwner {
		_mint(_to, _amount);
	}

}

contract ERC721Token is ERC721("Test2","TEST") {
    function mintTo(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}

contract ERC1155Token is ERC1155 {

constructor() public ERC1155("https://coin98/com") {}

function mintTo(address to, uint256 tokenId, uint256 amount) public {
    _mint(to, tokenId, amount, "");
}

function safeTransfer(address from, address to, uint256 id, uint256 amount) public {

    _safeTransferFrom(from,to,id,amount,"");

 }
}
