// ═══════════════════════════════════════════════════════════
//  app.js — Lógica principal de la aplicación
//  Body Tracker PWA · Fase 1
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
//  NAVEGACIÓN
// ─────────────────────────────────────────────────────────

const screens = {
  peso:       document.getElementById('screen-peso'),
  macros:     document.getElementById('screen-macros'),
  mediciones: document.getElementById('screen-mediciones'),
  checkin:    document.getElementById('screen-checkin'),
  fotos:      document.getElementById('screen-fotos'),
  dashboard:  document.getElementById('screen-dashboard'),
  ajustes:    document.getElementById('screen-ajustes'),
};

const navItems = document.querySelectorAll('.nav-item');

function navegarA(tab) {
  // Ocultar todas las pantallas
  Object.values(screens).forEach(s => s.classList.remove('active'));

  // Desactivar todos los nav items
  navItems.forEach(item => {
    item.style.color = '#6B6B6B';
  });

  // Activar pantalla y nav item correspondiente
  if (screens[tab]) screens[tab].classList.add('active');

  const activeNav = document.querySelector(`.nav-item[data-tab="${tab}"]`);
  if (activeNav) activeNav.style.color = '#C8F135';

  // Si vamos a peso, refrescar el estado
  if (tab === 'peso') {
    initPesoScreen();
  }

  // Si vamos a macros, refrescar
  if (tab === 'macros') {
    initMacrosScreen();
  }

  // Si vamos a mediciones, refrescar
  if (tab === 'mediciones') {
    initMedicionesScreen();
  }

  // Si vamos a check-in, refrescar
  if (tab === 'checkin') {
    initCheckinScreen();
  }

  // Si vamos a fotos, refrescar
  if (tab === 'fotos') {
    initFotosScreen();
  }

  // Si vamos a dashboard, quitar badge y renderizar
  if (tab === 'dashboard') {
    ocultarDashboardBadge();
    initDashboard();
  }

  // Si vamos a ajustes, inicializar
  if (tab === 'ajustes') {
    initAjustesScreen();
  }
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navegarA(item.dataset.tab);
  });
});

// ─────────────────────────────────────────────────────────
//  PANTALLA DE PESO
// ─────────────────────────────────────────────────────────

const weightInput      = document.getElementById('weight-input');
const btnGuardar       = document.getElementById('btn-guardar-peso');
const btnEditar        = document.getElementById('btn-editar-peso');
const pesoNoRegistro   = document.getElementById('peso-no-registro');
const pesoConRegistro  = document.getElementById('peso-con-registro');
const pesoValorHoy     = document.getElementById('peso-valor-hoy');
const pesoMediaMovil   = document.getElementById('peso-media-movil');
const pesoConfirmIcon  = document.getElementById('peso-confirm-icon');
const pesoDateLabel    = document.getElementById('peso-date-label');

let pesoHoyRegistrado = null; // Guarda el registro del día si existe

/**
 * Formatea fecha YYYY-MM-DD a string legible.
 */
function formatearFecha(fechaISO) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  return fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Inicializa la pantalla de peso: verifica si hay registro hoy
 * y muestra el estado correspondiente.
 */
async function initPesoScreen() {
  const fechaHoy = hoy();
  pesoDateLabel.textContent = formatearFecha(fechaHoy);

  pesoHoyRegistrado = await obtenerPesoPorFecha(fechaHoy);

  if (pesoHoyRegistrado) {
    mostrarEstadoConRegistro(pesoHoyRegistrado);
  } else {
    mostrarEstadoSinRegistro();
  }

  await actualizarGrafico();
}

function mostrarEstadoSinRegistro() {
  pesoNoRegistro.classList.remove('hidden');
  pesoConRegistro.classList.add('hidden');
  pesoNoRegistro.style.display = 'flex';
  pesoConRegistro.style.display = 'none';

  // Limpiar input y enfocar
  weightInput.value = '';
  pesoConfirmIcon.classList.add('hidden');
  pesoConfirmIcon.style.display = 'none';
  btnGuardar.style.display = 'block';

  // Enfocar input con pequeño delay para que el teclado aparezca
  setTimeout(() => weightInput.focus(), 150);
}

function mostrarEstadoConRegistro(registro) {
  pesoNoRegistro.classList.add('hidden');
  pesoConRegistro.classList.remove('hidden');
  pesoNoRegistro.style.display = 'none';
  pesoConRegistro.style.display = 'flex';

  pesoValorHoy.textContent = registro.peso.toFixed(1);
  pesoMediaMovil.textContent = registro.mediaMovil !== null
    ? registro.mediaMovil.toFixed(1)
    : '—';
}

/**
 * Guarda el peso ingresado y muestra la animación de confirmación.
 */
async function handleGuardarPeso() {
  const valor = parseFloat(weightInput.value);

  if (isNaN(valor) || valor < 30 || valor > 300) {
    // Shake visual en el input
    weightInput.style.color = '#FF4D4D';
    setTimeout(() => { weightInput.style.color = '#F0F0F0'; }, 600);
    return;
  }

  const fechaHoy = hoy();

  // Guardar en DB
  await guardarPeso(fechaHoy, valor);

  // Animación de confirmación
  btnGuardar.style.display = 'none';
  pesoConfirmIcon.classList.remove('hidden');
  pesoConfirmIcon.style.display = 'flex';
  pesoConfirmIcon.classList.add('confirm-pop');

  // Después de la animación, transicionar al estado con registro
  setTimeout(async () => {
    pesoConfirmIcon.classList.remove('confirm-pop');
    pesoHoyRegistrado = await obtenerPesoPorFecha(fechaHoy);
    mostrarEstadoConRegistro(pesoHoyRegistrado);
    await actualizarGrafico();
  }, 900);
}

/**
 * Entra en modo edición: vuelve al estado de input con el valor actual.
 */
function handleEditarPeso() {
  if (!pesoHoyRegistrado) return;

  pesoConRegistro.style.display = 'none';
  pesoNoRegistro.style.display = 'flex';
  pesoConRegistro.classList.add('hidden');
  pesoNoRegistro.classList.remove('hidden');

  weightInput.value = pesoHoyRegistrado.peso.toFixed(1);
  btnGuardar.style.display = 'block';
  pesoConfirmIcon.classList.add('hidden');
  pesoConfirmIcon.style.display = 'none';

  setTimeout(() => {
    weightInput.focus();
    // Seleccionar todo el texto para reemplazar fácilmente
    weightInput.select();
  }, 150);
}

// Event listeners de peso
btnGuardar.addEventListener('click', handleGuardarPeso);
btnEditar.addEventListener('click', handleEditarPeso);

weightInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleGuardarPeso();
  }
});

// Prevenir entrada de valores no numéricos razonables
weightInput.addEventListener('input', () => {
  const v = parseFloat(weightInput.value);
  if (weightInput.value && !isNaN(v)) {
    weightInput.style.color = '#F0F0F0';
  }
});

// ─────────────────────────────────────────────────────────
//  GRÁFICO DE PESO (Chart.js)
// ─────────────────────────────────────────────────────────

let weightChart = null;
let rangoActual = '4w'; // Rango seleccionado actualmente

const rangeButtons = document.querySelectorAll('.range-btn');
const btnResetZoom = document.getElementById('btn-reset-zoom');
const chartEmpty   = document.getElementById('chart-empty');
const chartCanvas  = document.getElementById('weight-chart');

// Colores
const COLOR_MEDIA   = '#C8F135';
const COLOR_CRUDO   = 'rgba(150, 150, 150, 0.35)';
const COLOR_GRID    = '#2A2A2A';
const COLOR_TICK    = '#6B6B6B';

/**
 * Obtiene los datos según el rango seleccionado.
 */
async function obtenerDatosParaRango(rango) {
  switch (rango) {
    case '4w':  return obtenerPesosUltimosDias(28);
    case '3m':  return obtenerPesosUltimosMeses(3);
    case 'all': return obtenerTodosLosPesos();
    default:    return obtenerPesosUltimosDias(28);
  }
}

/**
 * Formatea fecha ISO para mostrar en eje X del gráfico.
 */
function formatearFechaCorta(fechaISO) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/**
 * Actualiza el gráfico con los datos del rango actual.
 */
async function actualizarGrafico() {
  const datos = await obtenerDatosParaRango(rangoActual);

  // Mostrar/ocultar empty state
  if (!datos.length) {
    chartEmpty.style.display = 'flex';
    if (weightChart) {
      weightChart.destroy();
      weightChart = null;
    }
    return;
  }
  chartEmpty.style.display = 'none';

  const labels      = datos.map(r => r.fecha);
  const pesosCrudos = datos.map(r => r.peso);
  const mediasMovil = datos.map(r => r.mediaMovil);

  if (weightChart) {
    // Actualizar datos existentes (más eficiente que recrear)
    weightChart.data.labels = labels;
    weightChart.data.datasets[0].data = mediasMovil;
    weightChart.data.datasets[1].data = pesosCrudos;
    weightChart.update('active');
    return;
  }

  // Crear gráfico
  const ctx = chartCanvas.getContext('2d');

  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          // Dataset 0: Media móvil (protagonista)
          label: 'Media 7 días',
          data: mediasMovil,
          borderColor: COLOR_MEDIA,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: COLOR_MEDIA,
          tension: 0.4,
          fill: false,
          spanGaps: true,
        },
        {
          // Dataset 1: Peso crudo (secundario)
          label: 'Peso diario',
          data: pesosCrudos,
          borderColor: COLOR_CRUDO,
          borderWidth: 1.5,
          pointRadius: 2,
          pointBackgroundColor: COLOR_CRUDO,
          pointHoverRadius: 4,
          tension: 0.2,
          fill: false,
          spanGaps: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 400,
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false, // Leyenda propia más adelante si se necesita
        },
        tooltip: {
          backgroundColor: '#1A1A1A',
          borderColor: '#2A2A2A',
          borderWidth: 1,
          titleColor: '#6B6B6B',
          bodyColor: '#F0F0F0',
          padding: 10,
          callbacks: {
            title: (items) => {
              return formatearFechaCorta(items[0].label);
            },
            label: (item) => {
              const label = item.datasetIndex === 0 ? 'Media' : 'Peso';
              const val   = item.raw !== null ? item.raw.toFixed(1) : '—';
              return `${label}: ${val} kg`;
            },
          },
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x',
            onPanComplete: () => { btnResetZoom.classList.remove('hidden'); },
          },
          zoom: {
            wheel: { enabled: false },
            pinch: { enabled: true },
            mode: 'x',
            onZoomComplete: () => { btnResetZoom.classList.remove('hidden'); },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: COLOR_GRID,
            drawBorder: false,
          },
          ticks: {
            color: COLOR_TICK,
            font: { size: 11, family: 'Inter' },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6,
            callback: function(value, index) {
              return formatearFechaCorta(this.getLabelForValue(value));
            },
          },
        },
        y: {
          grid: {
            color: COLOR_GRID,
            drawBorder: false,
          },
          ticks: {
            color: COLOR_TICK,
            font: { size: 11, family: 'Inter' },
            callback: (val) => `${val} kg`,
            maxTicksLimit: 5,
          },
          // Padding para que la línea no quede pegada al borde
          grace: '5%',
        },
      },
    },
  });
}

// Botones de rango rápido
rangeButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    rangoActual = btn.dataset.range;

    // Estilo visual de selección
    rangeButtons.forEach(b => {
      b.style.color = '#6B6B6B';
      b.style.borderColor = '#2A2A2A';
    });
    btn.style.color = '#C8F135';
    btn.style.borderColor = '#C8F135';

    // Resetear zoom al cambiar rango
    if (weightChart) {
      weightChart.resetZoom();
      btnResetZoom.classList.add('hidden');
    }

    await actualizarGrafico();
  });
});

// Botón reset zoom
btnResetZoom.addEventListener('click', () => {
  if (weightChart) {
    weightChart.resetZoom();
    btnResetZoom.classList.add('hidden');
  }
});

// ─────────────────────────────────────────────────────────
//  PANTALLA DE MACROS
// ─────────────────────────────────────────────────────────

