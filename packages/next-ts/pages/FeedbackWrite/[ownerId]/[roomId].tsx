import axios from "axios";
import { useRouter } from "next/router";
import { ReactElement, useEffect, useState } from "react";

import { Feedback, FeedbackDataEventFilter } from "../../../contracts/contract-types/Feedback";
import useAppLoadContract from "../../../hooks/useAppLoadContract";
import { roomDataType } from "../../../types";

export default function RoomIdPage(): ReactElement {
  const router = useRouter();
  const { roomId, ownerId } = router.query;

  const feedBackContract = useAppLoadContract<Feedback>({
    contractName: "Feedback",
  });

  // f-local stats

  const [currentRoom, setCurrentRoom] = useState<roomDataType>();

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

  useEffect(() => {
    if (feedBackContract) {
      void loadRoomsData();
    }
  }, [feedBackContract]);

  return (
    <div>
      {currentRoom !== undefined && (
        <div className="bd-red">
          {/* <div>{currentRoom.roomContent.roomName}</div>
          <div>{currentRoom.roomContent.roomDescription}</div> */}
        </div>
      )}
    </div>
  );
}
