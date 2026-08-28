const CONFIG = {
  // VERSION BASE CARNET/ASISTENCIA V2: 2026-08-25
  CLAVE_CONSULTA_DOCENTES: 'MGP2026',

  // =====================================================
  // BASE DE DATOS V2
  // =====================================================

  HOJA_ID_ESTUDIANTES:
    "1h730RdttmSRULqd54ITVp6c4AJaaRNdPw14uvq9CWRs",

  HOJA_ID_PERSONAL:
    "1h730RdttmSRULqd54ITVp6c4AJaaRNdPw14uvq9CWRs",

  NOMBRE_HOJA_BASE:
    "ESTUDIANTES",

  NOMBRE_HOJA_PERSONAL:
    "PERSONAL",

  NOMBRE_HOJA_REGISTRO_ESTUDIANTES:
    "ASISTENCIA",

  NOMBRE_HOJA_REGISTRO_PERSONAL:
    "ASISTENCIA",

  ZONA_HORARIA:
    "America/Lima",

  HORA_INGRESO_ESTUDIANTES:
    "07:30",

  HORA_INGRESO_PERSONAL:
    "08:00"
};

/* =========================================================
   WEB APP
========================================================= */

function doGet(e) {

  const params = e && e.parameter
    ? e.parameter
    : {};

  

  if (params.action === 'apiLogin') {

    return procesarAPI(params);

  }

  if (params.action === 'apiRegistrar') {

    return procesarAPI(params);

  }

  // =====================================================
  // CARNETS V2
  // =====================================================
  if (
    params.action === 'apiCrearCarnet' ||
    params.action === 'apiConsultarCarnet' ||
    params.action === 'apiAnularCarnet'
  ) {

    return procesarAPI(params);

  }

  /*
   * =========================================================
   * IDENTIFICAR QR
   * =========================================================
   * Primero identifica al estudiante. El app.js actual
   * utilizará resultado.estudiante.dni para llamar después
   * a apiRegistrar.
   */
  if (params.accion === 'identificarQR') {

    const resultadoQR =
      apiIdentificarQRV2(
        String(params.codigoQR || '').trim()
      );

    const callbackQR =
      String(params.callback || '').trim();

    const jsonQR =
      JSON.stringify(resultadoQR);

    if (callbackQR) {

      return ContentService
        .createTextOutput(
          callbackQR +
          '(' +
          jsonQR +
          ');'
        )
        .setMimeType(
          ContentService.MimeType.JAVASCRIPT
        );

    }

    return ContentService
      .createTextOutput(jsonQR)
      .setMimeType(
        ContentService.MimeType.JSON
      );
  }

  if (params.action === 'apiConsultar') {

    return procesarAPI(params);

  }

  if (params.action === 'apiReportes') {
  return procesarAPI(params);
}

if (params.page === 'reportes') {

  return HtmlService
    .createHtmlOutputFromFile('reportes')
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );

}

  return HtmlService
    .createHtmlOutput(
      '<h2>Servidor de asistencia activo</h2>'
    )
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}


/* =====================================================
   DEVOLVER RESPUESTA JSONP
   ===================================================== */

function devolverJSONP(resultado, callback) {

  const nombreCallback =
    callback || 'callback';

  return ContentService
    .createTextOutput(
      nombreCallback +
      '(' +
      JSON.stringify(resultado) +
      ')'
    )
    .setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
}


/* =========================================================
   API
========================================================= */

/* =========================================================
   SEGURIDAD V2 - SESIONES Y AUTORIZACIÓN
   ---------------------------------------------------------
   El LOGIN emite un token temporal. Las acciones institucionales
   validan ese token y el permiso correspondiente antes de ejecutar.
   No modifica la matriz de permisos ni la lógica de asistencia.
   ========================================================= */

const MGP_SESION_PREFIJO_V2_ = 'MGP_SESION_V2_';
const MGP_SESION_DURACION_MS_V2_ = 8 * 60 * 60 * 1000;

function crearSesionV2_(usuario) {
  const token =
    Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '');
  const ahora = Date.now();
  const sesion = {
    usuario: String(usuario.usuario || ''),
    rol: String(usuario.rol || '').trim().toUpperCase(),
    idUsuario: String(usuario.idUsuario || ''),
    idPersonal: String(usuario.idPersonal || ''),
    creado: ahora,
    expira: ahora + MGP_SESION_DURACION_MS_V2_
  };
  PropertiesService.getScriptProperties().setProperty(
    MGP_SESION_PREFIJO_V2_ + token,
    JSON.stringify(sesion)
  );
  return { token: token, expira: sesion.expira };
}

function validarSesionV2_(token) {
  const tokenLimpio = String(token || '').trim();
  if (!tokenLimpio) {
    return { ok: false, mensaje: 'Sesión institucional no proporcionada.' };
  }
  const propiedades = PropertiesService.getScriptProperties();
  const clave = MGP_SESION_PREFIJO_V2_ + tokenLimpio;
  const texto = propiedades.getProperty(clave);
  if (!texto) {
    return { ok: false, mensaje: 'Sesión institucional inválida o vencida.' };
  }
  let sesion;
  try {
    sesion = JSON.parse(texto);
  }
  catch (error) {
    propiedades.deleteProperty(clave);
    return { ok: false, mensaje: 'Sesión institucional inválida.' };
  }
  if (!sesion.expira || Date.now() >= Number(sesion.expira)) {
    propiedades.deleteProperty(clave);
    return { ok: false, mensaje: 'La sesión institucional ha vencido.' };
  }
  const permisos = obtenerPermisosRolV2_(sesion.rol);
  if (!permisos) {
    propiedades.deleteProperty(clave);
    return {
      ok: false,
      mensaje: 'El rol de la sesión no tiene permisos V2 configurados.'
    };
  }
  return {
    ok: true,
    usuario: sesion.usuario,
    rol: sesion.rol,
    idUsuario: sesion.idUsuario,
    idPersonal: sesion.idPersonal,
    permisos: permisos
  };
}

function obtenerPermisoParaAccionV2_(action) {
  const mapa = {
    apiRegistrar: 'registrarAsistencia',
    apiReportes: 'verReportes',
    apiCrearCarnet: 'administrarQR',
    apiConsultarCarnet: 'administrarQR',
    apiAnularCarnet: 'administrarQR'
  };
  return mapa[action] || null;
}

function procesarAPI(params) {

  const action = String(params.action || '').trim();
  const callback = String(params.callback || '').trim();

  let resultado;

  // =====================================================
  // SEGURIDAD V2
  // apiLogin y apiConsultar son públicos.
  // Las demás acciones institucionales requieren sesión.
  // =====================================================
  if (
    action !== 'apiLogin' &&
    action !== 'apiConsultar'
  ) {

    const sesion =
      validarSesionV2_(params.token);

    if (!sesion.ok) {
      resultado = {
        ok: false,
        exito: false,
        codigo: 'SESION_NO_AUTORIZADA',
        mensaje: sesion.mensaje
      };
    }
    else {

      const permisoRequerido =
        obtenerPermisoParaAccionV2_(action);

      if (
        permisoRequerido &&
        sesion.permisos[permisoRequerido] !== true
      ) {
        resultado = {
          ok: false,
          exito: false,
          codigo: 'PERMISO_DENEGADO',
          mensaje:
            'El rol ' + sesion.rol +
            ' no tiene permiso para realizar esta acción.'
        };
      }
    }
  }

  try {

    if (!resultado) {

    // =====================================================
    // LOGIN
    // =====================================================

    if (action === 'apiLogin') {

  const usuario =
    String(params.user || '').trim();

  const password =
    String(params.pass || '').trim();

  resultado =
    validarLoginServidorV2(
      usuario,
      password
    );
}

    // =====================================================
    // REGISTRO DE ASISTENCIA
    // =====================================================

    else if (action === 'apiRegistrar') {

      resultado = registrarAsistenciaServidor(
        params.id || '',
        params.tipo || 'estudiante',
        params.estado || 'INGRESO'
      );
    }


    // =====================================================
    // CARNETS V2
    // =====================================================

    else if (action === 'apiCrearCarnet') {

      resultado = apiCrearCarnet(params);

    }

    else if (action === 'apiConsultarCarnet') {

      resultado = apiConsultarCarnet(params);

    }

    else if (action === 'apiAnularCarnet') {

      resultado = apiAnularCarnet(params);

    }


    // =====================================================
    // CONSULTA PÚBLICA POR DNI
    // =====================================================

    else if (action === 'apiConsultar') {

      resultado = apiConsultar({
        parameter: params
      });
    }

// =====================================================
// REPORTES DE ASISTENCIA
// =====================================================
else if (action === 'apiReportes') {

  resultado =
    apiReportes({
      parameter: params
    });

}


    // =====================================================
    // ACCIÓN NO RECONOCIDA
    // =====================================================

    else {

      resultado = {
        ok: false,
        exito: false,
        mensaje: 'Acción no válida: ' + action
      };
    }

    }


  } catch (error) {

    resultado = {
      ok: false,
      exito: false,
      mensaje: 'Error del servidor: ' + error.message
    };

  }


  // =====================================================
  // RESPUESTA JSON / JSONP
  // =====================================================

  const json = JSON.stringify(resultado);


  if (callback) {

    return ContentService
      .createTextOutput(
        callback + '(' + json + ');'
      )
      .setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );

  }


  return ContentService
    .createTextOutput(json)
    .setMimeType(
      ContentService.MimeType.JSON
    );

}

/* =========================================================
   IDENTIFICAR QR PARA V2
========================================================= */

function apiIdentificarQRV2(codigoQR) {

  try {

    const codigo =
      String(codigoQR || '').trim();

    if (!codigo) {

      return {
        ok: false,
        mensaje:
          'No se recibió ningún código QR.'
      };
    }

    /*
     * QR Legacy 2026:
     * el primer campo contiene el DNI.
     */

    const partes =
      codigo.split(/[\n,;|-]+/);

    const dni =
      String(partes[0] || '')
        .replace(/\s+/g, '')
        .trim();

    if (!/^\d{8}$/.test(dni)) {

      return {
        ok: false,
        tipoQR: 'DESCONOCIDO',
        mensaje:
          'El QR no contiene un DNI válido de 8 dígitos.'
      };
    }

    const resultado =
      buscarPersona(
        dni,
        'estudiante'
      );

    if (!resultado.encontrado) {

      return {
        ok: false,
        tipoQR: 'LEGACY_2026',
        dni: dni,
        mensaje: resultado.mensaje
      };
    }

    const datos =
      resultado.datos || {};

    /*
     * CONTRATO CON EL app.js ACTUAL:
     *
     * resultado.tipoQR === 'LEGACY_2026'
     * resultado.estudiante.dni
     *
     * Esto es lo que activa la llamada posterior
     * a registrarAsistenciaBackend().
     */

    return {

      ok: true,

      tipoQR:
        'LEGACY_2026',

      dni:
        dni,

      estudiante: {

        dni:
          dni,

        apellidoPaterno:
          datos.nombre || '',

        apellidoMaterno:
          '',

        nombres:
          '',

        grado:
          String(
            datos.gradoSeccion || ''
          ).split(' ')[0],

        seccion:
          String(
            datos.gradoSeccion || ''
          ).split(' ').slice(1).join(' '),

        turno:
          datos.perfil || ''
      },

      datos:
        datos,

      mensaje:
        'Estudiante identificado correctamente.'
    };

  }
  catch (error) {

    return {

      ok: false,

      mensaje:
        'Error al identificar QR: ' +
        error.message
    };
  }
}