const macrosMesLabel       = document.getElementById('macros-mes-label');
const macrosPromedio       = document.getElementById('macros-promedio');
const macrosFormContainer  = document.getElementById('macros-form-container');
const macrosFormTitulo     = document.getElementById('macros-form-titulo');
const macrosHistorial      = document.getElementById('macros-historial');
const macrosHistorialEmpty = document.getElementById('macros-historial-empty');
const btnNuevaMacro        = document.getElementById('btn-nueva-macro');
const btnMacrosGuardar     = document.getElementById('btn-macros-guardar');
const btnMacrosCancelar    = document.getElementById('btn-macros-cancelar');
const inputMacrosFecha     = document.getElementById('macros-fecha');
const inputMacrosProteina  = document.getElementById('macros-proteina');
const inputMacrosCarbos    = document.getElementById('macros-carbos');
const inputMacrosGrasas    = document.getElementById('macros-grasas');

let macrosEditandoFecha = null; // null = nueva, 'YYYY-MM-DD' = editando

async function initMacrosScreen() {
  macrosMesLabel.textContent = formatearMes(mesActual());
  await renderMacrosUI();
}

async function renderMacrosUI() {
  const registros = await obtenerMacrosPorMes(mesActual());
  const promedio  = await calcularPromedioMacrosMes(mesActual());

  renderMacrosPromedio(promedio);
  renderMacrosHistorial(registros);
}

// ── Promedio del mes ────────────────────────────────────

function renderMacrosPromedio(p) {
  if (p.diasConDato === 0) {
    macrosPromedio.innerHTML = `<p class="text-muted text-sm">Sin registros este mes.</p>`;
    return;
  }

  const dias = `<span class="text-muted text-xs">(${p.diasConDato} de ${p.diasTotales} días registrados)</span>`;

  macrosPromedio.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <p class="text-text text-xs font-600 uppercase tracking-wider">Promedio diario</p>
      ${dias}
    </div>
    <div class="grid gap-2" style="grid-template-columns:1fr 1fr 1fr;">
      <div class="rounded-xl p-3" style="background:#0D0D0D;">
        <p class="text-muted text-xs mb-1">Proteína</p>
        <p class="text-text font-700 text-lg">${p.proteina ?? '—'}<span class="text-muted font-400 text-xs"> g</span></p>
      </div>
      <div class="rounded-xl p-3" style="background:#0D0D0D;">
        <p class="text-muted text-xs mb-1">Carbos</p>
        <p class="text-text font-700 text-lg">${p.carbos ?? '—'}<span class="text-muted font-400 text-xs"> g</span></p>
      </div>
      <div class="rounded-xl p-3" style="background:#0D0D0D;">
        <p class="text-muted text-xs mb-1">Grasas</p>
        <p class="text-text font-700 text-lg">${p.grasas ?? '—'}<span class="text-muted font-400 text-xs"> g</span></p>
      </div>
    </div>`;
}

// ── Historial del mes ───────────────────────────────────

function renderMacrosHistorial(registros) {
  if (!registros.length) {
    macrosHistorialEmpty.classList.remove('hidden');
    macrosHistorial.innerHTML = '';
    return;
  }
  macrosHistorialEmpty.classList.add('hidden');

  // Más reciente primero
  macrosHistorial.innerHTML = [...registros].reverse().map(reg => {
    const fechaLabel = formatearFecha(reg.fecha);
    return `
      <div class="flex items-center justify-between px-4 py-3 rounded-2xl"
        style="background:#1A1A1A; border:1px solid #2A2A2A;">
        <div>
          <p class="text-text text-sm font-600 mb-1">${fechaLabel}</p>
          <p class="text-muted text-xs">
            ${reg.proteina !== null ? `P: <span style="color:#F0F0F0;">${reg.proteina}g</span>` : ''}
            ${reg.carbos   !== null ? `  C: <span style="color:#F0F0F0;">${reg.carbos}g</span>` : ''}
            ${reg.grasas   !== null ? `  G: <span style="color:#F0F0F0;">${reg.grasas}g</span>` : ''}
          </p>
        </div>
        <div class="flex gap-2">
          <button class="macro-editar-btn text-xs px-3 py-1 rounded-lg"
            data-fecha="${reg.fecha}"
            style="background:#2A2A2A; color:#6B6B6B;">Editar</button>
          <button class="macro-eliminar-btn text-xs px-3 py-1 rounded-lg"
            data-fecha="${reg.fecha}"
            style="background:#2A2A2A; color:#FF4D4D;">✕</button>
        </div>
      </div>`;
  }).join('');

  document.querySelectorAll('.macro-editar-btn').forEach(btn => {
    btn.addEventListener('click', () => abrirFormMacroEdicion(btn.dataset.fecha));
  });

  document.querySelectorAll('.macro-eliminar-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await eliminarMacros(btn.dataset.fecha);
      await renderMacrosUI();
      mostrarToast('Registro eliminado', '#6B6B6B');
    });
  });
}

// ── Formulario ──────────────────────────────────────────

function abrirFormMacroNueva() {
  macrosEditandoFecha = null;
  macrosFormTitulo.textContent = 'Registrar macros';
  inputMacrosFecha.value    = hoy();
  inputMacrosProteina.value = '';
  inputMacrosCarbos.value   = '';
  inputMacrosGrasas.value   = '';
  macrosFormContainer.classList.remove('hidden');
  macrosFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => inputMacrosProteina.focus(), 300);
}

async function abrirFormMacroEdicion(fecha) {
  const reg = await obtenerMacrosPorFecha(fecha);
  if (!reg) return;
  macrosEditandoFecha = fecha;
  macrosFormTitulo.textContent = 'Editar — ' + formatearFecha(fecha);
  inputMacrosFecha.value    = fecha;
  inputMacrosFecha.disabled = true; // No cambiar la fecha al editar
  inputMacrosProteina.value = reg.proteina ?? '';
  inputMacrosCarbos.value   = reg.carbos   ?? '';
  inputMacrosGrasas.value   = reg.grasas   ?? '';
  macrosFormContainer.classList.remove('hidden');
  macrosFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cerrarFormMacros() {
  macrosFormContainer.classList.add('hidden');
  inputMacrosFecha.disabled = false;
  macrosEditandoFecha = null;
}

function parsearMacro(input) {
  const v = parseFloat(input.value);
  return input.value.trim() === '' || isNaN(v) ? null : Math.round(v);
}

btnNuevaMacro.addEventListener('click', abrirFormMacroNueva);
btnMacrosCancelar.addEventListener('click', cerrarFormMacros);

btnMacrosGuardar.addEventListener('click', async () => {
  const fecha    = inputMacrosFecha.value;
  const proteina = parsearMacro(inputMacrosProteina);
  const carbos   = parsearMacro(inputMacrosCarbos);
  const grasas   = parsearMacro(inputMacrosGrasas);

  if (!fecha) {
    mostrarToast('Seleccioná una fecha', '#FF4D4D');
    return;
  }
  if (proteina === null && carbos === null && grasas === null) {
    mostrarToast('Completá al menos un campo', '#FF4D4D');
    return;
  }

  await guardarMacros(fecha, { proteina, carbos, grasas });
  cerrarFormMacros();
  await renderMacrosUI();
  mostrarToast('✓ Macros guardadas', '#C8F135');
});

// ─────────────────────────────────────────────────────────
//  PANTALLA DE MEDICIONES
// ─────────────────────────────────────────────────────────

let medChart = null;
let medVarActual = 'cintura';
let medEditandoMes = null; // null = nueva, 'YYYY-MM' = editando

const medFormContainer  = document.getElementById('med-form-container');
const medFormTitulo     = document.getElementById('med-form-titulo');
const medMesLabel       = document.getElementById('med-mes-label');
const btnNuevaMedicion  = document.getElementById('btn-nueva-medicion');
const btnMedGuardar     = document.getElementById('btn-med-guardar');
const btnMedCancelar    = document.getElementById('btn-med-cancelar');
const inputCintura      = document.getElementById('med-cintura');
const inputBrazoRel     = document.getElementById('med-brazo-rel');
const inputBrazoCont    = document.getElementById('med-brazo-cont');
const inputMuslo        = document.getElementById('med-muslo');
const medMiniTabla      = document.getElementById('med-mini-tabla');
const medMiniTablaEmpty = document.getElementById('med-mini-tabla-empty');
const medHistorial      = document.getElementById('med-historial');
const medHistorialEmpty = document.getElementById('med-historial-empty');
const medChartEmpty     = document.getElementById('med-chart-empty');
const medVarBtns        = document.querySelectorAll('.med-var-btn');

async function initMedicionesScreen() {
  medMesLabel.textContent = formatearMes(mesActual());
  await renderMedicionesUI();
}

async function renderMedicionesUI() {
  const todas = await obtenerTodasLasMediciones(); // ordenadas ASC

  renderMiniTabla(todas);
  renderHistorialCompleto(todas);
  await actualizarGraficoMediciones(todas);

  // Mostrar/ocultar botón Nueva según si ya existe registro este mes
  const hayMesActual = todas.some(m => m.fecha === mesActual());
  btnNuevaMedicion.textContent = hayMesActual ? '✎ Editar' : '+ Nueva';
}

// ── Mini tabla (últimos 3) ──────────────────────────────

function renderMiniTabla(todas) {
  const ultimas = todas.slice(-3).reverse(); // más reciente primero

  if (!ultimas.length) {
    medMiniTablaEmpty.classList.remove('hidden');
    medMiniTabla.innerHTML = '';
    medMiniTabla.style.display = 'none';
    return;
  }

  medMiniTablaEmpty.classList.add('hidden');
  medMiniTabla.style.display = 'block';

  // Cabecera
  const headerHTML = `
    <div class="grid text-muted text-xs font-500 px-3 py-2"
      style="grid-template-columns: 1fr 1fr 1fr 1fr 1fr; border-bottom:1px solid #2A2A2A;">
      <span>Mes</span>
      <span class="text-center">Cintura</span>
      <span class="text-center">B.Rel</span>
      <span class="text-center">B.Cont</span>
      <span class="text-center">Muslo</span>
    </div>`;

  const filasHTML = ultimas.map((reg, i) => {
    const anterior = ultimas[i + 1] || null; // el siguiente en el array invertido es el anterior en tiempo

    const dCintura   = anterior ? calcularDeltaMedicion(anterior.cintura,       reg.cintura,    'cintura') : { valor: null, direccion: 'neutral' };
    const dBrazoRel  = anterior ? calcularDeltaMedicion(anterior.brazoRelajado, reg.brazoRelajado, 'brazo') : { valor: null, direccion: 'neutral' };
    const dBrazoCont = anterior ? calcularDeltaMedicion(anterior.brazoCont,     reg.brazoCont,  'brazo') : { valor: null, direccion: 'neutral' };
    const dMuslo     = anterior ? calcularDeltaMedicion(anterior.muslo,         reg.muslo,      'muslo') : { valor: null, direccion: 'neutral' };

    const mesCorto = (() => {
      const [y, m] = reg.fecha.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    })();

    return `
      <div class="grid px-3 py-3 text-sm ${i < ultimas.length - 1 ? 'border-b' : ''}"
        style="grid-template-columns: 1fr 1fr 1fr 1fr 1fr; border-color:#2A2A2A;">
        <span class="text-muted text-xs" style="align-self:center;">${mesCorto}</span>
        <span class="text-center font-600 text-xs" style="align-self:center;">
          ${reg.cintura.toFixed(1)}<br>
          <small>${renderDeltaFlecha(dCintura)}</small>
        </span>
        <span class="text-center font-600 text-xs" style="align-self:center;">
          ${reg.brazoRelajado.toFixed(1)}<br>
          <small>${renderDeltaFlecha(dBrazoRel)}</small>
        </span>
        <span class="text-center font-600 text-xs" style="align-self:center;">
          ${reg.brazoCont.toFixed(1)}<br>
          <small>${renderDeltaFlecha(dBrazoCont)}</small>
        </span>
        <span class="text-center font-600 text-xs" style="align-self:center;">
          ${reg.muslo !== null ? reg.muslo.toFixed(1) : '<span style="color:#6B6B6B">—</span>'}<br>
          <small>${reg.muslo !== null ? renderDeltaFlecha(dMuslo) : '<span style="color:#6B6B6B">—</span>'}</small>
        </span>
      </div>`;
  }).join('');

  medMiniTabla.innerHTML = headerHTML + filasHTML;
}

// ── Historial completo ──────────────────────────────────

function renderHistorialCompleto(todas) {
  const invertidas = [...todas].reverse();

  if (!invertidas.length) {
    medHistorialEmpty.classList.remove('hidden');
    medHistorial.innerHTML = '';
    return;
  }

  medHistorialEmpty.classList.add('hidden');

  medHistorial.innerHTML = invertidas.map((reg, i) => {
    const anterior = invertidas[i + 1] || null;

    const dCintura   = anterior ? calcularDeltaMedicion(anterior.cintura,       reg.cintura,       'cintura') : { valor: null, direccion: 'neutral' };
    const dBrazoRel  = anterior ? calcularDeltaMedicion(anterior.brazoRelajado, reg.brazoRelajado, 'brazo')   : { valor: null, direccion: 'neutral' };
    const dBrazoCont = anterior ? calcularDeltaMedicion(anterior.brazoCont,     reg.brazoCont,     'brazo')   : { valor: null, direccion: 'neutral' };
    const dMuslo     = anterior && reg.muslo !== null && anterior.muslo !== null
      ? calcularDeltaMedicion(anterior.muslo, reg.muslo, 'muslo')
      : { valor: null, direccion: 'neutral' };

    return `
      <div class="rounded-2xl p-4" style="background:#1A1A1A; border:1px solid #2A2A2A;">
        <div class="flex items-center justify-between mb-3">
          <span class="text-text font-600 text-sm">${formatearMes(reg.fecha)}</span>
          <button class="med-editar-btn text-xs px-3 py-1 rounded-lg"
            data-mes="${reg.fecha}"
            style="background:#2A2A2A; color:#6B6B6B;">
            Editar
          </button>
        </div>
        <div class="grid gap-2" style="grid-template-columns: 1fr 1fr;">
          <div class="rounded-xl p-3" style="background:#0D0D0D;">
            <p class="text-muted text-xs mb-1">Cintura</p>
            <p class="text-text font-700">${reg.cintura.toFixed(1)} <span class="text-muted font-400 text-xs">cm</span></p>
            <p class="text-xs mt-1">${renderDeltaFlecha(dCintura)}</p>
          </div>
          <div class="rounded-xl p-3" style="background:#0D0D0D;">
            <p class="text-muted text-xs mb-1">Brazo relajado</p>
            <p class="text-text font-700">${reg.brazoRelajado.toFixed(1)} <span class="text-muted font-400 text-xs">cm</span></p>
            <p class="text-xs mt-1">${renderDeltaFlecha(dBrazoRel)}</p>
          </div>
          <div class="rounded-xl p-3" style="background:#0D0D0D;">
            <p class="text-muted text-xs mb-1">Brazo contraído</p>
            <p class="text-text font-700">${reg.brazoCont.toFixed(1)} <span class="text-muted font-400 text-xs">cm</span></p>
            <p class="text-xs mt-1">${renderDeltaFlecha(dBrazoCont)}</p>
          </div>
          <div class="rounded-xl p-3" style="background:#0D0D0D;">
            <p class="text-muted text-xs mb-1">Muslo derecho</p>
            ${reg.muslo !== null
              ? `<p class="text-text font-700">${reg.muslo.toFixed(1)} <span class="text-muted font-400 text-xs">cm</span></p>
                 <p class="text-xs mt-1">${renderDeltaFlecha(dMuslo)}</p>`
              : `<p class="text-muted text-sm">—</p>`
            }
          </div>
        </div>
      </div>`;
  }).join('');

  // Botones de editar en historial
  document.querySelectorAll('.med-editar-btn').forEach(btn => {
    btn.addEventListener('click', () => abrirFormEdicion(btn.dataset.mes));
  });
}

// ── Gráfico de mediciones ───────────────────────────────

const MED_VAR_CONFIG = {
  cintura:   { label: 'Cintura',        campo: 'cintura',       color: '#C8F135' },
  brazoRel:  { label: 'Brazo relajado', campo: 'brazoRelajado', color: '#4FC3F7' },
  brazoCont: { label: 'Brazo contraído',campo: 'brazoCont',     color: '#FFB347' },
  muslo:     { label: 'Muslo derecho',  campo: 'muslo',         color: '#CE93D8' },
};

async function actualizarGraficoMediciones(todas) {
  const config = MED_VAR_CONFIG[medVarActual];
  const datos = todas.filter(r => r[config.campo] !== null && r[config.campo] !== undefined);

  if (datos.length < 2) {
    medChartEmpty.style.display = 'flex';
    if (medChart) { medChart.destroy(); medChart = null; }
    return;
  }
  medChartEmpty.style.display = 'none';

  const labels = datos.map(r => {
    const [y, m] = r.fecha.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
  });
  const valores = datos.map(r => r[config.campo]);

  if (medChart) {
    medChart.data.labels = labels;
    medChart.data.datasets[0].data = valores;
    medChart.data.datasets[0].borderColor = config.color;
    medChart.data.datasets[0].pointBackgroundColor = config.color;
    medChart.data.datasets[0].label = config.label;
    medChart.update('active');
    return;
  }

  const ctx = document.getElementById('med-chart').getContext('2d');
  medChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: config.label,
        data: valores,
        borderColor: config.color,
        borderWidth: 2.5,
        pointRadius: 5,
        pointBackgroundColor: config.color,
        pointHoverRadius: 7,
        tension: 0.3,
        fill: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A1A1A',
          borderColor: '#2A2A2A',
          borderWidth: 1,
          titleColor: '#6B6B6B',
          bodyColor: '#F0F0F0',
          padding: 10,
          callbacks: {
            label: (item) => `${config.label}: ${item.raw.toFixed(1)} cm`,
          },
        },
        zoom: { pan: { enabled: false }, zoom: { pinch: { enabled: false }, wheel: { enabled: false } } },
      },
      scales: {
        x: {
          grid: { color: '#2A2A2A', drawBorder: false },
          ticks: { color: '#6B6B6B', font: { size: 11, family: 'Inter' }, maxRotation: 0 },
        },
        y: {
          grid: { color: '#2A2A2A', drawBorder: false },
          ticks: { color: '#6B6B6B', font: { size: 11, family: 'Inter' }, callback: v => `${v} cm`, maxTicksLimit: 5 },
          grace: '5%',
        },
      },
    },
  });
}

// Selector de variable del gráfico
medVarBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    medVarActual = btn.dataset.var;
    medVarBtns.forEach(b => {
      b.style.background = '#1A1A1A';
      b.style.color = '#6B6B6B';
      b.style.border = '1px solid #2A2A2A';
    });
    btn.style.background = '#C8F135';
    btn.style.color = '#0D0D0D';
    btn.style.border = 'none';
    if (medChart) { medChart.destroy(); medChart = null; }
    const todas = await obtenerTodasLasMediciones();
    await actualizarGraficoMediciones(todas);
  });
});

// ── Formulario ──────────────────────────────────────────

function abrirFormNueva() {
  medEditandoMes = null;
  medFormTitulo.textContent = 'Nueva medición — ' + formatearMes(mesActual());
  inputCintura.value = '';
  inputBrazoRel.value = '';
  inputBrazoCont.value = '';
  inputMuslo.value = '';
  medFormContainer.classList.remove('hidden');
  // Scroll al form
  medFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => inputCintura.focus(), 300);
}

async function abrirFormEdicion(mes) {
  const reg = await obtenerMedicionPorMes(mes);
  if (!reg) return;
  medEditandoMes = mes;
  medFormTitulo.textContent = 'Editando — ' + formatearMes(mes);
  inputCintura.value    = reg.cintura.toFixed(1);
  inputBrazoRel.value   = reg.brazoRelajado.toFixed(1);
  inputBrazoCont.value  = reg.brazoCont.toFixed(1);
  inputMuslo.value      = reg.muslo !== null ? reg.muslo.toFixed(1) : '';
  medFormContainer.classList.remove('hidden');
  medFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => inputCintura.focus(), 300);
}

function cerrarForm() {
  medFormContainer.classList.add('hidden');
  medEditandoMes = null;
}

function validarInputMedicion(input, label) {
  const v = parseFloat(input.value);
  if (isNaN(v) || v <= 0) {
    input.style.borderColor = '#FF4D4D';
    setTimeout(() => { input.style.borderColor = '#2A2A2A'; }, 1000);
    return null;
  }
  input.style.borderColor = '#2A2A2A';
  return v;
}

btnNuevaMedicion.addEventListener('click', abrirFormNueva);
btnMedCancelar.addEventListener('click', cerrarForm);

btnMedGuardar.addEventListener('click', async () => {
  const cintura    = validarInputMedicion(inputCintura,   'Cintura');
  const brazoRel   = validarInputMedicion(inputBrazoRel,  'Brazo relajado');
  const brazoCont  = validarInputMedicion(inputBrazoCont, 'Brazo contraído');

  if (cintura === null || brazoRel === null || brazoCont === null) return;

  const musloVal = inputMuslo.value.trim();
  const muslo = musloVal !== '' ? parseFloat(musloVal) : null;
  if (muslo !== null && (isNaN(muslo) || muslo <= 0)) {
    inputMuslo.style.borderColor = '#FF4D4D';
    setTimeout(() => { inputMuslo.style.borderColor = '#2A2A2A'; }, 1000);
    return;
  }

  const mes = medEditandoMes || mesActual();
  await guardarMedicion(mes, { cintura, brazoRelajado: brazoRel, brazoCont, muslo });

  cerrarForm();
  await renderMedicionesUI();

  // Feedback visual breve
  const toast = document.createElement('div');
  toast.textContent = '✓ Medición guardada';
  toast.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    background:#1A1A1A; color:#C8F135; border:1px solid #2A2A2A;
    padding:10px 20px; border-radius:999px; font-size:13px; font-weight:600;
    z-index:9999; white-space:nowrap; pointer-events:none;`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
});

