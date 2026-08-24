// =====================================================
// ASISTENCIA MGP V2
// FRONTEND - GITHUB
// =====================================================


// =====================================================
// CONFIGURACIÓN
// =====================================================

const CONFIG = {

  API_URL:
    'https://script.google.com/macros/s/AKfycbxN9HfZTc4fpp3YIqUGh0kz4mc8xoo1doAD8ilbCJOVS_31m1rX0o1xg77p6jjzhFdn/exec'

};


// =====================================================
// ESTADO GENERAL
// =====================================================

const state = {

  tipo: 'estudiante',

  estado: 'INGRESO',

  qr: null,

  camara: false,

  persona: null

};


// =====================================================
// ESTADO DE CÁMARA
// =====================================================

const cameraState = {

  reader: null,

  cameras: [],

  currentIndex: 0,

  activa: false,

  // En móviles no confiamos en los deviceId
  // porque el teléfono puede exponerlos con
  // etiquetas/mapeos incorrectos.
  esMovil: false,

  facingMode: 'environment',

  // V6: cámara móvil nativa
  mobileCameras: [],
  mobileStream: null,
  mobileVideo: null,
  mobileDetector: null,
  mobileScanActivo: false,
  procesandoQR: false

};


// =====================================================
// NAVEGACIÓN
// =====================================================

const vistas = [

  'portal',
  'consulta',
  'login',
  'panel',
  'registro',
  'reportes',
  'carnets',
  'admin'

];


function mostrarVista(nombre) {

  vistas.forEach(function(vista) {

    const elemento =
      document.getElementById(vista);

    if (elemento) {

      elemento.classList.toggle(
        'active',
        vista === nombre
      );

    }

  });


  if (nombre !== 'registro') {

    detenerCamara();

  }


  window.scrollTo(0, 0);

}


// =====================================================
// NAVEGACIÓN
// COMPATIBLE CON data-v Y data-view
// =====================================================

document
  .querySelectorAll('[data-v], [data-view]')
  .forEach(function(boton) {

    boton.addEventListener(
      'click',
      function() {

        const destino =
          boton.dataset.v ||
          boton.dataset.view;

        if (destino) {

          mostrarVista(destino);

        }

      }
    );

  });

// =====================================================
// BOTÓN INICIO
// =====================================================

const homeBtn =
  document.getElementById('home');

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
  document.getElementById('salir');

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
// LOGIN
// =====================================================

const entrarBtn =
  document.getElementById('entrar') ||
  document.getElementById('entrarBtn');

if (entrarBtn) {

  entrarBtn.addEventListener(
    'click',
    function() {

      const usuarioElemento =
        document.getElementById('usuario');

      const passwordElemento =
        document.getElementById('password');

      const mensaje =
        document.getElementById('loginMsg');

      const usuario =
        usuarioElemento
          ? usuarioElemento.value.trim()
          : '';

      const password =
        passwordElemento
          ? passwordElemento.value.trim()
          : '';

      if (!usuario || !password) {

        if (mensaje) {
          mensaje.textContent =
            'Ingrese usuario y contraseña.';
        }

        return;
      }

      if (mensaje) {
        mensaje.textContent =
          'Acceso de prueba V2.';
      }

      mostrarVista('panel');

    }
  );

}

// =====================================================
// TIPO DE PERSONA
// =====================================================

document
  .querySelectorAll('[data-t]')
  .forEach(function(boton) {

    boton.addEventListener(
      'click',
      function() {

        document
          .querySelectorAll('[data-t]')
          .forEach(function(b) {

            b.classList.remove('on');

          });


        boton.classList.add('on');

        state.tipo =
          boton.dataset.t;

      }
    );

  });


// =====================================================
// INGRESO / SALIDA
// =====================================================

document
  .querySelectorAll('[data-e]')
  .forEach(function(boton) {

    boton.addEventListener(
      'click',
      function() {

        document
          .querySelectorAll('[data-e]')
          .forEach(function(b) {

            b.classList.remove('on');

          });


        boton.classList.add('on');

        state.estado =
          boton.dataset.e;

      }
    );

  });


// =====================================================
// MENSAJE DE CÁMARA
// =====================================================