/* =========================================================
   REGISTRAR ASISTENCIA
========================================================= */

function registrarAsistenciaServidor(
  idCodigo,
  tipoPersona,
  estado
) {

  const rawQrData =
    String(idCodigo || "").trim();

   


  if (!rawQrData) {

    return {
      exito: false,
      mensaje: "Sin datos de DNI/QR."
    };

  }


  const buscado =
    procesarLecturaQR(
      rawQrData,
      tipoPersona
    );


  if (!buscado.encontrado) {

    return {
      exito: false,
      mensaje: buscado.mensaje
    };

  }


  // =====================================================
  // BUSCAR CARNET ACTIVO
  // =====================================================
  // El registro de asistencia NO genera el ID_CARNET.
  // Lo obtiene del maestro CARNETS mediante ID_PERSONA/DNI.
  // Si no existe carnet activo, se conserva el comportamiento
  // anterior y la asistencia puede registrarse con ID_CARNET vacío.
  // =====================================================

  let idCarnetActivo = "";

  const carnetEncontrado =
    buscarCarnetActivoPorPersonaV2_(
      buscado.datos.id,
      buscado.datos.dni
    );

  if (
    carnetEncontrado &&
    carnetEncontrado.encontrado &&
    carnetEncontrado.carnet
  ) {

    idCarnetActivo =
      String(
        carnetEncontrado.carnet.idCarnet || ""
      ).trim();

  }

  // =====================================================
  // TRAZABILIDAD V2
  // =====================================================
  // El ID_CARNET se resuelve antes de guardar la asistencia.
  // No se genera aquí y no se modifica Legacy.
  Logger.log(
    'ASISTENCIA V2 | ID_PERSONA=' +
    String(buscado.datos.id || '') +
    ' | DNI=' +
    String(buscado.datos.dni || '') +
    ' | ID_CARNET=' +
    idCarnetActivo
  );

  const res =
  registrarAsistencia({

    idPersona:
      buscado.datos.id,

    dni:
      buscado.datos.dni,

    nombre:
      buscado.datos.nombre,

    gradoSeccion:
      buscado.datos.gradoSeccion,

    estado:
      estado,

    tipoPersona:
      tipoPersona,

    metodo:
      "DNI/QR",

    tipoRegistro:
      "ASISTENCIA",

    usuarioRegistro:
      "SISTEMA",

    idCarnet:
      idCarnetActivo,

    observacion:
      ""

  });

  Logger.log(
    'ASISTENCIA V2 | GUARDADO | ID_REGISTRO=' +
    String(res.idRegistro || '') +
    ' | ID_CARNET=' +
    idCarnetActivo +
    ' | EXITO=' +
    String(res.exito)
  );

  return {

    exito:
      res.exito,

    mensaje:
      res.mensaje,

    hora:
      res.hora,

    estado:
      estado,

    puntualidad:
      res.puntualidad,

    idCarnet:
      idCarnetActivo,

    datos: Object.assign(
      {},
      buscado.datos,
      {
        idCarnet:
          idCarnetActivo
      }
    )

  };
}


/* =========================================================
   PROCESAR QR
========================================================= */

function procesarLecturaQR(
  contenidoQR,
  tipoPersona
) {

  const partes =
    String(contenidoQR)
      .split(/[\n,;|-]+/);


  const dniExtraido =
    partes[0]
      ? partes[0].trim()
      : "";


  if (!dniExtraido) {

    return {
      encontrado: false,
      mensaje:
        "Código DNI/QR no válido."
    };

  }


  return buscarPersona(
    dniExtraido,
    tipoPersona
  );
}


/* =========================================================
   BUSCAR PERSONA
========================================================= */

function buscarPersona(
  dni,
  tipoPersona
) {

  try {

    const esPersonal =
      tipoPersona === "personal";

    const ss =
      SpreadsheetApp.openById(
        CONFIG.HOJA_ID_ESTUDIANTES
      );

    const nombreHoja =
      esPersonal
        ? CONFIG.NOMBRE_HOJA_PERSONAL
        : CONFIG.NOMBRE_HOJA_BASE;

    const hoja =
      ss.getSheetByName(
        nombreHoja
      );

    if (!hoja) {

      return {
        encontrado: false,
        mensaje:
          "No existe la pestaña " +
          nombreHoja
      };

    }

    const datos =
      hoja
        .getDataRange()
        .getDisplayValues();

    if (datos.length < 2) {

      return {
        encontrado: false,
        mensaje:
          "La base de datos está vacía."
      };

    }

    const dniBuscado =
      String(dni || "")
        .replace(/\s+/g, "")
        .trim();

    if (!dniBuscado) {

      return {
        encontrado: false,
        mensaje:
          "DNI vacío."
      };

    }


    // =====================================================
    // ESTUDIANTES V2
    //
    // A ID_ESTUDIANTE
    // B DNI
    // C APELLIDO_PATERNO
    // D APELLIDO_MATERNO
    // E NOMBRES
    // F SEXO
    // G FECHA_NACIMIENTO
    // H GRADO
    // I SECCION
    // J TURNO
    // K ID_APODERADO
    // L TELEFONO_APODERADO
    // M ESTADO
    // N FECHA_REGISTRO
    // =====================================================

    if (!esPersonal) {

      const coincide =
        datos
          .slice(1)
          .find(function(fila) {

            return String(
              fila[1] || ""
            )
              .replace(/\s+/g, "")
              .trim() === dniBuscado;

          });


      if (!coincide) {

        return {
          encontrado: false,
          mensaje:
            "El DNI " +
            dniBuscado +
            " no fue encontrado en ESTUDIANTES."
        };

      }


      const nombreCompleto =
        (
          String(coincide[2] || "") +
          " " +
          String(coincide[3] || "") +
          " " +
          String(coincide[4] || "")
        )
          .replace(/\s+/g, " ")
          .trim();


      const gradoSeccion =
        (
          String(coincide[7] || "") +
          " " +
          String(coincide[8] || "")
        )
          .replace(/\s+/g, " ")
          .trim();


      return {

        encontrado: true,

        datos: {

          // ID_ESTUDIANTE
          id:
            coincide[0] || "",

          // DNI
          dni:
            coincide[1] || "",

          // Nombre completo
          nombre:
            nombreCompleto,

          // GRADO + SECCION
          gradoSeccion:
            gradoSeccion,

          // TURNO
          perfil:
            coincide[9] || "",

          // Estado V2
          estado:
            coincide[12] || "",

          // ID_APODERADO
          idApoderado:
            coincide[10] || "",

          // TELÉFONO APODERADO
          telefonoApoderado:
            coincide[11] || ""

        }

      };

    }


    // =====================================================
    // PERSONAL V2
    // =====================================================
    // Estructura confirmada de PERSONAL:
    //
    // A ID_PERSONAL
    // B DNI
    // C APELLIDO_PATERNO
    // D APELLIDO_MATERNO
    // E NOMBRES
    // F CARGO
    // G AREA
    // H (dato institucional adicional)
    // I ESTADO
    // J FECHA_REGISTRO
    //
    // Para asistencia solo necesitamos:
    // ID_PERSONAL, DNI, nombre y cargo/area.
    // =====================================================

    const coincide =
      datos
        .slice(1)
        .find(function(fila) {

          return String(
            fila[1] || ""
          )
            .replace(/\s+/g, "")
            .trim() === dniBuscado;

        });


    if (!coincide) {

      return {

        encontrado: false,

        mensaje:
          "El DNI " +
          dniBuscado +
          " no fue encontrado en PERSONAL."

      };

    }


    const nombreCompleto =
      (
        String(coincide[2] || "") +
        " " +
        String(coincide[3] || "") +
        " " +
        String(coincide[4] || "")
      )
        .replace(/\s+/g, " ")
        .trim();


    const perfil =
      (
        String(coincide[5] || "") +
        (
          coincide[6]
            ? " - " + String(coincide[6] || "")
            : ""
        )
      )
        .replace(/\s+/g, " ")
        .trim();


    return {

      encontrado: true,

      datos: {

        // ID_PERSONAL
        id:
          String(coincide[0] || "").trim(),

        // DNI
        dni:
          String(coincide[1] || "")
            .replace(/\s+/g, "")
            .trim(),

        // Nombre completo
        nombre:
          nombreCompleto,

        // Para PERSONAL no existe grado/sección.
        gradoSeccion:
          "",

        // Cargo + área
        perfil:
          perfil,

        // Estado
        estado:
          String(coincide[8] || "").trim()

      }

    };


  }

  catch (error) {

    return {

      encontrado: false,

      mensaje:
        "Error: " +
        error.message

    };

  }

}


/* =========================================================
   GUARDAR ASISTENCIA
========================================================= */

