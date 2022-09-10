import ascii85 from "ascii85";
import axios from "axios";
import { useRouter } from "next/router";
import { ReactElement, useEffect, useState } from "react";
import Blockies from "react-blockies";
import { FiShare2, FiLock } from "react-icons/fi";
import { useAccount } from "wagmi";

import { Feedback, FeedbackDataEventFilter } from "../../../contracts/contract-types/Feedback";
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
  const [roomFeedbacks, setRoomFeedbacks] = useState<RoomFeedbacksType[]>();
  const [currentRoom, setCurrentRoom] = useState<roomDataType>();

  // f-wagmi hooks
  const { address } = useAccount();

  // f-custom hooks
  const [value, copy] = useCopyToClipboard();

  // f-methods
  const loadRoomsData: () => any = async () => {
    const roomFeedbackFilter = feedBackContract?.filters.FeedbackData();
    const roomFeedbackQueryData = await feedBackContract?.queryFilter(roomFeedbackFilter as FeedbackDataEventFilter);
    console.log("roomFeedbackQueryData: ", roomFeedbackQueryData);
    const roomFeedbacksData = roomFeedbackQueryData
      ?.map((data) => {
        return {
          ownerAddress: data.args["ownerAddress"],
          roomId: data.args["roomId"],
          ipfsURL: data.args["ipfsURL"],
        };
      })
      .filter((data) => data.ownerAddress === address && data.roomId === roomId);

    console.log("roomFeedbacksData: ", roomFeedbacksData);
    if (roomFeedbacksData) {
      const finalRoomData = await Promise.all(
        roomFeedbacksData.map(async ({ ownerAddress, ipfsURL, roomId }) => {
          const ipfsRoomData = await axios.get(`https://ipfs.io/ipfs/${ipfsURL}/userFeedback.json`);
          console.log("ipfsRoomData: ", ipfsRoomData.data);
          const encryptedData: { encryptedData: string } = { ...ipfsRoomData.data };
          console.log("encryptedData: ", encryptedData);
          return { ownerAddress, ...encryptedData, roomId };
        })
      );

      console.log("finalRoomData: ", finalRoomData);
      setRoomFeedbacks(finalRoomData);
    }

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
      console.log("selectRoomData: ", selectRoomData);
      setCurrentRoom(selectRoomData);
    }
  };

  const onDecrypt: (encryptedData: string, selectedIndex: number) => Promise<any> = async (
    encryptedData,
    selectedIndex
  ) => {
    console.log("selectedIndex: ", selectedIndex);
    const encryptedDataBuffer = Buffer.from(encryptedData, "base64");

    // Reconstructing the original object outputed by encryption
    const structuredData = {
      version: "x25519-xsalsa20-poly1305",
      ephemPublicKey: encryptedDataBuffer.slice(0, 32).toString("base64"),
      nonce: encryptedDataBuffer.slice(32, 56).toString("base64"),
      ciphertext: encryptedDataBuffer.slice(56).toString("base64"),
    };
    // Convert data to hex string required by MetaMask
    const ct = `0x${Buffer.from(JSON.stringify(structuredData), "utf8").toString("hex")}`;
    // Send request to MetaMask to decrypt the ciphertext
    // Once again application must have acces to the account
    // @ts-ignore
    const decrypt = await window.ethereum.request({
      // @ts-ignore
      method: "eth_decrypt",
      // @ts-ignore
      params: [ct, address],
    });

    const decodedValue = ascii85.decode(decrypt);
    // console.log("decodedValue: ", decodedValue.toString());

    const updatedRoomFeedback = roomFeedbacks?.map((data, index) => {
      if (selectedIndex === index) {
        data.userFeedback = JSON.parse(decodedValue as string)["userFeedback"];
      }
      return data;
    });

    console.log("updatedRoomFeedback: ", updatedRoomFeedback);
    setRoomFeedbacks(updatedRoomFeedback);
  };

  useEffect(() => {
    if (feedBackContract) {
      void loadRoomsData();
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
                                    onClick={(): any => onDecrypt(data?.encryptedData, index)}>
                                    <FiLock size={23} />
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
                </div>
                <div className="justify-end card-actions">
                  <button
                    className="btn btn-primary btn-outline"
                    onClick={(): any => copy(`${window.location.origin}/FeedbackWrite/${address}/${roomId}`)}>
                    Share room link <FiShare2 size={25} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