// ─────────────────────────────────────────────────────────
//  PANTALLA DE CHECK-IN
// ─────────────────────────────────────────────────────────

const ciMesLabel          = document.getElementById('ci-mes-label');
const ciBanner            = document.getElementById('ci-banner');
const ciBannerTexto       = document.getElementById('ci-banner-texto');
const ciFormContainer     = document.getElementById('ci-form-container');
const ciFormTitulo        = document.getElementById('ci-form-titulo');
const ciResumenContainer  = document.getElementById('ci-resumen-container');
const ciResumen           = document.getElementById('ci-resumen');
const ciHistorial         = document.getElementById('ci-historial');
const ciHistorialEmpty    = document.getElementById('ci-historial-empty');
const btnNuevoCheckin     = document.getElementById('btn-nuevo-checkin');
const btnCiGuardar        = document.getElementById('btn-ci-guardar');
const btnCiCancelar       = document.getElementById('btn-ci-cancelar');
const inputCiBanca        = document.getElementById('ci-banca');
const inputCiDominadas    = document.getElementById('ci-dominadas');
const inputCiRdl          = document.getElementById('ci-rdl');
const inputCiFatiga       = document.getElementById('ci-fatiga');
const inputCiFatigaActiva = document.getElementById('ci-fatiga-activa');
const ciFatigaValor       = document.getElementById('ci-fatiga-valor');
const inputCiPasos        = document.getElementById('ci-pasos');
const inputCiNotas        = document.getElementById('ci-notas');
const dashboardBadge      = document.getElementById('dashboard-badge');

let ciEditandoMes = null;

// Badge de dashboard
function mostrarDashboardBadge() {
  dashboardBadge.classList.remove('hidden');
}
function ocultarDashboardBadge() {
  dashboardBadge.classList.add('hidden');
}

