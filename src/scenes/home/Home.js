import React, { useEffect, useState, useContext, useLayoutEffect } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import IconButton from '../../components/IconButton'
import ScreenTemplate from '../../components/ScreenTemplate'
import Button from '../../components/Button'
import { colors, fontSize } from '../../theme'
import { UserDataContext } from '../../context/UserDataContext'
import { getKilobyteSize } from '../../utils/functions'

export default function Home() {
  const navigation = useNavigation()
  const { userData } = useContext(UserDataContext)

  useEffect(() => {
    const str = 'Hello, こんにちは!'
    const kilobyteSize = getKilobyteSize({ str: str })
    console.log({ str, kilobyteSize })
  }, [])

  useEffect(() => {
    const obj = {
      name: 'name1',
      age: 15,
    }
    const kilobyteSize = getKilobyteSize({ str: obj })
    console.log({ obj, kilobyteSize })
  }, [])

  useEffect(() => {
    const array = ['name1', 'name2', 'name3']
    const kilobyteSize = getKilobyteSize({ str: array })
    console.log({ array, kilobyteSize })
  }, [])

  return (
    <ScreenTemplate>
      <ScrollView style={styles.main}>
        <Button
          label="Open Map"
          color={colors.primary}
          onPress={() => navigation.navigate('MapNavigator', { screen: 'Map' })}
        />
        <Button
          label="View Statistics"
          color={colors.primary}
          onPress={() => navigation.navigate('StatsNavigator', { userData })}
        />
      </ScrollView>
    </ScreenTemplate>
  )
}

const styles = StyleSheet.create({
  lightContent: {
    backgroundColor: colors.lightyellow,
    padding: 20,
    borderRadius: 5,
    marginTop: 30,
    marginLeft: 30,
    marginRight: 30,
  },
  darkContent: {
    backgroundColor: colors.gray,
    padding: 20,
    borderRadius: 5,
    marginTop: 30,
    marginLeft: 30,
    marginRight: 30,
  },
  main: {
    flex: 1,
    width: '100%',
  },
  title: {
    fontSize: fontSize.xxxLarge,
    marginBottom: 20,
    textAlign: 'center',
  },
  field: {
    fontSize: fontSize.middle,
    textAlign: 'center',
  },
})
