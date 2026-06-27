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
