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
// CÁMARA MÓVIL NATIVA V6
// =====================================================
//
// En V2-V5 usamos html5-qrcode para abrir la cámara
// móvil mediante facingMode/deviceId.
//
// En este teléfono ya comprobamos que esa ruta no
// distingue correctamente la cámara frontal.
//
// V6 cambia de estrategia:
// 1. El navegador obtiene los dispositivos reales.
// 2. Cada dispositivo se prueba con getUserMedia().
// 3. Se clasifica por track.getSettings().facingMode.
// 4. La cámara móvil se muestra en un <video> nativo.
// 5. Si BarcodeDetector existe, se usa para leer QR.
//
// El PC conserva html5-qrcode.
// =====================================================

async function prepararCamarasMovil() {

  if (!cameraState.esMovil) {
    return true;
  }

  try {

    mensajeCamara(
      '🔍 Detectando cámaras reales del teléfono...'
    );

    // Solicitar permiso una sola vez para que
    // enumerateDevices() entregue etiquetas.
    let permisoStream = null;

    try {

      permisoStream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });

    }
    finally {

      if (permisoStream) {

        permisoStream
          .getTracks()
          .forEach(function(track) {
            track.stop();
          });

      }

    }

    const dispositivos =
      await navigator.mediaDevices.enumerateDevices();

    const entradas =
      dispositivos.filter(function(dispositivo) {
        return dispositivo.kind === 'videoinput';
      });

    if (!entradas.length) {

      throw new Error(
        'El navegador no entregó cámaras de vídeo.'
      );

    }

    cameraState.mobileCameras = [];

    // Probamos cada deviceId de forma nativa.
    // No confiamos en el texto "facing front/back".
    for (let i = 0; i < entradas.length; i++) {

      const dispositivo = entradas[i];

      let stream = null;

      try {

        stream =
          await navigator.mediaDevices.getUserMedia({

            video: {
              deviceId: {
                exact: dispositivo.deviceId
              }
            },

            audio: false

          });

        const track =
          stream.getVideoTracks()[0];

        const settings =
          track.getSettings();

        const facing =
          settings.facingMode || '';

        cameraState.mobileCameras.push({

          id:
            dispositivo.deviceId,

          label:
            track.label ||
            dispositivo.label ||
            `Cámara ${i + 1}`,

          facingMode:
            facing,

          width:
            settings.width || 0,

          height:
            settings.height || 0

        });

      }
      catch (error) {

        console.warn(
          'No se pudo probar dispositivo:',
          dispositivo.label,
          error
        );

      }
      finally {

        if (stream) {

          stream
            .getTracks()
            .forEach(function(track) {
              track.stop();
            });

        }

      }

    }

    if (!cameraState.mobileCameras.length) {

      throw new Error(
        'No fue posible abrir ninguna cámara del teléfono.'
      );

    }

    console.log(
      'Cámaras móviles detectadas realmente:',
      cameraState.mobileCameras
    );

    const selector =
      document.getElementById('cameraSelect');

    if (selector) {

      selector.innerHTML = '';

      const frontal =
        cameraState.mobileCameras.find(function(c) {
          return c.facingMode === 'user';
        });

      const trasera =
        cameraState.mobileCameras.find(function(c) {
          return c.facingMode === 'environment';
        });

      if (frontal) {

        const opcionFrontal =
          document.createElement('option');

        opcionFrontal.value =
          'user';

        opcionFrontal.textContent =
          '📱 Cámara frontal';

        selector.appendChild(
          opcionFrontal
        );

      }

      if (trasera) {

        const opcionTrasera =
          document.createElement('option');

        opcionTrasera.value =
          'environment';

        opcionTrasera.textContent =
          '📷 Cámara trasera';

        selector.appendChild(
          opcionTrasera
        );

      }

      // Si el navegador no informa facingMode,
      // mostramos los dispositivos reales como
      // alternativa para diagnóstico/compatibilidad.
      if (!frontal && !trasera) {

        cameraState.mobileCameras.forEach(
          function(camara, index) {

            const opcion =
              document.createElement('option');

            opcion.value =
              'device:' + index;

            opcion.textContent =
              '📷 ' +
              (
                camara.label ||
                `Cámara ${index + 1}`
              );

            selector.appendChild(
              opcion
            );

          }
        );

      }

      if (trasera) {

        cameraState.facingMode =
          'environment';

        selector.value =
          'environment';

      }
      else if (frontal) {

        cameraState.facingMode =
          'user';

        selector.value =
          'user';

      }

    }

    const controles =
      document.getElementById(
        'camera-controls'
      );

    if (controles) {
      controles.style.display = 'block';
    }

    if (
      !cameraState.mobileCameras.some(function(c) {
        return c.facingMode === 'user';
      })
    ) {

      console.warn(
        'El navegador no expuso ninguna cámara con facingMode=user.'
      );

    }

    return true;

  }
  catch (error) {

    console.error(
      'Error detectando cámaras móviles:',
      error
    );

    mensajeCamara(
      '❌ No fue posible detectar las cámaras: ' +
      error.message
    );

    return false;

  }

}


