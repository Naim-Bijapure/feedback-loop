pragma solidity >=0.8.0 <0.9.0;

//SPDX-License-Identifier: MIT
import "forge-std/Test.sol";
import "forge-std/console2.sol";

import "../src/Feedback.sol";

contract FeedbackTest is Test {
  Feedback fb;

  function setUp() public {
    fb = new Feedback(address(0));
  }

  function testAddFeedbackData() public {
    string memory ipfsURL = "bafybeia3mgg7jjjp5rvrahpy2svts2hpzh5br7r6xz2fcr5wdvpo3lxhda/hello.json";
    fb.addFeedback(address(0), "asdfasdfsdf", ipfsURL);
  }

  function testCreateRoom() public {
    string memory pb_key = "bafybeia3mgg7jjjp5rvrahpy2svts2hpzh5br7r6xz2fcr5wdvpo3lxhda/hello.json";
    fb.createRoom(address(0), "asdfasdfsdf", "room 1", pb_key);
  }
}
