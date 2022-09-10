export type roomDataType = {
  ownerAddress: string;
  roomId: string;
  roomContent: any;
  publicKey: string;
};

export type RoomFeedbacksType = {
  ownerAddress: string;
  userFeedback?: string;
  roomId: string;
  encryptedData?: string;
  ipfsURL?: string;
};
