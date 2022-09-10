/* eslint-disable @typescript-eslint/no-unsafe-return */
import ascii85 from "ascii85";
import axios from "axios";
import { ethers } from "ethers";
import { useRouter } from "next/router";
import { ReactElement, useEffect, useState } from "react";
import Blockies from "react-blockies";
import { FiShare2, FiLock } from "react-icons/fi";
import { Blocks, Puff, ThreeDots } from "react-loader-spinner";
import { useAccount, useNetwork } from "wagmi";
import { Sleep } from "../../../configs";

import { Feedback__factory } from "../../../contracts/contract-types";
import { Feedback, FeedbackDataEventFilter } from "../../../contracts/contract-types/Feedback";
import foundryContracts from "../../../contracts/foundry_contracts.json";
import useAppLoadContract from "../../../hooks/useAppLoadContract";
import useCopyToClipboard from "../../../hooks/useCopyToClipboard";
import { roomDataType, RoomFeedbacksType } from "../../../types";

// import Blockie from "../../../components/EthComponents/Blockie";

export default function RoomIdPage(): ReactElement {
  // f-routes
  const router = useRouter();
  const { roomId, ownerId } = router.query;

  const feedBackContract = useAppLoadContract<Feedback>({
    contractName: "Feedback",
  });

  // f-local states
  const [roomFeedbacks, setRoomFeedbacks] = useState<RoomFeedbacksType[]>([]);
  const [currentRoom, setCurrentRoom] = useState<roomDataType>();
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState<boolean>(false);
  const [toDecryptionFeedback, setToDecryptionFeedback] = useState<any>({});
  const [toggle, setToggle] = useState(false);
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // f-wagmi hooks
  const { address } = useAccount();
  const { chain } = useNetwork();

  // f-custom hooks
  const [value, copy] = useCopyToClipboard();

  // f-methods
  const loadRoomsData: () => any = async () => {
    // load room data
    setIsRoomLoading(true);
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

      const selectRoomData = finalRoomData.find((data) => data.roomId === roomId);
      setCurrentRoom(selectRoomData);
      setIsRoomLoading(false);
    }

    // LOAD ROOM FEEDBACKS DATA
    const roomFeedbackFilter = feedBackContract?.filters.FeedbackData();
    const roomFeedbackQueryData = await feedBackContract?.queryFilter(roomFeedbackFilter as FeedbackDataEventFilter);
    const roomFeedbacksData = roomFeedbackQueryData
      ?.map((data) => {
        return {
          ownerAddress: data.args["ownerAddress"],
          roomId: data.args["roomId"],
          ipfsURL: data.args["ipfsURL"],
        };
      })
      .filter((data) => data.ownerAddress === address && data.roomId === roomId);

    if (roomFeedbacksData && roomFeedbacksData?.length > 0) {
      setIsLoadingFeedbacks(true);

      const finalRoomData = roomFeedbacksData.map(({ ownerAddress, ipfsURL, roomId }) => {
        return { ownerAddress, ipfsURL, roomId };
      });

      // @ts-ignore
      // setRoomFeedbacks(finalRoomData.map((data) => data.status === "fulfilled" && data.value));
      setRoomFeedbacks(finalRoomData);
      setIsLoadingFeedbacks(false);
    }
  };

  const onDecrypt: (ipfsURL: string, selectedIndex: number) => Promise<any> = async (ipfsURL, selectedIndex) => {
    setToDecryptionFeedback({ [selectedIndex]: true });

    const ipfsRoomData = await axios.get(`https://ipfs.io/ipfs/${ipfsURL}/userFeedback.json`);
    const encryptedData = ipfsRoomData.data["encryptedData"];
    console.log("encryptedData: ", encryptedData);

    const encryptedDataBuffer = Buffer.from(encryptedData as string, "base64");

    // Reconstructing the original object outputed by encryption
    const structuredData = {
      version: "x25519-xsalsa20-poly1305",
      ephemPublicKey: encryptedDataBuffer.slice(0, 32).toString("base64"),
      nonce: encryptedDataBuffer.slice(32, 56).toString("base64"),
      ciphertext: encryptedDataBuffer.slice(56).toString("base64"),
    };
    // Convert data to hex string required by MetaMask
    const ct = `0x${Buffer.from(JSON.stringify(structuredData), "utf8").toString("hex")}`;
    // @ts-ignore
    const decrypt = await window.ethereum.request({
      // @ts-ignore
      method: "eth_decrypt",
      // @ts-ignore
      params: [ct, address],
    });

    const decodedValue = ascii85.decode(decrypt);

    const updatedRoomFeedback = roomFeedbacks?.map((data, index) => {
      if (selectedIndex === index) {
        data.userFeedback = JSON.parse(decodedValue as string)["userFeedback"];
      }
      return data;
    });

    setRoomFeedbacks(updatedRoomFeedback);
  };

  const roomFeedBackListener: () => any = async () => {
    feedBackContract?.on("FeedbackData", (_ownerAddress, _roomId, ipfsURL) => {
      console.log("_ownerAddress, _roomId, ipfsURL: ", _ownerAddress, _roomId, ipfsURL);
      setToggle((preToggle) => !preToggle);
    });
  };

  const onCopy: (roomId: string) => any = async (roomId: string) => {
    setIsCopied(true);
    await Sleep(1000);
    await copy(`${window.location.href}FeedbackWrite/${address}/${roomId}`);
    setIsCopied(false);
  };

  // f-useEffect hooks
  useEffect(() => {
    if (feedBackContract) {
      void loadRoomsData();
    }
  }, [feedBackContract, toggle]);

  useEffect(() => {
    if (feedBackContract) {
      void roomFeedBackListener();
    }
  }, [feedBackContract]);

  return (
    <>
      <div>
        {currentRoom !== undefined && (
          <div className="flex flex-col items-center justify-center p-2 ">
            <div className="border-2 border-primary border-opacity-50 shadow--md  card w-[80%] bg-base-100">
              <div className="card-body ">
                <h2 className="card-title">{currentRoom.roomContent.roomName}</h2>
                <p>{currentRoom.roomContent.roomDescription}</p>
                <div className="w-full m-2">
                  {roomFeedbacks !== undefined && roomFeedbacks?.length > 0 && (
                    <div className="flex flex-col items-center justify-center">
                      {roomFeedbacks.map((data, index) => {
                        return (
                          <div key={index} className="flex justify-between">
                            <div className=" blockies ">
                              <Blockies
                                scale={4}
                                seed={`${String(address?.slice(0, 40)) + String(Math.floor(Math.random() * 1000))}`}
                              />
                            </div>

                            <div className="flex justify-center   p-10 m-2 border-4 rounded-full rounded-tl-none shadow--xl -card w-96 bg-base-100">
                              {data?.userFeedback !== undefined && (
                                <>
                                  <div className="">
                                    <div className="justify-end card-actions"></div>
                                    <p>{data?.userFeedback}</p>
                                  </div>
                                </>
                              )}
                              {data?.userFeedback === undefined && (
                                <div className="flex flex-col items-center justify-center">
                                  <button
                                    className="btn btn-primary btn-outline"
                                    onClick={(): any => onDecrypt(data?.ipfsURL as string, index)}
                                    disabled={toDecryptionFeedback[index] === true}>
                                    {index in toDecryptionFeedback === false && (
                                      <>
                                        <FiLock size={23} />
                                      </>
                                    )}

                                    {toDecryptionFeedback && toDecryptionFeedback[index] === true && (
                                      <>
                                        <Blocks
                                          visible={true}
                                          height="30"
                                          width="30"
                                          ariaLabel="blocks-loading"
                                          wrapperStyle={{}}
                                          wrapperClass="blocks-wrapper"
                                        />
                                      </>
                                    )}
                                  </button>
                                  <div className="mt-1 text-xs text-info opacity-70">Decrypt feedback</div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {roomFeedbacks?.length === 0 && isLoadingFeedbacks === false && (
                    <div className="p-10 text-center border-2 rounded-xl">
                      <div className="opacity-70">No feedbacks !</div>
                    </div>
                  )}

                  {isLoadingFeedbacks && (
                    <div className="flex flex-col items-center justify-center p-10 text-center border-2 rounded-xl">
                      <div>
                        <Puff
                          height="80"
                          width="80"
                          color="#4fa94d"
                          ariaLabel="puff-loading"
                          wrapperStyle={{}}
                          wrapperClass=""
                          visible={true}
                        />
                      </div>

                      <div className="mt-1 opacity-50">Wait loading feedbacks...</div>
                    </div>
                  )}
                </div>

                <div className="justify-end card-actions">
                  <button className="btn btn-primary btn-outline" onClick={(): any => onCopy(roomId as string)}>
                    {Boolean(isCopied) === false && (
                      <>
                        Share room link <FiShare2 size={25} />
                      </>
                    )}
                    {Boolean(isCopied) === true && <>Copied !</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isRoomLoading && chain !== undefined && (
          <div className="flex flex-col items-center w-full mt-16">
            <ThreeDots
              height="80"
              width="80"
              radius="9"
              color="#4fa94d"
              ariaLabel="three-dots-loading"
              wrapperStyle={{}}
              // wrapperClassName=""
              visible={true}
            />
            <div className="text-xs text-info">Loading room..</div>
          </div>
        )}

        {chain === undefined && (
          <div className="flex flex-col items-center w-full mt-16">
            <div className="p-10 border-2 rounded-xl opacity-70">Please connect to wallet to send feedback</div>
          </div>
        )}
      </div>
    </>
  );
}
