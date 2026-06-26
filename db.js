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