function registrarAsistencia(data) {

  try {

    const ss =
      SpreadsheetApp.openById(
        CONFIG.HOJA_ID_ESTUDIANTES
      );

    const hoja =
      ss.getSheetByName(
        "ASISTENCIA"
      );

    if (!hoja) {

      return {

        exito: false,

        mensaje:
          "No existe la pestaña ASISTENCIA."

      };

    }


    // =====================================================
    // FECHA Y HORA
    // =====================================================

    const fecha =
      new Date();

    const fechaRegistro =
      Utilities.formatDate(
        fecha,
        CONFIG.ZONA_HORARIA,
        "dd/MM/yyyy"
      );

    const horaRegistro =
      Utilities.formatDate(
        fecha,
        CONFIG.ZONA_HORARIA,
        "HH:mm:ss"
      );


    // =====================================================
    // DATOS
    // =====================================================

    const tipoPersona =
      String(
        data.tipoPersona || "estudiante"
      )
        .trim()
        .toLowerCase();

    const estado =
      String(
        data.estado || "INGRESO"
      )
        .trim()
        .toUpperCase();

    const dni =
      String(
        data.dni || ""
      )
        .replace(/\s+/g, "")
        .trim();

    const idPersona =
      String(
        data.idPersona ||
        data.id ||
        ""
      )
        .trim();


    if (!idPersona) {

      return {

        exito: false,

        mensaje:
          "No se encontró el ID de la persona."

      };

    }


    if (!dni) {

      return {

        exito: false,

        mensaje:
          "No se encontró el DNI."

      };

    }


    // =====================================================
    // PUNTUALIDAD
    // =====================================================

    const puntualidad =
      calcularPuntualidad(
        horaRegistro,
        tipoPersona,
        estado
      );


    // =====================================================
    // BLOQUEO
    // =====================================================

    const lock =
      LockService.getScriptLock();

    lock.waitLock(10000);


    try {

      const ultimaFila =
        hoja.getLastRow();

      let registros = [];


      if (ultimaFila > 1) {

        registros =
          hoja
            .getRange(
              2,
              1,
              ultimaFila - 1,
              13
            )
            .getDisplayValues();

      }


      // ===================================================
      // BUSCAR REGISTROS DEL MISMO DNI Y FECHA
      // ===================================================

      let tieneIngresoHoy = false;
      let tieneSalidaHoy = false;


      registros.forEach(
        function(fila) {

          if (
            !fila ||
            fila.length < 9
          ) {

            return;

          }


          // B = FECHA
          const fechaFila =
            String(
              fila[1] || ""
            )
              .trim();


          if (
            fechaFila !==
            fechaRegistro
          ) {

            return;

          }


          // D = TIPO_PERSONA
          const tipoFila =
            String(
              fila[3] || ""
            )
              .trim()
              .toLowerCase();


          if (
            tipoFila !==
            tipoPersona
          ) {

            return;

          }


          // F = DNI
          const dniFila =
            String(
              fila[5] || ""
            )
              .replace(/\s+/g, "")
              .trim();


          if (
            dniFila !==
            dni
          ) {

            return;

          }


          // I = ESTADO
          const estadoFila =
            String(
              fila[8] || ""
            )
              .trim()
              .toUpperCase();


          if (
            estadoFila ===
            "INGRESO"
          ) {

            tieneIngresoHoy =
              true;

          }


          if (
            estadoFila ===
            "SALIDA"
          ) {

            tieneSalidaHoy =
              true;

          }

        }
      );


      // ===================================================
      // NO DUPLICAR INGRESO
      // ===================================================

      if (
        estado ===
        "INGRESO" &&
        tieneIngresoHoy
      ) {

        return {

          exito: false,

          mensaje:
            "INGRESO YA REGISTRADO. " +
            "El DNI " +
            dni +
            " ya tiene un ingreso registrado hoy."

        };

      }


      // ===================================================
      // CONTROL DE SALIDA
      // ===================================================

      if (
        estado ===
        "SALIDA"
      ) {

        if (
          !tieneIngresoHoy
        ) {

          return {

            exito: false,

            mensaje:
              "NO SE PUEDE REGISTRAR LA SALIDA. " +
              "No existe un INGRESO registrado hoy."

          };

        }


        if (
          tieneSalidaHoy
        ) {

          return {

            exito: false,

            mensaje:
              "SALIDA YA REGISTRADA. " +
              "El DNI " +
              dni +
              " ya tiene una salida registrada hoy."

          };

        }

      }


      // ===================================================
      // GENERAR ID_REGISTRO
      // ===================================================

      const idRegistro =
        "ASI-" +
        Utilities.formatDate(
          fecha,
          CONFIG.ZONA_HORARIA,
          "yyyyMMdd-HHmmss"
        ) +
        "-" +
        Utilities.getUuid()
          .substring(0, 8)
          .toUpperCase();


      // ===================================================
      // DATOS PARA ASISTENCIA V2
      //
      // A ID_REGISTRO
      // B FECHA
      // C HORA
      // D TIPO_PERSONA
      // E ID_PERSONA
      // F DNI
      // G ID_CARNET
      // H TIPO_REGISTRO
      // I ESTADO
      // J METODO
      // K PUNTUALIDAD
      // L USUARIO_REGISTRO
      // M OBSERVACION
      // ===================================================

      hoja.appendRow([

        idRegistro,

        fechaRegistro,

        horaRegistro,

        tipoPersona,

        idPersona,

        dni,

        data.idCarnet || "",

        data.tipoRegistro || "ASISTENCIA",

        estado,

        data.metodo || "DNI/QR",

        puntualidad,

        data.usuarioRegistro || "SISTEMA",

        data.observacion || ""

      ]);


      return {

        exito: true,

        mensaje:
          "Asistencia registrada correctamente.",

        hora:
          horaRegistro,

        puntualidad:
          puntualidad,

        idRegistro:
          idRegistro,

        datos: {

          id:
            idPersona,

          dni:
            dni,

          nombre:
            data.nombre || "",

          gradoSeccion:
            data.gradoSeccion || ""

        }

      };


    }

    finally {

      lock.releaseLock();

    }


  }

  catch (error) {

    return {

      exito: false,

      mensaje:
        "Error: " +
        error.message

    };

  }

}

/* =========================================================
   PUNTUALIDAD
========================================================= */

function calcularPuntualidad(
  horaActualStr,
  tipoPersona,
  estado
) {

  if (estado !== "INGRESO") {

    return "N/A";

  }


  const horaLimiteStr =
    tipoPersona === "personal"
      ? CONFIG.HORA_INGRESO_PERSONAL
      : CONFIG.HORA_INGRESO_ESTUDIANTES;


  const partesActual =
    horaActualStr
      .split(":")
      .map(Number);


  const partesLimite =
    horaLimiteStr
      .split(":")
      .map(Number);


  const minActuales =
    partesActual[0] * 60 +
    partesActual[1];


  const minLimites =
    partesLimite[0] * 60 +
    partesLimite[1];


  return minActuales <= minLimites
    ? "PUNTUAL"
    : "TARDE";
}
/* =========================================================
   API CONSULTAR ASISTENCIA
   ========================================================= */

function apiConsultar(e) {

  try {

    const params = e && e.parameter
      ? e.parameter
      : {};

    const tipo =
      String(params.tipo || 'todos')
        .trim()
        .toLowerCase();

    const dni =
      String(params.dni || '')
        .trim()
        .toLowerCase();

    const nombre =
      String(params.nombre || '')
        .trim()
        .toLowerCase();

    const fecha =
      String(params.fecha || '')
        .trim();

    const grado =
      String(params.grado || '')
        .trim()
        .toLowerCase();

    const estado =
      String(params.estado || 'todos')
        .trim()
        .toUpperCase();

    const puntualidad =
      String(params.puntualidad || 'todos')
        .trim()
        .toUpperCase();

    /*
     * =====================================================
     * CLAVE PARA CONSULTA DE PERSONAL/DOCENTES
     * =====================================================
     */

    const claveDocentes =
      String(params.clave || '').trim();

    /*
     * Si se solicita PERSONAL, exigir clave.
     */

    if (tipo === 'personal') {

      if (!claveDocentes) {

        return {
          ok: false,
          exito: false,
          requiereClave: true,
          total: 0,
          registros: [],
          mensaje:
            'La consulta de docentes/personal requiere una clave.'
        };

      }

      if (
        claveDocentes !==
        String(CONFIG.CLAVE_CONSULTA_DOCENTES || '').trim()
      ) {

        return {
          ok: false,
          exito: false,
          requiereClave: true,
          total: 0,
          registros: [],
          mensaje:
            'Clave de consulta incorrecta.'
        };

      }

    }


    /*
     * =====================================================
     * OBLIGAR A INGRESAR DNI
     * =====================================================
     */

    if (!dni && !nombre) {

      return {
        ok: false,
        exito: false,
        total: 0,
        registros: [],
        mensaje:
          'Ingrese el DNI/Código o Apellidos y Nombres para realizar la búsqueda.'
      };

    }


    let registros = [];


    /*
     * =====================================================
     * ESTUDIANTES
     * =====================================================
     */

    if (
      tipo === 'todos' ||
      tipo === 'estudiante'
    ) {

      registros =
        registros.concat(
          obtenerRegistrosConsulta(
            CONFIG.HOJA_ID_ESTUDIANTES,
            CONFIG.NOMBRE_HOJA_REGISTRO_ESTUDIANTES,
            'estudiante'
          )
        );

    }


    /*
     * =====================================================
     * PERSONAL
     * =====================================================
     */

    if (tipo === 'personal') {

      registros =
        registros.concat(
          obtenerRegistrosConsulta(
            CONFIG.HOJA_ID_PERSONAL,
            CONFIG.NOMBRE_HOJA_REGISTRO_PERSONAL,
            'personal'
          )
        );

    }


    /*
     * =====================================================
     * FILTRAR
     * =====================================================
     */

    registros =
      registros.filter(function(r) {


        /*
         * DNI
         */

        if (
  dni &&
  !String(r.id || '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .includes(
      dni
        .replace(/\s+/g, '')
        .toLowerCase()
    )
) {
  return false;
}


        /*
         * NOMBRE
         */

        if (
          nombre &&
          !String(r.nombre || '')
            .toLowerCase()
            .includes(nombre)
        ) {

          return false;

        }


        /*
         * FECHA
         */

        if (
          fecha &&
          String(r.fecha || '') !== fecha
        ) {

          return false;

        }


        /*
         * GRADO / SECCIÓN
         */

        if (
          grado &&
          !String(r.gradoSeccion || '')
            .toLowerCase()
            .includes(grado)
        ) {

          return false;

        }


        /*
         * ESTADO
         */

        if (
          estado !== 'TODOS' &&
          estado &&
          String(r.estado || '')
            .toUpperCase() !== estado
        ) {

          return false;

        }


        /*
         * PUNTUALIDAD
         */

        if (
          puntualidad !== 'TODOS' &&
          puntualidad &&
          String(r.puntualidad || '')
            .toUpperCase() !== puntualidad
        ) {

          return false;

        }


        return true;

      });


    /*
     * =====================================================
     * ORDENAR
     * =====================================================
     */

    registros.sort(function(a, b) {

      return String(b.fechaHoraCompleta || '')
        .localeCompare(
          String(a.fechaHoraCompleta || '')
        );

    });


    /*
     * =====================================================
     * RESPUESTA
     * =====================================================
     */

    return {

      ok: true,

      exito: true,

      total: registros.length,

      registros: registros

    };

  }

  catch (error) {

    return {

      ok: false,

      exito: false,

      total: 0,

      registros: [],

      mensaje:
        'Error en consulta: ' +
        error.message

    };

  }

}


