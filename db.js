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
