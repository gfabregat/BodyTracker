// ═══════════════════════════════════════════════════════════
//  app.js — Lógica principal de la aplicación
//  Body Tracker PWA · Fase 1
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
//  NAVEGACIÓN
// ─────────────────────────────────────────────────────────

const screens = {
  peso:       document.getElementById('screen-peso'),
  mediciones: document.getElementById('screen-mediciones'),
  checkin:    document.getElementById('screen-checkin'),
  fotos:      document.getElementById('screen-fotos'),
  dashboard:  document.getElementById('screen-dashboard'),
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

  // Si vamos a dashboard, quitar badge
  if (tab === 'dashboard') {
    ocultarDashboardBadge();
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
  const notas     = inputCiNotas.value.trim() || null;

  // Al menos un campo debe tener dato
  if (banca === null && dominadas === null && rdl === null && fatiga === null && !notas) {
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
  await guardarCheckin(mes, { banca, dominadas, rdl, fatiga, notas });

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
const fotoFileInput      = document.getElementById('foto-file-input');
const fotoPoseModal      = document.getElementById('foto-pose-modal');
const fotoModalMes       = document.getElementById('foto-modal-mes');
const fotoPoseCancelar   = document.getElementById('foto-pose-cancelar');
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
                   <span style="font-size:10px;">${POSES_LABELS[pose]}</span>
                 </button>
               </div>`
          }
          ${tieneFoto
            ? `<button class="foto-eliminar-btn absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                 data-mes="${reg.fecha}" data-pose="${pose}"
                 style="background:rgba(0,0,0,0.7); border:none; color:#F0F0F0; font-size:12px; line-height:1;">✕</button>`
            : ''}
          <p class="text-center text-muted mt-1" style="font-size:10px;">${POSES_LABELS[pose]}</p>
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
 * Inicia el flujo de subida de foto.
 * Si se pasa pose, la usa directamente (desde botón de pose vacía).
 * Si no se pasa pose, abre el modal de selección.
 */
function iniciarSubidaFoto(mes, poseDirecta = null) {
  fotoMesSubida = mes || mesActual();
  fotoPoseSeleccionada = poseDirecta;

  if (poseDirecta) {
    // Ir directo al selector de archivo
    fotoFileInput.click();
  } else {
    // Abrir modal de selección de pose primero
    fotoModalMes.textContent = formatearMes(fotoMesSubida);
    fotoPoseModal.style.display = 'flex';
    fotoPoseModal.classList.remove('hidden');
  }
}

// Botón "+ Foto" del header
btnNuevaFoto.addEventListener('click', () => {
  iniciarSubidaFoto(mesActual(), null);
});

// Cancelar modal de pose
fotoPoseCancelar.addEventListener('click', () => {
  fotoPoseModal.style.display = 'none';
  fotoPoseModal.classList.add('hidden');
  fotoMesSubida = null;
  fotoPoseSeleccionada = null;
});

// Seleccionar pose en el modal
document.querySelectorAll('.foto-pose-select').forEach(btn => {
  btn.addEventListener('click', () => {
    fotoPoseSeleccionada = btn.dataset.pose;
    fotoPoseModal.style.display = 'none';
    fotoPoseModal.classList.add('hidden');
    fotoFileInput.click();
  });
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
    cropperInstance = new Cropper(cropImagen, {
      viewMode: 1,        // La imagen no puede salir del contenedor
      autoCropArea: 0.9,  // Área de crop inicial: 90% de la imagen
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
    await guardarFoto(fotoMesSubida, fotoPoseSeleccionada, base64);

    cerrarCropModal();
    await renderGaleriaFotos();

    // Si estamos en modo comparación, refrescar
    if (fotosCompararView.style.display !== 'none') {
      await renderComparacion();
    }

    const toast = document.createElement('div');
    toast.textContent = '✓ Foto guardada';
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

// Procesar archivo seleccionado — ahora abre el crop en lugar de guardar directo
fotoFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  fotoFileInput.value = '';

  if (!file || !fotoPoseSeleccionada || !fotoMesSubida) return;

  // Leer el archivo como Data URL para pasarlo al cropper
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
});

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
//  AJUSTES (placeholder — Fase 5)
// ─────────────────────────────────────────────────────────

document.getElementById('btn-settings').addEventListener('click', () => {
  // TODO Fase 5: abrir pantalla de ajustes
  const toast = document.createElement('div');
  toast.textContent = 'Ajustes disponibles en Fase 5';
  toast.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: #1A1A1A; color: #6B6B6B; border: 1px solid #2A2A2A;
    padding: 10px 20px; border-radius: 999px; font-size: 13px;
    z-index: 9999; white-space: nowrap;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
});

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