/* =========================================================
   LEER REGISTROS DE ASISTENCIA
   ========================================================= */

function obtenerRegistrosConsulta(
  idSpreadsheet,
  nombreHoja,
  tipo
) {

  const resultado = [];


  try {

    const ss =
      SpreadsheetApp.openById(
        idSpreadsheet
      );


    const hoja =
      ss.getSheetByName(
        nombreHoja
      );


    if (!hoja) {

      return resultado;

    }


    const datos =
      hoja.getDataRange()
        .getDisplayValues();


    if (
      datos.length < 2
    ) {

      return resultado;

    }


    for (
      let i = 1;
      i < datos.length;
      i++
    ) {

      const fila = datos[i];


      if (
        !fila ||
        !fila[0]
      ) {

        continue;

      }


      const fechaHora =
        String(
          fila[0] || ''
        ).trim();


      const partes =
        fechaHora.split(/\s+/);


      const fecha =
        partes[0] || '';


      const hora =
        partes[1] || '';


      /*
       * ===================================================
       * PERSONAL
       * ===================================================
       */

      if (
        tipo === 'personal'
      ) {

        resultado.push({

          tipo: 'personal',

          fecha: fecha,

          hora: hora,

          fechaHoraCompleta:
            fechaHora,

          id:
            fila[1] || '',

          nombre:
            fila[2] || '',

          gradoSeccion:
            '',

          perfil:
            fila[3] || '',

          estado:
            fila[4] || '',

          metodo:
            fila[5] || '',

          puntualidad:
            fila[6] || ''

        });

      }


      /*
       * ===================================================
       * ESTUDIANTES
       * ===================================================
       */

      else {

        resultado.push({

          tipo: 'estudiante',

          fecha: fecha,

          hora: hora,

          fechaHoraCompleta:
            fechaHora,

          id:
            fila[1] || '',

          nombre:
            fila[2] || '',

          gradoSeccion:
            fila[3] || '',

          perfil:
            fila[4] || '',

          estado:
            fila[5] || '',

          metodo:
            fila[6] || '',

          puntualidad:
            fila[7] || ''

        });

      }

    }

  }

  catch (error) {

    console.error(
      'Error leyendo registros: ' +
      error.message
    );

  }


  return resultado;

}
function pruebaConsultaServidor() {
  return apiConsultar({
    parameter: {
      action: 'apiConsultar',
      dni: '12345678',
      callback: 'prueba'
    }
  });
}

/* =========================================================
   API REPORTES DE ASISTENCIA
   ========================================================= */

function apiReportes(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const fechaISO = String(params.fecha || '').trim();
    const gradoSolicitado = normalizarTextoReporte(params.grado || '');
    const tipoReporte = String(params.reporte || 'asistencia').trim().toLowerCase();

    if (!fechaISO) {
      return { ok:false, exito:false, mensaje:'Debe indicar una fecha.', resumen:null, alumnos:[] };
    }

    const partesFecha = fechaISO.split('-');
    if (partesFecha.length !== 3) {
      return { ok:false, exito:false, mensaje:'Formato de fecha no válido.', resumen:null, alumnos:[] };
    }

    const fechaBuscada =
      partesFecha[2] + '/' + partesFecha[1] + '/' + partesFecha[0];

    const ss = SpreadsheetApp.openById(CONFIG.HOJA_ID_ESTUDIANTES);
    const hojaEstudiantes = ss.getSheetByName(CONFIG.NOMBRE_HOJA_BASE);

    if (!hojaEstudiantes) {
      return {
        ok:false, exito:false,
        mensaje:'No existe la hoja ' + CONFIG.NOMBRE_HOJA_BASE,
        resumen:null, alumnos:[]
      };
    }

    const datosEstudiantes = hojaEstudiantes.getDataRange().getDisplayValues();

    if (datosEstudiantes.length < 2) {
      return {
        ok:false, exito:false,
        mensaje:'La lista de estudiantes está vacía.',
        resumen:null, alumnos:[]
      };
    }

    const alumnos = [];

    for (let i = 1; i < datosEstudiantes.length; i++) {
      const fila = datosEstudiantes[i];

      const dni = normalizarDniReporte(fila[0]);
      const nombre = String(fila[1] || '').trim();
      const gradoSeccion = String(fila[2] || '').trim();

      if (!dni || !nombre) continue;

      if (
        gradoSolicitado &&
        normalizarTextoReporte(gradoSeccion) !== gradoSolicitado
      ) {
        continue;
      }

      alumnos.push({
        id:dni,
        nombre:nombre,
        gradoSeccion:gradoSeccion
      });
    }

    const hojaRegistros =
      ss.getSheetByName(CONFIG.NOMBRE_HOJA_REGISTRO_ESTUDIANTES);

    if (!hojaRegistros) {
      return {
        ok:false, exito:false,
        mensaje:'No existe la hoja ' +
          CONFIG.NOMBRE_HOJA_REGISTRO_ESTUDIANTES,
        resumen:null, alumnos:[]
      };
    }

    const datosRegistros = hojaRegistros.getDataRange().getDisplayValues();
    const ingresos = {};

    for (let i = 1; i < datosRegistros.length; i++) {
      const fila = datosRegistros[i];
      if (!fila) continue;

      const fechaHora = String(fila[0] || '').trim();
      if (!fechaHora) continue;

      const partes = fechaHora.split(/\s+/);
      const fechaRegistro = partes[0] || '';
      const horaRegistro = partes[1] || '';

      if (fechaRegistro !== fechaBuscada) continue;

      const dni = normalizarDniReporte(fila[1]);
      if (!dni) continue;

      /*
       * Estructura actual de guardar_datos_estudiantes:
       * A Fecha/Hora
       * B DNI/ID
       * C Nombre
       * D Grado/Sección
       * E Perfil
       * F Estado
       * G Método
       * H Puntualidad
       */
      const estado = String(fila[5] || '').trim().toUpperCase();
      const puntualidad = String(fila[7] || '').trim().toUpperCase();

      if (estado !== 'INGRESO') continue;

      if (!ingresos[dni]) {
        ingresos[dni] = {
          hora:horaRegistro,
          puntualidad:puntualidad
        };
      }
    }

    let presentes = 0;
    let puntuales = 0;
    let tardanzas = 0;
    let faltas = 0;

    const detalle = [];

    alumnos.forEach(function(alumno) {
      const registro = ingresos[alumno.id];

      if (registro) {
        presentes++;

        if (registro.puntualidad === 'TARDE') {
          tardanzas++;
        } else {
          puntuales++;
        }

        detalle.push({
          id:alumno.id,
          nombre:alumno.nombre,
          gradoSeccion:alumno.gradoSeccion,
          estado:'PRESENTE',
          puntualidad:
            registro.puntualidad === 'TARDE'
              ? 'TARDE'
              : 'PUNTUAL',
          hora:registro.hora || ''
        });

      } else {
        faltas++;

        detalle.push({
          id:alumno.id,
          nombre:alumno.nombre,
          gradoSeccion:alumno.gradoSeccion,
          estado:'FALTA',
          puntualidad:'N/A',
          hora:''
        });
      }
    });

    const resultado =
      tipoReporte === 'faltas'
        ? detalle.filter(function(alumno) {
            return alumno.estado === 'FALTA';
          })
        : detalle;

    return {
      ok:true,
      exito:true,
      reporte:tipoReporte,
      fecha:fechaBuscada,
      grado:gradoSolicitado,
      resumen:{
        total:alumnos.length,
        presentes:presentes,
        puntuales:puntuales,
        tardanzas:tardanzas,
        faltas:faltas
      },
      alumnos:resultado
    };

  } catch (error) {
    return {
      ok:false,
      exito:false,
      mensaje:'Error en reporte: ' + error.message,
      resumen:null,
      alumnos:[]
    };
  }
}



/* =========================================================
   NORMALIZAR DNI PARA REPORTES
   ========================================================= */

function normalizarDniReporte(valor) {

  return String(
    valor || ''
  )
    .replace(
      /\s+/g,
      ''
    )
    .trim();

}


/* =========================================================
   NORMALIZAR TEXTO PARA REPORTES
   ========================================================= */

function normalizarTextoReporte(valor) {

  return String(
    valor || ''
  )
    .trim()
    .replace(
      /\s+/g,
      ' '
    )
    .toUpperCase();

}
/* =========================================================
   REPORTE DE ASISTENCIA Y FALTAS
   ========================================================= */


/* =========================================================
   CARNETS V2
   =========================================================
   Arquitectura:
   CARNETS
   A ID_CARNET
   B TIPO_PERSONA
   C ID_PERSONA
   D DNI
   E FECHA_EMISION
   F FECHA_VENCIMIENTO
   G ESTADO
   H FECHA_ANULACION
   I MOTIVO_ANULACION
   J TIPO_QR
   K CODIGO_QR

   Regla:
   - El carnet pertenece a una PERSONA mediante ID_PERSONA.
   - DNI es dato de referencia.
   - ID_CARNET es único y se reutiliza en procesos futuros.
   - Este módulo NO modifica cámaras, Legacy 2026 ni el registro
     de asistencia existente.
   ========================================================= */

const CARNET_CONFIG = {

  NOMBRE_HOJA: 'CARNETS',

  TIPO_QR: 'MGP_V2',

  PREFIJO_ID: 'CAR',

  ANIOS_VIGENCIA: 1

};


/* =========================================================
   ASEGURAR HOJA CARNETS
   ========================================================= */

function obtenerHojaCarnets_() {

  const ss =
    SpreadsheetApp.openById(
      CONFIG.HOJA_ID_ESTUDIANTES
    );

  let hoja =
    ss.getSheetByName(
      CARNET_CONFIG.NOMBRE_HOJA
    );

  if (!hoja) {

    hoja =
      ss.insertSheet(
        CARNET_CONFIG.NOMBRE_HOJA
      );

  }

  const encabezados = [
    'ID_CARNET',
    'TIPO_PERSONA',
    'ID_PERSONA',
    'DNI',
    'FECHA_EMISION',
    'FECHA_VENCIMIENTO',
    'ESTADO',
    'FECHA_ANULACION',
    'MOTIVO_ANULACION',
    'TIPO_QR',
    'CODIGO_QR'
  ];

  const primeraFila =
    hoja
      .getRange(
        1,
        1,
        1,
        encabezados.length
      )
      .getDisplayValues()[0];

  let necesitaEncabezados = false;

  for (
    let i = 0;
    i < encabezados.length;
    i++
  ) {

    if (
      String(primeraFila[i] || '').trim() !==
      encabezados[i]
    ) {

      necesitaEncabezados = true;
      break;

    }

  }

  if (
    necesitaEncabezados &&
    hoja.getLastRow() === 0
  ) {

    hoja
      .getRange(
        1,
        1,
        1,
        encabezados.length
      )
      .setValues([encabezados]);

  }

  return hoja;

}