// Slider de fatiga — actualizar valor en tiempo real
inputCiFatiga.addEventListener('input', () => {
  ciFatigaValor.textContent = inputCiFatiga.value;
});
inputCiFatigaActiva.addEventListener('change', () => {
  inputCiFatiga.disabled = !inputCiFatigaActiva.checked;
  ciFatigaValor.style.color = inputCiFatigaActiva.checked ? '#C8F135' : '#6B6B6B';
});

async function initCheckinScreen() {
  ciMesLabel.textContent = formatearMes(mesActual());

  // Recordatorios
  const mensajes = await verificarRecordatorios();
  if (mensajes.length > 0) {
    ciBannerTexto.textContent = mensajes[0];
    ciBanner.classList.remove('hidden');
  } else {
    ciBanner.classList.add('hidden');
  }

  await renderCheckinUI();
}

async function renderCheckinUI() {
  const todos = await obtenerTodosLosCheckins(); // ASC
  const checkinMesActual = await obtenerCheckinPorMes(mesActual());

  // Botón header
  btnNuevoCheckin.textContent = checkinMesActual ? '✎ Editar' : '+ Nuevo';

  // Resumen mes actual
  if (checkinMesActual) {
    ciResumenContainer.classList.remove('hidden');
    renderResumenCheckin(checkinMesActual, todos);
  } else {
    ciResumenContainer.classList.add('hidden');
  }

  // Historial (todos excepto el mes actual, invertido)
  const historial = todos.filter(c => c.fecha !== mesActual()).reverse();
  renderHistorialCheckin(historial, todos);
}

function renderResumenCheckin(reg, todos) {
  // Buscar el anterior para deltas
  const idx = todos.findIndex(c => c.fecha === reg.fecha);
  const anterior = idx > 0 ? todos[idx - 1] : null;

  const dBanca     = calcularDeltaPR(anterior?.banca,     reg.banca);
  const dDominadas = calcularDeltaPR(anterior?.dominadas, reg.dominadas);
  const dRdl       = calcularDeltaPR(anterior?.rdl,       reg.rdl);
  const dFatiga    = calcularDeltaFatiga(anterior?.fatiga, reg.fatiga);

  ciResumen.innerHTML = `
    <div class="grid gap-2 mb-3" style="grid-template-columns:1fr 1fr 1fr;">
      ${renderPRCard('Banca', reg.banca, dBanca)}
      ${renderPRCard('Dominadas', reg.dominadas, dDominadas)}
      ${renderPRCard('RDL', reg.rdl, dRdl)}
    </div>
    ${reg.fatiga !== null ? `
    <div class="rounded-xl p-3 mb-3" style="background:#0D0D0D;">
      <p class="text-muted text-xs mb-1">Fatiga</p>
      <div class="flex items-center gap-2">
        <span class="text-text font-700 text-lg">${reg.fatiga}</span>
        <span class="text-muted text-xs">/10</span>
        <span class="text-xs ml-auto">${renderDeltaFlecha(dFatiga, '')}</span>
      </div>
      ${renderBarraFatiga(reg.fatiga)}
    </div>` : ''}
    ${reg.notas ? `
    <div class="rounded-xl p-3" style="background:#0D0D0D;">
      <p class="text-muted text-xs mb-1">Notas</p>
      <p class="text-sm" style="color:#F0F0F0; line-height:1.5; white-space:pre-wrap;">${escapeHTML(reg.notas)}</p>
    </div>` : ''}
    ${reg.pasos !== null && reg.pasos !== undefined ? `
    <div class="rounded-xl p-3 mt-2" style="background:#0D0D0D;">
      <p class="text-muted text-xs mb-1">Media de pasos diarios</p>
      <p class="text-text font-700">${reg.pasos.toLocaleString('es-ES')} <span class="text-muted font-400 text-xs">pasos/día</span></p>
    </div>` : ''}
  `;
}

function renderPRCard(nombre, valor, delta) {
  const valorStr = valor !== null ? `${valor} <span style="color:#6B6B6B;font-size:11px;font-weight:400;">kg</span>` : '<span style="color:#6B6B6B">—</span>';
  return `
    <div class="rounded-xl p-3" style="background:#0D0D0D;">
      <p class="text-muted text-xs mb-1">${nombre}</p>
      <p class="font-700" style="font-size:15px;">${valorStr}</p>
      <p class="text-xs mt-1">${renderDeltaFlecha(delta, 'kg')}</p>
    </div>`;
}

function renderBarraFatiga(valor) {
  const pct = ((valor - 1) / 9) * 100;
  const color = valor <= 3 ? '#C8F135' : valor <= 6 ? '#FFB347' : '#FF4D4D';
  return `
    <div style="height:4px; background:#2A2A2A; border-radius:2px; margin-top:8px;">
      <div style="height:100%; width:${pct}%; background:${color}; border-radius:2px; transition:width 0.3s;"></div>
    </div>`;
}

function renderHistorialCheckin(historial, todos) {
  if (!historial.length) {
    ciHistorialEmpty.classList.remove('hidden');
    ciHistorial.innerHTML = '';
    return;
  }
  ciHistorialEmpty.classList.add('hidden');

  ciHistorial.innerHTML = historial.map(reg => {
    const idx = todos.findIndex(c => c.fecha === reg.fecha);
    const anterior = idx > 0 ? todos[idx - 1] : null;

    const dBanca     = calcularDeltaPR(anterior?.banca,     reg.banca);
    const dDominadas = calcularDeltaPR(anterior?.dominadas, reg.dominadas);
    const dRdl       = calcularDeltaPR(anterior?.rdl,       reg.rdl);
    const dFatiga    = calcularDeltaFatiga(anterior?.fatiga, reg.fatiga);

    const notasId = `notas-${reg.fecha}`;

    return `
      <div class="rounded-2xl" style="background:#1A1A1A; border:1px solid #2A2A2A; overflow:hidden;">
        <!-- Header de tarjeta -->
        <div class="flex items-center justify-between px-4 py-3" style="border-bottom:1px solid #2A2A2A;">
          <span class="text-text font-600 text-sm">${formatearMes(reg.fecha)}</span>
          <div class="flex gap-2">
            ${reg.notas ? `<button class="ci-toggle-notas text-xs px-3 py-1 rounded-lg" data-target="${notasId}"
              style="background:#2A2A2A; color:#6B6B6B;">Ver notas</button>` : ''}
            <button class="ci-editar-btn text-xs px-3 py-1 rounded-lg"
              data-mes="${reg.fecha}"
              style="background:#2A2A2A; color:#6B6B6B;">Editar</button>
          </div>
        </div>
        <!-- PRs y fatiga -->
        <div class="px-4 py-3">
          <div class="grid gap-2 mb-2" style="grid-template-columns:1fr 1fr 1fr;">
            ${renderPRCard('Banca', reg.banca, dBanca)}
            ${renderPRCard('Dominadas', reg.dominadas, dDominadas)}
            ${renderPRCard('RDL', reg.rdl, dRdl)}
          </div>
          ${reg.fatiga !== null ? `
          <div class="rounded-xl px-3 py-2" style="background:#0D0D0D;">
            <div class="flex items-center gap-2">
              <span class="text-muted text-xs">Fatiga:</span>
              <span class="text-text font-700">${reg.fatiga}/10</span>
              <span class="text-xs ml-auto">${renderDeltaFlecha(dFatiga, '')}</span>
            </div>
            ${renderBarraFatiga(reg.fatiga)}
          </div>` : ''}
        </div>
        <!-- Notas expandibles -->
        ${reg.notas ? `
        <div id="${notasId}" class="hidden px-4 pb-3">
          <p class="text-muted text-xs mb-1">Notas</p>
          <p class="text-sm" style="color:#F0F0F0; line-height:1.5; white-space:pre-wrap;">${escapeHTML(reg.notas)}</p>
        </div>` : ''}
        ${reg.pasos !== null && reg.pasos !== undefined ? `
        <div class="px-4 pb-3">
          <div class="rounded-xl px-3 py-2" style="background:#0D0D0D;">
            <span class="text-muted text-xs">Pasos/día: </span>
            <span class="text-text font-700 text-sm">${reg.pasos.toLocaleString('es-ES')}</span>
          </div>
        </div>` : ''}
      </div>`;
  }).join('');

  // Toggle notas
  document.querySelectorAll('.ci-toggle-notas').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) {
        const oculto = target.classList.toggle('hidden');
        btn.textContent = oculto ? 'Ver notas' : 'Ocultar notas';
      }
    });
  });

  // Editar desde historial
  document.querySelectorAll('.ci-editar-btn').forEach(btn => {
    btn.addEventListener('click', () => abrirFormCheckinEdicion(btn.dataset.mes));
  });
}

// ── Formulario check-in ─────────────────────────────────

function abrirFormCheckinNuevo() {
  ciEditandoMes = null;
  ciFormTitulo.textContent = 'Check-in — ' + formatearMes(mesActual());
  inputCiBanca.value     = '';
  inputCiDominadas.value = '';
  inputCiRdl.value       = '';
  inputCiFatiga.value    = '5';
  ciFatigaValor.textContent = '5';
  inputCiFatigaActiva.checked = true;
  inputCiFatiga.disabled = false;
  inputCiPasos.value     = '';
  inputCiNotas.value     = '';
  ciFormContainer.classList.remove('hidden');
  ciFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => inputCiBanca.focus(), 300);
}

