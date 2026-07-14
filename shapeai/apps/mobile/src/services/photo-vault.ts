// Guarda temporariamente as fotos do funil quando a pessoa sai do app para o OAuth do
// Google. Sem isso, o redirecionamento de página inteira mataria as fotos (que vivem só
// em memória) e a pessoa voltaria para uma tela pedindo tudo de novo — perdendo justamente
// quem estava mais perto de converter.
//
// IndexedDB, e não localStorage: as fotos têm alguns MB e estourariam a cota de strings.
// O cofre é esvaziado assim que as fotos são consumidas — imagem de corpo não fica
// guardada no navegador depois do uso.

const DB_NAME = 'shapeai-funnel'
const STORE = 'photos'
const KEY = 'pending'

interface VaultedPhotos {
  front: string
  back: string | null
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function isAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

/** Converte um blob:/file: URI em data URL, que sobrevive ao reload da página. */
async function toDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri
  const blob = await fetch(uri).then((r) => r.blob())
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function stashPhotos(front: string, back: string | null): Promise<void> {
  if (!isAvailable()) return
  const payload: VaultedPhotos = {
    front: await toDataUrl(front),
    back: back ? await toDataUrl(back) : null,
  }
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(payload, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

/** Recupera as fotos e apaga o cofre — leitura única. */
export async function claimPhotos(): Promise<VaultedPhotos | null> {
  if (!isAvailable()) return null
  const db = await openDb()
  const result = await new Promise<VaultedPhotos | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const get = store.get(KEY)
    get.onsuccess = () => {
      const value = (get.result as VaultedPhotos | undefined) ?? null
      store.delete(KEY)
      resolve(value)
    }
    get.onerror = () => reject(get.error)
  })
  db.close()
  return result
}

export async function clearPhotos(): Promise<void> {
  if (!isAvailable()) return
  const db = await openDb()
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
  db.close()
}
