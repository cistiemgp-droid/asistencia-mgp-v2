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

  facingMode: 'environment'

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
        // como cámara inicial.
        cameraState.facingMode =
          'environment';


        selector.value =
          'environment';

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
// INICIAR CÁMARA
// =====================================================

async function iniciarCamara() {

  if (cameraState.activa) {

    mensajeCamara(
      '📷 La cámara ya está activa.'
    );

    return;

  }


  const camarasOK =
    await cargarCamaras();


  if (!camarasOK) {

    return;

  }


  try {

    cameraState.reader =
      new Html5Qrcode(
        'reader'
      );


    // En móvil usamos facingMode.
    // En PC mantenemos deviceId.
    const fuenteCamara =
      cameraState.esMovil
        ? {
            facingMode: {
              exact:
                cameraState.facingMode
            }
          }
        : (
            cameraState.cameras[
              cameraState.currentIndex
            ] || {}
          ).id;


    if (!fuenteCamara) {

      throw new Error(
        'No se pudo seleccionar la cámara.'
      );

    }


    try {

      await cameraState.reader.start(

        fuenteCamara,

        {

        fps: 10,

        qrbox: {

          width: 240,

          height: 240

        },

        aspectRatio: 1.0

      },


      // =================================================
      // QR LEÍDO
      // =================================================

      async function(decodedText) {

        // Evitamos procesar múltiples
        // lecturas simultáneas.

        if (cameraState.procesandoQR) {

          return;

        }


        cameraState.procesandoQR =
          true;


        state.qr =
          decodedText;


        mensajeCamara(
          '✅ QR leído. Consultando servidor...'
        );


        // Detener cámara antes de
        // consultar el backend.

        await detenerCamara();


        // =================================================
        // ENVIAR QR AL BACKEND
        // =================================================

        await identificarQRBackend(
          decodedText
        );


        cameraState.procesandoQR =
          false;

      },


      // =================================================
      // ERRORES NORMALES DEL LECTOR
      // =================================================

      function(errorMessage) {

        // No mostramos los errores normales
        // de búsqueda de QR continuamente.

      }

    );

    }
    catch (errorCamara) {

      // Algunos navegadores móviles no aceptan
      // facingMode exact aunque sí soporten user/
      // environment. Reintentamos sin exact.
      if (
        cameraState.esMovil &&
        errorCamara &&
        (
          errorCamara.name === 'OverconstrainedError' ||
          errorCamara.name === 'NotReadableError'
        )
      ) {

        console.warn(
          'Reintentando cámara móvil sin exact:',
          errorCamara
        );


        await cameraState.reader.stop().catch(
          function() {}
        );


        const fuenteAlternativa = {
          facingMode:
            cameraState.facingMode
        };


        await cameraState.reader.start(

          fuenteAlternativa,

          {

            fps: 10,

            qrbox: {

              width: 240,

              height: 240

            },

            aspectRatio: 1.0

          },


          async function(decodedText) {

            if (cameraState.procesandoQR) {

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

            // Errores normales de búsqueda QR.

          }

        );

      }
      else {

        throw errorCamara;

      }

    }


    cameraState.activa =
      true;


    cameraState.procesandoQR =
      false;


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
        cameraState.esMovil
          ? false
          : cameraState.cameras.length < 2;

    }

  }
  catch (error) {

    console.error(
      'Error iniciando cámara:',
      error
    );


    cameraState.activa =
      false;


    cameraState.procesandoQR =
      false;


    state.camara =
      false;


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

async function cambiarCamara() {

  // ===================================================
  // MÓVIL / TABLETA
  // ===================================================

  if (cameraState.esMovil) {

    cameraState.facingMode =
      cameraState.facingMode === 'environment'
        ? 'user'
        : 'environment';


    const selector =
      document.getElementById(
        'cameraSelect'
      );


    if (selector) {

      selector.value =
        cameraState.facingMode;

    }


    const nombre =
      cameraState.facingMode === 'user'
        ? '📱 Cámara frontal'
        : '📷 Cámara trasera';


    if (cameraState.activa) {

      await detenerCamara();

      await iniciarCamara();

    }
    else {

      mensajeCamara(
        'Cámara seleccionada: ' +
        nombre
      );

    }


    return;

  }


  // ===================================================
  // PC / ESCRITORIO
  // ===================================================

  if (
    cameraState.cameras.length < 2
  ) {

    mensajeCamara(
      'Solo hay una cámara disponible.'
    );

    return;

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


  if (cameraState.activa) {

    await detenerCamara();

    await iniciarCamara();

  }
  else {

    mensajeCamara(

      'Cámara seleccionada: ' +

      (
        cameraState.cameras[
          cameraState.currentIndex
        ].label ||

        `Cámara ${
          cameraState.currentIndex + 1
        }`

      )

    );

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

      if (cameraState.esMovil) {

        if (
          this.value === 'user' ||
          this.value === 'environment'
        ) {

          cameraState.facingMode =
            this.value;

        }

      }
      else {

        cameraState.currentIndex =
          Number(this.value);

      }


      if (cameraState.activa) {

        await detenerCamara();

        await iniciarCamara();

      }
      else {

        mensajeCamara(
          cameraState.esMovil
            ? (
                this.value === 'user'
                  ? '📱 Cámara frontal seleccionada.'
                  : '📷 Cámara trasera seleccionada.'
              )
            : 'Cámara seleccionada.'
        );

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


  cameraState.procesandoQR =
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
