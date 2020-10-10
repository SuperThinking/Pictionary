import {SketchCanvas} from '@terrylinla/react-native-sketch-canvas';
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {SafeAreaView, View, StatusBar, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import 'react-native-gesture-handler';

import {DrawingCanvas} from './src/components/DrawingCanvas';
import {HomePage} from './src/components/HomePage';
import {createStackNavigator} from '@react-navigation/stack';
import {WaitingRoom} from './src/components/WaitingRoom';

const Stack = createStackNavigator();

const RootStackNavigator = () => (
  <Stack.Navigator initialRouteName={'HomePage'} headerMode={'none'}>
    <Stack.Screen name="HomePage" component={HomePage} />
    <Stack.Screen name="WaitingRoom" component={WaitingRoom} />
    <Stack.Screen name="DrawingCanvas" component={DrawingCanvas} />
  </Stack.Navigator>
);

const App = () => {
  return (
    <>
      <StatusBar backgroundColor="black" />
      <NavigationContainer>
        <View style={{flex: 1}}>
          <RootStackNavigator />
        </View>
      </NavigationContainer>
    </>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

export default App;