async function abrirFormCheckinEdicion(mes) {
  const reg = await obtenerCheckinPorMes(mes);
  if (!reg) return;
  ciEditandoMes = mes;
  ciFormTitulo.textContent = 'Editando — ' + formatearMes(mes);
  inputCiBanca.value     = reg.banca     !== null ? reg.banca     : '';
  inputCiDominadas.value = reg.dominadas !== null ? reg.dominadas : '';
  inputCiRdl.value       = reg.rdl       !== null ? reg.rdl       : '';

  if (reg.fatiga !== null) {
    inputCiFatigaActiva.checked = true;
    inputCiFatiga.disabled = false;
    inputCiFatiga.value = reg.fatiga;
    ciFatigaValor.textContent = reg.fatiga;
  } else {
    inputCiFatigaActiva.checked = false;
    inputCiFatiga.disabled = true;
    inputCiFatiga.value = '5';
    ciFatigaValor.textContent = '5';
  }

  inputCiNotas.value = reg.notas || '';
  inputCiPasos.value = reg.pasos !== null && reg.pasos !== undefined ? reg.pasos : '';
  ciFormContainer.classList.remove('hidden');
  ciFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cerrarFormCheckin() {
  ciFormContainer.classList.add('hidden');
  ciEditandoMes = null;
}

function parsearPR(input) {
  const v = parseFloat(input.value);
  return input.value.trim() === '' || isNaN(v) ? null : v;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

btnNuevoCheckin.addEventListener('click', abrirFormCheckinNuevo);
btnCiCancelar.addEventListener('click', cerrarFormCheckin);

btnCiGuardar.addEventListener('click', async () => {
  const banca     = parsearPR(inputCiBanca);
  const dominadas = parsearPR(inputCiDominadas);
  const rdl       = parsearPR(inputCiRdl);
  const fatiga    = inputCiFatigaActiva.checked ? parseInt(inputCiFatiga.value, 10) : null;
  const pasosVal  = inputCiPasos.value.trim();
  const pasos     = pasosVal !== '' ? Math.round(parseFloat(pasosVal)) : null;
  const notas     = inputCiNotas.value.trim() || null;

  // Al menos un campo debe tener dato
  if (banca === null && dominadas === null && rdl === null && fatiga === null && pasos === null && !notas) {
    const hint = document.createElement('div');
    hint.textContent = 'Completá al menos un campo antes de guardar';
    hint.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:#1A1A1A; color:#FF4D4D; border:1px solid #FF4D4D;
      padding:10px 20px; border-radius:999px; font-size:13px;
      z-index:9999; white-space:nowrap;`;
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 2500);
    return;
  }

  const mes = ciEditandoMes || mesActual();
  await guardarCheckin(mes, { banca, dominadas, rdl, fatiga, pasos, notas });

  cerrarFormCheckin();
  await renderCheckinUI();
  mostrarDashboardBadge();

  const toast = document.createElement('div');
  toast.textContent = '✓ Check-in guardado';
  toast.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    background:#1A1A1A; color:#C8F135; border:1px solid #2A2A2A;
    padding:10px 20px; border-radius:999px; font-size:13px; font-weight:600;
    z-index:9999; white-space:nowrap;`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
});

// ─────────────────────────────────────────────────────────
//  PANTALLA DE FOTOS
// ─────────────────────────────────────────────────────────

const fotosGaleriaView   = document.getElementById('fotos-galeria-view');
const fotosCompararView  = document.getElementById('fotos-comparar-view');
const fotosGrid          = document.getElementById('fotos-grid');
const fotosGridEmpty     = document.getElementById('fotos-grid-empty');
const btnNuevaFoto       = document.getElementById('btn-nueva-foto');
const btnCompararFotos   = document.getElementById('btn-comparar-fotos');
const btnCerrarComparar  = document.getElementById('btn-cerrar-comparar');
const fotoFileCamara     = document.getElementById('foto-file-camara');
const fotoFileGaleria    = document.getElementById('foto-file-galeria');
const fotoPoseModal      = document.getElementById('foto-pose-modal');
const fotoModalMesSelector = document.getElementById('foto-modal-mes-selector');
const fotoPoseCancelar   = document.getElementById('foto-pose-cancelar');
const fotoModalPasoPose  = document.getElementById('foto-modal-paso-pose');
const fotoModalPasoFuente= document.getElementById('foto-modal-paso-fuente');
const fotoFuenteSubtitulo= document.getElementById('foto-fuente-subtitulo');
const fotoFuenteCamara   = document.getElementById('foto-fuente-camara');
const fotoFuenteGaleria  = document.getElementById('foto-fuente-galeria');
const fotoFuenteVolver   = document.getElementById('foto-fuente-volver');
const fotoExpandModal    = document.getElementById('foto-expand-modal');
const fotoExpandImg      = document.getElementById('foto-expand-img');
const fotoExpandLabel    = document.getElementById('foto-expand-label');
const fotoExpandCerrar   = document.getElementById('foto-expand-cerrar');
const compararMesA       = document.getElementById('comparar-mes-a');
const compararMesB       = document.getElementById('comparar-mes-b');
const compararImgA       = document.getElementById('comparar-img-a');
const compararImgB       = document.getElementById('comparar-img-b');
const compararLabelA     = document.getElementById('comparar-label-a');
const compararLabelB     = document.getElementById('comparar-label-b');
const fotoPoseBtns       = document.querySelectorAll('.foto-pose-btn');

let fotoPoseSeleccionada  = null; // pose elegida en el modal
let fotoMesSubida         = null; // mes al que pertenece la foto que se sube
let fotoArchivoTemporal   = null; // File object antes de elegir pose
let comparadorPoseActual  = 'frente';
let huboPasoPose          = false; // si el flujo actual pasó por el paso de elegir pose

// ── Inicialización ──────────────────────────────────────

async function initFotosScreen() {
  await renderGaleriaFotos();
  mostrarVistaGaleria();
}

// ── Vista galería ───────────────────────────────────────

async function renderGaleriaFotos() {
  const todas = await obtenerTodasLasFotos();

  if (!todas.length) {
    fotosGridEmpty.classList.remove('hidden');
    fotosGrid.innerHTML = '';
    return;
  }
  fotosGridEmpty.classList.add('hidden');

  // Ordenar descendente (más reciente primero)
  const invertidas = [...todas].reverse();

  fotosGrid.innerHTML = invertidas.map(reg => {
    // Thumbnail: primera pose disponible
    const thumbPose = POSES.find(p => reg[p]);
    const thumbSrc  = thumbPose ? `data:image/jpeg;base64,${reg[thumbPose]}` : null;
    const mesLabel  = formatearMes(reg.fecha);

    const posesHTML = POSES.map(pose => {
      const tieneFoto = !!reg[pose];
      return `
        <div class="flex flex-col">
          <div class="relative" style="aspect-ratio:3/4;">
            ${tieneFoto
              ? `<img src="data:image/jpeg;base64,${reg[pose]}"
                   alt="${POSES_LABELS[pose]}"
                   class="foto-thumb-tap w-full h-full rounded-xl object-cover cursor-pointer"
                   data-mes="${reg.fecha}" data-pose="${pose}"
                   style="display:block;" />`
              : `<div class="w-full h-full rounded-xl flex items-center justify-center"
                   style="background:#1A1A1A; border:1px dashed #2A2A2A;">
                   <button class="foto-agregar-btn flex flex-col items-center gap-1"
                     data-mes="${reg.fecha}" data-pose="${pose}"
                     style="background:transparent; border:none; color:#6B6B6B;">
                     <span style="font-size:20px;">+</span>
                   </button>
                 </div>`
            }
            ${tieneFoto
              ? `<button class="foto-eliminar-btn absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                   data-mes="${reg.fecha}" data-pose="${pose}"
                   style="background:rgba(0,0,0,0.7); border:none; color:#F0F0F0; font-size:12px; line-height:1;">✕</button>`
              : ''}
          </div>
          <p class="text-center text-muted" style="font-size:10px; margin-top:4px; line-height:1.2;">${POSES_LABELS[pose]}</p>
        </div>`;
    }).join('');

    return `
      <div class="rounded-2xl overflow-hidden" style="background:#1A1A1A; border:1px solid #2A2A2A;">
        <!-- Header del mes -->
        <div class="flex items-center justify-between px-4 py-3" style="border-bottom:1px solid #2A2A2A;">
          <span class="text-text font-600 text-sm">${mesLabel}</span>
          ${thumbPose
            ? `<span class="text-muted text-xs">${POSES.filter(p => reg[p]).length}/4 poses</span>`
            : ''}
        </div>
        <!-- Grid de 4 poses -->
        <div class="grid gap-2 p-3" style="grid-template-columns:1fr 1fr 1fr 1fr;">
          ${posesHTML}
        </div>
      </div>`;
  }).join('');

  // Listeners: expandir foto al tocar
  document.querySelectorAll('.foto-thumb-tap').forEach(img => {
    img.addEventListener('click', () => {
      abrirExpandModal(img.dataset.mes, img.dataset.pose);
    });
  });

  // Listeners: agregar foto a pose vacía
  document.querySelectorAll('.foto-agregar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      iniciarSubidaFoto(btn.dataset.mes, btn.dataset.pose);
    });
  });

  // Listeners: eliminar foto
  document.querySelectorAll('.foto-eliminar-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await eliminarFoto(btn.dataset.mes, btn.dataset.pose);
      await renderGaleriaFotos();
    });
  });
}

// ── Modal expandir foto ─────────────────────────────────

function abrirExpandModal(mes, pose) {
  fotoExpandModal.style.display = 'flex';
  fotoExpandModal.classList.remove('hidden');
  fotoExpandLabel.textContent = `${formatearMes(mes)} — ${POSES_LABELS[pose]}`;
  // La imagen ya estaba cargada en el DOM como base64
  const imgEl = document.querySelector(`.foto-thumb-tap[data-mes="${mes}"][data-pose="${pose}"]`);
  if (imgEl) fotoExpandImg.src = imgEl.src;
}

fotoExpandCerrar.addEventListener('click', () => {
  fotoExpandModal.style.display = 'none';
  fotoExpandModal.classList.add('hidden');
  fotoExpandImg.src = '';
});

fotoExpandModal.addEventListener('click', (e) => {
  if (e.target === fotoExpandModal) {
    fotoExpandModal.style.display = 'none';
    fotoExpandModal.classList.add('hidden');
    fotoExpandImg.src = '';
  }
});

// ── Subida de foto ──────────────────────────────────────

/**
 * Genera las opciones de mes para el selector de subida (mes actual + 2 anteriores).
 */
function generarOpcionesMesSubida(mesPreseleccionado) {
  const opciones = [];
  const [y, m] = mesActual().split('-').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = new Date(y, m - 1 - i, 1);
    const mesISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opciones.push(mesISO);
  }
  fotoModalMesSelector.innerHTML = opciones.map(m =>
    `<option value="${m}" ${m === mesPreseleccionado ? 'selected' : ''}>${formatearMes(m)}</option>`
  ).join('');
}

/**
 * Inicia el flujo de subida de foto.
 * Si se pasa pose, salta directo al paso de elegir fuente (cámara/galería),
 * con el mes ya fijado por contexto (grid o comparador).
 * Si no se pasa pose, abre el modal completo: mes + pose, y luego fuente.
 */
function iniciarSubidaFoto(mes, poseDirecta = null) {
  fotoMesSubida = mes || mesActual();
  fotoPoseSeleccionada = poseDirecta;

  fotoPoseModal.style.display = 'flex';
  fotoPoseModal.classList.remove('hidden');

  if (poseDirecta) {
    // Saltar directo al paso de fuente — mes y pose ya definidos por contexto
    huboPasoPose = false;
    mostrarPasoFuente();
  } else {
    // Mostrar paso 1: mes + pose
    huboPasoPose = true;
    generarOpcionesMesSubida(fotoMesSubida);
    mostrarPasoPose();
  }
}

function mostrarPasoPose() {
  fotoModalPasoPose.classList.remove('hidden');
  fotoModalPasoFuente.classList.add('hidden');
}

function mostrarPasoFuente() {
  fotoModalPasoPose.classList.add('hidden');
  fotoModalPasoFuente.classList.remove('hidden');
  // Subtítulo con contexto de mes y pose
  const poseLabel = POSES_LABELS[fotoPoseSeleccionada] || '';
  fotoFuenteSubtitulo.textContent = `${formatearMes(fotoMesSubida)} · ${poseLabel}`;
}

function cerrarModalPose() {
  fotoPoseModal.style.display = 'none';
  fotoPoseModal.classList.add('hidden');
  fotoMesSubida = null;
  fotoPoseSeleccionada = null;
}

// Botón "+ Foto" del header
btnNuevaFoto.addEventListener('click', () => {
  iniciarSubidaFoto(mesActual(), null);
});

// Cancelar modal de pose
fotoPoseCancelar.addEventListener('click', cerrarModalPose);

// Seleccionar pose en el modal — toma el mes elegido y pasa al paso de fuente
document.querySelectorAll('.foto-pose-select').forEach(btn => {
  btn.addEventListener('click', () => {
    fotoMesSubida = fotoModalMesSelector.value || mesActual();
    fotoPoseSeleccionada = btn.dataset.pose;
    mostrarPasoFuente();
  });
});

// Volver del paso de fuente: al paso de pose si vino del flujo completo, o cerrar si vino por contexto
fotoFuenteVolver.addEventListener('click', () => {
  if (huboPasoPose) {
    mostrarPasoPose();
  } else {
    cerrarModalPose();
  }
});

// Elegir cámara → dispara el input con capture
fotoFuenteCamara.addEventListener('click', () => {
  fotoPoseModal.style.display = 'none';
  fotoPoseModal.classList.add('hidden');
  fotoFileCamara.click();
});

// Elegir galería → dispara el input sin capture
fotoFuenteGaleria.addEventListener('click', () => {
  fotoPoseModal.style.display = 'none';
  fotoPoseModal.classList.add('hidden');
  fotoFileGaleria.click();
});

// ── Modal de crop ───────────────────────────────────────

const fotoCropModal    = document.getElementById('foto-crop-modal');
const cropImagen       = document.getElementById('crop-imagen');
const btnCropCancelar  = document.getElementById('btn-crop-cancelar');
const btnCropConfirmar = document.getElementById('btn-crop-confirmar');
const btnCropRotar     = document.getElementById('btn-crop-rotar');
const btnCropReset     = document.getElementById('btn-crop-reset');

let cropperInstance = null;

