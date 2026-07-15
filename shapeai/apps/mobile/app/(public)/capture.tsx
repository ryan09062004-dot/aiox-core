import { useState, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { HumanSilhouette } from '../../src/components/camera/HumanSilhouette'
import { useOnboardingStore } from '../../src/stores/onboarding.store'

type ScreenState = 'camera' | 'preview'

// Funil captura apenas a foto de frente.
const config = {
  label: 'Foto de frente',
  instruction: 'Fique de frente, braços levemente afastados',
}

export default function CaptureScreen() {
  const setPhotos = useOnboardingStore((s) => s.setPhotos)
  const [permission, requestPermission] = useCameraPermissions()
  const [screenState, setScreenState] = useState<ScreenState>('camera')
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const [imgLoading, setImgLoading] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  const goToSignup = (front: string) => {
    setPhotos(front, null)
    router.push('/(public)/signup')
  }

  if (!permission) return <View style={styles.container} />

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={56} color="#4CAF50" />
        <Text style={styles.permissionTitle}>Câmera necessária</Text>
        <Text style={styles.permissionText}>
          Precisamos da câmera para gerar a sua análise. A foto não sai do seu relatório.
        </Text>
        <TouchableOpacity style={styles.actionButton} onPress={requestPermission}>
          <Text style={styles.actionButtonText}>Permitir câmera</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return
    // Qualidade menor = arquivo menor = preview e upload mais rápidos. A análise
    // redimensiona no servidor, então 0.6 não tira nada útil.
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: false })
    if (!photo) return
    setImgLoading(true)
    setPreviewUri(photo.uri)
    setScreenState('preview')
  }

  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.6,
    })
    if (result.canceled || !result.assets[0]) return
    setImgLoading(true)
    setPreviewUri(result.assets[0].uri)
    setScreenState('preview')
  }

  const handleRetake = () => {
    setPreviewUri(null)
    setScreenState('camera')
  }

  // Só a foto de frente: ao confirmar, segue direto para o cadastro.
  const handleConfirm = () => {
    if (!previewUri) return
    goToSignup(previewUri)
  }

  if (screenState === 'preview' && previewUri) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.stepLabel}>{config.label}</Text>
        </View>
        <View style={styles.preview}>
          <Image
            source={{ uri: previewUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onLoadEnd={() => setImgLoading(false)}
          />
          {imgLoading && (
            <View style={styles.previewLoading}>
              <ActivityIndicator color="#4CAF50" size="large" />
            </View>
          )}
        </View>
        <View style={styles.previewButtons}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retakeText}>Refazer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, imgLoading && { opacity: 0.5 }]}
            onPress={handleConfirm}
            disabled={imgLoading}
          >
            <Text style={styles.confirmText}>Gerar minha análise</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.stepInfo}>
          <Text style={styles.stepText}>{config.label}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <CameraView ref={cameraRef} style={styles.camera} facing={'back' as CameraType}>
        <HumanSilhouette facing="front" />
        <Text style={styles.instruction}>{config.instruction}</Text>
      </CameraView>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryButton} onPress={handlePickFromGallery}>
          <Ionicons name="images-outline" size={26} color="#fff" />
          <Text style={styles.galleryText}>Galeria</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
          <View style={styles.captureInner} />
        </TouchableOpacity>

        <View style={{ width: 70 }} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  permissionContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  permissionText: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  actionButton: { backgroundColor: '#4CAF50', borderRadius: 12, padding: 16, paddingHorizontal: 32 },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#000',
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 19,
  },
  stepInfo: { flex: 1, alignItems: 'center' },
  stepText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  camera: { flex: 1 },
  instruction: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: '85%',
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#000',
  },
  galleryButton: { width: 70, alignItems: 'center', gap: 4 },
  galleryText: { color: '#aaa', fontSize: 11 },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  captureInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },

  topBar: { paddingTop: 56, paddingBottom: 12, alignItems: 'center', backgroundColor: '#000' },
  stepLabel: { color: '#fff', fontSize: 17, fontWeight: '600' },
  preview: { flex: 1, width: '100%', backgroundColor: '#000' },
  previewLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  previewButtons: { flexDirection: 'row', padding: 20, gap: 12, backgroundColor: '#000' },
  retakeButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  retakeText: { color: '#fff', fontSize: 15 },
  confirmButton: {
    flex: 2,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