// =====================================================
// ESCÁNER QR NATIVO PARA MÓVIL
// =====================================================

async function iniciarCamaraMovil() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    throw new Error(
      'El navegador no permite acceso nativo a la cámara.'
    );

  }

  const camarasOK =
    await prepararCamarasMovil();

  if (!camarasOK) {
    return;
  }

  let camaraSeleccionada = null;

  if (
    cameraState.facingMode === 'user' ||
    cameraState.facingMode === 'environment'
  ) {

    camaraSeleccionada =
      cameraState.mobileCameras.find(
        function(camara) {

          return (
            camara.facingMode ===
            cameraState.facingMode
          );

        }
      );

  }

  // Si el navegador no informa facingMode,
  // usamos el índice seleccionado.
  if (!camaraSeleccionada) {

    const selector =
      document.getElementById(
        'cameraSelect'
      );

    if (
      selector &&
      String(selector.value).indexOf('device:') === 0
    ) {

      const indice =
        Number(
          String(selector.value)
            .replace('device:', '')
        );

      camaraSeleccionada =
        cameraState.mobileCameras[indice];

    }

  }

  if (!camaraSeleccionada) {

    throw new Error(
      cameraState.facingMode === 'user'
        ? 'El navegador no expone una cámara frontal utilizable.'
        : 'El navegador no expone una cámara trasera utilizable.'
    );

  }

  let stream = null;

  try {

    stream =
      await navigator.mediaDevices.getUserMedia({

        video: {
          deviceId: {
            exact:
              camaraSeleccionada.id
          }
        },

        audio: false

      });

    const track =
      stream.getVideoTracks()[0];

    const settings =
      track.getSettings();

    console.log(
      'Cámara móvil abierta:',
      {
        solicitada:
          cameraState.facingMode,

        label:
          track.label,

        deviceId:
          settings.deviceId,

        facingMode:
          settings.facingMode

      }
    );

    // Verificación real.
    // Si pedimos frontal y el navegador informa
    // environment, no lo aceptamos como frontal.
    if (
      cameraState.facingMode === 'user' &&
      settings.facingMode === 'environment'
    ) {

      stream
        .getTracks()
        .forEach(function(t) {
          t.stop();
        });

      throw new Error(
        'Android abrió una cámara trasera al solicitar la frontal.'
      );

    }

    if (
      cameraState.facingMode === 'environment' &&
      settings.facingMode === 'user'
    ) {

      stream
        .getTracks()
        .forEach(function(t) {
          t.stop();
        });

      throw new Error(
        'Android abrió una cámara frontal al solicitar la trasera.'
      );

    }

    const reader =
      document.getElementById('reader');

    if (!reader) {

      throw new Error(
        'No existe el contenedor reader.'
      );

    }

    reader.innerHTML = '';

    const video =
      document.createElement('video');

    video.id =
      'mobileCameraVideo';

    video.autoplay =
      true;

    video.playsInline =
      true;

    video.muted =
      true;

    video.setAttribute(
      'playsinline',
      ''
    );

    video.style.width =
      '100%';

    video.style.maxWidth =
      '100%';

    video.style.display =
      'block';

    video.style.background =
      '#000';

    reader.appendChild(
      video
    );

    video.srcObject =
      stream;

    await video.play();

    cameraState.mobileStream =
      stream;

    cameraState.mobileVideo =
      video;

    cameraState.mobileDetector =
      null;

    // =================================================
    // LECTOR QR NATIVO
    // =================================================

    if (
      typeof BarcodeDetector !==
      'undefined'
    ) {

      let formatos =
        ['qr_code'];

      try {

        if (
          BarcodeDetector.getSupportedFormats
        ) {

          const disponibles =
            await BarcodeDetector
              .getSupportedFormats();

          if (
            !disponibles.includes('qr_code')
          ) {

            throw new Error(
              'BarcodeDetector no admite QR en este navegador.'
            );

          }

        }

      }
      catch (errorFormatos) {

        console.warn(
          'No se pudo comprobar formatos de BarcodeDetector:',
          errorFormatos
        );

      }

      cameraState.mobileDetector =
        new BarcodeDetector({
          formats: formatos
        });

      cameraState.mobileScanActivo =
        true;

      escanearQRMovilNativo();

    }
    else {

      // No ocultamos el problema.
      // En este teléfono Chrome Android debería
      // proporcionar BarcodeDetector.
      throw new Error(
        'Este navegador no dispone de BarcodeDetector para el lector QR móvil.'
      );

    }

    cameraState.activa =
      true;

    cameraState.procesandoQR =
      false;

    state.camara =
      true;

    mensajeCamara(
      cameraState.facingMode === 'user'
        ? '📱 Cámara frontal activa.'
        : '📷 Cámara trasera activa. Apunte al QR del carnet.'
    );

    const boton =
      document.getElementById('camBtn');

    if (boton) {
      boton.disabled = true;
    }

    const cambiar =
      document.getElementById(
        'switchCamBtn'
      );

    if (cambiar) {
      cambiar.disabled = false;
    }

  }
  catch (error) {

    if (stream) {

      stream
        .getTracks()
        .forEach(function(track) {
          track.stop();
        });

    }

    throw error;

  }

}


