import { expect, use } from "chai";
import { Contract } from "ethers";
import { deployContract, MockProvider, solidity } from "ethereum-waffle";
import YourContract from "../out/YourContract.sol/YourContract.json";

use(solidity);

describe("YourContract", () => {
  const [wallet, walletTo] = new MockProvider().getWallets();
  let youContract: Contract;

  beforeEach(async () => {
    //@ts-ignore
    youContract = await deployContract(wallet, YourContract, ["cool"]);
    console.log("youContract: ", youContract.address);
  });

  it("yourContract address ", async () => {
    //     console.log("youContract: ", youContract);
  });

  //   it("Transfer adds amount to destination account", async () => {
  //     await token.transfer(walletTo.address, 7);
  //     expect(await token.balanceOf(walletTo.address)).to.equal(7);
  //   });

  //   it("Transfer emits event", async () => {
  //     await expect(token.transfer(walletTo.address, 7))
  //       .to.emit(token, "Transfer")
  //       .withArgs(wallet.address, walletTo.address, 7);
  //   });

  //   it("Can not transfer above the amount", async () => {
  //     await expect(token.transfer(walletTo.address, 1007)).to.be.reverted;
  //   });

  //   it("Can not transfer from empty account", async () => {
  //     const tokenFromOtherWallet = token.connect(walletTo);
  //     await expect(tokenFromOtherWallet.transfer(wallet.address, 1)).to.be.reverted;
  //   });

  //   it("Calls totalSupply on BasicToken contract", async () => {
  //     await token.totalSupply();
  //     expect("totalSupply").to.be.calledOnContract(token);
  //   });

  //   it("Calls balanceOf with sender address on BasicToken contract", async () => {
  //     await token.balanceOf(wallet.address);
  //     expect("balanceOf").to.be.calledOnContractWith(token, [wallet.address]);
  //   });
});
