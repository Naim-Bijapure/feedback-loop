/* eslint-disable @typescript-eslint/no-unsafe-return */
import { GelatoRelaySDK } from "@gelatonetwork/relay-sdk";
import axios from "axios";
import { ethers, PopulatedTransaction } from "ethers";
import type { NextPage } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FiShare2 } from "react-icons/fi";
import { TailSpin, Watch } from "react-loader-spinner";
import { useAccount, useBalance, useNetwork, useProvider, useSigner } from "wagmi";

import { Sleep } from "../components/DebugContract/configs/utils";
import { client, FEE_TOKEN } from "../configs";
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
  const [roomsData, setRoomsData] = useState<roomDataType[]>([]);
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [toggle, setToggle] = useState(false);
  const [isFeesPaid, setIsFeesPaid] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isUploadingIPFS, setIsUploadingIPFS] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isCopied, setIsCopied] = useState({});
  const [isPayingFees, setIsPayingFees] = useState(false);

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
    const roomsDataFiltered = roomsQueryData
      ?.map((data) => {
        return {
          ownerAddress: data.args["ownerAddress"],
          roomId: data.args["roomId"],
          roomContent: data.args["roomContent"],
          publicKey: data.args["publicKey"],
        };
      })
      .filter((data) => data.ownerAddress === address);
    console.log("roomsData: ", roomsDataFiltered);

    if (roomsDataFiltered && roomsDataFiltered.length > 0) {
      setIsLoadingRooms(true);
      const finalRoomData = await Promise.all(
        roomsDataFiltered.map(async ({ ownerAddress, publicKey, roomContent, roomId }) => {
          const ipfsRoomData = await axios.get(`https://ipfs.io/ipfs/${roomContent}/roomContent.json`);
          const fetchedData = { ...ipfsRoomData.data };
          return { ownerAddress, publicKey, roomContent: fetchedData, roomId };
        })
      );

      console.log("finalRoomData: ", finalRoomData);
      setIsLoadingRooms(false);
      setRoomsData(finalRoomData);
    }
  };

  const onCreateRoom: () => any = async () => {
    setIsCreatingRoom(true);
    setIsUploadingIPFS(true);
    const roomData = { roomName, roomDescription };
    const blob = new Blob([JSON.stringify(roomData)], { type: "application/json" });
    const fileData = new File([blob], "roomContent.json");
    const cid = await client.put([fileData]);
    console.log("stored room content  with cid:", cid);
    setIsUploadingIPFS(false);

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

    // const tx = await feedBackContract?.createRoom(address as string, String(roomId), cid, publicKey);
    // const rcpt = await tx?.wait();

    const { data: populateTxData } = (await feedBackContract?.populateTransaction.createRoom(
      address as string,
      String(roomId),
      cid,
      publicKey
    )) as PopulatedTransaction;

    // populate relay request
    const request = {
      chainId: provider.network.chainId,
      target: feedBackContract?.address,
      data: populateTxData,
      feeToken: FEE_TOKEN,
    };

    // @ts-ignore
    const relayResponse = await GelatoRelaySDK.relayWithSyncFee(request);
    console.log("relayResponse: ", relayResponse);

    setRoomName("");
    setRoomDescription("");

    if (roomsData.length > 0) {
      // fetching created ipfs data to cache locally
      const ipfsRoomData = await axios.get(`https://ipfs.io/ipfs/${cid}/roomContent.json`);
      console.log("ipfsRoomData: ", ipfsRoomData.data);

      setRoomsData([
        ...roomsData,
        { ownerAddress: address as string, publicKey, roomContent: roomData, roomId: String(roomId) },
      ]);
    }

    setIsCreatingRoom(false);
    // await loadRoomsData();
  };

  const getFeesStatus: () => any = async () => {
    // localStorage.setItem("feesPaid", JSON.stringify({ address: true }));
    const localFeesPaid = localStorage.getItem("feesPaid");
    if (localFeesPaid !== null) {
      const isFeesPaid = JSON.parse(localFeesPaid);
      if (isFeesPaid[address as string]) {
        setIsFeesPaid(isFeesPaid[address as string] as boolean);
      } else {
        const feesPaid = await feedBackContract?.feesPaid(address as string);
        localStorage.setItem("feesPaid", JSON.stringify({ ...isFeesPaid, [address as string]: feesPaid }));

        setIsFeesPaid(feesPaid as boolean);
      }
    } else {
      const feesPaid = await feedBackContract?.feesPaid(address as string);
      localStorage.setItem("feesPaid", JSON.stringify({ [address as string]: true }));

      setIsFeesPaid(feesPaid as boolean);
    }
  };

  const onFundContract: () => any = async () => {
    setIsPayingFees(true);
    const chainId = chain?.id;
    const contractAddress = foundryContracts[chainId as number]["contracts"]["Feedback"]["address"];
    const tx = await signer?.sendTransaction({ to: contractAddress, value: ethers.utils.parseEther("0.10") });
    const rcpt = await tx?.wait();

    // setIsPayingFees(true);

    const localFeesPaid = localStorage.getItem("feesPaid");
    let previousFeesPaid;
    if (localFeesPaid !== null) {
      previousFeesPaid = JSON.parse(localFeesPaid);
    }
    localStorage.setItem("feesPaid", JSON.stringify({ ...previousFeesPaid, [address as string]: true }));
    // console.log("rcpt: ", rcpt);
    window.location.reload();
  };

  const onCopy: (roomId: string) => any = async (roomId: string) => {
    setIsCopied({ [roomId]: true });
    await copy(`${window.location.origin}/FeedbackWrite/${address}/${roomId}`);
    await Sleep(800);
    setIsCopied({ [roomId]: false });
  };

  // f-useEfects
  useEffect(() => {
    if (feedBackContract) {
      void loadRoomsData();
      void getFeesStatus();
    }
  }, [feedBackContract]);

  // useEffect(() => {
  //   void getFeesStatus();
  // }, []);

  useEffect(() => {
    if (feedBackContract) {
      // void loadRoomsData();
    }
  }, [feedBackContract, toggle]);

  // useEffect(() => {
  //   if (feedBackContract) {
  //     void createRoomListener();
  //   }
  // }, [feedBackContract]);

  // const localFeesPaid = localStorage.getItem("feesPaid");
  // console.log("localFeesPaid: ", localFeesPaid);

  return (
    <>
      {isFeesPaid === false && chain !== undefined && (
        <div className="flex flex-col items-center justify-center w-full text-center h-[80vh] ">
          <button className="m-2 btn btn-primary" onClick={onFundContract}>
            {isPayingFees === false && (
              <>
                <span>Pay 0.10 eth to join</span>
              </>
            )}

            {isPayingFees === true && (
              <>
                <span>
                  <TailSpin
                    height="30"
                    width="30"
                    color="#4fa94d"
                    ariaLabel="tail-spin-loading"
                    radius="1"
                    wrapperStyle={{}}
                    wrapperClass=""
                    visible={true}
                  />
                </span>
              </>
            )}
          </button>
        </div>
      )}
      <div className="flex flex-col items-center justify-center w-full xl:flex-row xl:items-start xl:justify-start">
        {isFeesPaid && (
          <div className="flex flex-col m-2  w-[50%] xl:w-[30%] xl:ml-12">
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

            <button
              className="m-2 btn btn-primary"
              onClick={onCreateRoom}
              disabled={roomName === "" || roomDescription === "" || isCreatingRoom === true}>
              {isCreatingRoom === false && <span>Create room</span>}
              {isUploadingIPFS && <span>Uploading to ipfs</span>}
              {isCreatingRoom && isUploadingIPFS === false && <span>Preparing room</span>}
              {isCreatingRoom && (
                <>
                  <span>
                    <TailSpin
                      height="30"
                      width="30"
                      color="#4fa94d"
                      ariaLabel="tail-spin-loading"
                      radius="1"
                      wrapperStyle={{}}
                      wrapperClass="mx-2"
                      visible={true}
                    />
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="w-[70%]">
          {isLoadingRooms === true && (
            <div className="flex flex-col items-center justify-center mt-10">
              <Watch
                height="80"
                width="80"
                radius="48"
                color="#4fa94d"
                ariaLabel="watch-loading"
                wrapperStyle={{}}
                // wrapperClassName=""
                visible={true}
              />
              <div className="mt-2 opacity-70 text-info">Hold on at first rooms takes time to load !</div>
            </div>
          )}

          {roomsData !== undefined && roomsData?.length !== 0 && isLoadingRooms === false && isFeesPaid && (
            <div className="flex flex-col items-center">
              {roomsData
                .sort((dataA, dataB) => Number(dataB.roomId) - Number(dataA.roomId))
                .map((data, index) => {
                  return (
                    <div key={index} className="m-2 border-2 card w-[80%] bg--base-300 ">
                      <div className="card-body">
                        <h2 className="card-title">{data.roomContent.roomName}</h2>
                        <p>{data.roomContent.roomDescription}</p>
                        <div className="justify-end card-actions">
                          <button className="btn btn-primary btn-outline" onClick={(): any => onCopy(data.roomId)}>
                            {Boolean(isCopied[data.roomId]) === false && (
                              <>
                                Share room link <FiShare2 size={25} />
                              </>
                            )}
                            {Boolean(isCopied[data.roomId]) === true && <>Copied !</>}
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

          {roomsData?.length === 0 && chain !== undefined && isFeesPaid === true && (
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

      {chain === undefined && (
        <div className="flex flex-col items-center w-full mt-16">
          <div className="p-10 border-2 rounded-xl opacity-70">Please connect wallet to send feedback</div>
        </div>
      )}
    </>
  );
};

export default Home;
