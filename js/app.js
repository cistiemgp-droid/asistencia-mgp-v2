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

  persona: null,

  usuario: null,

  permisos: null,

  // Sesión institucional V2
  token: null,
  expiraSesion: null

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

          const mapaPermisos = {
            registro: 'registrarAsistencia',
            reportes: 'verReportes',
            carnets: 'administrarQR',
            admin: 'administrarPersonas'
          };

          const permiso = mapaPermisos[destino];

          const rolActual =
            String(
              (state.usuario && state.usuario.rol) || ''
            ).trim().toUpperCase();

          if (
            rolActual === 'AUXILIAR' ||
            rolActual === 'DIRECTOR'
          ) {
            if (
              destino !== 'registro' &&
              destino !== 'reportes'
            ) {
              return;
            }
          }

          if (
            permiso &&
            (!state.permisos || state.permisos[permiso] !== true)
          ) {
            return;
          }

          mostrarVista(destino);

        }

      }
    );

  });

// =====================================================
// BOTÓN INICIO
// =====================================================

const homeBtn =
  document.getElementById('homeBtn') ||
  document.getElementById('home');

if (homeBtn) {

  homeBtn.addEventListener(
    'click',
    function() {

      const portal =
        document.getElementById('portal');

      if (
        portal &&
        portal.classList.contains('active')
      ) {
        return;
      }

      if (
        state.usuario &&
        state.token
      ) {
        mostrarVista('panel');
      }
      else {
        mostrarVista('portal');
      }

    }
  );

}


// =====================================================
// RETORNO AL PANEL INSTITUCIONAL
// CORRECCIÓN AISLADA - NO INTERCEPTAR OTROS CLICS
// =====================================================
// IMPORTANTE:
// Este manejador SOLO responde cuando el elemento pulsado
// es realmente un control de retorno al Panel.
// NO analiza textContent de contenedores padres, porque eso
// provocaba que cualquier clic dentro de Registro/Reportes
// pudiera interpretarse como "Panel Institucional".
// =====================================================

