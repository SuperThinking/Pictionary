import {StackActions} from '@react-navigation/native';
import React, {useState, useEffect} from 'react';
import {Text, View, StyleSheet} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {socket} from '../service/socket/socket';

export const WaitingRoom = ({navigation, route}) => {
  const [connectedUsers, setConnectedUsers] = useState([]);

  useEffect(() => {
    socket.emit('JOIN_ROOM', {
      roomId: route.params.roomId,
      username: route.params.username,
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    socket.on('USERS', (event) => {
      if (
        mounted &&
        (event.status === 'NEW_USER' || event.status === 'USER_LEFT_ROOM')
      ) {
        setConnectedUsers(event.payload.users);
      }
    });
    return () => (mounted = false);
  }, [socket]);

  useEffect(() => {
    let mounted = true;
    socket.on('START_GAME', (event) => {
      if (mounted && event.status === 'SUCCESS') {
        navigation.dispatch(
          StackActions.replace('DrawingCanvas', {
            roomId: route.params.roomId,
            username: route.params.username,
          }),
        );
      }
    });
    return () => (mounted = false);
  }, [socket]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (e.data.action.type === 'GO_BACK') {
          socket.emit('LEAVE_ROOM', {
            roomId: route.params.roomId,
          });
        }
      }),
    [navigation],
  );

  const startGame = () => {
    socket.emit('START_GAME', {
      roomId: route.params.roomId,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>
        Following people have joined the room:
      </Text>
      <View style={{display: 'flex', flexDirection: 'column'}}>
        {connectedUsers.map((user) => {
          return (
            <Text key={user.id} style={styles.text}>
              {user.username}
            </Text>
          );
        })}
      </View>
      <TouchableOpacity onPress={startGame} style={styles.button}>
        <Text style={styles.text}>Start Game</Text>
      </TouchableOpacity>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  button: {
    padding: 10,
    backgroundColor: '#d9d5d4',
    alignItems: 'center',
    borderRadius: 10,
    margin: 10,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
});