// =====================================================
// BÚSQUEDA QR NATIVA MÓVIL
// =====================================================

async function escanearQRMovilNativo() {

  if (
    !cameraState.mobileScanActivo ||
    !cameraState.mobileDetector ||
    !cameraState.mobileVideo
  ) {
    return;
  }

  if (
    !cameraState.activa &&
    !cameraState.mobileStream
  ) {
    return;
  }

  try {

    const resultados =
      await cameraState.mobileDetector.detect(
        cameraState.mobileVideo
      );

    if (
      resultados &&
      resultados.length
    ) {

      const decodedText =
        resultados[0].rawValue;

      if (
        decodedText &&
        !cameraState.procesandoQR
      ) {

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

        return;

      }

    }

  }
  catch (error) {

    console.warn(
      'Error leyendo QR móvil:',
      error
    );

  }

  if (
    cameraState.mobileScanActivo
  ) {

    setTimeout(
      escanearQRMovilNativo,
      250
    );

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

  cameraState.esMovil =
    esDispositivoMovil();

  try {

    // =================================================
    // MÓVIL
    // =================================================

    if (cameraState.esMovil) {

      await iniciarCamaraMovil();

      return;

    }

    // =================================================
    // PC
    // =================================================

    const camarasOK =
      await cargarCamaras();

    if (!camarasOK) {
      return;
    }

    cameraState.reader =
      new Html5Qrcode(
        'reader'
      );

    const cameraId =
      (
        cameraState.cameras[
          cameraState.currentIndex
        ] || {}
      ).id;

    if (!cameraId) {

      throw new Error(
        'No se pudo seleccionar la cámara.'
      );

    }

    await cameraState.reader.start(

      cameraId,

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
      document.getElementById('camBtn');

    if (boton) {
      boton.disabled = true;
    }

    const cambiar =
      document.getElementById('switchCamBtn');

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

    if (cameraState.activa) {

      await detenerCamara();

      await iniciarCamara();

    }
    else {

      mensajeCamara(
        cameraState.facingMode === 'user'
          ? '📱 Cámara frontal seleccionada.'
          : '📷 Cámara trasera seleccionada.'
      );

    }

    return;

  }

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
        `Cámara ${cameraState.currentIndex + 1}`
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

  // ===================================================
  // MÓVIL NATIVO
  // ===================================================

  if (cameraState.mobileStream) {

    cameraState.mobileScanActivo =
      false;

    try {

      cameraState.mobileStream
        .getTracks()
        .forEach(function(track) {
          track.stop();
        });

    }
    catch (error) {

      console.warn(
        'Error deteniendo stream móvil:',
        error
      );

    }

    cameraState.mobileStream =
      null;

    cameraState.mobileVideo =
      null;

    cameraState.mobileDetector =
      null;

    const reader =
      document.getElementById('reader');

    if (reader) {
      reader.innerHTML = '';
    }

  }

  // ===================================================
  // PC - HTML5 QR CODE
  // ===================================================

  if (cameraState.reader) {

    try {

      if (cameraState.activa) {

        await cameraState.reader.stop();

      }

      await cameraState.reader.clear();

    }
    catch (error) {

      console.warn(
        'Error deteniendo lector PC:',
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

  const boton =
    document.getElementById(
      'camBtn'
    );

  if (boton) {
    boton.disabled = false;
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
