import React, {useState, useEffect} from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import {socket} from '../service/socket/socket';

export const HomePage = ({navigation}) => {
  const [roomId, setRoomId] = useState();
  const [username, setUsername] = useState();

  useEffect(() => {
    socket.on(`ROOM#${roomId}`, (event) => {
      if (event.status === 'SUCCESS') {
        navigation.navigate('WaitingRoom', {
          username,
          roomId: `ROOM#${roomId}`,
        });
      }
    });
  }, [socket, roomId, username, navigation]);

  const createRoom = () => {
    socket.emit('CREATE_ROOM', {roomId: `ROOM#${roomId}`, username});
  };

  const joinRoom = () => {
    socket.emit('ROOM_EXISTS', {roomId: `ROOM#${roomId}`, username});
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <View>
        <Text style={styles.textLabels}>Use a funny username</Text>
        <TextInput
          style={{
            letterSpacing: 2,
            fontWeight: 'bold',
            fontSize: 20,
            textAlign: 'center',
          }}
          placeholder={'BunnyBlaster420'}
          onChangeText={(text) => setUsername(text)}
        />
      </View>
      <View>
        <Text style={styles.textLabels}>Join/Create a room</Text>
        <TextInput
          style={{
            letterSpacing: 5,
            fontWeight: 'bold',
            fontSize: 20,
            textAlign: 'center',
          }}
          keyboardType="phone-pad"
          maxLength={4}
          placeholder={'1234'}
          onChangeText={(text) => setRoomId(text)}
        />
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <TouchableOpacity style={styles.button} onPress={joinRoom}>
            <Text style={styles.buttonText}>Join Room</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={createRoom}>
            <Text style={styles.buttonText}>Create Room</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  textLabels: {fontSize: 25, fontWeight: 'bold'},
  button: {
    padding: 10,
    backgroundColor: '#d9d5d4',
    alignItems: 'center',
    borderRadius: 10,
    margin: 10,
  },
  buttonText: {fontSize: 15, fontWeight: 'bold'},
});
