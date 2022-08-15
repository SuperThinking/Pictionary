/*
Collection - rooms
Document Schema
{
    _id: string,
    roomID: string,
    users: []{ username: string, score: integer, id, turns: integer },
    word: string | null,
    artistId: string | null,
    hasStarted: boolean,
    timer: integer | null, // not being used | TODO: remove
  }
*/

export const getRoom = async (mongoClient, roomID) => {
  try {
    const rooms = mongoClient.db("pictionary").collection("rooms");
    const query = { _id: roomID };
    const room = await rooms.findOne(query);
    return room;
  } finally {
    // mongoClient.close();
  }
};

export const createRoom = async (mongoClient, roomId, username) => {
  const room = {
    _id: roomId,
    roomID: roomId,
    users: [],
    word: null,
    artistId: null,
    hasStarted: false,
    timer: null,
  };
  try {
    const rooms = mongoClient.db("pictionary").collection("rooms");
    const result = await rooms.insertOne(room);
    console.log(`${username} created ${roomId} | ${result.insertedId}`);
    return result.insertedId;
  } finally {
    // mongoClient.close();
  }
};

export const addUserToRoom = async (mongoClient, user, roomID) => {
  try {
    const rooms = mongoClient.db("pictionary").collection("rooms");
    const result = await rooms.findOneAndUpdate(
      { _id: roomID },
      { $push: { users: user } },
      { returnOriginal: false, new: true, returnDocument: "after" }
    );
    console.log(`${user.username} joined ${roomID}`);
    return result.value;
  } finally {
    // mongoClient.close();
  }
};

export const removeUserFromRoom = async (mongoClient, userID, roomID) => {
  // Removes user from given room & deletes the room if no users are left
  try {
    const rooms = mongoClient.db("pictionary").collection("rooms");
    const result = await rooms.findOneAndUpdate(
      { _id: roomID },
      { $pull: { users: { id: userID } } },
      { returnOriginal: false, new: true, returnDocument: "after" }
    );
    console.log(`${userID} left ${roomID}`);
    if (result.value.users.length === 0) {
      await rooms.deleteOne({ _id: roomID });
      console.log(`Deleted room ${roomID}`);
    }
    return result.value;
  } finally {
    // mongoClient.close();
  }
};

export const startGame = async (mongoClient, roomID) => {
  try {
    const rooms = mongoClient.db("pictionary").collection("rooms");
    await rooms.updateOne({ _id: roomID }, { $set: { hasStarted: true } });
  } finally {
    // mongoClient.close();
  }
};

export const updateWordAndArtistTurns = async (
  mongoClient,
  roomID,
  word,
  artistID
) => {
  // Increments turns of the given userID & updates the current word
  try {
    const rooms = mongoClient.db("pictionary").collection("rooms");
    await rooms.updateOne(
      { _id: roomID },
      { $set: { word: word }, $inc: { "users.$[ele].turns": 1 } },
      {
        arrayFilters: [{ "ele.id": artistID }],
      }
    );
  } finally {
    // mongoClient.close();
  }
};

export const updateRoomTimerID = async (mongoClient, roomID, timerID) => {
  try {
    const rooms = mongoClient.db("pictionary").collection("rooms");
    console.log(roomID, timerID);
    await rooms.updateOne({ _id: roomID }, { $set: { timer: timerID } });
  } finally {
    // mongoClient.close();
  }
};

export const increaseScore = async (mongoClient, roomID, userID, inc) => {
  // Increments score of the given userID by "inc"
  try {
    const rooms = mongoClient.db("pictionary").collection("rooms");
    const result = await rooms.findOneAndUpdate(
      { _id: roomID },
      { $inc: { "users.$[ele].score": inc } },
      {
        arrayFilters: [{ "ele.id": userID }],
        returnOriginal: false,
        new: true,
        returnDocument: "after",
      }
    );
    const index = result.value.users.findIndex((user) => user.id === userID);
    return result.value.users[index];
  } finally {
    // mongoClient.close();
  }
};

export const deleteRooms = async (mongoClient, roomID, all = false) => {
  // ! Deletes all the rooms ! //
  try {
    const rooms = mongoClient.db("pictionary").collection("rooms");
    if (all) {
      console.log("Deleting all rooms in collection");
      await rooms.deleteMany({});
    } else {
      await rooms.deleteOne({ _id: roomID });
    }
  } finally {
    // mongoClient.close();
  }
};