document.addEventListener(
  'click',
  function(evento) {

    const registro =
      document.getElementById('registro');

    const reportes =
      document.getElementById('reportes');

    const enRegistro =
      registro &&
      registro.classList.contains('active');

    const enReportes =
      reportes &&
      reportes.classList.contains('active');

    if (!enRegistro && !enReportes) {
      return;
    }

    // Solo el elemento de control realmente pulsado.
    // No subir por los contenedores buscando texto.
    const boton =
      evento.target.closest(
        'button, a, [role="button"], [data-view], [data-v]'
      );

    if (!boton) {
      return;
    }

    // El control debe estar dentro de Registro o Reportes.
    if (
      !(
        registro &&
        registro.contains(boton)
      ) &&
      !(
        reportes &&
        reportes.contains(boton)
      )
    ) {
      return;
    }

    const id =
      String(boton.id || '')
        .toLowerCase();

    const clase =
      String(boton.className || '')
        .toLowerCase();

    const texto =
      String(
        boton.textContent ||
        boton.getAttribute('aria-label') ||
        boton.getAttribute('title') ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    const dataView =
      String(
        boton.getAttribute('data-view') ||
        boton.getAttribute('data-v') ||
        ''
      )
        .trim()
        .toLowerCase();

    const href =
      String(
        boton.getAttribute('href') || ''
      )
        .trim()
        .toLowerCase();

    const onclick =
      String(
        boton.getAttribute('onclick') || ''
      )
        .toLowerCase()
        .replace(/\s+/g, '');

    const apuntaPanel =
      dataView === 'panel' ||
      href === '#panel' ||
      href.endsWith('#panel') ||
      onclick.includes("mostrarvista('panel')") ||
      onclick.includes('mostrarvista("panel")') ||
      onclick.includes('mostrarvista(panel)');

    const esRetorno =
      texto.includes('panel institucional') ||
      texto.includes('volver al panel') ||
      texto.includes('regresar al panel') ||
      texto.includes('retornar al panel') ||
      texto.includes('volver a panel') ||
      texto.includes('regresar a panel') ||
      texto.includes('retornar a panel') ||
      id.includes('panelinstitucional') ||
      id.includes('volverpanel') ||
      id.includes('regresarpanel') ||
      id.includes('retornarpanel') ||
      clase.includes('panel-institucional') ||
      clase.includes('volver-panel') ||
      clase.includes('regresar-panel') ||
      clase.includes('retornar-panel');

    if (!apuntaPanel && !esRetorno) {
      return;
    }

    if (
      !state.usuario ||
      !state.token
    ) {
      return;
    }

    evento.preventDefault();
    evento.stopPropagation();
    evento.stopImmediatePropagation();

    mostrarVista('panel');

  },
  true
);


// =====================================================
// BOTONES DEL PORTAL V2
// CORRECCIÓN AISLADA DE NAVEGACIÓN
// =====================================================
// Los botones del Portal pueden existir con data-v/data-view,
// id, texto o onclick según la versión del index actual.
// Aquí resolvemos únicamente CONSULTAS y ACCESO INSTITUCIONAL.
// No modifica la lógica de sesión, permisos, QR ni asistencia.
// =====================================================

document.addEventListener(
  'click',
  function(evento) {

    const portal =
      document.getElementById('portal');

    if (
      !portal ||
      !portal.classList.contains('active')
    ) {
      return;
    }

    const boton =
      evento.target.closest(
        'button, a, [role="button"]'
      );

    if (!boton) {
      return;
    }

    const id =
      String(boton.id || '')
        .toLowerCase();

    const clase =
      String(boton.className || '')
        .toLowerCase();

    const texto =
      String(
        boton.textContent ||
        boton.getAttribute('aria-label') ||
        boton.title ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    const dataView =
      String(
        boton.getAttribute('data-view') ||
        boton.getAttribute('data-v') ||
        ''
      )
        .trim()
        .toLowerCase();

    let destino = '';

    // CONSULTAS
    if (
      dataView === 'consulta' ||
      id.includes('consulta') ||
      clase.includes('consulta') ||
      texto.includes('consultas') ||
      texto === 'consulta'
    ) {
      destino = 'consulta';
    }

    // ACCESO INSTITUCIONAL / LOGIN
    else if (
      dataView === 'login' ||
      id.includes('institucional') ||
      id.includes('login') ||
      clase.includes('institucional') ||
      clase.includes('login') ||
      texto.includes('acceso institucional') ||
      texto.includes('acceso institucional')
    ) {
      destino = 'login';
    }

    if (!destino) {
      return;
    }

    evento.preventDefault();
    evento.stopImmediatePropagation();

    mostrarVista(destino);

  },
  true
);


// =====================================================
// BOTÓN SALIR
// =====================================================

const salirBtn =
  document.getElementById('salirBtn') ||
  document.getElementById('salir');

if (salirBtn) {

  salirBtn.addEventListener(
    'click',
    function() {

      detenerCamara();

      state.usuario = null;
      state.permisos = null;
      state.token = null;
      state.expiraSesion = null;
      state.persona = null;
      state.qr = null;

      mostrarVista('portal');

    }
  );

}


// =====================================================
// LOGIN V2
// =====================================================

const entrarBtn =
  document.getElementById('entrar') ||
  document.getElementById('entrarBtn');

if (entrarBtn) {

  entrarBtn.addEventListener(
    'click',
    async function() {

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
          '🔄 Verificando acceso...';

      }

      try {

        const nombreCallback =
          'respuestaLoginMGP_' + Date.now();

        let terminado = false;

        const limpiar =
          function() {

            if (
              loginScript &&
              loginScript.parentNode
            ) {
              loginScript.parentNode.removeChild(loginScript);
            }

            loginScript = null;

            try {
              delete window[nombreCallback];
            }
            catch (error) {
              console.warn(
                'No fue posible eliminar callback LOGIN:',
                error
              );
            }

          };

        const resultado =
          await new Promise(function(resolve, reject) {

            loginScript =
              document.createElement('script');

            window[nombreCallback] =
              function(data) {

                if (terminado) {
                  return;
                }

                terminado = true;
                limpiar();
                resolve(data);

              };

            loginScript.src =
              CONFIG.API_URL +
              '?action=apiLogin' +
              '&user=' + encodeURIComponent(usuario) +
              '&pass=' + encodeURIComponent(password) +
              '&callback=' + encodeURIComponent(nombreCallback);

            loginScript.async = true;

            loginScript.onerror =
              function() {

                if (terminado) {
                  return;
                }

                terminado = true;
                limpiar();

                reject(
                  new Error(
                    'No se pudo comunicar con el servidor.'
                  )
                );

              };

            document.head.appendChild(
              loginScript
            );

          });

        console.log(
          'Respuesta LOGIN V2:',
          resultado
        );

        console.log(
          'Respuesta LOGIN V2:',
          resultado
        );

        if (!resultado.ok) {

          if (mensaje) {

            mensaje.textContent =
              '❌ ' +
              (
                resultado.mensaje ||
                'Usuario o contraseña incorrectos.'
              );

          }

          return;

        }

        state.usuario =
          resultado.usuario || null;

        state.permisos =
          (
            resultado.usuario &&
            resultado.usuario.permisos
          ) || null;

        state.token =
          (
            resultado.usuario &&
            resultado.usuario.token
          ) || null;

        state.expiraSesion =
          (
            resultado.usuario &&
            resultado.usuario.expiraSesion
          ) || null;

        if (!state.token) {
          if (mensaje) {
            mensaje.textContent =
              '❌ El servidor no devolvió una sesión institucional válida.';
          }

          console.error(
            'LOGIN V2 sin token de sesión.'
          );

          return;
        }

        aplicarPermisosPanel();

        console.log(
          'Usuario autenticado V2:',
          state.usuario
        );

        console.log(
          'Permisos V2:',
          state.permisos
        );

        if (mensaje) {

          mensaje.textContent =
            '✅ Acceso autorizado.';

        }

        mostrarVista('panel');

      }
      catch (error) {

        console.error(
          'Error en LOGIN V2:',
          error
        );

        if (mensaje) {

          mensaje.textContent =
            '❌ No se pudo comunicar con el servidor: ' +
            error.message;

        }

      }

    }
  );

}


// =====================================================
// PERMISOS V2 - PANEL INSTITUCIONAL
// =====================================================

function aplicarPermisosPanel() {

  // El backend determina los permisos.
  // El frontend solo refleja esos permisos en el panel.
  const permisos = state.permisos || {};

  const rol =
    String(
      (state.usuario && state.usuario.rol) || ''
    ).trim().toUpperCase();

  const controles = [
    {
      vista: 'registro',
      permiso: 'registrarAsistencia'
    },
    {
      vista: 'reportes',
      permiso: 'verReportes'
    },
    {
      vista: 'carnets',
      permiso: 'administrarQR'
    },
    {
      vista: 'admin',
      permiso: 'administrarPersonas'
    }
  ];

  controles.forEach(function(control) {

    const botones = document.querySelectorAll(
      '[data-view="' + control.vista + '"], ' +
      '[data-v="' + control.vista + '"]'
    );

    // AUXILIAR y DIRECTOR solo muestran Registro y Reportes.
    // ADMIN conserva acceso a los módulos administrativos
    // según los permisos entregados por el backend.
    let permitidoPorRol = true;

    if (
      rol === 'AUXILIAR' ||
      rol === 'DIRECTOR'
    ) {
      permitidoPorRol =
        control.vista === 'registro' ||
        control.vista === 'reportes';
    }

    const permitido =
      permitidoPorRol &&
      permisos[control.permiso] === true;

    botones.forEach(function(boton) {

      boton.style.display =
        permitido ? '' : 'none';

      boton.disabled =
        !permitido;

    });

  });

}



// =====================================================
// TIPO DE PERSONA
// =====================================================

document
  .querySelectorAll('[data-t], [data-tipo]')
  .forEach(function(boton) {

    boton.addEventListener(
      'click',
      function() {

        document
          .querySelectorAll('[data-t], [data-tipo]')
          .forEach(function(b) {

            b.classList.remove('active');

          });


        boton.classList.add('active');

        state.tipo =
          boton.dataset.t ||
          boton.dataset.tipo ||
          'estudiante';

      }
    );

  });


// =====================================================
// INGRESO / SALIDA
// =====================================================

document
  .querySelectorAll('[data-e], [data-estado]')
  .forEach(function(boton) {

    boton.addEventListener(
      'click',
      function() {

        document
          .querySelectorAll('[data-e], [data-estado]')
          .forEach(function(b) {

            b.classList.remove('active');

          });


        boton.classList.add('active');

        state.estado =
          boton.dataset.e ||
          boton.dataset.estado ||
          'INGRESO';

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


    const nombreCallback =
      'respuestaQR_MGP_' + Date.now();

    const resultado =
      await new Promise(function(resolve, reject) {

        const script =
          document.createElement('script');

        let terminado = false;

        function limpiar() {

          if (
            script &&
            script.parentNode
          ) {
            script.parentNode.removeChild(script);
          }

          try {
            delete window[nombreCallback];
          }
          catch (error) {
            console.warn(
              'No fue posible eliminar callback QR:',
              error
            );
          }

        }

        window[nombreCallback] =
          function(data) {

            if (terminado) {
              return;
            }

            terminado = true;
            limpiar();
            resolve(data);

          };

        script.src =
          url +
          '&callback=' +
          encodeURIComponent(nombreCallback);

        script.async = true;

        script.onerror =
          function() {

            if (terminado) {
              return;
            }

            terminado = true;
            limpiar();

            reject(
              new Error(
                'No se pudo comunicar con el servidor.'
              )
            );

          };

        document.head.appendChild(
          script
        );

      });


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
    // IMPORTANTE V2
    // IDENTIFICAR NO ES LO MISMO QUE REGISTRAR
    //
    // La cámara ya hizo su trabajo.
    // Ahora enviamos el DNI identificado al endpoint
    // apiRegistrar para guardar INGRESO/SALIDA.
    // =================================================


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


    // =================================================
    // REGISTRAR ASISTENCIA AUTOMÁTICAMENTE
    // =================================================
    // Para el QR Legacy 2026 ya tenemos el DNI real.
    // Ese es el dato que entiende registrarAsistenciaServidor().
    // =================================================

    if (
      resultado.tipoQR === 'LEGACY_2026' &&
      resultado.estudiante &&
      resultado.estudiante.dni
    ) {

      await registrarAsistenciaBackend(
        resultado.estudiante.dni
      );

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
// REGISTRAR ASISTENCIA EN EL SERVIDOR
// =====================================================
// Usa JSONP porque GitHub Pages y Google Apps Script
// están en dominios diferentes.
// El backend existente recibe:
// ?action=apiRegistrar&id=...&tipo=...&estado=...
// =====================================================

let registroScript = null;

function eliminarRegistroScript() {

  if (registroScript && registroScript.parentNode) {
    registroScript.parentNode.removeChild(registroScript);
  }

  registroScript = null;

}


function registrarAsistenciaBackend(id) {

  return new Promise(function(resolve) {

    const mensaje =
      document.getElementById('regMsg');

    const idLimpio =
      String(id || '').trim();

    const tipo =
      String(state.tipo || 'estudiante').trim();

    const estado =
      String(state.estado || 'INGRESO').trim().toUpperCase();

    if (!idLimpio) {

      if (mensaje) {
        mensaje.textContent =
          '❌ No se obtuvo el DNI para registrar.';
      }

      resolve({ exito: false });
      return;

    }

    eliminarRegistroScript();

    if (mensaje) {
      mensaje.innerHTML =
        '<strong>⏳ REGISTRANDO ' +
        (estado === 'SALIDA' ? 'SALIDA' : 'INGRESO') +
        '...</strong><br>' +
        'DNI: ' + idLimpio + '<br>' +
        'Tipo: ' + tipo + '<br>' +
        'Estado: ' + estado;
    }

    window.respuestaRegistroMGP =
      function(data) {

        eliminarRegistroScript();

        if (!data) {
          if (mensaje) {
            mensaje.textContent =
              '❌ El servidor no devolvió respuesta.';
          }
          resolve({ exito: false });
          return;
        }

        console.log(
          'Respuesta registro asistencia:',
          data
        );

        if (data.exito) {

          const datos = data.datos || {};

          const nombre =
            datos.nombre ||
            (state.persona && state.persona.estudiante
              ? (
                  (state.persona.estudiante.apellidoPaterno || '') + ' ' +
                  (state.persona.estudiante.apellidoMaterno || '') + ' ' +
                  (state.persona.estudiante.nombres || '')
                ).trim()
              : '');

          const detalle =
            datos.gradoSeccion ||
            (state.persona && state.persona.estudiante
              ? (
                  (state.persona.estudiante.grado || '') + ' ' +
                  (state.persona.estudiante.seccion || '')
                ).trim()
              : '');

          if (mensaje) {
            mensaje.innerHTML =
              '<strong>✅ ' + (String(data.estado || estado).toUpperCase() === 'SALIDA' ? 'SALIDA REGISTRADA' : 'INGRESO REGISTRADO') + '</strong><br>' +
              'DNI: ' + idLimpio + '<br>' +
              (nombre ? 'Nombre: ' + nombre + '<br>' : '') +
              (detalle ? 'Grado: ' + detalle + '<br>' : '') +
              'Estado: ' + (data.estado || estado) + '<br>' +
              'Hora: ' + (data.hora || '--:--:--') + '<br>' +
              'Puntualidad: ' + (data.puntualidad || 'N/A');
          }

          resolve(data);
          return;
        }

        if (mensaje) {
          mensaje.innerHTML =
            '<strong>❌ NO REGISTRADO</strong><br>' +
            (data.mensaje || 'No fue posible registrar la asistencia.');
        }

        resolve(data);
      };

    registroScript =
      document.createElement('script');

    registroScript.src =
      CONFIG.API_URL +
      '?action=apiRegistrar' +
      '&id=' + encodeURIComponent(idLimpio) +
      '&tipo=' + encodeURIComponent(tipo) +
      '&estado=' + encodeURIComponent(estado) +
      '&token=' + encodeURIComponent(state.token || '') +
      '&callback=respuestaRegistroMGP';

    registroScript.onerror =
      function() {

        eliminarRegistroScript();

        if (mensaje) {
          mensaje.textContent =
            '❌ No se pudo conectar con el servidor para registrar la asistencia.';
        }

        resolve({ exito: false });
      };

    document.body.appendChild(
      registroScript
    );

  });

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

  return document.getElementById(
    'switchCamBtn'
  );

}


// =====================================================
// CARGAR HTML5-QRCODE SI AÚN NO ESTÁ DISPONIBLE
// =====================================================

function asegurarHtml5QrCode() {

  if (
    typeof Html5Qrcode !==
    'undefined'
  ) {

    return Promise.resolve();

  }


  return new Promise(function(resolve, reject) {

    const existente =
      document.querySelector(
        'script[data-mgp-html5qr]'
      );

    if (existente) {

      existente.addEventListener(
        'load',
        function() {

          if (
            typeof Html5Qrcode !==
            'undefined'
          ) {

            resolve();

          }
          else {

            reject(
              new Error(
                'html5-qrcode se cargó pero Html5Qrcode no está disponible.'
              )
            );

          }

        }
      );

      existente.addEventListener(
        'error',
        function() {

          reject(
            new Error(
              'No se pudo cargar html5-qrcode.'
            )
          );

        }
      );

      return;

    }


    const script =
      document.createElement(
        'script'
      );

    script.src =
      'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';

    script.async =
      false;

    script.setAttribute(
      'data-mgp-html5qr',
      'true'
    );


    script.onload =
      function() {

        if (
          typeof Html5Qrcode !==
          'undefined'
        ) {

          resolve();

        }
        else {

          reject(
            new Error(
              'html5-qrcode se cargó pero Html5Qrcode no está disponible.'
            )
          );

        }

      };


    script.onerror =
      function() {

        reject(
          new Error(
            'No se pudo descargar la biblioteca html5-qrcode.'
          )
        );

      };


    document.head.appendChild(
      script
    );

  });

}


// =====================================================
// INICIAR CÁMARA
// =====================================================
// Basado directamente en la rutina que funcionó
// en AsistenciaV1.
//
// TRASERA  -> environment
// FRONTAL  -> user
//
// No usa deviceId.
// No enumera cámaras.
// No intenta adivinar cuál es frontal.
// =====================================================

async function iniciarCamara() {

  if (
    cameraState.activa
  ) {

    mensajeCamara(
      '📷 La cámara ya está activa.'
    );

    return;

  }


  const reader =
    document.getElementById(
      'reader'
    );

  // En V2 el visor QR (#reader) es el contenedor real.
  // No dependemos de #reader-container porque no existe
  // en el index.html actual.
  const readerContainer =
    reader;

  const camBtn =
    document.getElementById(
      'camBtn'
    );

  const stopCamBtn =
    document.getElementById(
      'stopCamBtn'
    );

  const switchCamBtn =
    document.getElementById(
      'switchCamBtn'
    );

  const cameraControls =
    document.getElementById(
      'camera-controls'
    );


  try {

    if (!reader) {

      throw new Error(
        'No existe el contenedor de cámara #reader.'
      );

    }


    mensajeCamara(
      'Solicitando acceso a la cámara...'
    );


    readerContainer.style.display =
      'block';


    if (camBtn) {

      camBtn.disabled =
        true;

    }


    // -------------------------------------------------
    // Aseguramos la misma biblioteca de V1: 2.3.8
    // -------------------------------------------------

    await asegurarHtml5QrCode();


    // -------------------------------------------------
    // Limpiamos solamente el lector anterior.
    // -------------------------------------------------

    reader.innerHTML =
      '';


    cameraState.reader =
      new Html5Qrcode(
        'reader'
      );


    // -------------------------------------------------
    // MISMA SELECCIÓN DE V1
    // -------------------------------------------------

    const facingMode =
      camaraFrontal
        ? 'user'
        : 'environment';


    cameraState.facingMode =
      facingMode;


    await cameraState.reader.start(

      {
        facingMode:
          facingMode
      },

      {

        fps:
          10,

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

      async function(
        decodedText
      ) {

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

        try {

          await identificarQRBackend(
            decodedText
          );

        }

        finally {

          cameraState.procesandoQR =
            false;

          await iniciarCamara();

        }

      },

      function(
        errorMessage
      ) {

        // Error normal mientras busca un QR.
        // No mostrarlo continuamente.

      }

    );


    cameraState.activa =
      true;

    // En V2 el botón ya existe en index.html.
    // Solo hacemos visible su contenedor.
    if (cameraControls) {

      cameraControls.style.display =
        'block';

    }

    if (switchCamBtn) {

      switchCamBtn.style.display =
        'block';

      switchCamBtn.disabled =
        false;

    }

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

      camBtn.style.display =
        'none';

    }


    if (stopCamBtn) {

      stopCamBtn.style.display =
        'block';

    }


    if (switchCamBtn) {

      switchCamBtn.style.display =
        'block';

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


    if (
      cameraState.reader
    ) {

      try {

        await cameraState.reader.stop();

      }
      catch (
        stopError
      ) {

        console.warn(
          'No fue necesario detener el lector:',
          stopError
        );

      }


      try {

        await cameraState.reader.clear();

      }
      catch (
        clearError
      ) {

        console.warn(
          'No fue necesario limpiar el lector:',
          clearError
        );

      }

    }


    cameraState.reader =
      null;


    if (readerContainer) {

      readerContainer.style.display =
        'none';

    }


    if (camBtn) {

      camBtn.style.display =
        'block';

      camBtn.disabled =
        false;

    }


    if (stopCamBtn) {

      stopCamBtn.style.display =
        'none';

    }


    if (switchCamBtn) {

      switchCamBtn.style.display =
        'none';

    }


    cameraState.procesandoQR =
      false;


    mensajeCamara(
      '❌ No se pudo iniciar la cámara: ' +
      (
        error.name ||
        'Error'
      ) +
      ' — ' +
      (
        error.message ||
        'Error desconocido.'
      )
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
      'none';

  }


  const switchCamBtn =
    document.getElementById(
      'switchCamBtn'
    );

  if (switchCamBtn) {
    switchCamBtn.style.display = 'none';
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
  document.getElementById('consultarBtn') ||
  document.getElementById('consultar');


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

// =====================================================
// COMPATIBILIDAD FINAL V1 / V2
// =====================================================
// Estos alias garantizan que los botones del HTML puedan
// llamar directamente a las funciones aunque app.js haya
// sido cargado antes o después del HTML.
window.activarCamara = iniciarCamara;
window.detenerCamara = detenerCamara;
window.cambiarCamara = cambiarCamara;