function abrirCropModal(imageSrc) {
  cropImagen.src = imageSrc;
  fotoCropModal.style.display = 'flex';
  fotoCropModal.classList.remove('hidden');

  // Inicializar cropper después de que la imagen cargue
  cropImagen.onload = () => {
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
    // Pequeño delay para que el layout flex del modal termine de calcular dimensiones
    setTimeout(() => {
      cropperInstance = new Cropper(cropImagen, {
        viewMode: 2,        // La imagen cubre el contenedor sin dejar huecos, ajustando al área visible
        autoCropArea: 0.95, // Área de crop inicial: 95% de la imagen
        aspectRatio: NaN,   // Libre
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: false,
        responsive: true,
        checkOrientation: true,
        guides: true,
        center: true,
        highlight: false,
        background: true,
        modal: true,
      });
    }, 50);
  };
}

function cerrarCropModal() {
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
  fotoCropModal.style.display = 'none';
  fotoCropModal.classList.add('hidden');
  cropImagen.src = '';
  fotoMesSubida = null;
  fotoPoseSeleccionada = null;
}

btnCropCancelar.addEventListener('click', cerrarCropModal);

btnCropRotar.addEventListener('click', () => {
  if (cropperInstance) cropperInstance.rotate(90);
});

btnCropReset.addEventListener('click', () => {
  if (cropperInstance) cropperInstance.reset();
});

btnCropConfirmar.addEventListener('click', async () => {
  if (!cropperInstance || !fotoPoseSeleccionada || !fotoMesSubida) return;

  // Deshabilitar botón mientras procesa
  btnCropConfirmar.textContent = '...';
  btnCropConfirmar.style.opacity = '0.5';

  try {
    // Obtener canvas recortado y comprimido
    const canvas = cropperInstance.getCroppedCanvas({
      maxWidth: 1200,
      maxHeight: 1200,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    const mesGuardado = fotoMesSubida;
    await guardarFoto(fotoMesSubida, fotoPoseSeleccionada, base64);

    cerrarCropModal();
    await renderGaleriaFotos();

    // Si estamos en modo comparación, refrescar
    if (fotosCompararView.style.display !== 'none') {
      await renderComparacion();
    }

    const toast = document.createElement('div');
    toast.textContent = `✓ Guardada en ${formatearMes(mesGuardado)}`;
    toast.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:#1A1A1A; color:#C8F135; border:1px solid #2A2A2A;
      padding:10px 20px; border-radius:999px; font-size:13px; font-weight:600;
      z-index:9999; white-space:nowrap;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  } catch (err) {
    console.error('[Crop] Error:', err);
    btnCropConfirmar.textContent = 'Guardar';
    btnCropConfirmar.style.opacity = '1';
  }
});

// Procesar archivo seleccionado — abre el crop. Compartido por ambos inputs (cámara y galería).
function procesarArchivoFoto(e) {
  const file = e.target.files[0];
  e.target.value = ''; // Reset para permitir volver a elegir el mismo archivo

  if (!file || !fotoPoseSeleccionada || !fotoMesSubida) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    abrirCropModal(ev.target.result);
  };
  reader.onerror = () => {
    const toast = document.createElement('div');
    toast.textContent = '✗ Error al leer la imagen';
    toast.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:#1A1A1A; color:#FF4D4D; border:1px solid #FF4D4D;
      padding:10px 20px; border-radius:999px; font-size:13px;
      z-index:9999; white-space:nowrap;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };
  reader.readAsDataURL(file);
}

fotoFileCamara.addEventListener('change', procesarArchivoFoto);
fotoFileGaleria.addEventListener('change', procesarArchivoFoto);

// ── Vista comparación ───────────────────────────────────

function mostrarVistaGaleria() {
  fotosGaleriaView.classList.remove('hidden');
  fotosCompararView.classList.add('hidden');
  fotosCompararView.style.display = 'none';
  fotosGaleriaView.style.display = 'block';
  btnCompararFotos.style.color = '#6B6B6B';
  btnCompararFotos.style.borderColor = '#2A2A2A';
}

async function mostrarVistaComparar() {
  fotosGaleriaView.classList.add('hidden');
  fotosGaleriaView.style.display = 'none';
  fotosCompararView.classList.remove('hidden');
  fotosCompararView.style.display = 'flex';
  btnCompararFotos.style.color = '#C8F135';
  btnCompararFotos.style.borderColor = '#C8F135';

  await inicializarComparador();
}

async function inicializarComparador() {
  const todas = await obtenerTodasLasFotos();

  if (!todas.length) {
    compararImgA.innerHTML = `<p class="text-muted text-sm text-center p-4">Sin fotos registradas</p>`;
    compararImgB.innerHTML = `<p class="text-muted text-sm text-center p-4">Sin fotos registradas</p>`;
    return;
  }

  // Poblar selectores
  const options = todas.map(r =>
    `<option value="${r.fecha}">${formatearMes(r.fecha)}</option>`
  ).join('');
  compararMesA.innerHTML = options;
  compararMesB.innerHTML = options;

  // Por defecto: A = mes más reciente, B = penúltimo (si existe)
  compararMesA.value = todas[todas.length - 1].fecha;
  compararMesB.value = todas.length >= 2 ? todas[todas.length - 2].fecha : todas[0].fecha;

  await renderComparacion();
}

async function renderComparacion() {
  const mesA = compararMesA.value;
  const mesB = compararMesB.value;
  const pose = comparadorPoseActual;

  const regA = await obtenerFotosPorMes(mesA);
  const regB = await obtenerFotosPorMes(mesB);

  compararLabelA.textContent = formatearMes(mesA);
  compararLabelB.textContent = formatearMes(mesB);

  const renderSlot = (reg, mes) => {
    if (reg && reg[pose]) {
      return `<img src="data:image/jpeg;base64,${reg[pose]}"
        alt="${POSES_LABELS[pose]}"
        style="width:100%; height:100%; object-fit:cover; display:block;" />`;
    }
    return `<div class="flex flex-col items-center justify-center gap-2 p-4" style="height:100%;">
      <p class="text-muted text-xs text-center">Sin foto</p>
      <button class="comp-agregar-btn px-3 py-2 rounded-xl text-xs font-600"
        data-mes="${mes}" data-pose="${pose}"
        style="background:#2A2A2A; color:#6B6B6B; border:none;">+ Agregar</button>
    </div>`;
  };

  compararImgA.innerHTML = renderSlot(regA, mesA);
  compararImgB.innerHTML = renderSlot(regB, mesB);

  // Listeners botones agregar desde comparador
  document.querySelectorAll('.comp-agregar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      iniciarSubidaFoto(btn.dataset.mes, btn.dataset.pose);
    });
  });
}

// Cambios en selectores y pose del comparador
compararMesA.addEventListener('change', renderComparacion);
compararMesB.addEventListener('change', renderComparacion);

fotoPoseBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    comparadorPoseActual = btn.dataset.pose;
    fotoPoseBtns.forEach(b => {
      b.style.background = '#1A1A1A';
      b.style.color = '#6B6B6B';
      b.style.border = '1px solid #2A2A2A';
    });
    btn.style.background = '#C8F135';
    btn.style.color = '#0D0D0D';
    btn.style.border = 'none';
    await renderComparacion();
  });
});

btnCompararFotos.addEventListener('click', mostrarVistaComparar);
btnCerrarComparar.addEventListener('click', mostrarVistaGaleria);

// ─────────────────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────────────────

const dashMesSelector      = document.getElementById('dash-mes-selector');
const dashEmpty            = document.getElementById('dash-empty');
const dashContenido        = document.getElementById('dash-contenido');
const dashPesoActual       = document.getElementById('dash-peso-actual');
const dashPesoDelta        = document.getElementById('dash-peso-delta');
const dashPesoChartEmpty   = document.getElementById('dash-peso-chart-empty');
const dashMediciones       = document.getElementById('dash-mediciones');
const dashMacros           = document.getElementById('dash-macros');
const dashPRs              = document.getElementById('dash-prs');
const dashFatiga           = document.getElementById('dash-fatiga');
const dashNotasContainer   = document.getElementById('dash-notas-container');
const dashNotasTexto       = document.getElementById('dash-notas-texto');
const dashFotos            = document.getElementById('dash-fotos');
const btnGenerarInforme    = document.getElementById('btn-generar-informe');
const informeModal         = document.getElementById('informe-modal');
const informeTexto         = document.getElementById('informe-texto');
const btnInformeCerrar     = document.getElementById('btn-informe-cerrar');
const btnInformeCopiar     = document.getElementById('btn-informe-copiar');

let dashChart = null;
let dashMesActivo = mesActual();

async function initDashboard() {
  // Poblar selector de meses con todos los meses que tienen algún dato
  await poblarSelectorMeses();
  dashMesActivo = dashMesSelector.value || mesActual();
  await renderDashboard(dashMesActivo);
}

async function poblarSelectorMeses() {
  // Recopilar todos los meses únicos de todos los stores
  const [pesos, meds, checkins] = await Promise.all([
    obtenerTodosLosPesos(),
    obtenerTodasLasMediciones(),
    obtenerTodosLosCheckins(),
  ]);

  const mesesSet = new Set();

  // De pesos: extraer meses únicos
  pesos.forEach(r => mesesSet.add(r.fecha.slice(0, 7)));
  meds.forEach(r => mesesSet.add(r.fecha));
  checkins.forEach(r => mesesSet.add(r.fecha));

  // Siempre incluir el mes actual
  mesesSet.add(mesActual());

  const meses = [...mesesSet].sort().reverse();

  dashMesSelector.innerHTML = meses.map(m =>
    `<option value="${m}">${formatearMes(m)}</option>`
  ).join('');

  dashMesSelector.value = meses[0] || mesActual();
}

dashMesSelector.addEventListener('change', async () => {
  dashMesActivo = dashMesSelector.value;
  await renderDashboard(dashMesActivo);
});