/* =========================================================
   GENERAR ID_CARNET
   ========================================================= */

function generarIdCarnet_() {

  const hoja =
    obtenerHojaCarnets_();

  const anio =
    Utilities.formatDate(
      new Date(),
      CONFIG.ZONA_HORARIA,
      'yyyy'
    );

  const ultimaFila =
    hoja.getLastRow();

  let numeroMayor = 0;

  if (ultimaFila > 1) {

    const ids =
      hoja
        .getRange(
          2,
          1,
          ultimaFila - 1,
          1
        )
        .getDisplayValues();

    ids.forEach(function(fila) {

      const id =
        String(fila[0] || '').trim();

      const coincidencia =
        id.match(
          /^CAR-\d{4}-(\d+)$/
        );

      if (coincidencia) {

        const numero =
          parseInt(
            coincidencia[1],
            10
          );

        if (
          !isNaN(numero) &&
          numero > numeroMayor
        ) {

          numeroMayor = numero;

        }

      }

    });

  }

  return (
    CARNET_CONFIG.PREFIJO_ID +
    '-' +
    anio +
    '-' +
    String(numeroMayor + 1)
      .padStart(6, '0')
  );

}


/* =========================================================
   GENERAR CODIGO QR V2
   =========================================================
   El contenido identifica el carnet y la persona.
   No se altera el lector Legacy existente.
   ========================================================= */

function generarCodigoQRV2_(idCarnet, idPersona, dni) {

  return [
    'MGP_V2',
    'CARNET',
    idCarnet,
    idPersona,
    dni
  ].join('|');

}


/* =========================================================
   BUSCAR PERSONA PARA CARNET
   =========================================================
   Para estudiantes usamos directamente la estructura V2:
   A ID_ESTUDIANTE
   B DNI
   C APELLIDO_PATERNO
   D APELLIDO_MATERNO
   E NOMBRES
   F SEXO
   G FECHA_NACIMIENTO
   H GRADO
   I SECCION
   J TURNO
   K ID_APODERADO
   L TELEFONO_APODERADO
   M ESTADO
   N FECHA_REGISTRO
   ========================================================= */

function buscarPersonaParaCarnet_(tipoPersona, idPersona, dni) {

  const tipo =
    String(
      tipoPersona || 'estudiante'
    )
      .trim()
      .toLowerCase();

  if (tipo !== 'estudiante') {

    return {
      encontrado: false,
      mensaje:
        'La generación de carnet para PERSONAL aún no está habilitada. Primero debe verificarse su estructura V2.'
    };

  }

  const ss =
    SpreadsheetApp.openById(
      CONFIG.HOJA_ID_ESTUDIANTES
    );

  const hoja =
    ss.getSheetByName(
      CONFIG.NOMBRE_HOJA_BASE
    );

  if (!hoja) {

    return {
      encontrado: false,
      mensaje:
        'No existe la pestaña ' +
        CONFIG.NOMBRE_HOJA_BASE
    };

  }

  const datos =
    hoja
      .getDataRange()
      .getDisplayValues();

  const idBuscado =
    String(idPersona || '').trim();

  const dniBuscado =
    String(dni || '')
      .replace(/\s+/g, '')
      .trim();

  if (!idBuscado && !dniBuscado) {

    return {
      encontrado: false,
      mensaje:
        'Debe indicar ID_PERSONA o DNI.'
    };

  }

  let filaEncontrada = null;

  for (
    let i = 1;
    i < datos.length;
    i++
  ) {

    const fila = datos[i];

    const idFila =
      String(fila[0] || '').trim();

    const dniFila =
      String(fila[1] || '')
        .replace(/\s+/g, '')
        .trim();

    if (
      (idBuscado && idFila === idBuscado) ||
      (dniBuscado && dniFila === dniBuscado)
    ) {

      filaEncontrada = fila;
      break;

    }

  }

  if (!filaEncontrada) {

    return {
      encontrado: false,
      mensaje:
        'La persona no fue encontrada en ' +
        CONFIG.NOMBRE_HOJA_BASE +
        '.'
    };

  }

  return {
    encontrado: true,
    datos: {

      id:
        String(filaEncontrada[0] || '').trim(),

      dni:
        String(filaEncontrada[1] || '')
          .replace(/\s+/g, '')
          .trim(),

      apellidoPaterno:
        String(filaEncontrada[2] || '').trim(),

      apellidoMaterno:
        String(filaEncontrada[3] || '').trim(),

      nombres:
        String(filaEncontrada[4] || '').trim(),

      estado:
        String(filaEncontrada[12] || '').trim()

    }
  };

}


/* =========================================================
   CREAR CARNET V2
   ========================================================= */

function apiCrearCarnet(params) {

  try {

    const tipoPersona =
      String(
        params.tipoPersona ||
        params.tipo ||
        'estudiante'
      )
        .trim()
        .toLowerCase();

    const idPersona =
      String(
        params.idPersona || ''
      ).trim();

    const dni =
      String(
        params.dni || ''
      )
        .replace(/\s+/g, '')
        .trim();

    if (!idPersona && !dni) {

      return {
        ok: false,
        exito: false,
        mensaje:
          'Debe indicar ID_PERSONA o DNI.'
      };

    }

    const persona =
      buscarPersonaParaCarnet_(
        tipoPersona,
        idPersona,
        dni
      );

    if (!persona.encontrado) {

      return {
        ok: false,
        exito: false,
        mensaje:
          persona.mensaje
      };

    }

    const datosPersona =
      persona.datos;

    if (
      String(
        datosPersona.estado || ''
      )
        .toUpperCase() !==
      'ACTIVO'
    ) {

      return {
        ok: false,
        exito: false,
        mensaje:
          'La persona no está ACTIVA. No se puede emitir el carnet.'
      };

    }

    const hoja =
      obtenerHojaCarnets_();

    const ultimaFila =
      hoja.getLastRow();

    let carnetActivo = null;

    if (ultimaFila > 1) {

      const filas =
        hoja
          .getRange(
            2,
            1,
            ultimaFila - 1,
            11
          )
          .getDisplayValues();

      filas.forEach(function(fila) {

        if (carnetActivo) {
          return;
        }

        const estado =
          String(
            fila[6] || ''
          )
            .trim()
            .toUpperCase();

        const idFila =
          String(
            fila[2] || ''
          ).trim();

        const dniFila =
          String(
            fila[3] || ''
          )
            .replace(/\s+/g, '')
            .trim();

        if (
          estado === 'ACTIVO' &&
          (
            idFila === datosPersona.id ||
            dniFila === datosPersona.dni
          )
        ) {

          carnetActivo = {
            idCarnet: fila[0] || '',
            tipoPersona: fila[1] || '',
            idPersona: fila[2] || '',
            dni: fila[3] || '',
            fechaEmision: fila[4] || '',
            fechaVencimiento: fila[5] || '',
            estado: fila[6] || '',
            tipoQR: fila[9] || '',
            codigoQR: fila[10] || ''
          };

        }

      });

    }

    if (carnetActivo) {

      return {
        ok: true,
        exito: true,
        existente: true,
        mensaje:
          'La persona ya tiene un carnet activo.',
        carnet:
          carnetActivo
      };

    }

    const lock =
      LockService.getScriptLock();

    lock.waitLock(10000);

    try {

      const fecha =
        new Date();

      const fechaEmision =
        Utilities.formatDate(
          fecha,
          CONFIG.ZONA_HORARIA,
          'dd/MM/yyyy'
        );

      const fechaVencimientoDate =
        new Date(fecha);

      fechaVencimientoDate.setFullYear(
        fechaVencimientoDate.getFullYear() +
        CARNET_CONFIG.ANIOS_VIGENCIA
      );

      const fechaVencimiento =
        Utilities.formatDate(
          fechaVencimientoDate,
          CONFIG.ZONA_HORARIA,
          'dd/MM/yyyy'
        );

      const idCarnet =
        generarIdCarnet_();

      const codigoQR =
        generarCodigoQRV2_(
          idCarnet,
          datosPersona.id,
          datosPersona.dni
        );

      hoja.appendRow([

        idCarnet,
        tipoPersona,
        datosPersona.id,
        datosPersona.dni,
        fechaEmision,
        fechaVencimiento,
        'ACTIVO',
        '',
        '',
        CARNET_CONFIG.TIPO_QR,
        codigoQR

      ]);

      return {

        ok: true,
        exito: true,
        existente: false,

        mensaje:
          'Carnet creado correctamente.',

        carnet: {

          idCarnet:
            idCarnet,

          tipoPersona:
            tipoPersona,

          idPersona:
            datosPersona.id,

          dni:
            datosPersona.dni,

          fechaEmision:
            fechaEmision,

          fechaVencimiento:
            fechaVencimiento,

          estado:
            'ACTIVO',

          tipoQR:
            CARNET_CONFIG.TIPO_QR,

          codigoQR:
            codigoQR

        }

      };

    }
    finally {

      lock.releaseLock();

    }

  }
  catch (error) {

    return {

      ok: false,
      exito: false,

      mensaje:
        'Error al crear carnet: ' +
        error.message

    };

  }

}


/* =========================================================
   CONSULTAR CARNET V2
   ========================================================= */

