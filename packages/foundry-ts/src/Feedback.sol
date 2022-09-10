//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { RelayerContext } from "relayer-context-contracts/RelayerContext.sol";

contract Feedback is RelayerContext {
  // contract Feedback {
  // mapping(address => mapping(address => string[])) public feedBackData;
  mapping(address => bool) public feesPaid;

  event FeedbackData(address ownerAddress, string roomId, string ipfsURL);
  event FeedbackRooms(address ownerAddress, string roomId, string roomContent, string publicKey);

  // constructor(address relayer) RelayerContext(relayer) {}

  constructor(address relayer) RelayerContext(relayer) {}

  // constructor(address relayer) {}

  //   function addFeedback(
  //     address _ownerAddress,
  //     address _roomAddress,
  //     string calldata ipfsURL
  //   ) public {
  //     feedBackData[_ownerAddress][_roomAddress].push(ipfsURL);
  //   }

  //   function getFeedback(address _ownerAddress, address _roomAddress) public view returns (string[] memory) {
  //     return feedBackData[_ownerAddress][_roomAddress];
  //   }

  // STORING IPFS STRING ON EVENTS BECAUSE ITS CHEAP
  function createRoom(
    address _ownerAddress,
    string calldata _roomId,
    string calldata _roomContent,
    string calldata _publicKey
  ) public payable {
    _uncheckedTransferToFeeCollectorUncapped();
    emit FeedbackRooms(_ownerAddress, _roomId, _roomContent, _publicKey);
  }

  // STORING IPFS STRING ON EVENTS BECAUSE ITS CHEAP
  function addFeedback(
    address _ownerAddress,
    string calldata _roomId,
    string calldata ipfsURL
  ) public payable {
    _uncheckedTransferToFeeCollectorUncapped();
    emit FeedbackData(_ownerAddress, _roomId, ipfsURL);
  }

  receive() external payable {
    feesPaid[msg.sender] = true;
  }

  fallback() external payable {}
}
