pragma solidity >=0.8.0 <0.9.0;

//SPDX-License-Identifier: MIT
import "forge-std/Test.sol";
import "forge-std/console2.sol";

import "../src/YourContract.sol";

contract YourContractTest is Test {
  uint256 testNumber;
  YourContract yc;

  function setUp() public {
    console.log("setUp:1 ");
    testNumber = 42;
    yc = new YourContract("MyPurpose");
  }

  function testCheckPurpose() public {
    console.log("testCheckPurpose: 3 ");
    string memory purpose = yc.purpose();
    console.log("purpose: ", purpose);
    assertEq(purpose, "MyPurpose");
  }

  function testSetPuprpose() public {
    console.log("testSetPuprpose: 2 ");
    uint256 balance = 1 ether;
    console.log("balance: ", balance / 10**18);
    yc.setPurpose("N");

    // string memory purpose = yc.purpose();
    // assertEq(purpose, "N");
  }
}