function apiConsultarCarnet(params) {

  try {

    const idCarnet =
      String(
        params.idCarnet || ''
      ).trim();

    const idPersona =
      String(
        params.idPersona || ''
      ).trim();

    const dni =
      String(
        params.dni || ''
      )
        .replace(/\s+/g, '')
        .trim();

    if (
      !idCarnet &&
      !idPersona &&
      !dni
    ) {

      return {
        ok: false,
        exito: false,
        mensaje:
          'Debe indicar ID_CARNET, ID_PERSONA o DNI.'
      };

    }

    const hoja =
      obtenerHojaCarnets_();

    const ultimaFila =
      hoja.getLastRow();

    if (ultimaFila < 2) {

      return {
        ok: true,
        exito: true,
        total: 0,
        carnets: []
      };

    }

    const filas =
      hoja
        .getRange(
          2,
          1,
          ultimaFila - 1,
          11
        )
        .getDisplayValues();

    const carnets = [];

    filas.forEach(function(fila) {

      const coincide =
        (
          idCarnet &&
          String(fila[0] || '').trim() === idCarnet
        ) ||
        (
          idPersona &&
          String(fila[2] || '').trim() === idPersona
        ) ||
        (
          dni &&
          String(fila[3] || '')
            .replace(/\s+/g, '')
            .trim() === dni
        );

      if (!coincide) {
        return;
      }

      carnets.push({

        idCarnet: fila[0] || '',
        tipoPersona: fila[1] || '',
        idPersona: fila[2] || '',
        dni: fila[3] || '',
        fechaEmision: fila[4] || '',
        fechaVencimiento: fila[5] || '',
        estado: fila[6] || '',
        fechaAnulacion: fila[7] || '',
        motivoAnulacion: fila[8] || '',
        tipoQR: fila[9] || '',
        codigoQR: fila[10] || ''

      });

    });

    return {

      ok: true,
      exito: true,
      total: carnets.length,
      carnets: carnets

    };

  }
  catch (error) {

    return {

      ok: false,
      exito: false,

      mensaje:
        'Error al consultar carnet: ' +
        error.message

    };

  }

}


/* =========================================================
   ANULAR CARNET V2
   ========================================================= */

function apiAnularCarnet(params) {

  try {

    const idCarnet =
      String(
        params.idCarnet || ''
      ).trim();

    const motivo =
      String(
        params.motivo || ''
      ).trim();

    if (!idCarnet) {

      return {
        ok: false,
        exito: false,
        mensaje:
          'Debe indicar ID_CARNET.'
      };

    }

    if (!motivo) {

      return {
        ok: false,
        exito: false,
        mensaje:
          'Debe indicar el motivo de anulación.'
      };

    }

    const hoja =
      obtenerHojaCarnets_();

    const ultimaFila =
      hoja.getLastRow();

    if (ultimaFila < 2) {

      return {
        ok: false,
        exito: false,
        mensaje:
          'No existen carnets registrados.'
      };

    }

    const filas =
      hoja
        .getRange(
          2,
          1,
          ultimaFila - 1,
          11
        )
        .getDisplayValues();

    for (
      let i = 0;
      i < filas.length;
      i++
    ) {

      if (
        String(
          filas[i][0] || ''
        ).trim() !== idCarnet
      ) {

        continue;

      }

      const estado =
        String(
          filas[i][6] || ''
        )
          .trim()
          .toUpperCase();

      if (estado !== 'ACTIVO') {

        return {
          ok: false,
          exito: false,
          mensaje:
            'El carnet no está ACTIVO.'
        };

      }

      const fechaAnulacion =
        Utilities.formatDate(
          new Date(),
          CONFIG.ZONA_HORARIA,
          'dd/MM/yyyy'
        );

      const filaHoja =
        i + 2;

      hoja
        .getRange(
          filaHoja,
          7
        )
        .setValue('ANULADO');

      hoja
        .getRange(
          filaHoja,
          8
        )
        .setValue(
          fechaAnulacion
        );

      hoja
        .getRange(
          filaHoja,
          9
        )
        .setValue(
          motivo
        );

      return {

        ok: true,
        exito: true,

        mensaje:
          'Carnet anulado correctamente.',

        idCarnet:
          idCarnet,

        estado:
          'ANULADO',

        fechaAnulacion:
          fechaAnulacion,

        motivo:
          motivo

      };

    }

    return {

      ok: false,
      exito: false,

      mensaje:
        'No se encontró el ID_CARNET ' +
        idCarnet

    };

  }
  catch (error) {

    return {

      ok: false,
      exito: false,

      mensaje:
        'Error al anular carnet: ' +
        error.message

    };

  }

}


/* =========================================================
   FIN CARNETS V2
   ========================================================= */


/* =========================================================
   CARNETS V2 - MODULO COMPLETO
   =========================================================
   REGLAS:
   - ID_PERSONA = persona
   - ID_CARNET = carnet
   - CODIGO_QR = QR
   - No modifica cámaras.
   - No modifica Legacy 2026.
   - No modifica el flujo QR existente.
   - No modifica reglas de asistencia.
   ========================================================= */

function obtenerHojaCarnetsV2() {

  const ss =
    SpreadsheetApp.openById(
      CONFIG.HOJA_ID_ESTUDIANTES
    );

  let hoja =
    ss.getSheetByName('CARNETS');

  if (!hoja) {

    hoja =
      ss.insertSheet('CARNETS');

    hoja.appendRow([
      'ID_CARNET',
      'TIPO_PERSONA',
      'ID_PERSONA',
      'DNI',
      'FECHA_EMISION',
      'FECHA_VENCIMIENTO',
      'ESTADO',
      'FECHA_ANULACION',
      'MOTIVO_ANULACION',
      'TIPO_QR',
      'CODIGO_QR'
    ]);

  }

  return hoja;
}








function existeCodigoQRV2(
  registros,
  codigoQR
) {

  const buscado =
    String(
      codigoQR || ''
    )
      .trim()
      .toUpperCase();

  return registros.some(
    function(fila) {

      return String(
        fila[10] || ''
      )
        .trim()
        .toUpperCase() === buscado;

    }
  );

}


function convertirFilaCarnetV2(
  fila
) {

  return {

    idCarnet:
      String(fila[0] || ''),

    tipoPersona:
      String(fila[1] || ''),

    idPersona:
      String(fila[2] || ''),

    dni:
      String(fila[3] || ''),

    fechaEmision:
      String(fila[4] || ''),

    fechaVencimiento:
      String(fila[5] || ''),

    estado:
      String(fila[6] || ''),

    fechaAnulacion:
      String(fila[7] || ''),

    motivoAnulacion:
      String(fila[8] || ''),

    tipoQR:
      String(fila[9] || ''),

    codigoQR:
      String(fila[10] || '')

  };

}


/* =========================================================
   BUSCAR CARNET ACTIVO
   ========================================================= */

function buscarCarnetActivoPorPersonaV2_(
  idPersona,
  dni
) {

  try {

    const id =
      String(idPersona || '').trim();

    const dniBuscado =
      String(dni || '')
        .replace(/\s+/g, '')
        .trim();

    if (!id && !dniBuscado) {

      return {
        encontrado: false,
        mensaje:
          'Debe indicar ID_PERSONA o DNI.'
      };

    }

    const hoja =
      obtenerHojaCarnetsV2();

    const ultimaFila =
      hoja.getLastRow();

    if (ultimaFila < 2) {

      return {
        encontrado: false,
        mensaje:
          'La hoja CARNETS está vacía.'
      };

    }

    const registros =
      hoja
        .getRange(
          2,
          1,
          ultimaFila - 1,
          11
        )
        .getDisplayValues();

    for (
      let i = 0;
      i < registros.length;
      i++
    ) {

      const fila =
        registros[i];

      const idRegistrado =
        String(fila[2] || '').trim();

      const dniRegistrado =
        String(fila[3] || '')
          .replace(/\s+/g, '')
          .trim();

      const estado =
        String(fila[6] || '')
          .trim()
          .toUpperCase();

      if (
        estado !== 'ACTIVO'
      ) {
        continue;
      }

      const coincideID =
        id &&
        idRegistrado === id;

      const coincideDNI =
        dniBuscado &&
        dniRegistrado === dniBuscado;

      if (
        coincideID ||
        coincideDNI
      ) {

        return {

          encontrado: true,

          carnet:
            convertirFilaCarnetV2(fila),

          mensaje:
            'Carnet ACTIVO encontrado.'

        };

      }

    }

    return {
      encontrado: false,
      mensaje:
        'No existe un carnet ACTIVO para la persona.'
    };

  }
  catch (error) {

    return {

      encontrado: false,

      mensaje:
        'Error buscando carnet: ' +
        error.message

    };

  }

}


/* =========================================================
   BUSCAR CARNET POR QR
   ========================================================= */

function buscarCarnetPorCodigoQRV2(
  codigoQR
) {

  try {

    const codigo =
      String(codigoQR || '')
        .trim()
        .toUpperCase();

    if (!codigo) {

      return {
        ok: false,
        exito: false,
        mensaje:
          'Debe indicar CODIGO_QR.'
      };

    }

    const hoja =
      obtenerHojaCarnetsV2();

    const ultimaFila =
      hoja.getLastRow();

    if (ultimaFila < 2) {

      return {
        ok: false,
        exito: false,
        mensaje:
          'La hoja CARNETS está vacía.'
      };

    }

    const registros =
      hoja
        .getRange(
          2,
          1,
          ultimaFila - 1,
          11
        )
        .getDisplayValues();

    for (
      let i = 0;
      i < registros.length;
      i++
    ) {

      const fila =
        registros[i];

      const codigoRegistrado =
        String(fila[10] || '')
          .trim()
          .toUpperCase();

      if (
        codigoRegistrado !== codigo
      ) {
        continue;
      }

      const carnet =
        convertirFilaCarnetV2(fila);

      if (
        carnet.estado
          .trim()
          .toUpperCase() !==
        'ACTIVO'
      ) {

        return {
          ok: false,
          exito: false,
          carnet: carnet,
          mensaje:
            'El carnet existe pero no está ACTIVO.'
        };

      }

      return {
        ok: true,
        exito: true,
        carnet: carnet,
        mensaje:
          'Carnet ACTIVO encontrado.'
      };

    }

    return {
      ok: false,
      exito: false,
      mensaje:
        'No existe un carnet con ese CODIGO_QR.'
    };

  }
  catch (error) {

    return {
      ok: false,
      exito: false,
      mensaje:
        'Error buscando carnet: ' +
        error.message
    };

  }

}


/* =========================================================
   PRUEBA CONTROLADA
   ========================================================= */




