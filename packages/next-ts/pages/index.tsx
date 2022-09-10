import axios from "axios";
import { ethers } from "ethers";
import type { NextPage } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FiShare2 } from "react-icons/fi";
import { useAccount, useBalance, useNetwork, useProvider, useSigner } from "wagmi";
import { Web3Storage } from "web3.storage";
import { client } from "../configs";

import { Feedback } from "../contracts/contract-types";
import { FeedbackDataEventFilter } from "../contracts/contract-types/Feedback";
import foundryContracts from "../contracts/foundry_contracts.json";
import useAppLoadContract from "../hooks/useAppLoadContract";
import useCopyToClipboard from "../hooks/useCopyToClipboard";
import { roomDataType } from "../types";

// type roomDataType = {
//   ownerAddress: string;
//   roomId: string;
//   roomContent: any;
//   publicKey: string;
// };

const Home: NextPage = () => {
  // main contract load
  const feedBackContract = useAppLoadContract<Feedback>({
    contractName: "Feedback",
  });

  // f-local states
  const [roomsData, setRoomsData] = useState<roomDataType[]>();
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [toggle, setToggle] = useState(false);
  const [isFeesPaid, setIsFeesPaid] = useState(false);

  const roomsDataRef = useRef<roomDataType[]>();

  // f-wagmi hooks
  const { address } = useAccount();
  const provider = useProvider();
  const { data: signer } = useSigner();
  const { chain } = useNetwork();
  const { data } = useBalance({ addressOrName: address });

  // f-custom hooks
  const [value, copy] = useCopyToClipboard();

  // f-methods
  const loadRoomsData: () => any = async () => {
    const roomsFilter = feedBackContract?.filters.FeedbackRooms();
    const roomsQueryData = await feedBackContract?.queryFilter(roomsFilter as FeedbackDataEventFilter);
    const roomsData = roomsQueryData?.map((data) => {
      return {
        ownerAddress: data.args["ownerAddress"],
        roomId: data.args["roomId"],
        roomContent: data.args["roomContent"],
        publicKey: data.args["publicKey"],
      };
    });

    if (roomsData) {
      const finalRoomData = await Promise.all(
        roomsData.map(async ({ ownerAddress, publicKey, roomContent, roomId }) => {
          const ipfsRoomData = await axios.get(`https://ipfs.io/ipfs/${roomContent}/roomContent.json`);
          const fetchedData = { ...ipfsRoomData.data };
          return { ownerAddress, publicKey, roomContent: fetchedData, roomId };
        })
      );

      console.log("finalRoomData: ", finalRoomData);
      setRoomsData(finalRoomData);
    }
  };

  const onCreateRoom: () => any = async () => {
    const roomData = { roomName, roomDescription };
    const blob = new Blob([JSON.stringify(roomData)], { type: "application/json" });
    const fileData = new File([blob], "roomContent.json");
    const cid = await client.put([fileData]);
    console.log("stored room content  with cid:", cid);

    // @ts-ignore
    const keyB64 = (await window.ethereum.request({
      // @ts-ignore
      method: "eth_getEncryptionPublicKey",
      // @ts-ignore
      params: [address],
    })) as string;
    // const publicKey = Buffer.from(keyB64, "base64");
    const publicKey = keyB64;
    console.log("publicKey: ", publicKey);

    const roomId = Date.now();
    console.log("roomId: ", roomId);

    const tx = await feedBackContract?.createRoom(address as string, String(roomId), cid, publicKey);
    const rcpt = await tx?.wait();
    // console.log("rcpt: ", rcpt);
    setRoomName("");
    setRoomDescription("");
    // window.location.reload();

    setToggle(!toggle);
  };

  const getFeesStatus: () => any = async () => {
    const feesPaid = await feedBackContract?.feesPaid(address as string);
    setIsFeesPaid(feesPaid as boolean);
  };

  const onFundContract: () => any = async () => {
    const chainId = chain?.id;
    const contractAddress = foundryContracts[chainId as number]["contracts"]["Feedback"]["address"];
    const tx = await signer?.sendTransaction({ to: contractAddress, value: ethers.utils.parseEther("0.10") });
    const rcpt = await tx?.wait();
    console.log("rcpt: ", rcpt);
    window.location.reload();
  };

  // f-useEfects
  useEffect(() => {
    if (feedBackContract) {
      void loadRoomsData();
      void getFeesStatus();
    }
  }, [feedBackContract, toggle]);

  return (
    <>
      {isFeesPaid === false && (
        <div className="flex flex-col items-center justify-center w-full text-center h-[80vh] ">
          <button className="m-2 btn btn-primary" onClick={onFundContract}>
            Pay 0.25 eth to join
          </button>
        </div>
      )}
      <div className="flex flex-col items-center justify-center w-full xl:flex-row xl:items-start xl:justify-start">
        {isFeesPaid && (
          <div className="flex flex-col m-2 w-[50%] xl:w-[30%]">
            <input
              type="text"
              className="mt-1 input input-primary"
              placeholder="Enter room name"
              onChange={(e): any => setRoomName(e.target.value)}
              value={roomName}
            />

            <textarea
              // type="text"
              className="mt-2 h-28 input input-primary"
              placeholder="Enter room description"
              value={roomDescription}
              onChange={(e): any => setRoomDescription(e.target.value)}
              rows={10}
            />

            <button className="m-2 btn btn-primary" onClick={onCreateRoom} disabled={roomName === ""}>
              Create room
            </button>
          </div>
        )}

        <div className="w-[70%]">
          {roomsData !== undefined && roomsData?.length !== 0 && (
            <div className="flex flex-col items-center">
              {roomsData.map((data, index) => {
                return (
                  <div key={index} className="m-2 border-2 card w-[80%] bg--base-300 ">
                    <div className="card-body">
                      <h2 className="card-title">{data.roomContent.roomName}</h2>
                      <p>{data.roomContent.roomDescription}</p>
                      <div className="justify-end card-actions">
                        <button
                          className="btn btn-primary btn-outline"
                          onClick={(): any => copy(`${window.location.href}FeedbackWrite/${address}/${data.roomId}`)}>
                          Share room link <FiShare2 size={25} />
                        </button>
                        <Link href={`/FeedbackView/${address}/${data.roomId}`}>
                          <button className="btn btn-primary">Open</button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {roomsData?.length === 0 && (
            <div className="flex flex-col items-center mt-5 ">
              <div className="p-10 text-center border-2 w-[50%] rounded-xl">
                <div>
                  <span className="opacity-80">Please create a room</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
