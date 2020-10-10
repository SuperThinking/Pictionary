const express = require("express");
const { words } = require("./words");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io").listen(server);
const port = 3000;

var rooms = {};

const Status = {
  ERROR: "ERROR",
  SUCCESS: "SUCCESS",
  NEW_USER: "NEW_USER",
  ROOM_404: "ROOM_404",
  USER_LEFT_ROOM: "USER_LEFT_ROOM",
  WRONG: "WRONG",
};

const randomRoomGenerator = () => {
  return `Room#${Math.floor(1000 + Math.random() * 9000)}`;
};

const getWord = () => {
  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
};

const getArtistId = (roomId) => {
  // Get the user with the least turns
  const users = rooms[roomId]["users"];
  let turns = users[0]["turns"];
  let index = 0;
  for (let i = 1; i < users.length; i++) {
    if (users[i]["turns"] < turns) {
      turns = users[i]["turns"];
      index = i;
    }
  }
  rooms[roomId]["users"][index]["turns"] += 1;
  return rooms[roomId]["users"][index]["id"];
};

const createEvent = (status, payload) => {
  return { status, payload };
};

const createUser = (id, username, roomId) => {
  const user = { username: username, score: 0, id, turns: 0 };
  rooms[roomId]["users"].push(user);
  return user;
};

const createRoom = (roomId) => {
  rooms[roomId] = {
    users: [],
    word: null,
    artistId: null,
    hasStarted: false,
    timer: null,
  };
};

const removeUser = (id, roomId) => {
  const index = rooms[roomId]["users"].findIndex((user) => user.id === id);

  if (index !== -1) {
    return rooms[roomId]["users"].splice(index, 1)[0];
  }
};

io.on("connection", (socket) => {
  console.log("A user connected :D", socket.id);

  // DRAWING
  socket.on("DRAW", ({ roomId, pathPayload }) => {
    socket.broadcast.to(roomId).emit("DRAW", pathPayload);
  });

  // START GAME
  socket.on("START_GAME", ({ roomId }) => {
    rooms[roomId]["hasStarted"] = true;
    io.to(roomId).emit(
      "START_GAME",
      createEvent(Status.SUCCESS, "Starting Game!")
    );
  });

  // TAKES CARE OF TURNS AND GENERATE WORDS
  socket.on("TURN", ({ roomId }) => {
    if (rooms[roomId].timer === null) {
      rooms[roomId].timer = setInterval(() => {
        const index = rooms[roomId]["users"].findIndex(
          (user) => user.id === socket.id
        );
        const word = getWord();
        const id = getArtistId(roomId);
        rooms[roomId]["word"] = word;
        io.to(roomId).emit("TURN", {
          word,
          id,
        });
      }, 30000);
    }
    const index = rooms[roomId]["users"].findIndex(
      (user) => user.id === socket.id
    );
    const word = getWord();
    const id = getArtistId(roomId);
    rooms[roomId]["word"] = word;
    io.to(roomId).emit("TURN", {
      word,
      id,
    });
  });

  // TAKES CARE OF GUESSES AND SCORES
  socket.on("GUESS", ({ roomId, guess }) => {
    // Can also be moved to client as the client is aware of the word
    const index = rooms[roomId]["users"].findIndex(
      (user) => user.id === socket.id
    );
    if (guess.toLowerCase() === rooms[roomId]["word"].toLowerCase()) {
      rooms[roomId]["users"][index]["score"] += 1;
      socket.emit(
        "GUESS",
        createEvent(Status.SUCCESS, {
          score: rooms[roomId]["users"][index]["score"],
        })
      );
    } else {
      socket.emit(
        "GUESS",
        createEvent(Status.WRONG, {
          score: rooms[roomId]["users"][index]["score"],
        })
      );
    }
  });

  // CREATE ROOM
  socket.on("CREATE_ROOM", ({ roomId, username }) => {
    if (roomId in rooms) {
      socket.emit(
        roomId,
        createEvent(Status.ERROR, "Room with this ID already exists")
      );
    } else {
      createRoom(roomId);
      socket.emit(
        roomId,
        createEvent(Status.SUCCESS, "Room created successfully")
      );
    }
  });

  // CHECK IF ROOM EXISTS BEFORE JOINING
  socket.on("ROOM_EXISTS", ({ roomId }) => {
    if (roomId in rooms) {
      socket.emit(
        roomId,
        createEvent(Status.SUCCESS, "Connecting you to room")
      );
    } else {
      socket.emit(roomId, createEvent(Status.ROOM_404, "Invalid Room ID"));
    }
  });

  // JOIN ROOM
  socket.on("JOIN_ROOM", ({ roomId, username }) => {
    if (roomId in rooms && rooms[roomId]["hasStarted"] != true) {
      const user = createUser(socket.id, username, roomId);
      socket.join(roomId);

      // Send sender success event
      socket.emit(roomId, createEvent(Status.SUCCESS, { username }));

      // Send users and room info
      io.to(roomId).emit(
        "USERS",
        createEvent(Status.NEW_USER, {
          roomId: roomId,
          users: rooms[roomId]["users"],
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
  socket.on("LEAVE_ROOM", ({ roomId }) => {
    removeUser(socket.id, roomId);
    socket.leave(roomId);
    io.to(roomId).emit(
      "USERS",
      createEvent(Status.USER_LEFT_ROOM, {
        roomId: roomId,
        users: rooms[roomId]["users"],
      })
    );
    // Delete Room if no user exists
    if (rooms[roomId]["users"].length === 0) {
      if (rooms[roomId].timer != null) clearInterval(rooms[roomId].timer);
      delete rooms[roomId];
    }
  });
});

server.listen(port, () => console.log("SOCKET up on port " + port));
