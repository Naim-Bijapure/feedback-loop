import { Web3Storage } from "web3.storage";

export const client = new Web3Storage({
  token: process.env.NEXT_PUBLIC_TARGET_WEB3_STORAGE as string,
});
