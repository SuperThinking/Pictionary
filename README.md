# Pictionary

Pictionary Game - Using React Native/NodeJS/Socket.io

### - Creating a socket connection

![](preview-gif/creating-socket-connection.gif)

### - Multiple users connecting to the same room

![](preview-gif/joining-same-room.gif)

### - Drawing (Please ignore my art skills)

![](preview-gif/drawing.gif)

How to run:

1. Clone this repo

2. Run Backend:<br/>

```
  cd pictionary-server
  make env // creates a .env file
  // ^ set your mongoDB host in this .env file
  make install // installs npm dependencies
  make run // starts server
```

3. In a different terminal,

```
  cd PictionaryClient/
  npm start
  npm run android
```

Download APK : [Download](apk/Pictionary.apk)

##### Currently no DB is being used and everything is being done in memory (Reload the backend and whooosh)

###### PS: Might have bugs, will try to resolve them in my free time :)
