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

// =====================================================
// ESTADO DEL ÚLTIMO REPORTE PARA EXPORTACIÓN
// =====================================================

let ultimoReporteMGP = null;
let matrizMensualVisibleMGP = false;


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
// =====================================================
// CORRECCIÓN EXCLUSIVA DE LOS BOTONES DE RETORNO.
// Se atienden los botones reales dentro de REGISTRO y
// REPORTES aunque el HTML use texto, id, clase, href,
// data-v/data-view u onclick.
// No modifica cámara, QR, permisos ni registro.
// =====================================================

document.addEventListener(
  'click',
  function(evento) {

    // Solo actuar cuando estamos en REGISTRO o REPORTES.
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

    // Buscar el control clickeado y sus ancestros.
    let elemento =
      evento.target;

    let boton = null;

    while (
      elemento &&
      elemento !== document.body
    ) {

      const tag =
        String(elemento.tagName || '')
          .toLowerCase();

      const id =
        String(elemento.id || '')
          .toLowerCase();

      const clase =
        String(elemento.className || '')
          .toLowerCase();

      const texto =
        String(
          elemento.textContent ||
          elemento.getAttribute('aria-label') ||
          elemento.title ||
          ''
        )
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

      const dataView =
        String(
          elemento.getAttribute('data-view') ||
          elemento.getAttribute('data-v') ||
          ''
        )
          .trim()
          .toLowerCase();

      const href =
        String(
          elemento.getAttribute('href') || ''
        )
          .trim()
          .toLowerCase();

      const onclick =
        String(
          elemento.getAttribute('onclick') || ''
        )
          .toLowerCase();

      const esControl =
        tag === 'button' ||
        tag === 'a' ||
        elemento.getAttribute('role') === 'button' ||
        id.includes('panel') ||
        id.includes('volver') ||
        id.includes('regresar') ||
        id.includes('retornar') ||
        clase.includes('panel') ||
        clase.includes('volver') ||
        clase.includes('regresar') ||
        clase.includes('retornar');

      if (esControl) {

        const apuntaPanel =
          dataView === 'panel' ||
          href.includes('#panel') ||
          onclick.includes("mostrarvista('panel')") ||
          onclick.includes('mostrarvista("panel")') ||
          onclick.includes('panel');

        const textoRetorno =
          texto.includes('panel institucional') ||
          texto.includes('volver al panel') ||
          texto.includes('regresar al panel') ||
          texto.includes('retornar al panel') ||
          texto.includes('volver a panel') ||
          texto.includes('regresar a panel') ||
          texto.includes('retornar a panel') ||
          texto === 'panel' ||
          texto === 'inicio';

        if (apuntaPanel || textoRetorno) {
          boton = elemento;
          break;
        }

      }

      elemento =
        elemento.parentElement;

    }

    if (!boton) {
      return;
    }

    // Evitar que href, onclick u otros listeners
    // cambien la vista antes de nuestra navegación.
    evento.preventDefault();
    evento.stopPropagation();
    evento.stopImmediatePropagation();

    if (
      state.usuario &&
      state.token
    ) {
      mostrarVista('panel');
    }
    else {
      mostrarVista('portal');
    }

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
  '🔄 Consultando ' +
  (
    String(state.tipo || 'estudiante').trim().toLowerCase() === 'personal'
      ? 'personal'
      : 'estudiante'
  ) +
  '...';

    }


    const parametros =
  new URLSearchParams({

    accion:
      'identificarQR',

    codigoQR:
      codigoQR,

    tipo:
      String(state.tipo || 'estudiante')
        .trim()
        .toLowerCase()

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
    // Ese DNI se envía al endpoint apiRegistrar para registrar la asistencia.
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

  camBtn.style.display =
    'block';

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
// REPORTES - FASE 1
// REPORTE DIARIO DE ESTUDIANTES
// =====================================================

const consultarReporteBtn =
  document.getElementById(
    'consultarReporteBtn'
  );


if (consultarReporteBtn) {

  consultarReporteBtn.addEventListener(
    'click',
    consultarReporte
  );

}


// =====================================================
// BOTONES DE DESCARGA DE REPORTES
// =====================================================

const descargarReporteExcelBtn =
  document.getElementById(
    'descargarReporteExcelBtn'
  );

const descargarReportePdfBtn =
  document.getElementById(
    'descargarReportePdfBtn'
  );

const verMatrizMensualBtn =
  document.getElementById(
    'verMatrizMensualBtn'
  );


if (descargarReporteExcelBtn) {

  descargarReporteExcelBtn.addEventListener(
    'click',
    descargarReporteExcel
  );

}


if (descargarReportePdfBtn) {

  descargarReportePdfBtn.addEventListener(
    'click',
    descargarReportePDF
  );

}

if (verMatrizMensualBtn) {

  verMatrizMensualBtn.addEventListener(
    'click',
    function() {
      if (!ultimoReporteMGP ||
          ultimoReporteMGP.tipoReporte !== 'mensual') {
        return;
      }

      matrizMensualVisibleMGP =
        !matrizMensualVisibleMGP;

      renderizarMatrizMensualMGP();

      verMatrizMensualBtn.textContent =
        matrizMensualVisibleMGP
          ? '📅 Ocultar matriz mensual'
          : '📅 Ver matriz mensual';
    }
  );

}

// =====================================================
// CAMBIO DE FILTRO SEGÚN TIPO DE REPORTE
// =====================================================

const reporteTipo =
  document.getElementById(
    'reporteTipo'
  );

const reporteFecha =
  document.getElementById(
    'reporteFecha'
  );

const reporteMes =
  document.getElementById(
    'reporteMes'
  );

const reporteMensualFiltros =
  document.getElementById(
    'reporteMensualFiltros'
  );


function actualizarFiltroReporte() {

  if (!reporteTipo) {
    return;
  }

  const tipo =
    reporteTipo.value
      .trim()
      .toLowerCase();


  const esMensual =
    tipo === 'mensual';

  const esAlertas =
    tipo === 'alertas';

  const usaFiltroMensual =
    esMensual || esAlertas;


  if (reporteFecha) {

    reporteFecha.style.display =
      usaFiltroMensual
        ? 'none'
        : '';

  }


  if (reporteMensualFiltros) {

    reporteMensualFiltros.style.display =
      usaFiltroMensual
        ? 'block'
        : 'none';

  }

}


if (reporteTipo) {

  reporteTipo.addEventListener(
    'change',
    actualizarFiltroReporte
  );

  actualizarFiltroReporte();

}

async function consultarReporte() {

  const fechaElemento =
    document.getElementById(
      'reporteFecha'
    );

  const gradoElemento =
    document.getElementById(
      'reporteGrado'
    );

  const tipoElemento =
    document.getElementById(
      'reporteTipo'
    );

  const mensaje =
    document.getElementById(
      'reporteMsg'
    );

  const resumen =
    document.getElementById(
      'reporteResumen'
    );

  const resultados =
    document.getElementById(
      'reporteResultados'
    );

  const tabla =
    document.getElementById(
      'reporteTablaBody'
    );


  const fecha =
    fechaElemento
      ? fechaElemento.value.trim()
      : '';

  const grado =
    gradoElemento
      ? gradoElemento.value.trim()
      : '';

  const tipoReporte =
    tipoElemento
      ? tipoElemento.value.trim().toLowerCase()
      : 'asistencia';

 
  const mesElemento =
  document.getElementById(
    'reporteMes'
  );

const mes =
  mesElemento
    ? mesElemento.value.trim()
    : '';

const esMensual =
  tipoReporte === 'mensual';

const esAlertas =
  tipoReporte === 'alertas';

const usaFiltroMensual =
  esMensual || esAlertas;

  // -------------------------------------------------
  // VALIDACIONES
  // -------------------------------------------------


  if (
  usaFiltroMensual
    ? !mes
    : !fecha
) {

  if (mensaje) {

    mensaje.textContent =
      usaFiltroMensual
        ? 'Ingrese el mes del reporte.'
        : 'Ingrese la fecha del reporte.';

  }

  return;
}
  


  if (!state.token) {

    if (mensaje) {

      mensaje.textContent =
        '❌ La sesión institucional no es válida.';

    }

    return;

  }


  // -------------------------------------------------
  // LIMPIAR RESULTADO ANTERIOR
  // -------------------------------------------------

  if (mensaje) {

    mensaje.textContent =
      '🔄 Consultando reporte...';

  }


  if (resumen) {

    resumen.style.display =
      'none';

  }


  if (resultados) {

    resultados.style.display =
      'none';

  }


  if (tabla) {

    tabla.innerHTML =
      '';

  }


  consultarReporteBtn.disabled =
    true;


  try {

    const nombreCallback =
      'respuestaReporteMGP_' +
      Date.now();


    const parametros =
      new URLSearchParams({

        action:
          'apiReportes',


        fecha:
  usaFiltroMensual
    ? ''
    : fecha,

        mes:
      mes,

        grado:
          grado,

        reporte:
          tipoReporte,

        token:
          state.token,

        callback:
          nombreCallback

      });


    const url =
      CONFIG.API_URL +
      '?' +
      parametros.toString();


    console.log(
      'Consultando reporte:',
      url
    );


    const resultado =
      await new Promise(
        function(resolve, reject) {

          const script =
            document.createElement(
              'script'
            );

          let terminado =
            false;


          function limpiar() {

            if (
              script &&
              script.parentNode
            ) {

              script.parentNode
                .removeChild(script);

            }


            try {

              delete window[
                nombreCallback
              ];

            }
            catch (error) {

              console.warn(
                'No fue posible eliminar callback REPORTE:',
                error
              );

            }

          }


          window[nombreCallback] =
            function(data) {

              if (terminado) {

                return;

              }


              terminado =
                true;

              limpiar();

              resolve(data);

            };


          script.src =
            url;


          script.async =
            true;


          script.onerror =
            function() {

              if (terminado) {

                return;

              }


              terminado =
                true;

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

        }
      );


    console.log(
      'Respuesta API REPORTES:',
      resultado
    );


    // -------------------------------------------------
    // ERROR DEL SERVIDOR
    // -------------------------------------------------

    if (
      !resultado ||
      resultado.ok !== true
    ) {

      if (mensaje) {

        mensaje.textContent =
          '❌ ' +
          (
            resultado &&
            resultado.mensaje
              ? resultado.mensaje
              : 'No fue posible obtener el reporte.'
          );

      }

      return;

    }


    // -------------------------------------------------
    // GUARDAR REPORTE ACTUAL PARA EXPORTACIÓN
    // -------------------------------------------------

    ultimoReporteMGP = {
      tipoReporte: tipoReporte,
      fecha: fecha,
      mes: mes,
      grado: grado,
      resumen: resultado.resumen || {},
      alumnos: Array.isArray(resultado.alumnos)
        ? resultado.alumnos
        : []
    };

    actualizarBotonesDescargaReporte();
    renderizarMatrizMensualMGP();

        // -------------------------------------------------
    // ALERTAS V2
    // -------------------------------------------------
    // Alertas no utiliza resultado.alumnos.
    // Se recibe directamente en resultado.alertas.
    // -------------------------------------------------

    if (esAlertas) {

      const alertas =
        Array.isArray(resultado.alertas)
          ? resultado.alertas
          : [];

      console.log(
        'Alertas recibidas:',
        alertas.length
      );

    }

    
    // -------------------------------------------------
    // RESUMEN
    // -------------------------------------------------

    const datosResumen =
      resultado.resumen || {};


    const totalElemento =
      document.getElementById(
        'reporteTotal'
      );

    const presentesElemento =
      document.getElementById(
        'reportePresentes'
      );

    const puntualesElemento =
      document.getElementById(
        'reportePuntuales'
      );

    const tardanzasElemento =
      document.getElementById(
        'reporteTardanzas'
      );

    const faltasElemento =
      document.getElementById(
        'reporteFaltas'
      );


    if (totalElemento) {

      totalElemento.textContent =
        datosResumen.total || 0;

    }


    if (presentesElemento) {

      presentesElemento.textContent =
        datosResumen.presentes || 0;

    }


    if (puntualesElemento) {

      puntualesElemento.textContent =
        datosResumen.puntuales || 0;

    }


    if (tardanzasElemento) {

      tardanzasElemento.textContent =
        datosResumen.tardanzas || 0;

    }


    if (faltasElemento) {

      faltasElemento.textContent =
        datosResumen.faltas || 0;

    }


    if (resumen) {

      resumen.style.display =
        'block';

    }


    // -------------------------------------------------
    // CARGAR GRADOS / SECCIONES EN EL SELECTOR
    //
    // No inventamos grados.
    // Los obtenemos de los datos reales
    // devueltos por apiReportes().
    // -------------------------------------------------

    if (gradoElemento) {

      const gradosActuales =
        new Set();

      const alumnos =
        Array.isArray(resultado.alumnos)
          ? resultado.alumnos
          : [];


      alumnos.forEach(
        function(alumno) {

          const gradoSeccion =
            String(
              alumno.gradoSeccion || ''
            ).trim();


          if (gradoSeccion) {

            gradosActuales.add(
              gradoSeccion
            );

          }

        }
      );


      gradosActuales.forEach(
        function(gradoSeccion) {

          const existe =
            Array.from(
              gradoElemento.options
            ).some(
              function(opcion) {

                return (
                  opcion.value ===
                  gradoSeccion
                );

              }
            );


          if (!existe) {

            const opcion =
              document.createElement(
                'option'
              );


            opcion.value =
              gradoSeccion;

            opcion.textContent =
              gradoSeccion;


            gradoElemento.appendChild(
              opcion
            );

          }

        }
      );

    }


    // -------------------------------------------------
    // TABLA
    // -------------------------------------------------

    const alumnos =
      Array.isArray(resultado.alumnos)
        ? resultado.alumnos
        : [];


    if (tabla) {

      // El encabezado cambia según el tipo de reporte.
      // El reporte diario conserva Estado/Puntualidad/Hora.
      // El reporte mensual muestra los acumulados del mes.
      const tablaElemento =
        tabla.closest('table');

      const cabecera =
        tablaElemento
          ? tablaElemento.querySelector('thead')
          : null;

      if (cabecera) {

        if (esMensual) {

          cabecera.innerHTML =
            '<tr>' +
            '<th>DNI</th>' +
            '<th>Estudiante</th>' +
            '<th>Grado / Sección</th>' +
            '<th>Días evaluados</th>' +
            '<th>Presentes</th>' +
            '<th>Faltas</th>' +
            '<th>Faltas derivadas</th>' +
            '<th>Puntuales</th>' +
            '<th>Tardanzas</th>' +
            '<th>Registros DNI</th>' +
            '<th>Límite DNI</th>' +
            '<th>Justificación</th>' +
            '<th>Detalle</th>' +
            '</tr>';

        } else {

          cabecera.innerHTML =
            '<tr>' +
            '<th>DNI</th>' +
            '<th>Estudiante</th>' +
            '<th>Grado / Sección</th>' +
            '<th>Estado</th>' +
            '<th>Puntualidad</th>' +
            '<th>Hora</th>' +
            '</tr>';

        }

      }


      alumnos.forEach(
        function(alumno) {

          const fila =
            document.createElement(
              'tr'
            );


          const celdaDni =
            document.createElement(
              'td'
            );

          celdaDni.textContent =
            alumno.dni || '';


          const celdaNombre =
            document.createElement(
              'td'
            );

          celdaNombre.textContent =
            alumno.nombre || '';


          const celdaGrado =
            document.createElement(
              'td'
            );

          celdaGrado.textContent =
            alumno.gradoSeccion || '';


          fila.appendChild(
            celdaDni
          );

          fila.appendChild(
            celdaNombre
          );

          fila.appendChild(
            celdaGrado
          );


          if (esMensual) {

            const celdaDiasEvaluados =
              document.createElement(
                'td'
              );

            celdaDiasEvaluados.textContent =
              alumno.diasEvaluados || 0;


            const celdaPresentes =
              document.createElement(
                'td'
              );

            celdaPresentes.textContent =
              alumno.presentes || 0;


            const celdaFaltas =
              document.createElement(
                'td'
              );

            celdaFaltas.textContent =
              alumno.faltas || 0;


            const celdaFaltasDerivadas =
              document.createElement(
                'td'
              );

            celdaFaltasDerivadas.textContent =
              alumno.faltasDerivadasPorTardanzas || 0;


            const celdaPuntuales =
              document.createElement(
                'td'
              );

            celdaPuntuales.textContent =
              alumno.puntuales || 0;


            const celdaTardanzas =
              document.createElement(
                'td'
              );

            celdaTardanzas.textContent =
              alumno.tardanzas || 0;


            fila.appendChild(
              celdaDiasEvaluados
            );

            fila.appendChild(
              celdaPresentes
            );

            fila.appendChild(
              celdaFaltas
            );

            fila.appendChild(
              celdaFaltasDerivadas
            );

            fila.appendChild(
              celdaPuntuales
            );

            fila.appendChild(
              celdaTardanzas
            );


            // ---------------------------------------------
            // REGLA MAX_DNI_MENSUAL
            // ---------------------------------------------
            const celdaRegistrosDni =
              document.createElement(
                'td'
              );

            celdaRegistrosDni.textContent =
              alumno.registrosDniMes || 0;


            const celdaLimiteDni =
              document.createElement(
                'td'
              );

            celdaLimiteDni.textContent =
              alumno.limiteDniMensual || 0;


            const celdaJustificacion =
              document.createElement(
                'td'
              );

            const requiereJustificacion =
              alumno.requiereJustificacion === true;

            celdaJustificacion.textContent =
              requiereJustificacion
                ? 'REQUIERE'
                : 'NO';


            if (requiereJustificacion) {
              celdaJustificacion.style.fontWeight =
                'bold';
            }


            fila.appendChild(
              celdaRegistrosDni
            );

            fila.appendChild(
              celdaLimiteDni
            );

            fila.appendChild(
              celdaJustificacion
            );


            // ---------------------------------------------
            // BOTÓN VER DETALLE DEL MES
            // ---------------------------------------------
            const celdaDetalle =
              document.createElement(
                'td'
              );

            const botonDetalle =
              document.createElement(
                'button'
              );

            botonDetalle.type = 'button';
            botonDetalle.textContent = 'Ver detalle';

            botonDetalle.style.cursor = 'pointer';
            botonDetalle.style.padding = '4px 8px';
            botonDetalle.style.borderRadius = '4px';
            botonDetalle.style.border = '1px solid #ccc';
            botonDetalle.style.background = '#f5f5f5';

            botonDetalle.addEventListener(
              'click',
              function() {

                const siguiente =
                  fila.nextElementSibling;

                if (
                  siguiente &&
                  siguiente.dataset &&
                  siguiente.dataset.detalleAlumno === '1'
                ) {
                  siguiente.remove();
                  botonDetalle.textContent = 'Ver detalle';
                  return;
                }

                const filaDetalle =
                  document.createElement(
                    'tr'
                  );

                filaDetalle.dataset.detalleAlumno = '1';

                const celdaDetalleCompleto =
                  document.createElement(
                    'td'
                  );

                celdaDetalleCompleto.colSpan = 13;
                celdaDetalleCompleto.style.padding = '10px';

                const tituloDetalle =
                  document.createElement(
                    'strong'
                  );

                tituloDetalle.textContent =
                  'Detalle diario de ' +
                  (alumno.nombre || 'estudiante');

                celdaDetalleCompleto.appendChild(
                  tituloDetalle
                );

                const tablaDetalle =
                  document.createElement(
                    'table'
                  );

                tablaDetalle.style.width = '100%';
                tablaDetalle.style.marginTop = '8px';
                tablaDetalle.style.borderCollapse = 'collapse';

                const encabezadoDetalle =
                  document.createElement(
                    'tr'
                  );

                [
                  'Fecha',
                  'Estado',
                  'Puntualidad',
                  'Hora'
                ].forEach(
                  function(texto) {
                    const th =
                      document.createElement(
                        'th'
                      );

                    th.textContent = texto;
                    th.style.textAlign = 'left';
                    th.style.padding = '4px';
                    th.style.borderBottom = '1px solid #ddd';

                    encabezadoDetalle.appendChild(th);
                  }
                );

                tablaDetalle.appendChild(
                  encabezadoDetalle
                );

                const detalleDias =
                  Array.isArray(alumno.detalleDias)
                    ? alumno.detalleDias
                    : [];

                if (!detalleDias.length) {

                  const filaSinDetalle =
                    document.createElement(
                      'tr'
                    );

                  const celdaSinDetalle =
                    document.createElement(
                      'td'
                    );

                  celdaSinDetalle.colSpan = 4;
                  celdaSinDetalle.textContent =
                    'No hay detalle diario disponible.';
                  celdaSinDetalle.style.padding = '6px';

                  filaSinDetalle.appendChild(
                    celdaSinDetalle
                  );

                  tablaDetalle.appendChild(
                    filaSinDetalle
                  );

                } else {

                  detalleDias.forEach(
                    function(dia) {

                      const filaDia =
                        document.createElement(
                          'tr'
                        );

                      [
                        dia.fecha || '',
                        dia.estado || '',
                        dia.puntualidad || '',
                        dia.hora || ''
                      ].forEach(
                        function(valor) {

                          const td =
                            document.createElement(
                              'td'
                            );

                          td.textContent = valor;
                          td.style.padding = '4px';
                          td.style.borderBottom = '1px solid #eee';

                          filaDia.appendChild(td);

                        }
                      );

                      tablaDetalle.appendChild(
                        filaDia
                      );

                    }
                  );

                }

                celdaDetalleCompleto.appendChild(
                  tablaDetalle
                );

                filaDetalle.appendChild(
                  celdaDetalleCompleto
                );

                fila.parentNode.insertBefore(
                  filaDetalle,
                  fila.nextSibling
                );

                botonDetalle.textContent = 'Ocultar detalle';

              }
            );

            celdaDetalle.appendChild(
              botonDetalle
            );

            fila.appendChild(
              celdaDetalle
            );

          } else {

            const celdaEstado =
              document.createElement(
                'td'
              );

            celdaEstado.textContent =
              alumno.estado || '';


            const celdaPuntualidad =
              document.createElement(
                'td'
              );

            celdaPuntualidad.textContent =
              alumno.puntualidad || '';


            const celdaHora =
              document.createElement(
                'td'
              );

            celdaHora.textContent =
              alumno.hora ||
              alumno.horaRegistro ||
              alumno.horaIngreso ||
              '';


            fila.appendChild(
              celdaEstado
            );

            fila.appendChild(
              celdaPuntualidad
            );

            fila.appendChild(
              celdaHora
            );

          }


          tabla.appendChild(
            fila
          );

        }
      );

    }


    if (resultados) {

      resultados.style.display =
        'block';

    }


    if (mensaje) {

      mensaje.textContent =
        '✅ Reporte generado correctamente.';

    }

  }
  catch (error) {

    console.error(
      'Error en consulta de Reportes:',
      error
    );


    if (mensaje) {

      mensaje.textContent =
        '❌ No se pudo obtener el reporte: ' +
        error.message;

    }

  }
  finally {

    consultarReporteBtn.disabled =
      false;

  }

}
// =====================================================
// MATRIZ MENSUAL V2 - APOYO PARA SIAGIE
// -----------------------------------------------------
// Usa el detalle mensual que ya devuelve apiReportes().
// No modifica datos ni crea nuevos registros.
// =====================================================

function renderizarMatrizMensualMGP() {

  const contenedorMatriz =
    document.getElementById(
      'reporteMatrizTablaContenedor'
    );

  const contenedorIncidencias =
    document.getElementById(
      'reporteIncidenciasTablaContenedor'
    );

  const contenedorPrincipal =
    document.getElementById(
      'reporteMatrizMensual'
    );

  if (!contenedorMatriz ||
      !contenedorIncidencias ||
      !contenedorPrincipal) {
    return;
  }

  contenedorMatriz.innerHTML = '';
  contenedorIncidencias.innerHTML = '';

  if (!matrizMensualVisibleMGP ||
      !ultimoReporteMGP ||
      ultimoReporteMGP.tipoReporte !== 'mensual') {
    contenedorPrincipal.style.display = 'none';
    return;
  }

  const alumnos =
    Array.isArray(ultimoReporteMGP.alumnos)
      ? ultimoReporteMGP.alumnos
      : [];

  if (!alumnos.length) {
    contenedorPrincipal.style.display = 'block';
    contenedorMatriz.textContent =
      'No hay estudiantes para mostrar.';
    contenedorIncidencias.textContent =
      'No hay incidencias para mostrar.';
    return;
  }

  const mes =
    String(ultimoReporteMGP.mes || '').trim();
  const partesMes = mes.split('-');
  const anio = Number(partesMes[0]);
  const numeroMes = Number(partesMes[1]);

  if (!anio || !numeroMes) {
    contenedorPrincipal.style.display = 'block';
    contenedorMatriz.textContent =
      'No fue posible determinar el mes del reporte.';
    return;
  }

  const ultimoDia =
    new Date(anio, numeroMes, 0).getDate();

  const diasEvaluados = new Set();
  const datosPorAlumno = [];
  const incidencias = [];

  alumnos.forEach(function(alumno, indiceAlumno) {

    const porFecha = {};
    const detalleDias =
      Array.isArray(alumno.detalleDias)
        ? alumno.detalleDias
        : [];

    detalleDias.forEach(function(dia) {
      const fecha =
        String(dia.fecha || '').trim();

      const partesFecha = fecha.split('/');
      if (partesFecha.length !== 3) {
        return;
      }

      const diaNumero = Number(partesFecha[0]);
      if (diaNumero < 1 || diaNumero > ultimoDia) {
        return;
      }

      diasEvaluados.add(diaNumero);
      porFecha[diaNumero] = {
        codigo: String(dia.codigo || '').trim().toUpperCase(),
        fecha: fecha,
        estado: String(dia.estado || '').trim().toUpperCase(),
        puntualidad: String(dia.puntualidad || '').trim().toUpperCase(),
        hora: String(dia.hora || '').trim()
      };
    });

    datosPorAlumno.push({
      alumno: alumno,
      porFecha: porFecha,
      numero: indiceAlumno + 1
    });
  });

  // ---------------------------------------------------
  // TABLA MATRIZ
  // ---------------------------------------------------

  const tablaMatriz =
    document.createElement('table');

  tablaMatriz.style.borderCollapse = 'collapse';
  tablaMatriz.style.minWidth = '1100px';
  tablaMatriz.style.width = '100%';

  const thead =
    document.createElement('thead');
  const filaCabecera =
    document.createElement('tr');

  [
    'N.º',
    'DNI',
    'APELLIDOS Y NOMBRES'
  ].forEach(function(texto) {
    const th = document.createElement('th');
    th.textContent = texto;
    th.style.padding = '5px';
    th.style.border = '1px solid #ccc';
    th.style.whiteSpace = 'nowrap';
    filaCabecera.appendChild(th);
  });

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const th = document.createElement('th');
    th.textContent = String(dia);
    th.style.padding = '5px';
    th.style.border = '1px solid #ccc';
    th.style.textAlign = 'center';
    th.style.minWidth = '28px';
    filaCabecera.appendChild(th);
  }

  thead.appendChild(filaCabecera);
  tablaMatriz.appendChild(thead);

  const tbody = document.createElement('tbody');

  datosPorAlumno.forEach(function(item) {
    const fila = document.createElement('tr');

    [
      item.numero,
      item.alumno.dni || '',
      item.alumno.nombre || ''
    ].forEach(function(valor) {
      const td = document.createElement('td');
      td.textContent = valor;
      td.style.padding = '5px';
      td.style.border = '1px solid #ccc';
      td.style.whiteSpace = 'nowrap';
      fila.appendChild(td);
    });

    for (let dia = 1; dia <= ultimoDia; dia++) {
      const td = document.createElement('td');
      const registro = item.porFecha[dia];

      // Si el día fue evaluado, el código proviene
      // directamente de las reglas mensuales actuales.
      // Si no fue evaluado, se muestra D.
      let codigo = '';

      if (registro) {
        codigo = registro.codigo || '';
      } else if (diasEvaluados.has(dia)) {
        codigo = 'F';
      } else {
        codigo = 'D';
      }

      td.textContent = codigo;
      td.style.padding = '5px';
      td.style.border = '1px solid #ccc';
      td.style.textAlign = 'center';
      td.style.fontWeight = 'bold';
      td.style.minWidth = '28px';
      fila.appendChild(td);

      if (
        registro &&
        ['T', 'U', 'F', 'J'].indexOf(codigo) !== -1
      ) {
        incidencias.push({
          numero: item.numero,
          nombre: item.alumno.nombre || '',
          dni: item.alumno.dni || '',
          dia: dia,
          fecha: registro.fecha || '',
          codigo: codigo
        });
      }
    }

    tbody.appendChild(fila);
  });

  tablaMatriz.appendChild(tbody);
  contenedorMatriz.appendChild(tablaMatriz);

  // ---------------------------------------------------
  // LEYENDA DE CÓDIGOS
  // ---------------------------------------------------

  const leyenda = document.createElement('div');
  leyenda.style.marginTop = '12px';
  leyenda.style.padding = '10px';
  leyenda.style.border = '1px solid #ccc';
  leyenda.style.background = '#f8f8f8';

  const tituloLeyenda = document.createElement('strong');
  tituloLeyenda.textContent = 'Leyenda de códigos';
  leyenda.appendChild(tituloLeyenda);

  const tablaLeyenda = document.createElement('table');
  tablaLeyenda.style.borderCollapse = 'collapse';
  tablaLeyenda.style.marginTop = '7px';

  [
    ['A', 'Asistió'],
    ['T', 'Tardanza'],
    ['U', 'Tardanza justificada'],
    ['F', 'Falta'],
    ['J', 'Falta justificada'],
    ['D', 'Día no evaluable']
  ].forEach(function(item) {
    const fila = document.createElement('tr');

    item.forEach(function(valor, indice) {
      const td = document.createElement('td');
      td.textContent = valor;
      td.style.padding = '4px 10px';
      td.style.border = '1px solid #ccc';
      if (indice === 0) {
        td.style.fontWeight = 'bold';
        td.style.textAlign = 'center';
      }
      fila.appendChild(td);
    });

    tablaLeyenda.appendChild(fila);
  });

  leyenda.appendChild(tablaLeyenda);

  const notaLeyenda = document.createElement('div');
  notaLeyenda.style.marginTop = '8px';
  notaLeyenda.textContent =
    'Nota: Las incidencias para SIAGIE se muestran en la sección siguiente y corresponden a F, T, U y J.';
  leyenda.appendChild(notaLeyenda);

  contenedorMatriz.appendChild(leyenda);

  // ---------------------------------------------------
  // TABLA DE INCIDENCIAS
  // ---------------------------------------------------

  incidencias.sort(function(a, b) {
    if (a.numero !== b.numero) {
      return a.numero - b.numero;
    }
    return a.dia - b.dia;
  });

  const tablaIncidencias =
    document.createElement('table');

  tablaIncidencias.style.borderCollapse = 'collapse';
  tablaIncidencias.style.width = '100%';
  tablaIncidencias.style.minWidth = '650px';

  const filaIncidenciasCabecera =
    document.createElement('tr');

  [
    'N.º',
    'DNI',
    'ESTUDIANTE',
    'DÍA',
    'FECHA',
    'CÓDIGO'
  ].forEach(function(texto) {
    const th = document.createElement('th');
    th.textContent = texto;
    th.style.padding = '6px';
    th.style.border = '1px solid #ccc';
    th.style.textAlign = 'left';
    filaIncidenciasCabecera.appendChild(th);
  });

  const theadIncidencias =
    document.createElement('thead');
  theadIncidencias.appendChild(filaIncidenciasCabecera);
  tablaIncidencias.appendChild(theadIncidencias);

  const tbodyIncidencias =
    document.createElement('tbody');

  incidencias.forEach(function(item) {
    const fila = document.createElement('tr');

    [
      item.numero,
      item.dni,
      item.nombre,
      item.dia,
      item.fecha,
      item.codigo
    ].forEach(function(valor) {
      const td = document.createElement('td');
      td.textContent = valor;
      td.style.padding = '6px';
      td.style.border = '1px solid #ccc';
      fila.appendChild(td);
    });

    tbodyIncidencias.appendChild(fila);
  });

  tablaIncidencias.appendChild(tbodyIncidencias);
  contenedorIncidencias.appendChild(tablaIncidencias);

  if (!incidencias.length) {
    contenedorIncidencias.textContent =
      'No se encontraron faltas ni tardanzas en el período seleccionado.';
  }

  contenedorPrincipal.style.display = 'block';
}


// =====================================================
// EXPORTACIÓN DE REPORTES V2
// PDF Y EXCEL
// -----------------------------------------------------
// Estas funciones exportan exactamente el último reporte
// consultado. No vuelven a consultar ni modifican datos.
// =====================================================

function actualizarBotonesDescargaReporte() {

  const habilitado =
    !!ultimoReporteMGP &&
    Array.isArray(ultimoReporteMGP.alumnos);

  if (descargarReporteExcelBtn) {
    descargarReporteExcelBtn.disabled = !habilitado;
  }

  if (descargarReportePdfBtn) {
    descargarReportePdfBtn.disabled = !habilitado;
  }

  const esMensual =
    habilitado &&
    ultimoReporteMGP.tipoReporte === 'mensual';

  if (verMatrizMensualBtn) {
    verMatrizMensualBtn.disabled = !esMensual;
  }

  if (!esMensual) {
    matrizMensualVisibleMGP = false;
    if (verMatrizMensualBtn) {
      verMatrizMensualBtn.textContent =
        '📅 Ver matriz mensual';
    }
    renderizarMatrizMensualMGP();
  }

}


function obtenerDatosExportacionReporte() {

  if (!ultimoReporteMGP) {
    throw new Error(
      'Primero genere un reporte.'
    );
  }

  const reporte = ultimoReporteMGP;
  const esMensual =
    reporte.tipoReporte === 'mensual';

  let encabezados = [];
  let filas = [];

  if (esMensual) {

    encabezados = [
      'DNI',
      'Estudiante',
      'Grado / Sección',
      'Días evaluados',
      'Presentes',
      'Faltas',
      'Faltas derivadas',
      'Puntuales',
      'Tardanzas',
      'Registros DNI',
      'Límite DNI',
      'Justificación'
    ];

    filas = reporte.alumnos.map(function(alumno) {
      return [
        alumno.dni || '',
        alumno.nombre || '',
        alumno.gradoSeccion || '',
        alumno.diasEvaluados || 0,
        alumno.presentes || 0,
        alumno.faltas || 0,
        alumno.faltasDerivadasPorTardanzas || 0,
        alumno.puntuales || 0,
        alumno.tardanzas || 0,
        alumno.registrosDniMes || 0,
        alumno.limiteDniMensual || 0,
        alumno.requiereJustificacion === true
          ? 'REQUIERE'
          : 'NO'
      ];
    });

  } else {

    encabezados = [
      'DNI',
      'Estudiante',
      'Grado / Sección',
      'Estado',
      'Puntualidad',
      'Hora'
    ];

    filas = reporte.alumnos.map(function(alumno) {
      return [
        alumno.dni || '',
        alumno.nombre || '',
        alumno.gradoSeccion || '',
        alumno.estado || '',
        alumno.puntualidad || '',
        alumno.hora ||
          alumno.horaRegistro ||
          alumno.horaIngreso ||
          ''
      ];
    });

  }

  return {
    reporte: reporte,
    esMensual: esMensual,
    encabezados: encabezados,
    filas: filas
  };
}


function obtenerTituloReporteMGP(datos) {

  const nombres = {
    asistencia: 'REPORTE DE ASISTENCIA',
    faltas: 'REPORTE DE FALTAS',
    tardanzas: 'REPORTE DE TARDANZAS',
    mensual: 'REPORTE MENSUAL DE ASISTENCIA'
  };

  return nombres[datos.reporte.tipoReporte] ||
    'REPORTE DE ASISTENCIA';
}


function obtenerSubtituloReporteMGP(datos) {

  const reporte = datos.reporte;
  const partes = [];

  if (datos.esMensual) {
    if (reporte.mes) {
      partes.push('Mes: ' + reporte.mes);
    }
  } else if (reporte.fecha) {
    const partesFecha = reporte.fecha.split('-');
    if (partesFecha.length === 3) {
      partes.push(
        'Fecha: ' +
        partesFecha[2] + '/' +
        partesFecha[1] + '/' +
        partesFecha[0]
      );
    } else {
      partes.push('Fecha: ' + reporte.fecha);
    }
  }

  partes.push(
    'Grado / Sección: ' +
    (reporte.grado || 'Todos')
  );

  return partes.join('   |   ');
}


function obtenerDatosMatrizMensualMGP() {

  const reporte = ultimoReporteMGP;

  if (!reporte || reporte.tipoReporte !== 'mensual') {
    return {
      encabezados: [],
      filas: [],
      incidencias: []
    };
  }

  const mes = String(reporte.mes || '').trim();
  const partesMes = mes.split('-');
  const anio = Number(partesMes[0]);
  const numeroMes = Number(partesMes[1]);
  const ultimoDia =
    anio && numeroMes
      ? new Date(anio, numeroMes, 0).getDate()
      : 0;

  const diasEvaluados = new Set();
  const datosPorAlumno = [];

  (Array.isArray(reporte.alumnos) ? reporte.alumnos : []).forEach(function(alumno, indiceAlumno) {
    const porFecha = {};
    const detalleDias =
      Array.isArray(alumno.detalleDias)
        ? alumno.detalleDias
        : [];

    detalleDias.forEach(function(dia) {
      const fecha = String(dia.fecha || '').trim();
      const partesFecha = fecha.split('/');
      if (partesFecha.length !== 3) return;

      const diaNumero = Number(partesFecha[0]);
      if (diaNumero < 1 || diaNumero > ultimoDia) return;

      diasEvaluados.add(diaNumero);
      porFecha[diaNumero] = {
        codigo: String(dia.codigo || '').trim().toUpperCase(),
        fecha: fecha
      };
    });

    datosPorAlumno.push({
      numero: indiceAlumno + 1,
      dni: alumno.dni || '',
      nombre: alumno.nombre || '',
      porFecha: porFecha
    });
  });

  const encabezados = ['N.º', 'DNI', 'APELLIDOS Y NOMBRES'];
  for (let dia = 1; dia <= ultimoDia; dia++) {
    encabezados.push(String(dia));
  }

  const filas = [];
  const incidencias = [];

  datosPorAlumno.forEach(function(item) {
    const fila = [item.numero, item.dni, item.nombre];

    for (let dia = 1; dia <= ultimoDia; dia++) {
      const registro = item.porFecha[dia];
      let codigo = '';

      if (registro) {
        codigo = registro.codigo || '';
      } else if (diasEvaluados.has(dia)) {
        codigo = 'F';
      } else {
        codigo = 'D';
      }

      fila.push(codigo);

      if (['T', 'U', 'F', 'J'].indexOf(codigo) !== -1 && registro) {
        incidencias.push([
          item.numero,
          item.dni,
          item.nombre,
          dia,
          registro.fecha || '',
          codigo
        ]);
      }
    }

    filas.push(fila);
  });

  return {
    encabezados: encabezados,
    filas: filas,
    incidencias: incidencias
  };
}


function descargarReporteExcel() {

  try {

    if (
      typeof XLSX === 'undefined'
    ) {
      throw new Error(
        'No se cargó el módulo de Excel.'
      );
    }

    const datos =
      obtenerDatosExportacionReporte();

    const titulo =
      obtenerTituloReporteMGP(datos);

    const subtitulo =
      obtenerSubtituloReporteMGP(datos);

    const filasHoja = [
      ['IE JEC MANUEL GONZALES PRADA'],
      [titulo],
      [subtitulo],
      [],
      datos.encabezados,
      ...datos.filas
    ];

    const hoja =
      XLSX.utils.aoa_to_sheet(filasHoja);

    hoja['!cols'] =
      datos.encabezados.map(function(encabezado, indice) {
        let maximo = String(encabezado).length;

        datos.filas.forEach(function(fila) {
          maximo = Math.max(
            maximo,
            String(fila[indice] ?? '').length
          );
        });

        return {
          wch: Math.min(40, Math.max(10, maximo + 2))
        };
      });

    const libro =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      libro,
      hoja,
      datos.esMensual
        ? 'Reporte Mensual'
        : 'Reporte Diario'
    );

    if (datos.esMensual) {
      const matriz = obtenerDatosMatrizMensualMGP();
      const filasMatriz = [
        ['IE JEC MANUEL GONZALES PRADA'],
        ['MATRIZ MENSUAL DE ASISTENCIA'],
        [subtitulo],
        [],
        matriz.encabezados,
        ...matriz.filas,
        [],
        ['LEYENDA DE CÓDIGOS'],
        ['A', 'Asistió'],
        ['T', 'Tardanza'],
        ['U', 'Tardanza justificada'],
        ['F', 'Falta'],
        ['J', 'Falta justificada'],
        ['D', 'Día no evaluable']
      ];

      const hojaMatriz = XLSX.utils.aoa_to_sheet(filasMatriz);
      hojaMatriz['!cols'] = matriz.encabezados.map(function(encabezado, indice) {
        if (indice === 2) return { wch: 36 };
        return { wch: Math.max(5, String(encabezado).length + 2) };
      });

      XLSX.utils.book_append_sheet(
        libro,
        hojaMatriz,
        'Matriz Mensual'
      );

      const filasIncidencias = [
        ['IE JEC MANUEL GONZALES PRADA'],
        ['INCIDENCIAS PARA SIAGIE'],
        [subtitulo],
        [],
        ['N.º', 'DNI', 'ESTUDIANTE', 'DÍA', 'FECHA', 'CÓDIGO'],
        ...matriz.incidencias,
        [],
        ['CÓDIGOS CONSIDERADOS COMO INCIDENCIA'],
        ['T', 'Tardanza'],
        ['U', 'Tardanza justificada'],
        ['F', 'Falta'],
        ['J', 'Falta justificada']
      ];

      const hojaIncidencias = XLSX.utils.aoa_to_sheet(filasIncidencias);
      hojaIncidencias['!cols'] = [
        { wch: 7 },
        { wch: 14 },
        { wch: 36 },
        { wch: 8 },
        { wch: 14 },
        { wch: 10 }
      ];

      XLSX.utils.book_append_sheet(
        libro,
        hojaIncidencias,
        'Incidencias SIAGIE'
      );
    }

    const fechaArchivo =
      datos.reporte.fecha ||
      datos.reporte.mes ||
      'reporte';

    XLSX.writeFile(
      libro,
      'Asistencia_MGP_' +
      datos.reporte.tipoReporte.toUpperCase() +
      '_' +
      fechaArchivo.replace(/-/g, '') +
      '.xlsx'
    );

  }
  catch (error) {

    console.error(
      'Error exportando Excel:',
      error
    );

    const mensaje =
      document.getElementById(
        'reporteMsg'
      );

    if (mensaje) {
      mensaje.textContent =
        '❌ No se pudo descargar Excel: ' +
        error.message;
    }

  }

}


function descargarReportePDF() {

  try {

    if (
      typeof window.jspdf === 'undefined' ||
      typeof window.jspdf.jsPDF === 'undefined'
    ) {
      throw new Error(
        'No se cargó el módulo PDF.'
      );
    }

    const datos =
      obtenerDatosExportacionReporte();

    const jsPDF =
      window.jspdf.jsPDF;

    const doc =
      new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

    const titulo =
      obtenerTituloReporteMGP(datos);

    const subtitulo =
      obtenerSubtituloReporteMGP(datos);

    doc.setFontSize(14);
    doc.text(
      'IE JEC MANUEL GONZALES PRADA',
      14,
      13
    );

    doc.setFontSize(12);
    doc.text(
      titulo,
      14,
      20
    );

    doc.setFontSize(9);
    doc.text(
      subtitulo,
      14,
      26
    );

    if (
      typeof doc.autoTable !== 'function'
    ) {
      throw new Error(
        'No se cargó el módulo de tablas PDF.'
      );
    }

    doc.autoTable({
      head: [datos.encabezados],
      body: datos.filas,
      startY: 30,
      theme: 'grid',
      styles: {
        fontSize: datos.esMensual ? 6.5 : 8,
        cellPadding: 2,
        overflow: 'linebreak'
      },
      headStyles: {
        fontSize: datos.esMensual ? 6.5 : 8
      },
      margin: {
        left: 10,
        right: 10
      }
    });

    if (datos.esMensual) {
      const matriz = obtenerDatosMatrizMensualMGP();
      let siguienteY = doc.lastAutoTable.finalY + 8;

      doc.setFontSize(11);
      doc.text('MATRIZ MENSUAL DE ASISTENCIA', 10, siguienteY);
      siguienteY += 4;

      doc.autoTable({
        head: [matriz.encabezados],
        body: matriz.filas,
        startY: siguienteY,
        theme: 'grid',
        styles: {
          fontSize: 5,
          cellPadding: 1.2,
          overflow: 'linebreak'
        },
        headStyles: {
          fontSize: 5
        },
        margin: {
          left: 8,
          right: 8
        }
      });

      siguienteY = doc.lastAutoTable.finalY + 6;

      doc.setFontSize(10);
      doc.text('LEYENDA DE CÓDIGOS', 10, siguienteY);
      siguienteY += 2;

      doc.autoTable({
        head: [['Código', 'Significado']],
        body: [
          ['A', 'Asistió'],
          ['T', 'Tardanza'],
          ['U', 'Tardanza justificada'],
          ['F', 'Falta'],
          ['J', 'Falta justificada'],
          ['D', 'Día no evaluable']
        ],
        startY: siguienteY,
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 1.5
        },
        margin: {
          left: 10,
          right: 10
        }
      });

      siguienteY = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(10);
      doc.text('INCIDENCIAS PARA SIAGIE', 10, siguienteY);
      siguienteY += 2;

      doc.autoTable({
        head: [['N.º', 'DNI', 'ESTUDIANTE', 'DÍA', 'FECHA', 'CÓDIGO']],
        body: matriz.incidencias,
        startY: siguienteY,
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          overflow: 'linebreak'
        },
        margin: {
          left: 10,
          right: 10
        }
      });
    }

    const fechaArchivo =
      datos.reporte.fecha ||
      datos.reporte.mes ||
      'reporte';

    doc.save(
      'Asistencia_MGP_' +
      datos.reporte.tipoReporte.toUpperCase() +
      '_' +
      fechaArchivo.replace(/-/g, '') +
      '.pdf'
    );

  }
  catch (error) {

    console.error(
      'Error exportando PDF:',
      error
    );

    const mensaje =
      document.getElementById(
        'reporteMsg'
      );

    if (mensaje) {
      mensaje.textContent =
        '❌ No se pudo descargar PDF: ' +
        error.message;
    }

  }

}


actualizarBotonesDescargaReporte();


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

document.getElementById('dniBtn')
  .addEventListener('click', function() {

    const dni =
      document.getElementById('dniManual').value.trim();

    const mensaje =
      document.getElementById('regMsg');

    if (!dni) {

      if (mensaje) {
        mensaje.textContent =
          'Ingrese el DNI.';
      }

      return;
    }

    registrarAsistenciaBackend(dni);

  });

// =====================================================
// COMPATIBILIDAD FINAL V1 / V2
// =====================================================
// Estos alias garantizan que los botones del HTML puedan
// llamar directamente a las funciones aunque app.js haya
// sido cargado antes o después del HTML.
window.activarCamara = iniciarCamara;
window.detenerCamara = detenerCamara;
window.cambiarCamara = cambiarCamara;
