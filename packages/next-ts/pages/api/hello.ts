// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { DefenderRelayProvider, DefenderRelaySigner } from "defender-relay-client/lib/ethers";
import { ethers } from "ethers";
import type { NextApiRequest, NextApiResponse } from "next";

import { YourContract, YourContract__factory } from "../../contracts/contract-types";

type Data = {
  name: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>): Promise<any> {
  // defender
  // const credentials = {
  //   apiKey: "H2i3HSi1nahwbYHTV5RE3ugrqAFkHrQk",
  //   apiSecret: "2n2nfQYQTGKH5qbK5pPyQEYuXmhoXiKHRNnvywupq9u2gBL4Wztta9XrrzQPAVkN",
  // };
  // const provider = new DefenderRelayProvider(credentials);
  // const signer = new DefenderRelaySigner(credentials, provider, { speed: "fast" });

  // const CONTRACT_ADDRESS = "0x17C5edF2b3d713dE2839C7f5A738D0E2E3de20b9";

  // console.log("foundryContracts: ", YourContract__factory.abi);

  // // @ts-ignore
  // const yourContract: YourContract = new ethers.Contract(CONTRACT_ADDRESS, YourContract__factory.abi, signer);
  // console.log("yourContract: ", yourContract);
  // // const tx = await yourContract.setPurpose("cool man from relay");
  // // const rcpt = await tx.wait();
  // // console.log("rcpt: ", rcpt);

  // const purpose = await yourContract.purpose();
  // console.log("purpose: ", purpose);

  res.status(200).json({ name: "John Doe" });
}
