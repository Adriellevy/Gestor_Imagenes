import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDWUP2LopecZaj5CNgwd1iCcVmGyCaCorg",
  authDomain: "suma-care-apps.firebaseapp.com",
  projectId: "suma-care-apps",
  storageBucket: "suma-care-apps.firebasestorage.app",
  messagingSenderId: "497918504496",
  appId: "1:497918504496:web:5b09dda0f737fe4bab47f5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const APP_ID = 'Gestor_Imagenes';
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

let localWhatsappCount = 0;
let latestGetStudies: (() => any[]) | undefined;
let latestGetUser: (() => any) | undefined;

/**
 * Envía inmediatamente un snapshot BI a Firestore con las métricas en vivo.
 */
export async function sendBiSnapshotNow(): Promise<void> {
  try {
    const studies = (latestGetStudies && latestGetStudies()) || [];
    const user = (latestGetUser && latestGetUser()) || null;
    const now = Date.now();
    const unDiaMs = 24 * 60 * 60 * 1000;

    const estudiosHoy = studies.filter((s: any) => s.fechaSolicitud && (now - s.fechaSolicitud) <= unDiaMs);
    const urgentesActivos = studies.filter((s: any) => s.prioridad === 'urgente' && s.estado !== 'realizado').length;
    const enProceso = studies.filter((s: any) => s.estado === 'en_proceso' || s.estado === 'traslado_retorno').length;
    const realizadosHoy = estudiosHoy.filter((s: any) => s.estado === 'realizado').length;

    const modCount: Record<string, number> = {};
    studies.forEach((s: any) => {
      const mod = s.modalidad || 'RX';
      modCount[mod] = (modCount[mod] || 0) + 1;
    });

    const modalidadesTop = Object.entries(modCount)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    await addDoc(collection(db, 'app_bi_snapshots'), {
      appId: APP_ID,
      timestamp: serverTimestamp(),
      pedidosCreados: studies.length,
      usuariosIniciadosSesion: user ? 1 : 0,
      usuarioActivoNombre: user?.nombre || user?.username || 'Sin usuario',
      whatsappsIntentados: localWhatsappCount,
      totalEstudios: studies.length,
      estudiosHoy: estudiosHoy.length,
      urgentesActivos,
      enProceso,
      realizadosHoy,
      modalidadesTop,
    });

    console.log('📈 [Firebase BI Imágenes] Snapshot guardado con éxito:', {
      pedidosCreados: studies.length,
      usuariosIniciadosSesion: user ? 1 : 0,
      whatsappsIntentados: localWhatsappCount,
    });
  } catch (err) {
    console.error('❌ [Firebase BI Imágenes] Error al guardar snapshot en Firestore (Verificar reglas de Firebase):', err);
  }
}

/**
 * Escucha en tiempo real el flag de permiso de la aplicación en Firestore.
 */
export function subscribeToAppStatus(onStatusChange: (enabled: boolean) => void): () => void {
  const docRef = doc(db, 'app_controls', APP_ID);

  const unsubscribe = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onStatusChange(data.enabled !== false);
      } else {
        onStatusChange(true);
      }
    },
    (err) => {
      console.error('Error suscribiendo al estado de Gestor_Imagenes:', err);
    }
  );

  return unsubscribe;
}

/**
 * Registra la creación de un nuevo estudio / pedido para estadísticas de BI.
 */
export async function logStudyCreated(metadata: { modalidad?: string; prioridad?: string; sector?: string; estado?: string }): Promise<void> {
  try {
    await addDoc(collection(db, 'study_creation_events'), {
      appId: APP_ID,
      timestamp: serverTimestamp(),
      modalidad: metadata.modalidad || 'RX',
      prioridad: metadata.prioridad || 'normal',
      sector: metadata.sector || 'General',
      estado: metadata.estado || 'solicitado',
    });
    sendBiSnapshotNow();
  } catch (err) {
    console.error('Error enviando evento de creación de estudio en Imágenes:', err);
  }
}

/**
 * Registra cada WhatsApp que se desea enviar (clic en botón WhatsApp).
 */
export async function logWhatsAppAttempt(metadata: { tipo: string; studyId?: string; usuario?: string }): Promise<void> {
  try {
    localWhatsappCount += 1;
    await addDoc(collection(db, 'app_whatsapp_events'), {
      appId: APP_ID,
      timestamp: serverTimestamp(),
      tipo: metadata.tipo || 'ida',
      studyId: metadata.studyId || '',
      usuario: metadata.usuario || 'Usuario Imágenes',
    });
    sendBiSnapshotNow();
  } catch (err) {
    console.error('Error registrando intento de WhatsApp en Imágenes:', err);
  }
}

/**
 * Registra inicio de sesión o usuario activo para monitoreo BI.
 */
export async function logUserSession(usuario: { id?: string; nombre?: string; rol?: string }): Promise<void> {
  try {
    await addDoc(collection(db, 'app_user_sessions'), {
      appId: APP_ID,
      timestamp: serverTimestamp(),
      usuarioId: usuario.id || 'anon',
      nombre: usuario.nombre || 'Usuario Imágenes',
      rol: usuario.rol || 'clínico',
    });
    sendBiSnapshotNow();
  } catch (err) {
    console.error('Error registrando sesión de usuario en Imágenes:', err);
  }
}

/**
 * Inicia el envío periódico de telemetría de uso y snapshot de Business Intelligence.
 */
export function startTelemetryHeartbeat(
  getStudiesSnapshot?: () => any[],
  getCurrentUser?: () => any
): () => void {
  latestGetStudies = getStudiesSnapshot;
  latestGetUser = getCurrentUser;

  const sendHeartbeatAndBi = async () => {
    try {
      await addDoc(collection(db, 'app_usage_events'), {
        appId: APP_ID,
        timestamp: serverTimestamp(),
        intervalSeconds: 300,
        clientType: 'docker-imagenes',
      });
      await sendBiSnapshotNow();
    } catch (err) {
      console.error('Error enviando telemetría de Imágenes:', err);
    }
  };

  const initTimeout = setTimeout(sendHeartbeatAndBi, 4000);
  const intervalId = setInterval(sendHeartbeatAndBi, HEARTBEAT_INTERVAL_MS);

  return () => {
    clearTimeout(initTimeout);
    clearInterval(intervalId);
  };
}
