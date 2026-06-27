// ═══════════════════════════════════════════════════════════
//  db.js — Capa de datos (Dexie.js sobre IndexedDB)
//  Body Tracker PWA · Fase 1
// ═══════════════════════════════════════════════════════════

const db = new Dexie('BodyTrackerDB');

// Versión 1: los cuatro stores definidos desde el inicio
// para no tener que hacer migraciones en fases siguientes.
db.version(1).stores({
  Registro_Peso:          'fecha, peso, mediaMovil',
  Mediciones_Corporales:  'fecha, cintura, brazoRelajado, brazoCont, muslo',
  Checkin_Mensual:        'fecha, banca, dominadas, rdl, fatiga, notas',
  Fotos_Progreso:         'fecha, frente, espalda, perfilD, perfilI',
});

// ─────────────────────────────────────────────────────────
//  REGISTRO DE PESO
// ─────────────────────────────────────────────────────────

/**
 * Devuelve la fecha local de hoy en formato YYYY-MM-DD.
 */
function hoy() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calcula la media aritmética de los últimos N registros disponibles.
 * "Disponibles" = los que existen en DB, sin importar si son días consecutivos.
 * @param {string} fechaHasta  - incluye este registro (YYYY-MM-DD)
 * @param {number} n           - ventana (7 por defecto)
 * @returns {number|null}      - media redondeada a 2 decimales, o null si no hay datos
 */
async function calcularMediaMovil(fechaHasta, n = 7) {
  const registros = await db.Registro_Peso
    .where('fecha')
    .belowOrEqual(fechaHasta)
    .reverse()
    .limit(n)
    .toArray();

  if (!registros.length) return null;
  const suma = registros.reduce((acc, r) => acc + r.peso, 0);
  return Math.round((suma / registros.length) * 100) / 100;
}

/**
 * Guarda (o actualiza) el registro de peso de una fecha.
 * Recalcula y persiste la media móvil del día.
 * @param {string} fecha  - YYYY-MM-DD
 * @param {number} peso   - kg (ej: 82.5)
 */
async function guardarPeso(fecha, peso) {
  const mediaMovil = await calcularMediaMovil(fecha, 7);
  await db.Registro_Peso.put({ fecha, peso, mediaMovil });
}

/**
 * Obtiene el registro de peso de una fecha específica.
 * @param {string} fecha - YYYY-MM-DD
 * @returns {object|undefined}
 */
async function obtenerPesoPorFecha(fecha) {
  return db.Registro_Peso.get(fecha);
}

/**
 * Obtiene todos los registros de peso ordenados por fecha ascendente.
 * @returns {Array}
 */
async function obtenerTodosLosPesos() {
  return db.Registro_Peso.orderBy('fecha').toArray();
}

/**
 * Obtiene los registros de peso de los últimos N días.
 * @param {number} dias
 * @returns {Array}
 */
async function obtenerPesosUltimosDias(dias) {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const fechaDesde = desde.toISOString().slice(0, 10);
  return db.Registro_Peso
    .where('fecha')
    .aboveOrEqual(fechaDesde)
    .sortBy('fecha');
}

/**
 * Obtiene los registros de peso de los últimos N meses.
 * @param {number} meses
 * @returns {Array}
 */
async function obtenerPesosUltimosMeses(meses) {
  const desde = new Date();
  desde.setMonth(desde.getMonth() - meses);
  const fechaDesde = desde.toISOString().slice(0, 10);
  return db.Registro_Peso
    .where('fecha')
    .aboveOrEqual(fechaDesde)
    .sortBy('fecha');
}

// ─────────────────────────────────────────────────────────
//  FUNCIÓN DE DATOS DE PRUEBA (disponible desde consola)
//  Uso: await seedTestData(90)  → genera 90 días de historial
//  No tiene efecto en producción, solo para testing.
// ─────────────────────────────────────────────────────────

async function seedTestData(diasAtras = 60, pesoBase = 82.0) {
  console.log(`[seed] Generando ${diasAtras} días de datos de prueba...`);
  const hoyDate = new Date();

  for (let i = diasAtras; i >= 0; i--) {
    const d = new Date(hoyDate);
    d.setDate(d.getDate() - i);
    const fecha = d.toISOString().slice(0, 10);

    // Simula fluctuación realista: tendencia leve a la baja + ruido diario
    const tendencia = -0.02 * (diasAtras - i);
    const ruido = (Math.random() - 0.5) * 1.2;
    const peso = Math.round((pesoBase + tendencia + ruido) * 10) / 10;

    await guardarPeso(fecha, peso);
  }
  console.log(`[seed] Listo. ${diasAtras + 1} registros creados.`);
}

// Exponer al scope global para uso desde consola DevTools
window.seedTestData = seedTestData;
window.db = db;

// ─────────────────────────────────────────────────────────
//  MEDICIONES CORPORALES
// ─────────────────────────────────────────────────────────

/**
 * Devuelve el mes actual en formato YYYY-MM.
 */
