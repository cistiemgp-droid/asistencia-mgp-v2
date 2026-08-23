// =====================================================
// ASISTENCIA MGP V2
// FRONTEND - GITHUB PAGES
// =====================================================

const state = {
  tipo: 'estudiante',
  estado: 'INGRESO',
  qr: null,
  camara: false
};


// =====================================================
// ESTADO DE CÁMARA
// =====================================================

const cameraState = {
  reader: null,
  cameras: [],
  currentIndex: 0,
  activa: false
};


// =====================================================
// MOSTRAR VISTA
// =====================================================

function mostrarVista(id) {

  document
    .querySelectorAll('.view')
    .forEach(function(vista) {

      vista.classList.toggle(
        'active',
        vista.id === id
      );

    });

  if (id !== 'registro') {
    detenerCamara();
  }

  window.scrollTo(0, 0);
}


// =====================================================
// NAVEGACIÓN
// =====================================================

document
  .querySelectorAll('[data-view]')
  .forEach(function(boton) {

    boton.addEventListener(
      'click',
      function() {

        mostrarVista(
          boton.dataset.view
        );

      }
    );

  });


// =====================================================
// BOTÓN INICIO
// =====================================================

const homeBtn =
  document.getElementById('homeBtn');

if (homeBtn) {

  homeBtn.addEventListener(
    'click',
    function() {

      mostrarVista('portal');

    }
  );

}


// =====================================================
// BOTÓN SALIR
// =====================================================

const salirBtn =
  document.getElementById('salirBtn');

if (salirBtn) {

  salirBtn.addEventListener(
    'click',
    function() {

      detenerCamara();

      mostrarVista('portal');

    }
  );

}


// =====================================================
// LOGIN TEMPORAL
// =====================================================

const entrarBtn =
  document.getElementById('entrarBtn');

if (entrarBtn) {

  entrarBtn.addEventListener(
    'click',
    function() {

      const usuario =
        document
          .getElementById('usuario')
          .value
          .trim();

      const password =
        document
          .getElementById('password')
          .value
          .trim();

      const mensaje =
        document.getElementById('loginMsg');

      if (!usuario || !password) {

        mensaje.textContent =
          'Ingrese usuario y contraseña.';

        return;

      }

      mensaje.textContent =
        'Acceso de prueba V2. La autenticación real se conectará al backend.';

      mostrarVista('panel');

    }
  );

}


// =====================================================
// TIPO DE PERSONA
// =====================================================

document
  .querySelectorAll('[data-tipo]')
  .forEach(function(boton) {

    boton.addEventListener(
      'click',
      function() {

        document
          .querySelectorAll('[data-tipo]')
          .forEach(function(b) {

            b.classList.remove('active');

          });

        boton.classList.add('active');

        state.tipo =
          boton.dataset.tipo;

      }
    );

  });


// =====================================================
// ESTADO INGRESO / SALIDA
// =====================================================

document
  .querySelectorAll('[data-estado]')
  .forEach(function(boton) {

    boton.addEventListener(
      'click',
      function() {

        document
          .querySelectorAll('[data-estado]')
          .forEach(function(b) {

            b.classList.remove('active');

          });

        boton.classList.add('active');

        state.estado =
          boton.dataset.estado;

      }
    );

  });


// =====================================================
// MENSAJE DE CÁMARA
// =====================================================

function mensajeCamara(texto) {

  const elemento =
    document.getElementById('camMsg');

  if (elemento) {

    elemento.textContent =
      texto;

  }

}


// =====================================================
// OBTENER CÁMARAS
// =====================================================

