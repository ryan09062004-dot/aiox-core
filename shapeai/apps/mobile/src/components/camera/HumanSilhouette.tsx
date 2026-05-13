import { View, Image, StyleSheet } from 'react-native'

interface Props {
  facing: 'front' | 'back'
}

export function HumanSilhouette({ facing: _facing }: Props) {
  return (
    <View style={styles.container} pointerEvents="none">
      <Image
        source={require('../../../assets/body-silhouette.png')}
        style={styles.silhouette}
        resizeMode="contain"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  silhouette: {
    width: '90%',
    height: '100%',
    opacity: 0.25,
  },
})