function mesActual() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Guarda (o actualiza) la medición del mes indicado.
 * @param {string} mes       - YYYY-MM (clave primaria)
 * @param {object} datos     - { cintura, brazoRelajado, brazoCont, muslo }
 *                             muslo puede ser null si no se registra
 */
async function guardarMedicion(mes, datos) {
  await db.Mediciones_Corporales.put({
    fecha: mes,
    cintura:       datos.cintura,
    brazoRelajado: datos.brazoRelajado,
    brazoCont:     datos.brazoCont,
    muslo:         datos.muslo ?? null,
  });
}

/**
 * Obtiene la medición de un mes específico.
 * @param {string} mes - YYYY-MM
 * @returns {object|undefined}
 */
async function obtenerMedicionPorMes(mes) {
  return db.Mediciones_Corporales.get(mes);
}

/**
 * Obtiene todas las mediciones ordenadas por fecha ascendente.
 * @returns {Array}
 */
async function obtenerTodasLasMediciones() {
  return db.Mediciones_Corporales.orderBy('fecha').toArray();
}

/**
 * Calcula el delta entre dos valores de medición.
 * Devuelve { valor, direccion } donde dirección es 'mejor', 'peor' o 'neutral'.
 * @param {number|null} anterior
 * @param {number|null} actual
 * @param {string} campo - 'cintura' | 'brazo' | 'muslo'
 * @param {string} objetivo - 'masa' | 'definicion' | 'mantenimiento'
 */
function calcularDeltaMedicion(anterior, actual, campo, objetivo = 'mantenimiento') {
  if (anterior === null || actual === null) return { valor: null, direccion: 'neutral' };

  const diff = actual - anterior;
  const umbral = campo === 'cintura' ? 0.5 : 0.1;

  if (Math.abs(diff) < umbral) return { valor: diff, direccion: 'neutral' };

  // Lógica de "mejora" según campo y objetivo
  let esMejora;
  if (campo === 'cintura') {
    // Cintura: bajar siempre es positivo en definición/mantenimiento,
    // neutro en masa (se acepta algo de cintura al ganar masa)
    esMejora = diff < 0;
  } else {
    // Brazo y muslo: subir es siempre positivo (más músculo)
    esMejora = diff > 0;
  }

  return {
    valor: diff,
    direccion: esMejora ? 'mejor' : 'peor',
  };
}

/**
 * Genera el HTML de una flecha de delta con color.
 * @param {object} delta - resultado de calcularDeltaMedicion
 * @param {string} unidad - 'cm' por defecto
 */
function renderDeltaFlecha(delta, unidad = 'cm') {
  if (delta.valor === null) return '<span style="color:#6B6B6B">—</span>';

  const signo = delta.valor > 0 ? '+' : '';
  const valorStr = `${signo}${delta.valor.toFixed(1)} ${unidad}`;

  if (delta.direccion === 'neutral') {
    return `<span style="color:#6B6B6B">→ ${valorStr}</span>`;
  }
  if (delta.direccion === 'mejor') {
    return `<span style="color:#C8F135">↑ ${valorStr}</span>`;
  }
  return `<span style="color:#FF4D4D">↓ ${valorStr}</span>`;
}

/**
 * Formatea YYYY-MM a nombre de mes legible.
 */