async function renderDashboard(mes) {
  const ajustes = cargarAjustes();
  const mesAnt  = mesAnterior(mes);

  // ── Peso ──────────────────────────────────────────────
  const mediaActual   = await mediaMovilHastaMes(mes);
  const mediaAnterior = await mediaMovilHastaMes(mesAnt);

  if (mediaActual === null) {
    dashEmpty.classList.remove('hidden');
    dashContenido.style.display = 'none';
    return;
  }
  dashEmpty.classList.add('hidden');
  dashContenido.style.display = 'block';

  dashPesoActual.textContent = mediaActual.toFixed(1);

  if (mediaAnterior !== null) {
    const diff = mediaActual - mediaAnterior;
    const dir  = colorFlechaPeso(diff, ajustes.objetivo);
    const signo = diff > 0 ? '+' : '';
    const color = dir === 'mejor' ? '#C8F135' : dir === 'peor' ? '#FF4D4D' : '#6B6B6B';
    const flecha = diff > 0.3 ? '↑' : diff < -0.3 ? '↓' : '→';
    dashPesoDelta.innerHTML = `<span style="color:${color};">${flecha} ${signo}${diff.toFixed(1)} kg</span>`;
  } else {
    dashPesoDelta.textContent = '—';
  }

  // Mini gráfico 3 meses
  await renderDashMiniChart(mes);

  // ── Macros ────────────────────────────────────────────
  const promedioMacrosDash = await calcularPromedioMacrosMes(mes);

  if (promedioMacrosDash.diasConDato > 0) {
    const p = promedioMacrosDash;
    dashMacros.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <span class="text-muted text-xs">Promedio diario</span>
        <span class="text-muted text-xs">${p.diasConDato} de ${p.diasTotales} días registrados</span>
      </div>
      <div class="grid gap-2" style="grid-template-columns:1fr 1fr 1fr;">
        <div class="rounded-xl p-3" style="background:#0D0D0D;">
          <p class="text-muted text-xs mb-1">Proteína</p>
          <p class="text-text font-700">${p.proteina ?? '—'}<span class="text-muted font-400 text-xs"> g</span></p>
        </div>
        <div class="rounded-xl p-3" style="background:#0D0D0D;">
          <p class="text-muted text-xs mb-1">Carbos</p>
          <p class="text-text font-700">${p.carbos ?? '—'}<span class="text-muted font-400 text-xs"> g</span></p>
        </div>
        <div class="rounded-xl p-3" style="background:#0D0D0D;">
          <p class="text-muted text-xs mb-1">Grasas</p>
          <p class="text-text font-700">${p.grasas ?? '—'}<span class="text-muted font-400 text-xs"> g</span></p>
        </div>
      </div>`;
  } else {
    dashMacros.innerHTML = `<p class="text-muted text-sm">Sin registros de macros este mes.</p>`;
  }

  // ── Mediciones ────────────────────────────────────────
  const medActual   = await obtenerMedicionPorMes(mes);
  const medAnterior = await obtenerMedicionPorMes(mesAnt);

  if (medActual) {
    const dCintura   = medAnterior ? calcularDeltaMedicion(medAnterior.cintura,       medActual.cintura,       'cintura') : { valor: null, direccion: 'neutral' };
    const dBrazoRel  = medAnterior ? calcularDeltaMedicion(medAnterior.brazoRelajado, medActual.brazoRelajado, 'brazo')   : { valor: null, direccion: 'neutral' };
    const dBrazoCont = medAnterior ? calcularDeltaMedicion(medAnterior.brazoCont,     medActual.brazoCont,     'brazo')   : { valor: null, direccion: 'neutral' };

    dashMediciones.innerHTML = `
      <div class="grid gap-2" style="grid-template-columns:1fr 1fr 1fr;">
        <div class="rounded-xl p-3" style="background:#0D0D0D;">
          <p class="text-muted text-xs mb-1">Cintura</p>
          <p class="text-text font-700">${medActual.cintura.toFixed(1)} <span class="text-muted text-xs font-400">cm</span></p>
          <p class="text-xs mt-1">${renderDeltaFlecha(dCintura)}</p>
        </div>
        <div class="rounded-xl p-3" style="background:#0D0D0D;">
          <p class="text-muted text-xs mb-1">B.Relajado</p>
          <p class="text-text font-700">${medActual.brazoRelajado.toFixed(1)} <span class="text-muted text-xs font-400">cm</span></p>
          <p class="text-xs mt-1">${renderDeltaFlecha(dBrazoRel)}</p>
        </div>
        <div class="rounded-xl p-3" style="background:#0D0D0D;">
          <p class="text-muted text-xs mb-1">B.Contraído</p>
          <p class="text-text font-700">${medActual.brazoCont.toFixed(1)} <span class="text-muted text-xs font-400">cm</span></p>
          <p class="text-xs mt-1">${renderDeltaFlecha(dBrazoCont)}</p>
        </div>
      </div>
      ${medActual.muslo !== null ? `
      <div class="rounded-xl p-3 mt-2" style="background:#0D0D0D;">
        <p class="text-muted text-xs mb-1">Muslo derecho</p>
        <p class="text-text font-700">${medActual.muslo.toFixed(1)} <span class="text-muted text-xs font-400">cm</span></p>
        ${medAnterior?.muslo !== null ? `<p class="text-xs mt-1">${renderDeltaFlecha(calcularDeltaMedicion(medAnterior.muslo, medActual.muslo, 'muslo'))}</p>` : ''}
      </div>` : ''}`;
  } else {
    dashMediciones.innerHTML = `<p class="text-muted text-sm">Sin medición registrada para este mes.</p>`;
  }

  // ── PRs ───────────────────────────────────────────────
  const ciActual   = await obtenerCheckinPorMes(mes);
  const ciAnterior = await obtenerCheckinPorMes(mesAnt);

  if (ciActual) {
    const dBanca     = calcularDeltaPR(ciAnterior?.banca,     ciActual.banca);
    const dDominadas = calcularDeltaPR(ciAnterior?.dominadas, ciActual.dominadas);
    const dRdl       = calcularDeltaPR(ciAnterior?.rdl,       ciActual.rdl);

    dashPRs.innerHTML = `
      <div class="grid gap-2" style="grid-template-columns:1fr 1fr 1fr;">
        ${renderPRCard('Banca', ciActual.banca, dBanca)}
        ${renderPRCard('Dominadas', ciActual.dominadas, dDominadas)}
        ${renderPRCard('RDL', ciActual.rdl, dRdl)}
      </div>`;
  } else {
    dashPRs.innerHTML = `<p class="text-muted text-sm">Sin check-in registrado para este mes.</p>`;
  }

  // ── Fatiga ────────────────────────────────────────────
  if (ciActual?.fatiga !== null && ciActual?.fatiga !== undefined) {
    const dFatiga = calcularDeltaFatiga(ciAnterior?.fatiga ?? null, ciActual.fatiga);
    dashFatiga.innerHTML = `
      <div class="flex items-center gap-4">
        <span class="text-text font-800" style="font-size:2rem; letter-spacing:-0.02em;">${ciActual.fatiga}</span>
        <span class="text-muted font-500">/10</span>
        <span class="text-sm ml-auto">${renderDeltaFlecha(dFatiga, '')}</span>
      </div>
      ${renderBarraFatiga(ciActual.fatiga)}
      ${ciActual.pasos !== null && ciActual.pasos !== undefined ? `
      <div class="mt-3 pt-3" style="border-top:1px solid #2A2A2A;">
        <span class="text-muted text-xs">Pasos/día: </span>
        <span class="text-text font-700">${ciActual.pasos.toLocaleString('es-ES')}</span>
        ${ciAnterior?.pasos !== null && ciAnterior?.pasos !== undefined ? `
        <span class="text-muted text-xs ml-2">(anterior: ${ciAnterior.pasos.toLocaleString('es-ES')})</span>` : ''}
      </div>` : ''}`;
  } else if (ciActual?.pasos !== null && ciActual?.pasos !== undefined) {
    dashFatiga.innerHTML = `
      <span class="text-muted text-xs">Pasos/día: </span>
      <span class="text-text font-700">${ciActual.pasos.toLocaleString('es-ES')}</span>
      ${ciAnterior?.pasos !== null && ciAnterior?.pasos !== undefined ? `
      <span class="text-muted text-xs ml-2">(anterior: ${ciAnterior.pasos.toLocaleString('es-ES')})</span>` : ''}`;
  } else {
    dashFatiga.innerHTML = `<p class="text-muted text-sm">Sin fatiga registrada para este mes.</p>`;
  }

  // ── Notas del check-in ───────────────────────────────
  if (ciActual?.notas) {
    dashNotasContainer.classList.remove('hidden');
    dashNotasTexto.textContent = ciActual.notas;
  } else {
    dashNotasContainer.classList.add('hidden');
    dashNotasTexto.textContent = '';
  }

  // ── Fotos ─────────────────────────────────────────────
  const fotosActual   = await obtenerFotosPorMes(mes);
  const fotosAnterior = await obtenerFotosPorMes(mesAnt);

  if (fotosActual || fotosAnterior) {
    const thumbActual   = fotosActual   ? POSES.find(p => fotosActual[p])   : null;
    const thumbAnterior = fotosAnterior ? POSES.find(p => fotosAnterior[p]) : null;

    dashFotos.innerHTML = `
      <div class="grid gap-3 mb-3" style="grid-template-columns:1fr 1fr;">
        <div>
          <p class="text-muted text-xs mb-2 text-center">${formatearMes(mes)}</p>
          <div class="rounded-xl overflow-hidden flex items-center justify-center"
            style="aspect-ratio:3/4; background:#0D0D0D;">
            ${thumbActual
              ? `<img src="data:image/jpeg;base64,${fotosActual[thumbActual]}"
                  style="width:100%; height:100%; object-fit:cover;" />`
              : `<p class="text-muted text-xs">Sin foto</p>`}
          </div>
        </div>
        <div>
          <p class="text-muted text-xs mb-2 text-center">${formatearMes(mesAnt)}</p>
          <div class="rounded-xl overflow-hidden flex items-center justify-center"
            style="aspect-ratio:3/4; background:#0D0D0D;">
            ${thumbAnterior
              ? `<img src="data:image/jpeg;base64,${fotosAnterior[thumbAnterior]}"
                  style="width:100%; height:100%; object-fit:cover;" />`
              : `<p class="text-muted text-xs">Sin foto</p>`}
          </div>
        </div>
      </div>
      <button id="dash-btn-comparar"
        class="w-full py-3 rounded-xl text-sm font-600 transition-all active:scale-95"
        style="background:#1A1A1A; border:1px solid #2A2A2A; color:#6B6B6B;">
        Ver comparación completa →
      </button>`;

    document.getElementById('dash-btn-comparar')?.addEventListener('click', () => {
      navegarA('fotos');
      setTimeout(mostrarVistaComparar, 100);
    });
  } else {
    dashFotos.innerHTML = `<p class="text-muted text-sm">Sin fotos registradas para este período.</p>`;
  }
}

async function renderDashMiniChart(mes) {
  const datos = await obtenerPesos3Meses(mes);

  if (datos.length < 2) {
    dashPesoChartEmpty.style.display = 'flex';
    if (dashChart) { dashChart.destroy(); dashChart = null; }
    return;
  }
  dashPesoChartEmpty.style.display = 'none';

  const labels  = datos.map(r => r.fecha);
  const medias  = datos.map(r => r.mediaMovil);

  if (dashChart) {
    dashChart.data.labels = labels;
    dashChart.data.datasets[0].data = medias;
    dashChart.update('active');
    return;
  }

  const ctx = document.getElementById('dash-peso-chart').getContext('2d');
  dashChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: medias,
        borderColor: '#C8F135',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(200, 241, 53, 0.08)',
        spanGaps: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        zoom: { pan: { enabled: false }, zoom: { pinch: { enabled: false }, wheel: { enabled: false } } },
      },
      scales: {
        x: { display: false },
        y: { display: false, grace: '10%' },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────
//  INFORME MARKDOWN
// ─────────────────────────────────────────────────────────

function signo(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

function flechaTexto(diff, umbral) {
  if (Math.abs(diff) < umbral) return '→';
  return diff > 0 ? '↑' : '↓';
}

async function generarInformeMarkdown(mes) {
  const ajustes    = cargarAjustes();
  const mesAnt     = mesAnterior(mes);
  const nombreMes  = formatearMes(mes);
  const hoyStr     = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  const [
    mediaActual, mediaAnterior,
    medActual, medAnterior,
    ciActual, ciAnterior,
    fotosActual,
    promedioMacros,
  ] = await Promise.all([
    mediaMovilHastaMes(mes),
    mediaMovilHastaMes(mesAnt),
    obtenerMedicionPorMes(mes),
    obtenerMedicionPorMes(mesAnt),
    obtenerCheckinPorMes(mes),
    obtenerCheckinPorMes(mesAnt),
    obtenerFotosPorMes(mes),
    calcularPromedioMacrosMes(mes),
  ]);

  const lineas = [];

  // ── Cabecera ──────────────────────────────────────────
  lineas.push(`# INFORME DE CHECK-IN MENSUAL — ${nombreMes}`);
  lineas.push(`**Generado:** ${hoyStr}`);
  lineas.push(`**Objetivo del ciclo:** ${ajustes.objetivo === 'masa' ? 'Ganar masa' : ajustes.objetivo === 'definicion' ? 'Definición' : 'Mantenimiento'}`);
  lineas.push('');

  // ── Peso ──────────────────────────────────────────────
  lineas.push('## PESO');
  if (mediaActual !== null) {
    lineas.push(`- **Media 7 días (este mes):** ${mediaActual.toFixed(1)} kg`);
    if (mediaAnterior !== null) {
      const diff = +(mediaActual - mediaAnterior).toFixed(1);
      lineas.push(`- **Media 7 días (mes anterior):** ${mediaAnterior.toFixed(1)} kg`);
      lineas.push(`- **Delta:** ${signo(diff)} kg ${flechaTexto(diff, 0.3)}`);
    } else {
      lineas.push(`- **Media 7 días (mes anterior):** Sin datos`);
    }
  } else {
    lineas.push(`- Sin registros de peso para este mes.`);
  }
  lineas.push('');

  // ── Mediciones ────────────────────────────────────────
  lineas.push('## MEDICIONES');
  if (medActual) {
    const dCin  = medAnterior ? +(medActual.cintura       - medAnterior.cintura).toFixed(1)       : null;
    const dBRel = medAnterior ? +(medActual.brazoRelajado - medAnterior.brazoRelajado).toFixed(1) : null;
    const dBCon = medAnterior ? +(medActual.brazoCont     - medAnterior.brazoCont).toFixed(1)     : null;
    const dMus  = (medActual.muslo !== null && medAnterior?.muslo !== null)
      ? +(medActual.muslo - medAnterior.muslo).toFixed(1) : null;

    lineas.push(`- **Cintura:**         ${medActual.cintura.toFixed(1)} cm${dCin  !== null ? `  (Δ ${signo(dCin)} cm ${flechaTexto(-dCin, 0.5)})` : ''}`);
    lineas.push(`- **Brazo relajado:**  ${medActual.brazoRelajado.toFixed(1)} cm${dBRel !== null ? `  (Δ ${signo(dBRel)} cm ${flechaTexto(dBRel, 0.1)})` : ''}`);
    lineas.push(`- **Brazo contraído:** ${medActual.brazoCont.toFixed(1)} cm${dBCon !== null ? `  (Δ ${signo(dBCon)} cm ${flechaTexto(dBCon, 0.1)})` : ''}`);
    if (medActual.muslo !== null) {
      lineas.push(`- **Muslo derecho:**   ${medActual.muslo.toFixed(1)} cm${dMus !== null ? `  (Δ ${signo(dMus)} cm ${flechaTexto(dMus, 0.1)})` : ''}`);
    }
  } else {
    lineas.push(`- Sin mediciones registradas para este mes.`);
  }
  lineas.push('');

  // ── PRs ───────────────────────────────────────────────
  lineas.push('## MARCAS PERSONALES');
  if (ciActual && (ciActual.banca !== null || ciActual.dominadas !== null || ciActual.rdl !== null)) {
    const prLinea = (nombre, val, valAnt) => {
      if (val === null) return null;
      const diff = valAnt !== null ? +(val - valAnt).toFixed(1) : null;
      return `- **${nombre}:** ${val} kg${diff !== null ? `  (Δ ${signo(diff)} kg ${flechaTexto(diff, 1)})` : ''}`;
    };
    const l1 = prLinea('Press de Banca', ciActual.banca,     ciAnterior?.banca     ?? null);
    const l2 = prLinea('Dominadas',      ciActual.dominadas, ciAnterior?.dominadas ?? null);
    const l3 = prLinea('RDL',            ciActual.rdl,       ciAnterior?.rdl       ?? null);
    if (l1) lineas.push(l1);
    if (l2) lineas.push(l2);
    if (l3) lineas.push(l3);
  } else {
    lineas.push(`- Sin check-in registrado para este mes.`);
  }
  lineas.push('');

  // ── Fatiga ────────────────────────────────────────────
  lineas.push('## FATIGA SUBJETIVA');
  if (ciActual?.fatiga !== null && ciActual?.fatiga !== undefined) {
    lineas.push(`- **Este mes:**     ${ciActual.fatiga}/10`);
    if (ciAnterior?.fatiga !== null && ciAnterior?.fatiga !== undefined) {
      lineas.push(`- **Mes anterior:** ${ciAnterior.fatiga}/10`);
    }
  } else {
    lineas.push(`- Sin dato de fatiga para este mes.`);
  }
  lineas.push('');

  // ── Pasos ─────────────────────────────────────────────
  if (ciActual?.pasos !== null && ciActual?.pasos !== undefined) {
    lineas.push('## PASOS DIARIOS (media mensual)');
    lineas.push(`- **Este mes:**     ${ciActual.pasos.toLocaleString('es-ES')} pasos/día`);
    if (ciAnterior?.pasos !== null && ciAnterior?.pasos !== undefined) {
      lineas.push(`- **Mes anterior:** ${ciAnterior.pasos.toLocaleString('es-ES')} pasos/día`);
    }
    lineas.push('');
  }

  // ── Macros ────────────────────────────────────────────
  if (promedioMacros.diasConDato > 0) {
    lineas.push('## MACROS (promedio días registrados)');
    lineas.push(`- **Días con registro:** ${promedioMacros.diasConDato} de ${promedioMacros.diasTotales}`);
    if (promedioMacros.proteina !== null) lineas.push(`- **Proteína:**      ${promedioMacros.proteina} g/día`);
    if (promedioMacros.carbos   !== null) lineas.push(`- **Carbohidratos:** ${promedioMacros.carbos} g/día`);
    if (promedioMacros.grasas   !== null) lineas.push(`- **Grasas:**        ${promedioMacros.grasas} g/día`);
    lineas.push('');
  }

  // ── Fotos ─────────────────────────────────────────────
  lineas.push('## FOTOS');
  const posesConFoto = fotosActual ? POSES.filter(p => fotosActual[p]) : [];
  if (posesConFoto.length > 0) {
    lineas.push(`- Adjuntas: ${posesConFoto.map(p => POSES_LABELS[p]).join(', ')}`);
  } else {
    lineas.push(`- No adjuntas este mes.`);
  }
  lineas.push('');

  // ── Notas ─────────────────────────────────────────────
  if (ciActual?.notas) {
    lineas.push('## NOTAS DEL MES');
    lineas.push(ciActual.notas);
    lineas.push('');
  }

  return lineas.join('\n');
}

// Event listeners del informe
btnGenerarInforme.addEventListener('click', async () => {
  const md = await generarInformeMarkdown(dashMesActivo);
  informeTexto.textContent = md;
  informeModal.style.display = 'flex';
  informeModal.classList.remove('hidden');
});

btnInformeCerrar.addEventListener('click', () => {
  informeModal.style.display = 'none';
  informeModal.classList.add('hidden');
});

btnInformeCopiar.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(informeTexto.textContent);
    btnInformeCopiar.textContent = '✓ Copiado';
    btnInformeCopiar.style.background = '#8AAD20';
    setTimeout(() => {
      btnInformeCopiar.textContent = 'Copiar';
      btnInformeCopiar.style.background = '#C8F135';
    }, 2000);
  } catch {
    // Fallback para browsers que bloquean clipboard sin interacción
    const range = document.createRange();
    range.selectNode(informeTexto);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    mostrarToast('Seleccioná el texto y copiá manualmente', '#6B6B6B');
  }
});

