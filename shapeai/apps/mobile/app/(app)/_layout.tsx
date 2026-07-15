import { Tabs, Redirect } from 'expo-router'
import { Image, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/stores/auth.store'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function tabIcon(active: IoniconsName, inactive: IoniconsName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={24} color={color} />
  )
}

// Rótulo próprio: o rótulo padrão do React Navigation calcula uma altura apertada e corta
// os acentos/cedilha ("Avaliações", "Nutrição") na web. Um <Text> com altura folgada e
// sem clipping resolve de forma determinística.
function tabLabel(text: string) {
  return ({ color }: { color: string }) => (
    <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>
      {text}
    </Text>
  )
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    paddingTop: 2,
    paddingBottom: 2,
  },
})

// Ícone próprio (PNG com alpha) — tintColor o recolore conforme o estado da aba,
// igual aos Ionicons.
const BODY_SCAN = require('../../assets/icon-body-scan.png')

function bodyScanIcon({ color }: { color: string }) {
  return <Image source={BODY_SCAN} style={{ width: 24, height: 24, tintColor: color }} />
}

export default function AppLayout() {
  const { session, isGuest } = useAuthStore()
  const insets = useSafeAreaInsets()

  const bottomPad = Math.max(insets.bottom, 10)

  if (!session && !isGuest) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: '#1A1A1A',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: bottomPad,
          height: 62 + bottomPad,
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#555',
        tabBarAllowFontScaling: false,
        tabBarItemStyle: { paddingHorizontal: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', tabBarIcon: tabIcon('home', 'home-outline'), tabBarLabel: tabLabel('Início') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Avaliações', tabBarIcon: bodyScanIcon, tabBarLabel: tabLabel('Avaliações') }}
      />
      <Tabs.Screen
        name="treino"
        options={{ title: 'Treino', tabBarIcon: tabIcon('barbell', 'barbell-outline'), tabBarLabel: tabLabel('Treino') }}
      />
      <Tabs.Screen
        name="meal-plan"
        options={{ title: 'Nutrição', tabBarIcon: tabIcon('restaurant', 'restaurant-outline'), tabBarLabel: tabLabel('Nutrição') }}
      />
      <Tabs.Screen
        name="coach"
        options={{ title: 'Personal', tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline'), tabBarLabel: tabLabel('Personal') }}
      />
      <Tabs.Screen name="profile"    options={{ href: null }} />
      <Tabs.Screen name="camera"    options={{ href: null }} />
      <Tabs.Screen name="photo-tip" options={{ href: null }} />
      <Tabs.Screen name="analysis"  options={{ href: null }} />
      <Tabs.Screen name="compare"   options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="paywall"   options={{ href: null }} />
    </Tabs>
  )
}
