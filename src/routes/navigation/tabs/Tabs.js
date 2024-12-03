import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FontIcon from 'react-native-vector-icons/FontAwesome';
import { colors } from 'theme';

// stack navigators
import { HomeNavigator, ProfileNavigator } from '../stacks'; // Removed ConnectNavigator
import { StatsComponent } from '../stacks/StatsComponent';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      options={{
        tabBarStyle: {
          // Customize if needed
        },
      }}
      defaultScreenOptions={{
        headerShown: false,
        headerTransparent: true,
      }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.lightPurple,
        tabBarInactiveTintColor: colors.gray,
      })}
      initialRouteName="HomeTab"
      swipeEnabled={false}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <FontIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="StatisticsTab" // Changed from ConnectTab
        component={StatsComponent} // Changed to StatsComponent
        options={{
          tabBarLabel: 'Statistics', // Updated label
          tabBarIcon: ({ color, size }) => (
            <FontIcon name="bar-chart" color={color} size={size} /> // Icon for statistics
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <FontIcon name="user" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