// ─────────────────────────────────────────────────────────
//  AJUSTES
// ─────────────────────────────────────────────────────────

const ajusteObjetivoBtns  = document.querySelectorAll('.ajuste-objetivo');
const btnExportarJSON      = document.getElementById('btn-exportar-json');
const btnImportarJSON      = document.getElementById('btn-importar-json');
const importFileInput      = document.getElementById('import-file-input');
const importConfirmModal   = document.getElementById('import-confirm-modal');
const importConfirmInfo    = document.getElementById('import-confirm-info');
const btnImportCancelar    = document.getElementById('btn-import-cancelar');
const btnImportConfirmar   = document.getElementById('btn-import-confirmar');
const exportIncluirFotos   = document.getElementById('export-incluir-fotos');

let importDatosPendientes = null;

function initAjustesScreen() {
  const ajustes = cargarAjustes();
  // Marcar el radio correcto
  ajusteObjetivoBtns.forEach(radio => {
    radio.checked = radio.value === ajustes.objetivo;
  });
}

// Cambio de objetivo — guardar inmediatamente
ajusteObjetivoBtns.forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.checked) {
      const ajustes = cargarAjustes();
      ajustes.objetivo = radio.value;
      guardarAjustes(ajustes);
      mostrarToast('✓ Objetivo actualizado', '#C8F135');
    }
  });
});

// Exportar JSON
btnExportarJSON.addEventListener('click', async () => {
  const incluirFotos = exportIncluirFotos.checked;
  btnExportarJSON.textContent = 'Exportando...';
  btnExportarJSON.style.opacity = '0.6';

  try {
    const datos = await exportarDatos(incluirFotos);
    const json  = JSON.stringify(datos, null, 2);
    const blob  = new Blob([json], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().slice(0, 10);
    const a     = document.createElement('a');
    a.href     = url;
    a.download = `bodytracker-backup-${fecha}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarToast('✓ Backup descargado', '#C8F135');
  } catch (err) {
    console.error('[Export] Error:', err);
    mostrarToast('✗ Error al exportar', '#FF4D4D');
  } finally {
    btnExportarJSON.textContent = 'Exportar datos';
    btnExportarJSON.style.opacity = '1';
  }
});

// Importar JSON — seleccionar archivo
btnImportarJSON.addEventListener('click', () => importFileInput.click());

importFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  importFileInput.value = '';
  if (!file) return;

  try {
    const texto = await file.text();
    const datos = JSON.parse(texto);

    if (!datos.version || !datos.Registro_Peso) {
      mostrarToast('✗ Archivo inválido', '#FF4D4D');
      return;
    }

    importDatosPendientes = datos;

    // Mostrar modal de confirmación con resumen
    const nPesos     = datos.Registro_Peso?.length ?? 0;
    const nMeds      = datos.Mediciones_Corporales?.length ?? 0;
    const nCheckins  = datos.Checkin_Mensual?.length ?? 0;
    const nFotos     = datos.Fotos_Progreso?.length ?? 0;
    const fechaExport = datos.exportadoEn
      ? new Date(datos.exportadoEn).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'fecha desconocida';

    importConfirmInfo.innerHTML = `
      Backup del <strong style="color:#F0F0F0;">${fechaExport}</strong><br>
      ${nPesos} registros de peso · ${nMeds} mediciones · ${nCheckins} check-ins · ${nFotos} meses de fotos`;

    importConfirmModal.style.display = 'flex';
    importConfirmModal.classList.remove('hidden');
  } catch (err) {
    mostrarToast('✗ Error al leer el archivo', '#FF4D4D');
  }
});

btnImportCancelar.addEventListener('click', () => {
  importConfirmModal.style.display = 'none';
  importConfirmModal.classList.add('hidden');
  importDatosPendientes = null;
});

btnImportConfirmar.addEventListener('click', async () => {
  if (!importDatosPendientes) return;

  btnImportConfirmar.textContent = 'Importando...';
  btnImportConfirmar.style.opacity = '0.6';

  try {
    await importarDatos(importDatosPendientes);
    importConfirmModal.style.display = 'none';
    importConfirmModal.classList.add('hidden');
    importDatosPendientes = null;
    mostrarToast('✓ Datos importados correctamente', '#C8F135');

    // Refrescar la pantalla de peso
    await initPesoScreen();
  } catch (err) {
    console.error('[Import] Error:', err);
    mostrarToast('✗ Error al importar los datos', '#FF4D4D');
  } finally {
    btnImportConfirmar.textContent = 'Importar';
    btnImportConfirmar.style.opacity = '1';
  }
});

// Botón ajustes del header de peso
document.getElementById('btn-settings').addEventListener('click', () => {
  navegarA('ajustes');
});

// Botón cerrar ajustes
document.getElementById('btn-cerrar-ajustes').addEventListener('click', () => {
  navegarA('peso');
});

// ─────────────────────────────────────────────────────────
//  UTILIDAD: TOAST GENÉRICO
// ─────────────────────────────────────────────────────────

function mostrarToast(texto, color = '#C8F135') {
  const toast = document.createElement('div');
  toast.textContent = texto;
  toast.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    background:#1A1A1A; color:${color}; border:1px solid #2A2A2A;
    padding:10px 20px; border-radius:999px; font-size:13px; font-weight:600;
    z-index:9999; white-space:nowrap; pointer-events:none;`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ─────────────────────────────────────────────────────────
//  SERVICE WORKER
// ─────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('[SW] Error al registrar:', err);
    });
  });
}

// ─────────────────────────────────────────────────────────
//  INICIALIZACIÓN
// ─────────────────────────────────────────────────────────

// Navegar a peso como pantalla inicial y marcarla activa
navegarA('peso');
