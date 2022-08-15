import express from "express";
import { words } from "./words.js";
import http from "http";
import socket from "socket.io";
import "dotenv/config";
import {
  getRoom,
  createRoom,
  addUserToRoom,
  removeUserFromRoom,
  startGame,
  updateWordAndArtistTurns,
  increaseScore,
  deleteRooms,
} from "./models/rooms.js";
import { default as mongodb } from "mongodb";

const MongoClient = mongodb.MongoClient;
const app = express();
const server = http.createServer(app);
const io = socket.listen(server);
const port = 3000;
const TURN_DURATION = 15; // 30 seconds
const PAUSE_DURATION = 2; // 2 second pause
const SCORE_INC = 1;

var mongoClient;
var roomIntervalMap = {};

const Status = {
  ERROR: "ERROR",
  SUCCESS: "SUCCESS",
  NEW_USER: "NEW_USER",
  ROOM_404: "ROOM_404",
  USER_LEFT_ROOM: "USER_LEFT_ROOM",
  WRONG: "WRONG",
};

const getWord = () => {
  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
};

const getArtistId = (users) => {
  // Get the user with the least turns
  let turns = users[0]["turns"];
  let index = 0;
  for (let i = 1; i < users.length; i++) {
    if (users[i]["turns"] < turns) {
      turns = users[i]["turns"];
      index = i;
    }
  }
  return users[index]["id"];
};

const resetRooms = async (roomID, username) => {
  // Small hack to delete rooms collection :p
  if (
    username === process.env.RESET_USERNAME &&
    roomID === process.env.RESET_ROOM_ID
  )
    await deleteRooms(mongoClient, "-", true);
};

const createEvent = (status, payload) => {
  return { status, payload };
};

const createUser = (id, username, roomId) => {
  const user = { username: username, score: 0, id, turns: 0 };
  return user;
};

io.on("connection", (socket) => {
  console.log("A user connected :D", socket.id);

  // DRAWING
  socket.on("DRAW", ({ roomId, pathPayload }) => {
    socket.broadcast.to(roomId).emit("DRAW", pathPayload);
  });

  // START GAME
  socket.on("START_GAME", async ({ roomId }) => {
    await startGame(mongoClient, roomId);
    io.to(roomId).emit(
      "START_GAME",
      createEvent(Status.SUCCESS, "Starting Game!")
    );

    const startNextTurn = async (room) => {
      const word = getWord();
      const artistID = getArtistId(room.users);
      await updateWordAndArtistTurns(mongoClient, room.roomID, word, artistID);
      io.to(room.roomID).emit("DRAW", { eventName: "CLEAR_BOARD" });
      io.to(room.roomID).emit("TURN", {
        word,
        id: artistID,
        turnInterval: TURN_DURATION,
      });
    };

    const room = await getRoom(mongoClient, roomId);
    if (room.timer === null) {
      const intervalID = setInterval(async () => {
        const room = await getRoom(mongoClient, roomId);
        if (!room || room.users.length == 0) {
          console.log(
            `Deleting & CLearing Interval for ${roomId} | ${roomIntervalMap[roomId]}`
          );
          clearInterval(roomIntervalMap[roomId]);
          deleteRooms(roomId);
        }
        await new Promise((r) => setTimeout(r, PAUSE_DURATION));
        await startNextTurn(room);
      }, (TURN_DURATION + PAUSE_DURATION) * 1000);
      roomIntervalMap[room.roomID] = intervalID; // this id is not an int but an object and can't be strigified
    }
    await startNextTurn(room);
  });

  // TAKES CARE OF TURNS AND GENERATE WORDS
  socket.on("TURN", async ({ roomId }) => {});

  // TAKES CARE OF GUESSES AND SCORES
  socket.on("GUESS", async ({ roomId, guess }) => {
    // Can also be moved to client as the client is aware of the word
    const room = await getRoom(mongoClient, roomId);
    if (guess.toLowerCase() === room.word.toLowerCase()) {
      const user = await increaseScore(
        mongoClient,
        roomId,
        socket.id,
        SCORE_INC
      );
      socket.emit(
        "GUESS",
        createEvent(Status.SUCCESS, {
          score: user.score,
        })
      );
    } else {
      const index = room.users.findIndex((user) => user.id === socket.id);
      socket.emit(
        "GUESS",
        createEvent(Status.WRONG, {
          score: room.users[index].score,
        })
      );
    }
  });

  // CREATE ROOM
  socket.on("CREATE_ROOM", async ({ roomId, username }) => {
    resetRooms(roomId, username);
    const room = await getRoom(mongoClient, roomId);
    if (room) {
      socket.emit(
        roomId,
        createEvent(Status.ERROR, "Room with this id already exists")
      );
    } else {
      await createRoom(mongoClient, roomId, username);
      socket.emit(
        roomId,
        createEvent(Status.SUCCESS, "Room created successfully")
      );
    }
  });

  // CHECK IF ROOM EXISTS BEFORE JOINING
  socket.on("ROOM_EXISTS", async ({ roomId }) => {
    const room = await getRoom(mongoClient, roomId);
    if (room && room.hasStarted != true) {
      socket.emit(
        roomId,
        createEvent(Status.SUCCESS, "Connecting you to room")
      );
    } else if (!room) {
      socket.emit(
        roomId,
        createEvent(Status.ROOM_404, `Room with this id does not exist`)
      );
    } else {
      socket.emit(
        roomId,
        createEvent(Status.ERROR, "Game has already started")
      );
    }
  });

  // JOIN ROOM
  socket.on("JOIN_ROOM", async ({ roomId, username }) => {
    const room = await getRoom(mongoClient, roomId);
    if (room && room.hasStarted != true) {
      const user = createUser(socket.id, username, roomId);
      const updatedRoom = await addUserToRoom(mongoClient, user, roomId);
      socket.join(roomId);

      // Send sender success event
      socket.emit(roomId, createEvent(Status.SUCCESS, { username }));

      // Send users and room info
      io.to(roomId).emit(
        "USERS",
        createEvent(Status.NEW_USER, {
          roomId: roomId,
          users: updatedRoom.users,
        })
      );
    } else {
      socket.emit(
        roomId,
        createEvent(
          Status.ROOM_404,
          "Room with this ID does not exist/game has started"
        )
      );
    }
  });

  // LEAVE ROOM
  socket.on("LEAVE_ROOM", async ({ roomId }) => {
    const room = await removeUserFromRoom(mongoClient, socket.id, roomId);
    socket.leave(roomId);
    io.to(roomId).emit(
      "USERS",
      createEvent(Status.USER_LEFT_ROOM, {
        roomId: roomId,
        users: room.users,
      })
    );
    // Clear room turn interval
    if (room.users.length === 0) {
      if (room.roomID in roomIntervalMap) {
        console.log(
          `CLearing Interval for ${room.roomID} | ${
            roomIntervalMap[room.roomID]
          }`
        );
        clearInterval(roomIntervalMap[room.roomID]);
      }
    }
  });
});

MongoClient.connect(process.env.MONGO_HOST, function (err, client) {
  if (err) throw err;
  mongoClient = client;
  server.listen(port, () => console.log("SOCKET up on port " + port));
});

process.on("SIGINT", function () {
  if (mongoClient) mongoClient.close();
});
