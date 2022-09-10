import { encrypt } from "@metamask/eth-sig-util";
import ascii85 from "ascii85";
import axios from "axios";
import { useRouter } from "next/router";
import { ReactElement, useEffect, useState } from "react";
import { RiSendPlaneLine } from "react-icons/ri";
import { client } from "../../../configs";

import { Feedback, FeedbackDataEventFilter } from "../../../contracts/contract-types/Feedback";
import useAppLoadContract from "../../../hooks/useAppLoadContract";
import { roomDataType } from "../../../types";

export default function RoomIdPage(): ReactElement {
  const router = useRouter();
  const { roomId, ownerId } = router.query;

  const feedBackContract = useAppLoadContract<Feedback>({
    contractName: "Feedback",
  });

  // f-local states
  const [currentRoom, setCurrentRoom] = useState<roomDataType>();
  const [enteredFeedback, setEnteredFeedback] = useState<string>();

  // f-wagmi hooks

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

      const selectRoomData = finalRoomData.find((data) => data.roomId === roomId);
      console.log("selectRoomData: ", selectRoomData);
      setCurrentRoom(selectRoomData);
    }
  };

  function encryptData(publicKey: Buffer, data: Buffer): Buffer {
    const enc = encrypt({
      publicKey: publicKey.toString("base64"),
      data: ascii85.encode(data).toString(),
      version: "x25519-xsalsa20-poly1305",
    });

    // We want to store the data in smart contract, therefore we concatenate them
    const buf = Buffer.concat([
      Buffer.from(enc.ephemPublicKey, "base64"),
      Buffer.from(enc.nonce, "base64"),
      Buffer.from(enc.ciphertext, "base64"),
    ]);

    return buf;
  }

  const onSendFeedback: () => any = async () => {
    // const data = { data: "cool man" };

    const feedBackData = { userFeedback: enteredFeedback };
    const bufferdData = Buffer.from(JSON.stringify(feedBackData));
    // @ts-ignore
    const encryptedDataBuffer = encryptData(currentRoom?.publicKey, bufferdData);
    const encryptedData = encryptedDataBuffer.toString("base64");
    console.log("encryptedString: ", encryptedData);

    // const feedBackData = { userFeedback: enteredFeedback };
    console.log("feedBackData: ", feedBackData);
    const ipfsData = { encryptedData };
    const blob = new Blob([JSON.stringify(ipfsData)], { type: "application/json" });
    const fileData = new File([blob], "userFeedback.json");
    const ipfsCid = await client.put([fileData]);
    console.log("ipfsCid: ", ipfsCid);

    const tx = await feedBackContract?.addFeedback(ownerId as string, roomId as string, ipfsCid);
    const rcpt = await tx?.wait();
    console.log("rcpt: ", rcpt);
  };

  useEffect(() => {
    if (feedBackContract) {
      void loadRoomsData();
    }
  }, [feedBackContract]);

  return (
    <div>
      {currentRoom !== undefined && (
        <div className="flex flex-col items-center justify-center m-2 ">
          <div className="border-2 border-primary border-opacity-50 shadow--md  card w-[60%] bg-base-100">
            <div className="card-body ">
              <h2 className="card-title">{currentRoom.roomContent.roomName}</h2>
              <p>{currentRoom.roomContent.roomDescription}</p>
              <div className="w-full h-32 ">
                <textarea
                  name="feedbackInput"
                  placeholder="Enter your feedback"
                  id=""
                  className="w-full h-32 input textarea-bordered border-opacity-50 textarea-info"
                  onChange={(e): any => setEnteredFeedback(e.target.value)}
                  value={enteredFeedback}
                />
                <div>
                  <span className="m-1 text-xs text-info">* Your feedback is completly anonymous and gasless</span>
                </div>
              </div>
              <div className="justify-end card-actions">
                <button className="btn btn-primary btn-outline" onClick={onSendFeedback}>
                  <RiSendPlaneLine size={30} />
                </button>
              </div>
            </div>
          </div>

          <div className="self-center mt-1 text-sm opacity-90">
            To create your own feedback room
            <a className="mx-1 link link-primary" href={window.location.origin} target="_blank" rel="noreferrer">
              join here
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