function formatearMes(mesISO) {
  const [y, m] = mesISO.split('-').map(Number);
  const fecha = new Date(y, m - 1, 1);
  return fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────
//  CHECK-IN MENSUAL
// ─────────────────────────────────────────────────────────

/**
 * Guarda (o actualiza) el check-in del mes indicado.
 * Todos los campos son opcionales — se guarda lo que venga.
 * @param {string} mes   - YYYY-MM
 * @param {object} datos - { banca, dominadas, rdl, fatiga, notas }
 *                         Cualquier campo puede ser null.
 */
async function guardarCheckin(mes, datos) {
  await db.Checkin_Mensual.put({
    fecha:     mes,
    banca:     datos.banca     ?? null,
    dominadas: datos.dominadas ?? null,
    rdl:       datos.rdl       ?? null,
    fatiga:    datos.fatiga    ?? null,
    notas:     datos.notas     ?? null,
  });
}

/**
 * Obtiene el check-in de un mes específico.
 * @param {string} mes - YYYY-MM
 * @returns {object|undefined}
 */
async function obtenerCheckinPorMes(mes) {
  return db.Checkin_Mensual.get(mes);
}

/**
 * Obtiene todos los check-ins ordenados por fecha ascendente.
 * @returns {Array}
 */
async function obtenerTodosLosCheckins() {
  return db.Checkin_Mensual.orderBy('fecha').toArray();
}

/**
 * Calcula delta de PR entre dos valores.
 * @param {number|null} anterior
 * @param {number|null} actual
 * @returns {{ valor: number|null, direccion: 'mejor'|'peor'|'neutral' }}
 */
function calcularDeltaPR(anterior, actual) {
  if (anterior === null || actual === null) return { valor: null, direccion: 'neutral' };
  const diff = actual - anterior;
  const umbral = 1; // kg
  if (Math.abs(diff) < umbral) return { valor: diff, direccion: 'neutral' };
  return { valor: diff, direccion: diff > 0 ? 'mejor' : 'peor' };
}

/**
 * Calcula delta de fatiga (bajar es mejor).
 */
function calcularDeltaFatiga(anterior, actual) {
  if (anterior === null || actual === null) return { valor: null, direccion: 'neutral' };
  const diff = actual - anterior;
  if (Math.abs(diff) < 1) return { valor: diff, direccion: 'neutral' };
  return { valor: diff, direccion: diff < 0 ? 'mejor' : 'peor' };
}

// ─────────────────────────────────────────────────────────
//  NOTIFICACIONES — Lógica de in-app banners
// ─────────────────────────────────────────────────────────

/**
 * Verifica si hay que mostrar banners de recordatorio al abrir la app.
 * Devuelve un array de mensajes a mostrar (puede ser vacío).
 */
async function verificarRecordatorios() {
  const mensajes = [];
  const hoyStr = hoy();
  const hoyDate = new Date();

  // ── Recordatorio 1: domingo previo al primer lunes del mes ──
  // Mostramos si hoy es domingo y el próximo lunes es el primero del mes
  if (hoyDate.getDay() === 0) { // 0 = domingo
    const proximoLunes = new Date(hoyDate);
    proximoLunes.setDate(hoyDate.getDate() + 1);
    if (proximoLunes.getDate() <= 7) {
      // El próximo lunes es el primero del mes (está en la primera semana)
      const mesProximoLunes = `${proximoLunes.getFullYear()}-${String(proximoLunes.getMonth() + 1).padStart(2, '0')}`;
      const checkinExiste = await obtenerCheckinPorMes(mesProximoLunes);
      const medicionExiste = await obtenerMedicionPorMes(mesProximoLunes);
      if (!checkinExiste && !medicionExiste) {
        mensajes.push('📏 Mañana es día de mediciones y check-in. Recordá hacerlo en ayunas.');
      }
    }
  }

  // ── Recordatorio 2: 3+ días sin registrar peso ──
  const ultimosPesos = await db.Registro_Peso
    .orderBy('fecha')
    .reverse()
    .limit(1)
    .toArray();

  if (ultimosPesos.length > 0) {
    const ultimaFecha = new Date(ultimosPesos[0].fecha + 'T12:00:00');
    const diasSinPeso = Math.floor((hoyDate - ultimaFecha) / (1000 * 60 * 60 * 24));
    if (diasSinPeso >= 3) {
      mensajes.push(`⚖️ Llevas ${diasSinPeso} días sin registrar tu peso. Registrarlo hoy ayuda a mantener la media móvil precisa.`);
    }
  }

  return mensajes;
}

// ─────────────────────────────────────────────────────────
//  FOTOS DE PROGRESO
// ─────────────────────────────────────────────────────────

const POSES = ['frente', 'espalda', 'perfilD', 'perfilI'];
const POSES_LABELS = { frente: 'Frente', espalda: 'Espalda', perfilD: 'Perfil D', perfilI: 'Perfil I' };

/**
 * Guarda (o actualiza) una foto individual de un mes.
 * Carga el registro existente y actualiza solo la pose indicada.
 * @param {string} mes   - YYYY-MM
 * @param {string} pose  - 'frente' | 'espalda' | 'perfilD' | 'perfilI'
 * @param {string} base64 - imagen en base64 (sin prefijo data:...)
 */
async function guardarFoto(mes, pose, base64) {
  const existing = await db.Fotos_Progreso.get(mes) || { fecha: mes, frente: null, espalda: null, perfilD: null, perfilI: null };
  existing[pose] = base64;
  await db.Fotos_Progreso.put(existing);
}

/**
 * Elimina una foto individual de un mes.
 */
async function eliminarFoto(mes, pose) {
  const existing = await db.Fotos_Progreso.get(mes);
  if (!existing) return;
  existing[pose] = null;
  // Si no quedan fotos en el mes, eliminar el registro entero
  const hayAlguna = POSES.some(p => existing[p] !== null);
  if (hayAlguna) {
    await db.Fotos_Progreso.put(existing);
  } else {
    await db.Fotos_Progreso.delete(mes);
  }
}

/**
 * Obtiene el registro de fotos de un mes.
 * @param {string} mes - YYYY-MM
 */
async function obtenerFotosPorMes(mes) {
  return db.Fotos_Progreso.get(mes);
}

/**
 * Obtiene todos los registros de fotos ordenados por fecha ascendente.
 */
async function obtenerTodasLasFotos() {
  return db.Fotos_Progreso.orderBy('fecha').toArray();
}

/**
 * Comprime una imagen antes de guardarla.
 * Máx 1200px en lado mayor, JPEG calidad 0.85.
 * @param {File} file
 * @returns {Promise<string>} base64 sin prefijo
 */
function comprimirImagen(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Extraer base64 sin el prefijo "data:image/jpeg;base64,"
        const dataURL = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataURL.split(',')[1]);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
