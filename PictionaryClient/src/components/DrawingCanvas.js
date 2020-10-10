import {SketchCanvas} from '@terrylinla/react-native-sketch-canvas';
import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  TextInput,
} from 'react-native';
import {socket} from '../service/socket/socket';
import {DrawingEvents} from './enums';

export const DrawingCanvas = ({navigation, route}) => {
  const canvas = useRef(null);
  const [pathIds, setPathIds] = useState([]);
  const [currentPathId, setCurrentPathId] = useState(0);
  const [currentPath, setCurrentPath] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const {roomId, username} = route.params;
  const [word, setWord] = useState('');
  const [score, setScore] = useState(0);
  const [disableTextInput, setDisableTextInput] = useState(true);

  useEffect(() => {
    socket.emit('TURN', {
      roomId,
    });
  }, []);

  useEffect(() => {
    socket.on('TURN', ({word, id}) => {
      setDisableTextInput(true);
      if (socket.id === id) {
        setIsDrawing(true);
      } else {
        setIsDrawing(false);
      }
      setWord(word);
      canvas.current.clear();
      setPathIds([]);
      setCurrentPath([]);
      setCurrentPathId(0);
    });
  }, [socket]);

  useEffect(() => {
    socket.on('GUESS', ({status, payload}) => {
      if (status === 'SUCCESS') {
        setDisableTextInput(false);
        Alert.alert(`CORRECT GUESS!`);
      } else {
        Alert.alert(`ERRR, TRY AGAIN!`);
      }
      setScore(payload.score);
    });
  }, [socket]);

  // Drawing Events Sub.
  useEffect(() => {
    if (!isDrawing) {
      socket.on('DRAW', (event) => {
        actionBasedOnEvents(event);
      });
    }
  }, [socket]);

  useEffect(() => {
    canvas.current.deletePath(currentPathId);
    canvas.current.addPath({
      drawer: 'user1',
      size: {
        width: Math.round(Dimensions.get('window').width),
        height: Math.round(Dimensions.get('window').height),
      },
      path: {
        id: currentPathId,
        color: 'black',
        width: 5,
        data: currentPath,
      },
    });
  }, [currentPath, currentPathId]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        socket.emit('LEAVE_ROOM', {
          roomId,
        });
      }),
    [navigation],
  );

  const coordinatesToPathDataString = (xy) => {
    return `${xy.x},${xy.y}`;
  };

  const actionBasedOnEvents = (event) => {
    switch (event.eventName) {
      case DrawingEvents.CLEAR_BOARD: {
        canvas.current.clear();
        setPathIds([]);
        return;
      }
      case DrawingEvents.START_DRAWING: {
        setCurrentPathId(event.payload.pathId);
        setCurrentPath([event.payload.xy]);
        setPathIds((pathIds) => [...pathIds, event.payload.currentPathId]);
        return;
      }
      case DrawingEvents.DRAWING: {
        setCurrentPath((currentPath) => [...currentPath, event.payload.xy]);
        return;
      }
      case DrawingEvents.STOP_DRAWING: {
        // User stopped drawing
        return;
      }
      default:
        return;
    }
  };

  const createSocketEvent = (eventName, payload) => {
    socket.emit('DRAW', {roomId, pathPayload: {eventName, payload}});
  };

  const clearBoard = () => {
    canvas.current.clear();
    createSocketEvent(DrawingEvents.CLEAR_BOARD, {});
    // Move to a cleanup method
    setPathIds([]);
    setCurrentPathId(0);
  };

  const drawStartEvent = (x, y) => {
    const pathId = pathIds.length + 1;
    setCurrentPathId(pathId);
    setPathIds((pathIds) => [...pathIds, pathId]);
    createSocketEvent(DrawingEvents.START_DRAWING, {
      xy: coordinatesToPathDataString({x, y}),
      pathId,
    });
  };

  const drawEvent = (x, y) => {
    createSocketEvent(DrawingEvents.DRAWING, {
      xy: coordinatesToPathDataString({x, y}),
      currentPathId,
    });
    // console.log(x, y);
  };

  const drawEndEvent = (event) => {
    createSocketEvent(DrawingEvents.STOP_DRAWING, {currentPathId});
    // console.log(event);
  };

  const checkGuess = ({nativeEvent}) => {
    const {eventCount, target, text} = nativeEvent;
    socket.emit('GUESS', {
      roomId,
      guess: text,
    });
  };

  return (
    <View style={styles.container}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: '#d1cbcb',
        }}>
        <View style={styles.headers}>
          {isDrawing ? (
            <Text style={styles.headerText}>Draw: {word}</Text>
          ) : (
            <Text style={styles.headerText}>
              {`Guess: ${word.length} letter word`}
            </Text>
          )}
        </View>
        <View style={styles.headers}>
          <Text style={styles.headerText}>{`Points: ${score}`}</Text>
        </View>
      </View>
      <View style={{flex: 1, flexDirection: 'row'}}>
        <SketchCanvas
          ref={canvas}
          style={{flex: 1}}
          strokeColor={'black'}
          strokeWidth={5}
          onStrokeStart={drawStartEvent}
          onStrokeChanged={drawEvent}
          onStrokeEnd={drawEndEvent}
          touchEnabled={isDrawing}
        />
      </View>
      {isDrawing ? (
        <TouchableOpacity
          onPress={clearBoard}
          style={{backgroundColor: '#d9d5d4', width: '100%', height: 30}}>
          <Text
            style={{
              textAlign: 'center',
              fontSize: 20,
              fontWeight: 'bold',
            }}>
            Clear Board
          </Text>
        </TouchableOpacity>
      ) : (
        <TextInput
          style={{
            backgroundColor: '#d9d5d4',
            width: '100%',
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 'bold',
            letterSpacing: 2,
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          autoCompleteType="off"
          placeholder="Any Guesses??"
          editable={disableTextInput}
          onSubmitEditing={checkGuess}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  headers: {
    flex: 1,
    borderRadius: 1,
    borderColor: '#000',
  },
  headerText: {textAlign: 'center', fontWeight: 'bold', fontSize: 20},
});
