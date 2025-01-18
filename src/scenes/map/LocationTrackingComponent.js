import React from 'react';
import { View, Text } from 'react-native';
import useLocationTracker from './useLocationTracker';

const LocationTrackingComponent = () => {
  const { locationDurations, error } = useLocationTracker();

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  return (
    <View>
      <Text>Tracked Locations:</Text>
      {locationDurations.map((loc, index) => (
        <Text key={index}>
          Location: {loc.latitude}, {loc.longitude} | Duration: {Math.round(loc.duration / 1000)}s
        </Text>
      ))}
    </View>
  );
};

export default LocationTrackingComponent;
