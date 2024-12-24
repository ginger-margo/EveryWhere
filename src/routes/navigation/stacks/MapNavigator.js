import React, { useContext } from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { ColorSchemeContext } from '../../../context/ColorSchemeContext'
import { lightProps, darkProps } from './navigationProps/navigationProps'
import HeaderStyle from './headerComponents/HeaderStyle'

import Map from '../../../scenes/map'

const Stack = createStackNavigator()

export const MapNavigator = () => {
  const { scheme } = useContext(ColorSchemeContext)
  const navigationProps = scheme === 'dark' ? darkProps:lightProps
  return (
    <Stack.Navigator screenOptions={navigationProps}>
      <Stack.Screen
        name="Map"
        component={Map}
        options={({ navigation }) => ({
          headerBackground: scheme === 'dark' ? null: () => <HeaderStyle />,
        })}
      />
    </Stack.Navigator>
  )
}