function mensajeCamara(texto) {

  const elemento =
    document.getElementById(
      'camMsg'
    );


  if (elemento) {

    elemento.textContent =
      texto;

  }

}


// =====================================================
// DETECTAR DISPOSITIVO MÓVIL
// =====================================================

function esDispositivoMovil() {

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent);

}


// =====================================================
// CARGAR CÁMARAS
// =====================================================

async function cargarCamaras() {

  try {

    mensajeCamara(
      '🔍 Buscando cámaras disponibles...'
    );


    if (
      typeof Html5Qrcode ===
      'undefined'
    ) {

      throw new Error(
        'No se cargó la biblioteca del lector QR.'
      );

    }


    // =================================================
    // DETECTAR SI ESTAMOS EN MÓVIL / TABLETA
    // =================================================

    cameraState.esMovil =
      esDispositivoMovil();


    // =================================================
    // OBTENER CÁMARAS REALES
    //
    // En móvil las consultamos para comprobar que
    // existe acceso a cámara, pero NO usamos sus IDs
    // para decidir frontal/trasera.
    // =================================================

    cameraState.cameras =
      await Html5Qrcode.getCameras();


    if (
      !cameraState.cameras ||
      cameraState.cameras.length === 0
    ) {

      throw new Error(
        'No se encontró ninguna cámara.'
      );

    }


    const selector =
      document.getElementById(
        'cameraSelect'
      );


    if (selector) {

      selector.innerHTML = '';


      if (cameraState.esMovil) {

        // ---------------------------------------------
        // MÓVIL / TABLETA
        // ---------------------------------------------
        // No mostramos camera 0, 1, 2, 3 porque en
        // nuestro teléfono esos IDs no corresponden
        // correctamente a frontal/trasera.
        // Usaremos facingMode.
        // ---------------------------------------------

        const frontal =
          document.createElement('option');

        frontal.value =
          'user';

        frontal.textContent =
          '📱 Cámara frontal';

        selector.appendChild(
          frontal
        );


        const trasera =
          document.createElement('option');

        trasera.value =
          'environment';

        trasera.textContent =
          '📷 Cámara trasera';

        selector.appendChild(
          trasera
        );


        // Para asistencia QR dejamos la trasera
        // como cámara inicial SOLO la primera vez.
        //
        // IMPORTANTE:
        // No debemos volver a poner "environment"
        // cada vez que iniciarCamara() llama a
        // cargarCamaras(), porque eso anulaba la
        // selección "user" del botón Cambiar cámara.

        if (
          cameraState.facingMode !== 'user' &&
          cameraState.facingMode !== 'environment'
        ) {

          cameraState.facingMode =
            'environment';

        }


        selector.value =
          cameraState.facingMode;

      }
      else {

        // ---------------------------------------------
        // PC / ESCRITORIO
        // ---------------------------------------------
        // Aquí conservamos el comportamiento que ya
        // comprobamos que funciona correctamente:
        // seleccionar por deviceId.
        // ---------------------------------------------

        cameraState.cameras.forEach(
          function(camera, index) {

            const opcion =
              document.createElement(
                'option'
              );


            opcion.value =
              index;


            opcion.textContent =
              camera.label ||
              `Cámara ${index + 1}`;


            selector.appendChild(
              opcion
            );

          }
        );


        let indicePreferido = 0;


        for (
          let i = 0;
          i < cameraState.cameras.length;
          i++
        ) {

          const nombre =
            String(
              cameraState.cameras[i].label || ''
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


        selector.value =
          indicePreferido;

      }

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
      cameraState.esMovil
        ? '📱 Cámara móvil lista. Se usará frontal/trasera mediante el modo de cámara.'
        : `${cameraState.cameras.length} cámara(s) disponible(s).`
    );


    return true;

  }
  catch (error) {

    console.error(
      'Error enumerando cámaras:',
      error
    );


    mensajeCamara(
      '❌ No fue posible obtener las cámaras: ' +
      error.message
    );


    return false;

  }

}


// =====================================================
// IDENTIFICAR QR EN BACKEND
// =====================================================

async function identificarQRBackend(
  codigoQR
) {

  const mensaje =
    document.getElementById(
      'regMsg'
    );


  try {

    if (!codigoQR) {

      throw new Error(
        'El código QR está vacío.'
      );

    }


    if (mensaje) {

      mensaje.textContent =
        '🔄 Consultando estudiante...';

    }


    const parametros =
      new URLSearchParams({

        accion:
          'identificarQR',

        codigoQR:
          codigoQR

      });


    const url =
      CONFIG.API_URL +
      '?' +
      parametros.toString();


    console.log(
      'Consultando API:',
      url
    );


    const respuesta =
      await fetch(
        url,
        {
          method: 'GET',
          cache: 'no-store'
        }
      );


    if (!respuesta.ok) {

      throw new Error(
        'El servidor respondió HTTP ' +
        respuesta.status
      );

    }


    const resultado =
      await respuesta.json();


    console.log(
      'Respuesta API QR V2:',
      resultado
    );


    // =================================================
    // QR NO IDENTIFICADO
    // =================================================

    if (!resultado.ok) {

      if (mensaje) {

        mensaje.textContent =
          '❌ ' +
          (
            resultado.mensaje ||
            'No se pudo identificar el QR.'
          );

      }


      return resultado;

    }


    // =================================================
    // GUARDAR PERSONA IDENTIFICADA
    // =================================================

    state.persona =
      resultado;


    // =================================================
    // LEGACY 2026
    // =================================================

    if (
      resultado.tipoQR ===
      'LEGACY_2026'
      &&
      resultado.estudiante
    ) {

      const estudiante =
        resultado.estudiante;


      if (mensaje) {

        mensaje.innerHTML =

          '<strong>✅ ESTUDIANTE IDENTIFICADO</strong><br>' +

          'DNI: ' +
          estudiante.dni +
          '<br>' +

          estudiante.apellidoPaterno +
          ' ' +

          estudiante.apellidoMaterno +
          ' ' +

          estudiante.nombres +
          '<br>' +

          'Grado: ' +
          estudiante.grado +
          ' ' +
          estudiante.seccion +
          '<br>' +

          'Turno: ' +
          estudiante.turno;

      }

    }


    // =================================================
    // QR V2
    // =================================================

    else if (
      resultado.tipoQR ===
      'MGP_V2'
    ) {

      if (mensaje) {

        mensaje.innerHTML =

          '<strong>✅ QR V2 IDENTIFICADO</strong><br>' +

          'ID: ' +
          resultado.identificador;

      }

    }


    else {

      if (mensaje) {

        mensaje.textContent =
          '✅ QR identificado correctamente.';

      }

    }


    return resultado;

  }
  catch (error) {

    console.error(
      'Error consultando API QR V2:',
      error
    );


    if (mensaje) {

      mensaje.textContent =
        '❌ No se pudo comunicar con el servidor: ' +
        error.message;

    }


    return {

      ok: false,

      mensaje:
        error.message

    };

  }

}


// =====================================================
// CÁMARA — ARQUITECTURA RECUPERADA DE ASISTENCIAV1
// =====================================================
//
// Esta es la arquitectura que ya funcionó en el proyecto
// anterior:
//
//   camaraFrontal = false  -> environment (trasera)
//   camaraFrontal = true   -> user        (frontal)
//
// En móvil NO usamos:
//   - getCameras() para decidir frontal/trasera
//   - deviceId
//   - enumerateDevices()
//   - BarcodeDetector
//   - detección de cámaras
//
// html5-qrcode recibe directamente el facingMode.
// =====================================================

let camaraFrontal = false;


// =====================================================
// ASEGURAR BOTÓN CAMBIAR CÁMARA
// =====================================================
//
// V1 tenía este control visible en móvil.
// En V9 la lógica cambiarCamara() estaba presente,
// pero el botón no se creó si no existía en el HTML.
//
// Para no obligar a modificar index.html, lo creamos
// automáticamente junto al botón DETENER CÁMARA.
// =====================================================

function asegurarBotonCambiarCamara() {

  let boton =
    document.getElementById(
      'switchCamBtn'
    );

  if (boton) {
    return boton;
  }

  const stopCamBtn =
    document.getElementById(
      'stopCamBtn'
    );

  if (!stopCamBtn || !stopCamBtn.parentElement) {
    return null;
  }

  boton =
    document.createElement('button');

  boton.type =
    'button';

  boton.id =
    'switchCamBtn';

  boton.className =
    'btn';

  boton.textContent =
    '🔄 CAMBIAR CÁMARA';

  boton.style.background =
    '#2563eb';

  boton.style.display =
    'none';

  boton.style.width =
    '100%';

  boton.style.marginTop =
    '7px';

  boton.style.padding =
    '12px';

  boton.style.border =
    'none';

  boton.style.borderRadius =
    '7px';

  boton.style.color =
    'white';

  boton.style.fontWeight =
    'bold';

  boton.style.cursor =
    'pointer';

  boton.onclick =
    cambiarCamara;

  stopCamBtn.parentElement.insertBefore(
    boton,
    stopCamBtn.nextSibling
  );

  return boton;
}


// =====================================================
// INICIAR CÁMARA
// =====================================================

async function iniciarCamara() {

  if (cameraState.activa) {

    mensajeCamara(
      '📷 La cámara ya está activa.'
    );

    return;

  }


  cameraState.esMovil =
    esDispositivoMovil();


  const reader =
    document.getElementById('reader-container');

  const camBtn =
    document.getElementById('btn-camera');

  const stopCamBtn =
    document.getElementById('btn-stop');

  // Recuperamos el botón de cambio de cámara de V1.
  const switchCamBtn =
    asegurarBotonCambiarCamara();


  try {

    if (!reader) {

      throw new Error(
        'No existe el contenedor de cámara #reader.'
      );

    }


    if (
      typeof Html5Qrcode ===
      'undefined'
    ) {

      throw new Error(
        'No se cargó la biblioteca html5-qrcode.'
      );

    }


    mensajeCamara(
      '🔍 Solicitando acceso a la cámara...'
    );


    reader.innerHTML = '';


    cameraState.reader =
      new Html5Qrcode(
        'reader'
      );


    // =================================================
    // LA MISMA LÓGICA QUE FUNCIONÓ EN ASISTENCIAV1
    // =================================================

    const facingMode =
      camaraFrontal
        ? 'user'
        : 'environment';


    await cameraState.reader.start(

      {
        facingMode:
          facingMode
      },

      {

        fps: 10,

        qrbox:
          function(
            viewfinderWidth,
            viewfinderHeight
          ) {

            const size =
              Math.min(
                viewfinderWidth,
                viewfinderHeight
              ) * 0.70;


            return {

              width:
                size,

              height:
                size

            };

          },

        aspectRatio:
          1.0

      },

      async function(decodedText) {

        if (
          cameraState.procesandoQR
        ) {

          return;

        }


        cameraState.procesandoQR =
          true;

        state.qr =
          decodedText;


        mensajeCamara(
          '✅ QR leído. Consultando servidor...'
        );


        await detenerCamara();


        await identificarQRBackend(
          decodedText
        );


        cameraState.procesandoQR =
          false;

      },

      function(errorMessage) {

        // Los errores normales de búsqueda QR
        // no se muestran continuamente.

      }

    );


    cameraState.activa =
      true;

    state.camara =
      true;

    cameraState.procesandoQR =
      false;


    mensajeCamara(

      camaraFrontal

        ? '🤳 Cámara frontal activa. Apunte al código QR.'

        : '📷 Cámara trasera activa. Apunte al código QR.'

    );


    if (camBtn) {

      camBtn.disabled =
        true;

    }


    if (stopCamBtn) {

      stopCamBtn.style.display =
        'block';

    }


    // El cambio de cámara tiene sentido
    // principalmente en celulares/tablets.

    if (switchCamBtn) {

      switchCamBtn.style.display =
        cameraState.esMovil
          ? 'block'
          : 'none';

    }


    const selector =
      document.getElementById(
        'cameraSelect'
      );


    if (selector) {

      selector.value =
        facingMode;

    }

  }
  catch (error) {

    console.error(
      'Error al iniciar cámara:',
      error
    );


    cameraState.activa =
      false;

    state.camara =
      false;


    if (cameraState.reader) {

      try {

        await cameraState.reader.clear();

      }
      catch (clearError) {

        console.warn(
          'No fue necesario limpiar el lector:',
          clearError
        );

      }

    }


    cameraState.reader =
      null;


    if (camBtn) {

      camBtn.disabled =
        false;

    }


    mensajeCamara(

      '❌ No se pudo iniciar la cámara: ' +
      error.name +
      ' — ' +
      error.message

    );

  }

}


// =====================================================
// CAMBIAR CÁMARA
// =====================================================
//
// Esta es la lógica utilizada en AsistenciaV1:
//
//   false -> true
//   true  -> false
//
// y luego se vuelve a iniciar html5-qrcode con:
//   environment <-> user
// =====================================================

async function cambiarCamara() {

  if (!cameraState.activa) {

    mensajeCamara(
      'Primero active la cámara.'
    );

    return;

  }


  const switchCamBtn =
    document.getElementById(
      'switchCamBtn'
    );


  try {

    if (switchCamBtn) {

      switchCamBtn.disabled =
        true;

    }


    mensajeCamara(
      '🔄 Cambiando cámara...'
    );


    if (cameraState.reader) {

      try {

        await cameraState.reader.stop();

      }
      catch (error) {

        console.log(
          'La cámara ya estaba detenida.'
        );

      }


      try {

        await cameraState.reader.clear();

      }
      catch (error) {

        console.log(
          'No fue necesario limpiar el lector.'
        );

      }

    }


    cameraState.reader =
      null;

    cameraState.activa =
      false;

    state.camara =
      false;


    // AQUÍ está la conmutación real V1.
    camaraFrontal =
      !camaraFrontal;


    const selector =
      document.getElementById(
        'cameraSelect'
      );


    if (selector) {

      selector.value =
        camaraFrontal
          ? 'user'
          : 'environment';

    }


    await iniciarCamara();

  }
  catch (error) {

    console.error(
      'Error al cambiar cámara:',
      error
    );


    cameraState.activa =
      false;


    mensajeCamara(
      '❌ No se pudo cambiar la cámara: ' +
      error.name +
      ' — ' +
      error.message
    );

  }
  finally {

    if (switchCamBtn) {

      switchCamBtn.disabled =
        false;

    }

  }

}


// =====================================================
// SELECTOR DE CÁMARA
// =====================================================

const cameraSelect =
  document.getElementById(
    'cameraSelect'
  );


if (cameraSelect) {

  cameraSelect.addEventListener(

    'change',

    async function() {

      if (
        this.value !== 'user' &&
        this.value !== 'environment'
      ) {

        return;

      }


      const nuevaCamaraFrontal =
        this.value === 'user';


      if (
        nuevaCamaraFrontal ===
        camaraFrontal
      ) {

        return;

      }


      camaraFrontal =
        nuevaCamaraFrontal;


      if (cameraState.activa) {

        await cambiarCamara();

      }
      else {

        mensajeCamara(

          camaraFrontal

            ? '📱 Cámara frontal seleccionada.'

            : '📷 Cámara trasera seleccionada.'

        );

      }

    }

  );

}


// =====================================================
// DETENER CÁMARA
// =====================================================

async function detenerCamara() {

  if (cameraState.reader) {

    try {

      if (cameraState.activa) {

        await cameraState.reader.stop();

      }

    }
    catch (error) {

      console.warn(
        'Error deteniendo lector:',
        error
      );

    }


    try {

      await cameraState.reader.clear();

    }
    catch (error) {

      console.warn(
        'Error limpiando lector:',
        error
      );

    }

  }


  cameraState.reader =
    null;

  cameraState.activa =
    false;

  cameraState.procesandoQR =
    false;

  state.camara =
    false;


  const camBtn =
    document.getElementById(
      'camBtn'
    );

  if (camBtn) {

    camBtn.disabled =
      false;

  }


  const stopCamBtn =
    document.getElementById(
      'stopCamBtn'
    );

  if (stopCamBtn) {

    stopCamBtn.style.display =
      'block';

  }


  mensajeCamara(
    'Cámara detenida.'
  );

}


// =====================================================
// BOTÓN ACTIVAR CÁMARA
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
// BOTÓN DETENER CÁMARA
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
//
// Si index.html ya lo contiene, conectamos el evento.
// Si no lo contiene, iniciarCamara() lo creará
// automáticamente mediante asegurarBotonCambiarCamara().
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
    'consultar'
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
        'Consulta V2 preparada para conexión segura al servidor.';

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