async function cargarCamaras() {

  mensajeCamara(
    '🔍 Detectando cámaras disponibles...'
  );


  try {

    if (
      typeof Html5Qrcode ===
      'undefined'
    ) {

      throw new Error(
        'La biblioteca html5-qrcode no está disponible.'
      );

    }


    const camaras =
      await Html5Qrcode.getCameras();


    if (
      !camaras ||
      camaras.length === 0
    ) {

      throw new Error(
        'No se encontró ninguna cámara.'
      );

    }


    cameraState.cameras =
      camaras;


    const selector =
      document.getElementById(
        'cameraSelect'
      );


    if (selector) {

      selector.innerHTML = '';

      camaras.forEach(
        function(camara, indice) {

          const opcion =
            document.createElement(
              'option'
            );

          opcion.value =
            indice;

          opcion.textContent =
            camara.label ||
            `Cámara ${indice + 1}`;

          selector.appendChild(
            opcion
          );

        }
      );

    }


    // =================================================
    // BUSCAR CÁMARA TRASERA
    // =================================================

    let indicePreferido = 0;


    for (
      let i = 0;
      i < camaras.length;
      i++
    ) {

      const nombre =
        String(
          camaras[i].label || ''
        ).toLowerCase();


      if (
        nombre.includes('back') ||
        nombre.includes('rear') ||
        nombre.includes('trasera') ||
        nombre.includes('posterior')
      ) {

        indicePreferido =
          i;

        break;

      }

    }


    cameraState.currentIndex =
      indicePreferido;


    if (selector) {

      selector.value =
        indicePreferido;

    }


    const controles =
      document.getElementById(
        'camera-controls'
      );


    if (controles) {

      controles.style.display =
        'block';

    }


    mensajeCamara(
      `${camaras.length} cámara(s) disponible(s).`
    );


    return true;

  }
  catch (error) {

    console.error(
      'Error obteniendo cámaras:',
      error
    );


    mensajeCamara(
      '❌ No fue posible obtener las cámaras: ' +
      error.name +
      ' — ' +
      error.message
    );


    return false;

  }

}


// =====================================================
// ACTIVAR CÁMARA
// =====================================================

async function iniciarCamara() {

  if (cameraState.activa) {

    mensajeCamara(
      '📷 La cámara ya está activa.'
    );

    return;

  }


  const correcto =
    await cargarCamaras();


  if (!correcto) {

    return;

  }


  try {

    const camara =
      cameraState.cameras[
        cameraState.currentIndex
      ];


    if (!camara) {

      throw new Error(
        'No se pudo seleccionar una cámara.'
      );

    }


    cameraState.reader =
      new Html5Qrcode(
        'reader'
      );


    mensajeCamara(
      '📷 Iniciando cámara...'
    );


    await cameraState.reader.start(

      camara.id,

      {
        fps: 10,

        qrbox: {
          width: 250,
          height: 250
        },

        aspectRatio: 1.0

      },


      function(decodedText) {

        state.qr =
          decodedText;


        mensajeCamara(
          '✅ QR leído correctamente.'
        );


        const mensaje =
          document.getElementById(
            'regMsg'
          );


        if (mensaje) {

          mensaje.textContent =
            'QR leído: ' +
            decodedText;

        }


        detenerCamara();

      },


      function(errorMessage) {

        // Los errores normales de búsqueda
        // de QR no se muestran.

      }

    );


    cameraState.activa =
      true;

    state.camara =
      true;


    mensajeCamara(
      '📷 Cámara activa. Apunte al QR del carnet.'
    );


    const boton =
      document.getElementById(
        'camBtn'
      );


    if (boton) {

      boton.disabled =
        true;

    }


    const cambiar =
      document.getElementById(
        'switchCamBtn'
      );


    if (cambiar) {

      cambiar.disabled =
        cameraState.cameras.length < 2;

    }

  }
  catch (error) {

    console.error(
      'Error iniciando cámara:',
      error
    );


    cameraState.activa =
      false;

    state.camara =
      false;


    mensajeCamara(
      '❌ No se pudo iniciar la cámara: ' +
      error.name +
      ' — ' +
      error.message
    );


    if (cameraState.reader) {

      try {

        await cameraState.reader.clear();

      }
      catch (e) {

        console.warn(e);

      }

    }


    cameraState.reader =
      null;

  }

}


// =====================================================
// CAMBIAR CÁMARA
// =====================================================