function pruebaBuscarCarnetNilda() {

  const resultado =
    buscarCarnetActivoPorPersonaV2_(
      'EST-000001',
      '81434318'
    );

  Logger.log(
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;

}

/* =========================================================
   PRUEBA DE RESOLUCION DE ID_CARNET PARA ASISTENCIA
   No registra una asistencia. Solo verifica el puente.
   ========================================================= */

function pruebaResolverIdCarnetAsistenciaNilda() {

  const resultado =
    buscarCarnetActivoPorPersonaV2_(
      'EST-000001',
      '81434318'
    );

  const idCarnet =
    resultado &&
    resultado.encontrado &&
    resultado.carnet
      ? String(
          resultado.carnet.idCarnet || ''
        ).trim()
      : '';

  const salida = {

    ok:
      !!idCarnet,

    idPersona:
      'EST-000001',

    dni:
      '81434318',

    idCarnet:
      idCarnet,

    mensaje:
      idCarnet
        ? 'ID_CARNET listo para registrar asistencia.'
        : 'No existe un carnet ACTIVO para la persona.'

  };

  Logger.log(
    JSON.stringify(
      salida,
      null,
      2
    )
  );

  return salida;
}
/* =========================================================
   CARNETS V2
   CREAR CARNET
========================================================= */

function crearCarnetV2(idPersona, tipoPersona, dni) {

  const lock = LockService.getScriptLock();

  try {

    lock.waitLock(10000);

    const id =
      String(idPersona || '').trim();

    const tipo =
      String(tipoPersona || 'estudiante')
        .trim()
        .toLowerCase();

    const dniLimpio =
      String(dni || '')
        .replace(/\s+/g, '')
        .trim();

    if (!id) {
      return {
        ok: false,
        exito: false,
        mensaje: 'Falta ID_PERSONA.'
      };
    }

    if (!dniLimpio) {
      return {
        ok: false,
        exito: false,
        mensaje: 'Falta DNI.'
      };
    }

    const ss =
      SpreadsheetApp.openById(
        CONFIG.HOJA_ID_ESTUDIANTES
      );

    let hoja =
      ss.getSheetByName('CARNETS');

    if (!hoja) {

      hoja =
        ss.insertSheet('CARNETS');

      hoja.appendRow([
        'ID_CARNET',
        'TIPO_PERSONA',
        'ID_PERSONA',
        'DNI',
        'FECHA_EMISION',
        'FECHA_VENCIMIENTO',
        'ESTADO',
        'FECHA_ANULACION',
        'MOTIVO_ANULACION',
        'TIPO_QR',
        'CODIGO_QR'
      ]);

    }

    const ultimaFila =
      hoja.getLastRow();

    let datos = [];

    if (ultimaFila > 1) {

      datos =
        hoja
          .getRange(
            2,
            1,
            ultimaFila - 1,
            11
          )
          .getDisplayValues();

    }

    /* ================================================
       VERIFICAR SI YA TIENE CARNET ACTIVO
    ================================================= */

    for (
      let i = 0;
      i < datos.length;
      i++
    ) {

      const fila =
        datos[i];

      const idRegistrado =
        String(
          fila[2] || ''
        ).trim();

      const dniRegistrado =
        String(
          fila[3] || ''
        )
        .replace(/\s+/g, '')
        .trim();

      const estado =
        String(
          fila[6] || ''
        )
        .trim()
        .toUpperCase();

      if (
        estado === 'ACTIVO' &&
        (
          idRegistrado === id ||
          dniRegistrado === dniLimpio
        )
      ) {

        return {
          ok: false,
          exito: false,
          mensaje:
            'La persona ya tiene un carnet ACTIVO.',
          idCarnet:
            fila[0] || ''
        };

      }

    }

    /* ================================================
       GENERAR ID_CARNET
    ================================================= */

    const anio =
      Utilities.formatDate(
        new Date(),
        CONFIG.ZONA_HORARIA,
        'yyyy'
      );

    let numero = 1;

    const patron =
      new RegExp(
        '^CAR-' +
        anio +
        '-(\\d{6})$'
      );

    datos.forEach(
      function(fila) {

        const idExistente =
          String(
            fila[0] || ''
          ).trim();

        const coincidencia =
          idExistente.match(patron);

        if (coincidencia) {

          const n =
            Number(
              coincidencia[1]
            );

          if (n >= numero) {
            numero = n + 1;
          }

        }

      }
    );

    const idCarnet =
      'CAR-' +
      anio +
      '-' +
      String(numero)
        .padStart(6, '0');

    /* ================================================
       GENERAR CODIGO QR
    ================================================= */

    let codigoQR;

    do {

      codigoQR =
        'MGP-' +
        generarCodigoQRV2();

    }
    while (
      datos.some(
        function(fila) {

          return String(
            fila[10] || ''
          ).trim() === codigoQR;

        }
      )
    );

    /* ================================================
       FECHAS
    ================================================= */

    const fechaEmision =
      new Date();

    const fechaVencimiento =
      new Date(
        fechaEmision
      );

    fechaVencimiento.setFullYear(
      fechaVencimiento.getFullYear() + 1
    );

    const fechaEmisionTexto =
      Utilities.formatDate(
        fechaEmision,
        CONFIG.ZONA_HORARIA,
        'dd/MM/yyyy'
      );

    const fechaVencimientoTexto =
      Utilities.formatDate(
        fechaVencimiento,
        CONFIG.ZONA_HORARIA,
        'dd/MM/yyyy'
      );

    /* ================================================
       GUARDAR CARNET
    ================================================= */

    hoja.appendRow([

      idCarnet,

      tipo,

      id,

      dniLimpio,

      fechaEmisionTexto,

      fechaVencimientoTexto,

      'ACTIVO',

      '',

      '',

      'MGP_V2',

      codigoQR

    ]);

    return {

      ok: true,

      exito: true,

      mensaje:
        'Carnet creado correctamente.',

      idCarnet:
        idCarnet,

      codigoQR:
        codigoQR

    };

  }
  catch (error) {

    return {

      ok: false,

      exito: false,

      mensaje:
        'Error creando carnet: ' +
        error.message

    };

  }
  finally {

    try {
      lock.releaseLock();
    }
    catch (e) {}
  }

}


/* =========================================================
   GENERAR CODIGO QR
========================================================= */

function generarCodigoQRV2() {

  const caracteres =
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  let resultado = '';

  for (
    let i = 0;
    i < 8;
    i++
  ) {

    resultado +=
      caracteres.charAt(
        Math.floor(
          Math.random() *
          caracteres.length
        )
      );

  }

  return resultado;
}


/* =========================================================
   PRUEBA CREAR CARNET DE NILDA
========================================================= */

function pruebaCrearCarnetNilda() {

  const resultado =
    crearCarnetV2(
      'EST-000001',
      'estudiante',
      '81434318'
    );

  Logger.log(
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}
function diagnosticoCarnetsV2() {

  try {

    const ss =
      SpreadsheetApp.openById(
        CONFIG.HOJA_ID_ESTUDIANTES
      );

    const hoja =
      ss.getSheetByName('CARNETS');

    const resultado = {

      ok: true,

      spreadsheetId:
        CONFIG.HOJA_ID_ESTUDIANTES,

      nombreHojaBase:
        CONFIG.NOMBRE_HOJA_BASE,

      existeCarnets:
        hoja !== null,

      ultimaFila:
        hoja ? hoja.getLastRow() : 0,

      ultimaColumna:
        hoja ? hoja.getLastColumn() : 0,

      pruebaFuncion:
        typeof crearCarnetV2,

      fecha:
        Utilities.formatDate(
          new Date(),
          CONFIG.ZONA_HORARIA,
          'dd/MM/yyyy HH:mm:ss'
        )

    };

    Logger.log(
      JSON.stringify(
        resultado,
        null,
        2
      )
    );

    return resultado;

  }
  catch (error) {

    const resultado = {

      ok: false,

      mensaje:
        error.message,

      stack:
        error.stack || ''

    };

    Logger.log(
      JSON.stringify(
        resultado,
        null,
        2
      )
    );

    return resultado;
  }
}
/* =========================================================
   SEGURIDAD V2 - LOGIN POR USUARIOS
   PRUEBA AISLADA
   NO MODIFICA EL LOGIN ACTUAL
   ========================================================= */

function hashClaveV2_(clave) {

  const texto =
    String(clave || "");

  const bytes =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      texto,
      Utilities.Charset.UTF_8
    );

  return bytes
    .map(function(byte) {

      const valor =
        byte < 0
          ? byte + 256
          : byte;

      return ("0" + valor.toString(16))
        .slice(-2);

    })
    .join("");

}


/* =========================================================
   BUSCAR USUARIO V2
   ========================================================= */

function buscarUsuarioV2_(usuario) {

  const ss =
    SpreadsheetApp.openById(
      CONFIG.HOJA_ID_ESTUDIANTES
    );

  const hoja =
    ss.getSheetByName("USUARIOS");

  if (!hoja) {

    return {
      encontrado: false,
      mensaje:
        "No existe la hoja USUARIOS."
    };

  }

  const datos =
    hoja
      .getDataRange()
      .getDisplayValues();

  if (datos.length < 2) {

    return {
      encontrado: false,
      mensaje:
        "La hoja USUARIOS no tiene usuarios."
    };

  }

  const buscado =
    String(usuario || "")
      .trim()
      .toLowerCase();

  for (
    let i = 1;
    i < datos.length;
    i++
  ) {

    const fila = datos[i];

    const usuarioFila =
      String(fila[1] || "")
        .trim()
        .toLowerCase();

    if (
      usuarioFila === buscado
    ) {

      return {

        encontrado: true,

        fila: i + 1,

        usuario: {

          idUsuario:
            String(fila[0] || "").trim(),

          usuario:
            String(fila[1] || "").trim(),

          nombre:
            String(fila[2] || "").trim(),

          rol:
            String(fila[3] || "")
              .trim()
              .toUpperCase(),

          idPersonal:
            String(fila[4] || "").trim(),

          estado:
            String(fila[5] || "")
              .trim()
              .toUpperCase(),

          fechaRegistro:
            String(fila[6] || "").trim(),

          ultimoAcceso:
            String(fila[7] || "").trim(),

          idApoderado:
            String(fila[8] || "").trim(),

          claveHash:
            String(fila[9] || "").trim()

        }

      };

    }

  }

  return {

    encontrado: false,

    mensaje:
      "Usuario no encontrado."

  };

}


/* =========================================================
   VALIDAR LOGIN V2
   PRUEBA AISLADA
   ========================================================= */

function validarLoginV2Prueba(
  usuario,
  password
) {

  const encontrado =
    buscarUsuarioV2_(usuario);

  if (
    !encontrado.encontrado
  ) {

    return {

      ok: false,

      mensaje:
        encontrado.mensaje

    };

  }

  const datos =
    encontrado.usuario;

  if (
    datos.estado !==
    "ACTIVO"
  ) {

    return {

      ok: false,

      mensaje:
        "El usuario está inactivo."

    };

  }

  const hashIngresado =
    hashClaveV2_(password);

  if (
    !datos.claveHash
  ) {

    return {

      ok: false,

      mensaje:
        "El usuario todavía no tiene contraseña V2 configurada."

    };

  }

  if (
    hashIngresado !==
    datos.claveHash
  ) {

    return {

      ok: false,

      mensaje:
        "Usuario o contraseña incorrectos."

    };

  }

  return {

    ok: true,

    usuario: {

      idUsuario:
        datos.idUsuario,

      usuario:
        datos.usuario,

      nombre:
        datos.nombre,

      rol:
        datos.rol,

      idPersonal:
        datos.idPersonal,

      idApoderado:
        datos.idApoderado

    }

  };

}
/* =========================================================
   PERSONAL V2
   GENERADOR DE ID_PERSONAL
   ---------------------------------------------------------
   No modifica Registro, QR, cámara ni asistencia.
   ========================================================= */

function generarIdPersonalV2_() {

  const lock = LockService.getScriptLock();

  try {

    lock.waitLock(10000);

    const ss =
      SpreadsheetApp.openById(
        CONFIG.HOJA_ID_ESTUDIANTES
      );

    const hoja =
      ss.getSheetByName("PERSONAL");

    if (!hoja) {

      throw new Error(
        "No existe la hoja PERSONAL."
      );

    }

    const ultimaFila =
      hoja.getLastRow();

    // Solo encabezados
    if (ultimaFila < 2) {
      return "PER-000001";
    }

    const datos =
      hoja
        .getRange(
          2,
          1,
          ultimaFila - 1,
          1
        )
        .getDisplayValues();

    let mayor = 0;

    datos.forEach(function(fila) {

      const id =
        String(fila[0] || "")
          .trim()
          .toUpperCase();

      const coincidencia =
        id.match(/^PER-(\d+)$/);

      if (coincidencia) {

        const numero =
          parseInt(
            coincidencia[1],
            10
          );

        if (
          !isNaN(numero) &&
          numero > mayor
        ) {
          mayor = numero;
        }

      }

    });

    const siguiente =
      mayor + 1;

    return (
      "PER-" +
      String(siguiente)
        .padStart(6, "0")
    );

  }
  catch (error) {

    throw new Error(
      "Error generando ID_PERSONAL: " +
      error.message
    );

  }
  finally {

    try {
      lock.releaseLock();
    }
    catch (e) {}

  }

}
/* =========================================================
   PRUEBA CONTROLADA
   NO MODIFICA LA HOJA PERSONAL
   ========================================================= */

function pruebaGenerarIdPersonalV2() {

  const id =
    generarIdPersonalV2_();

  Logger.log(
    "ID_PERSONAL generado: " +
    id
  );

  return id;

}

/* =========================================================
   PERSONAL V2
   ASIGNAR ID_PERSONAL A REGISTRO EXISTENTE
   ---------------------------------------------------------
   PRUEBA CONTROLADA
   Solo modifica la columna A de la persona indicada.
   ========================================================= */

function pruebaAsignarIdPersonalV2() {

  const dniObjetivo = "41397784";

  const lock =
    LockService.getScriptLock();

  try {

    lock.waitLock(10000);

    const ss =
      SpreadsheetApp.openById(
        CONFIG.HOJA_ID_ESTUDIANTES
      );

    const hoja =
      ss.getSheetByName("PERSONAL");

    if (!hoja) {

      throw new Error(
        "No existe la hoja PERSONAL."
      );

    }

    const ultimaFila =
      hoja.getLastRow();

    if (ultimaFila < 2) {

      throw new Error(
        "La hoja PERSONAL no tiene registros."
      );

    }

    const datos =
      hoja
        .getRange(
          2,
          1,
          ultimaFila - 1,
          10
        )
        .getDisplayValues();

    let filaObjetivo = -1;
    let idActual = "";

    for (
      let i = 0;
      i < datos.length;
      i++
    ) {

      const dni =
        String(datos[i][1] || "")
          .replace(/\s+/g, "")
          .trim();

      if (dni === dniObjetivo) {

        filaObjetivo = i + 2;

        idActual =
          String(datos[i][0] || "")
            .trim();

        break;
      }
    }

    if (filaObjetivo === -1) {

      throw new Error(
        "No se encontró el DNI " +
        dniObjetivo +
        " en PERSONAL."
      );

    }

    /*
     * SEGURIDAD:
     * Si ya existe un ID_PERSONAL,
     * NO lo reemplazamos.
     */

    if (idActual) {

      return {

        ok: true,

        modificado: false,

        idPersonal: idActual,

        mensaje:
          "La persona ya tiene ID_PERSONAL. " +
          "No se modificó el registro."

      };

    }

    const nuevoId =
      generarIdPersonalV2_();

    hoja
      .getRange(
        filaObjetivo,
        1
      )
      .setValue(nuevoId);

    return {

      ok: true,

      modificado: true,

      fila: filaObjetivo,

      dni: dniObjetivo,

      idPersonal: nuevoId,

      mensaje:
        "ID_PERSONAL asignado correctamente."

    };

  }
  catch (error) {

    throw new Error(
      "Error asignando ID_PERSONAL: " +
      error.message
    );

  }
  finally {

    try {
      lock.releaseLock();
    }
    catch (e) {}

  }

}
/* =========================================================
   PRUEBA CONTROLADA
   GENERAR HASH DE CONTRASEÑA
   NO MODIFICA NINGUNA HOJA
   ========================================================= */

function pruebaGenerarHashClaveV2() {

  const clave =
    "PRUEBA123";

  const hash =
    hashClaveV2_(clave);

  Logger.log(
    "HASH DE PRUEBA123:"
  );

  Logger.log(hash);

  return hash;

}
/* =========================================================
   PRUEBA CONTROLADA
   LOGIN V2 - AUXILIAR
   NO MODIFICA NINGUNA HOJA
   ========================================================= */

function pruebaLoginV2Auxiliar() {

  const resultado =
    validarLoginV2Prueba(
      "auxiliar",
      "PRUEBA123"
    );

  if (!resultado) {

    throw new Error(
      "La función validarLoginV2Prueba no devolvió resultado."
    );

  }

  Logger.log(
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;

}
/* =========================================================
   LOGIN V2 - PRODUCCIÓN
   ---------------------------------------------------------
   Lee USUARIOS y devuelve identidad + rol.
   No modifica ninguna hoja.
   ========================================================= */

function validarLoginServidorV2(usuario, password) {

  const resultado =
    validarLoginV2Prueba(
      usuario,
      password
    );

  if (!resultado) {

    return {
      ok: false,
      mensaje: "No se obtuvo respuesta del sistema de usuarios."
    };

  }

  if (!resultado.ok || !resultado.usuario) {

    return resultado;

  }

  const permisos =
    obtenerPermisosRolV2_(
      resultado.usuario.rol
    );

  if (!permisos) {

    return {
      ok: false,
      mensaje:
        "El rol del usuario no tiene permisos V2 configurados."
    };

  }

  const usuarioConPermisos =
    Object.assign(
      {},
      resultado.usuario,
      {
        permisos: permisos
      }
    );

  const sesion =
    crearSesionV2_(usuarioConPermisos);

  usuarioConPermisos.token =
    sesion.token;

  usuarioConPermisos.expiraSesion =
    sesion.expira;

  return {
    ok: true,
    usuario: usuarioConPermisos
  };

}
/* =========================================================
   PRUEBA LOGIN SERVIDOR V2
   NO MODIFICA NINGUNA HOJA
   ========================================================= */

function pruebaLoginServidorV2() {

  const resultado =
    validarLoginServidorV2(
      "auxiliar",
      "PRUEBA123"
    );

  Logger.log(
    "RESULTADO LOGIN SERVIDOR V2:"
  );

  Logger.log(
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;

}
/* =========================================================
   SEGURIDAD V2
   MATRIZ CENTRAL DE PERMISOS
   ---------------------------------------------------------
   PRUEBA AISLADA
   NO MODIFICA LOGIN
   NO MODIFICA REGISTRO
   NO MODIFICA QR
   NO MODIFICA NINGUNA HOJA
   ========================================================= */

function obtenerPermisosRolV2_(rol) {

  const rolNormalizado =
    String(rol || "")
      .trim()
      .toUpperCase();

  const permisos = {

    AUXILIAR: {

      registrarAsistencia: true,

      consultarAsistencia: true,

      verReportes: true,

      administrarPersonas: false,

      administrarUsuarios: false,

      administrarQR: false,

      administrarConfiguracion: false,

      administrarJustificaciones: true

    },

    DIRECTOR: {

      registrarAsistencia: true,

      consultarAsistencia: true,

      verReportes: true,

      administrarPersonas: false,

      administrarUsuarios: false,

      administrarQR: false,

      administrarConfiguracion: false,

      administrarJustificaciones: true

    },

    ADMIN: {

      registrarAsistencia: true,

      consultarAsistencia: true,

      verReportes: true,

      administrarPersonas: true,

      administrarUsuarios: true,

      administrarQR: true,

      administrarConfiguracion: true,

      administrarJustificaciones: true

    },

    PUBLICO: {

      registrarAsistencia: false,

      consultarAsistencia: true,

      verReportes: false,

      administrarPersonas: false,

      administrarUsuarios: false,

      administrarQR: false,

      administrarConfiguracion: false,

      administrarJustificaciones: false

    },

    APODERADO: {

      registrarAsistencia: false,

      consultarAsistencia: true,

      verReportes: false,

      administrarPersonas: false,

      administrarUsuarios: false,

      administrarQR: false,

      administrarConfiguracion: false,

      administrarJustificaciones: false

    }

  };

  return permisos[rolNormalizado] || null;

}


/* =========================================================
   PRUEBA CONTROLADA
   PERMISOS V2 - AUXILIAR
   NO MODIFICA NINGUNA HOJA
   ========================================================= */

function pruebaPermisosV2Auxiliar() {

  const resultado =
    validarLoginV2Prueba(
      "auxiliar",
      "PRUEBA123"
    );

  if (
    !resultado ||
    !resultado.ok ||
    !resultado.usuario
  ) {

    throw new Error(
      "No fue posible autenticar al usuario AUXILIAR."
    );

  }

  const permisos =
    obtenerPermisosRolV2_(
      resultado.usuario.rol
    );

  if (!permisos) {

    throw new Error(
      "El rol " +
      resultado.usuario.rol +
      " no tiene una matriz de permisos configurada."
    );

  }

  const salida = {

    ok: true,

    usuario:
      resultado.usuario.usuario,

    rol:
      resultado.usuario.rol,

    idPersonal:
      resultado.usuario.idPersonal,

    permisos:
      permisos

  };

  Logger.log(
    "RESULTADO PERMISOS V2 AUXILIAR:"
  );

  Logger.log(
    JSON.stringify(
      salida,
      null,
      2
    )
  );

  return salida;

}
