import { useRouter } from "next/router";
import { ReactElement } from "react";

export default function RoomIdPage(): ReactElement {
  const router = useRouter();
  const { roomId, ownerId } = router.query;
  console.log("ownerId: ", ownerId);
  console.log("roomId: ", roomId);
  return (
    <>
      <div>cool</div>
    </>
  );
}
