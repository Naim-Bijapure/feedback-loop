import { Web3Storage } from "web3.storage";

export const client = new Web3Storage({
  token: process.env.NEXT_PUBLIC_TARGET_WEB3_STORAGE as string,
});

export const Sleep = async (time: number): Promise<any> =>
  new Promise((resolve, reject) => setTimeout(() => resolve(true), time));

export const FEE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
