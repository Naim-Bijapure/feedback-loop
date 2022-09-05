import { GelatoRelaySDK } from "@gelatonetwork/relay-sdk";
import { ethers, Signer } from "ethers";
import { ReactElement, useState } from "react";
import { useProvider, useSigner } from "wagmi";
import { Web3Storage } from "web3.storage";

import { YourContract, YourContract__factory } from "../contracts/contract-types";

console.log("process.env.NEXT_PUBLIC_TARGET_WEB3_STORAGE: ", process.env.NEXT_PUBLIC_TARGET_WEB3_STORAGE);
const client = new Web3Storage({
  token: process.env.NEXT_PUBLIC_TARGET_WEB3_STORAGE as string,
});

export default function PocPage(): ReactElement {
  const provider = useProvider();
  const { data: signer } = useSigner();
  const [taskId, setTaskId] = useState("");
  const [cid, setCid] = useState("");

  const test: () => any = async (): Promise<void> => {
    const credentials = {
      apiKey: "H2i3HSi1nahwbYHTV5RE3ugrqAFkHrQk",
      apiSecret: "2n2nfQYQTGKH5qbK5pPyQEYuXmhoXiKHRNnvywupq9u2gBL4Wztta9XrrzQPAVkN",
    };
    // const provider = new DefenderRelayProvider(credentials);
    // const signer = new DefenderRelaySigner(credentials, provider, { speed: "fast" });

    // const erc20 = new ethers.Contract(ERC20_ADDRESS, ERC20_ABI, signer);
    // const tx = await erc20.transfer(beneficiary, (1e18).toString());
    // const mined = await tx.wait();

    // set up on-chain variables
    const abi = YourContract__factory.abi;
    const feeToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

    // generate payload
    // const provider = new ethers.providers.Web3Provider(window.ethereum);
    // const signer = provider.getSigner();

    // @ts-ignore
    const contract: YourContract = new ethers.Contract(
      "0xBbd3d9Da3aBB32d81732eF64973Bfcf1AB4a4B01",
      abi,
      signer as Signer
    );

    const { data } = await contract.populateTransaction.setPurpose(
      `bafybeig5z3xswqfnqneeaw4c5gfobvdwkknp4oxv6bcbhgi5curcufxhqy `
    );

    // populate relay request
    const request = {
      chainId: provider.network.chainId,
      target: "0xBbd3d9Da3aBB32d81732eF64973Bfcf1AB4a4B01",
      data: data,
      feeToken: feeToken,
    };

    const gasCost = await GelatoRelaySDK.getEstimatedFee(
      provider.network.chainId,
      feeToken,
      ethers.BigNumber.from(100000),
      false
    );

    console.log("gasCost: ", ethers.utils.formatEther(gasCost.toString()));

    // send relayRequest to Gelato Relay API
    // @ts-ignore
    const relayResponse = await GelatoRelaySDK.relayWithSyncFee(request);
    console.log("relayResponse: ", relayResponse);
    setTaskId(relayResponse.taskId);

    // const purpose = await contract.purpose();
    // console.log("purpose: ", purpose);
  };

  const getPurpose: () => any = async (): Promise<void> => {
    const status = await GelatoRelaySDK.getTaskStatus(taskId);
    console.log("status: ", status);

    const abi = YourContract__factory.abi;
    // @ts-ignore
    const contract: YourContract = new ethers.Contract(
      "0xBbd3d9Da3aBB32d81732eF64973Bfcf1AB4a4B01",
      abi,
      signer as Signer
    );
    const purpose = await contract.purpose();
    console.log("purpose: ", purpose);
  };

  const ipfsUpload: () => any = async (): Promise<void> => {
    const obj = { hello: "world yo man" };
    const blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
    const fileData = new File([blob], "hello.json");
    const cid = await client.put([fileData]);
    console.log("stored files with cid:", cid);
    setCid(cid);
  };
  const ipfsGetData: () => any = async (): Promise<void> => {
    // console.log("ipfsGetData: ");
    // const res = await client.get("bafybeia3mgg7jjjp5rvrahpy2svts2hpzh5br7r6xz2fcr5wdvpo3lxhda");
    // console.log("res: ", res);
    // const data = await res?.files();
    // console.log("data: ", data);
    // console.log(`Got a response! [${res.status}] ${res.statusText}`);
    const res = await fetch(`https://ipfs.io/ipfs/${cid}/hello.json`);

    const data = await res.json();
    console.log("data: ", data);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center">
        <button className="m-2 btn btn-primary" onClick={test}>
          on send tx
        </button>

        <button className="m-2 btn btn-primary" onClick={getPurpose}>
          get purpose
        </button>

        <button className="m-2 btn btn-primary" onClick={ipfsUpload}>
          Ipfs upload
        </button>

        <button className="m-2 btn btn-primary" onClick={ipfsGetData}>
          Ipfs get data
        </button>
      </div>
    </>
  );
}
