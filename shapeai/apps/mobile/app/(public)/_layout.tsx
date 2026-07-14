import { Stack } from 'expo-router'

// Funil de aquisição — acessível sem sessão. O quiz e a captura de fotos acontecem
// antes do cadastro; o signup só é pedido na hora de salvar o resultado.
export default function PublicLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
}
