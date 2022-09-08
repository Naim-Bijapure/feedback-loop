//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract YourContract {
  string public purpose = "Building Unstoppable Apps!!!";

  constructor(string memory startingPurpose) {
    purpose = startingPurpose;
  }

  function setPurpose(string memory newPurpose) public payable {
    purpose = newPurpose;
  }

  receive() external payable {}

  fallback() external payable {}
}
