//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;
import { RelayerContext } from "relayer-context-contracts/RelayerContext.sol";

contract YourContractGelato is RelayerContext {
  event SetPurpose(address sender, string purpose);

  mapping(address => uint256) public balance;

  string public purpose = "Building Unstoppable Apps!!!";

  constructor(address relayer) RelayerContext(relayer) {
    // purpose = startingPurpose;
  }

  function setPurpose(string memory newPurpose) public payable {
    _uncheckedTransferToFeeCollectorUncapped();

    purpose = newPurpose;
    emit SetPurpose(msg.sender, purpose);
  }

  receive() external payable {}

  fallback() external payable {}
}