async function cambiarCamara() {

  if (
    cameraState.cameras.length < 2
  ) {

    mensajeCamara(
      'Solo hay una cámara disponible.'
    );

    return;

  }


  const estabaActiva =
    cameraState.activa;


  if (estabaActiva) {

    await detenerCamara();

  }


  cameraState.currentIndex =
    (
      cameraState.currentIndex + 1
    ) %
    cameraState.cameras.length;


  const selector =
    document.getElementById(
      'cameraSelect'
    );


  if (selector) {

    selector.value =
      cameraState.currentIndex;

  }


  const camara =
    cameraState.cameras[
      cameraState.currentIndex
    ];


  mensajeCamara(
    '🔄 Cámara seleccionada: ' +
    (
      camara.label ||
      `Cámara ${cameraState.currentIndex + 1}`
    )
  );


  if (estabaActiva) {

    await iniciarCamara();

  }

}


// =====================================================
// CAMBIAR CÁMARA DESDE SELECTOR
// =====================================================

const cameraSelect =
  document.getElementById(
    'cameraSelect'
  );


if (cameraSelect) {

  cameraSelect.addEventListener(
    'change',
    async function() {

      const estabaActiva =
        cameraState.activa;


      if (estabaActiva) {

        await detenerCamara();

      }


      cameraState.currentIndex =
        Number(
          this.value
        );


      if (estabaActiva) {

        await iniciarCamara();

      }

    }
  );

}


// =====================================================
// DETENER CÁMARA
// =====================================================

async function detenerCamara() {

  try {

    if (cameraState.reader) {

      if (cameraState.activa) {

        await cameraState.reader.stop();

      }


      await cameraState.reader.clear();

    }

  }
  catch (error) {

    console.warn(
      'Error deteniendo cámara:',
      error
    );

  }


  cameraState.reader =
    null;

  cameraState.activa =
    false;

  state.camara =
    false;


  const boton =
    document.getElementById(
      'camBtn'
    );


  if (boton) {

    boton.disabled =
      false;

  }


  mensajeCamara(
    'Cámara detenida.'
  );

}


// =====================================================
// BOTÓN ACTIVAR
// =====================================================

const camBtn =
  document.getElementById(
    'camBtn'
  );


if (camBtn) {

  camBtn.addEventListener(
    'click',
    iniciarCamara
  );

}


// =====================================================
// BOTÓN DETENER
// =====================================================

const stopCamBtn =
  document.getElementById(
    'stopCamBtn'
  );


if (stopCamBtn) {

  stopCamBtn.addEventListener(
    'click',
    detenerCamara
  );

}


// =====================================================
// BOTÓN CAMBIAR CÁMARA
// =====================================================

const switchCamBtn =
  document.getElementById(
    'switchCamBtn'
  );


if (switchCamBtn) {

  switchCamBtn.addEventListener(
    'click',
    cambiarCamara
  );

}


// =====================================================
// CONSULTA PÚBLICA
// =====================================================

const consultarBtn =
  document.getElementById(
    'consultarBtn'
  );


if (consultarBtn) {

  consultarBtn.addEventListener(
    'click',
    function() {

      const dni =
        document
          .getElementById(
            'dniConsulta'
          )
          .value
          .trim();


      const clave =
        document
          .getElementById(
            'claveConsulta'
          )
          .value
          .trim();


      const mensaje =
        document.getElementById(
          'consultaMsg'
        );


      if (!dni || !clave) {

        mensaje.textContent =
          'Ingrese DNI y código de consulta.';

        return;

      }


      mensaje.textContent =
        'Consulta frontend lista para conectarse al backend.';

    }
  );

}


// =====================================================
// REGISTRO EXCEPCIONAL POR DNI
// =====================================================

const dniBtn =
  document.getElementById(
    'dniBtn'
  );


if (dniBtn) {

  dniBtn.addEventListener(
    'click',
    function() {

      const dni =
        document
          .getElementById(
            'dniManual'
          )
          .value
          .trim();


      const mensaje =
        document.getElementById(
          'regMsg'
        );


      if (!dni) {

        mensaje.textContent =
          'Ingrese el DNI.';

        return;

      }


      mensaje.textContent =
        'Registro excepcional por DNI preparado. ' +
        'Método: DNI.';

    }
  );

}


// =====================================================
// INICIO
// =====================================================

console.log(
  'Asistencia MGP V2 - Frontend cargado correctamente.'
);
