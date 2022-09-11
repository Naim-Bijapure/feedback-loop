import { encrypt } from "@metamask/eth-sig-util";
import { GelatoRelaySDK } from "@gelatonetwork/relay-sdk";
import ascii85 from "ascii85";
import axios from "axios";
import { ethers, PopulatedTransaction } from "ethers";
import { useRouter } from "next/router";
import { ReactElement, useEffect, useState } from "react";
import { RiSendPlaneLine } from "react-icons/ri";
import { TailSpin, ThreeDots } from "react-loader-spinner";
import { useNetwork } from "wagmi";

import { client, FEE_TOKEN } from "../../../configs";
import { Feedback, FeedbackDataEventFilter } from "../../../contracts/contract-types/Feedback";
import useAppLoadContract from "../../../hooks/useAppLoadContract";
import { roomDataType } from "../../../types";

export default function RoomIdPage(): ReactElement {
  const router = useRouter();
  const { roomId, ownerId } = router.query;

  let feedBackContract = useAppLoadContract<Feedback>({
    contractName: "Feedback",
  });

  // f-local states
  const [currentRoom, setCurrentRoom] = useState<roomDataType>();
  const [enteredFeedback, setEnteredFeedback] = useState<string>();
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [isMsgSend, setIsMsgSend] = useState<boolean>(false);
  const [isRoomLoading, setIsRoomLoading] = useState(true);

  // f-wagmi hooks

  const { chain } = useNetwork();

  // f-methods
  const loadRoomsData: () => any = async () => {
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
      console.log("selectRoomData: ", selectRoomData);
      setCurrentRoom(selectRoomData);
      setIsRoomLoading(false);
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
    setIsSendingMessage(true);

    const feedBackData = { userFeedback: enteredFeedback };
    const bufferdData = Buffer.from(JSON.stringify(feedBackData));
    // @ts-ignore
    const encryptedDataBuffer = encryptData(currentRoom?.publicKey, bufferdData);
    const encryptedData = encryptedDataBuffer.toString("base64");
    console.log("encryptedString: ", encryptedData);

    // const feedBackData = { userFeedback: enteredFeedback };
    // console.log("feedBackData: ", feedBackData);
    const ipfsData = { encryptedData };
    const blob = new Blob([JSON.stringify(ipfsData)], { type: "application/json" });
    const fileData = new File([blob], "userFeedback.json");
    const ipfsCid = await client.put([fileData]);
    // console.log("ipfsCid: ", ipfsCid);

    // const tx = await feedBackContract?.addFeedback(ownerId as string, roomId as string, ipfsCid);
    // const rcpt = await tx?.wait();
    // console.log("rcpt: ", rcpt);

    const randomSigner = ethers.Wallet.createRandom();
    feedBackContract = feedBackContract?.connect(randomSigner);

    const { data: populateTxData } = (await feedBackContract?.populateTransaction.addFeedback(
      ownerId as string,
      roomId as string,
      ipfsCid
    )) as PopulatedTransaction;

    // populate relay request
    const request = {
      chainId: chain?.id,
      target: feedBackContract?.address,
      data: populateTxData,
      feeToken: FEE_TOKEN,
    };

    // @ts-ignore
    const relayResponse = await GelatoRelaySDK.relayWithSyncFee(request);
    console.log("relayResponse: ", relayResponse);

    setEnteredFeedback("");
    setIsSendingMessage(false);
    setIsMsgSend(true);
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
          <div className="border-2 border-primary border-opacity-50 shadow--md  card w-[60%] bg-base-100 ">
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

                {isMsgSend && (
                  <div className="self-center  text-center">
                    <span className="m-2 text-md text-success">Feedback sent !</span>
                  </div>
                )}
              </div>
              <div className="justify-end card-actions">
                <button
                  className="btn btn-primary btn-outline"
                  onClick={onSendFeedback}
                  disabled={Boolean(enteredFeedback) === false}>
                  {isSendingMessage === false && <RiSendPlaneLine size={30} />}

                  {isSendingMessage && (
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
                  )}
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
          <div className="p-10 border-2 rounded-xl opacity-70">Please connect wallet to send feedback</div>
        </div>
      )}
    </div>
  );
}
