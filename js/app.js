const state={tipo:'estudiante',estado:'INGRESO',qr:null,camara:false};
function mostrarVista(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));if(id!=='registro')detenerCamara();window.scrollTo(0,0)}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>mostrarVista(b.dataset.view)));
homeBtn.addEventListener('click',()=>mostrarVista('portal'));salirBtn.addEventListener('click',()=>mostrarVista('portal'));
entrarBtn.addEventListener('click',()=>{const m=loginMsg;if(!usuario.value.trim()||!password.value.trim()){m.textContent='Ingrese usuario y contraseña.';return}m.textContent='Acceso de prueba V2. La autenticación real se conectará al backend.';mostrarVista('panel')});
document.querySelectorAll('[data-tipo]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tipo]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.tipo=b.dataset.tipo}));
document.querySelectorAll('[data-estado]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-estado]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.estado=b.dataset.estado}));
// =====================================================
// SISTEMA DE CÁMARA V2
// =====================================================

const cameraState = {
  reader: null,
  cameras: [],
  currentIndex: 0,
  activa: false
};


// =====================================================
// MOSTRAR MENSAJE DE CÁMARA
// =====================================================

function mensajeCamara(texto) {

  const elemento =
    document.getElementById('camMsg');

  if (elemento) {
    elemento.textContent = texto;
  }

}


// =====================================================
// CARGAR CÁMARAS DISPONIBLES
// =====================================================

async function cargarCamaras() {

  try {

    mensajeCamara(
      '🔍 Buscando cámaras disponibles...'
    );

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
      document.getElementById('cameraSelect');

    selector.innerHTML = '';


    cameraState.cameras.forEach(
      function(camera, index) {

        const opcion =
          document.createElement('option');

        opcion.value = index;

        opcion.textContent =
          camera.label ||
          `Cámara ${index + 1}`;

        selector.appendChild(opcion);

      }
    );


    // =================================================
    // INTENTAR SELECCIONAR CÁMARA TRASERA
    // =================================================

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

        indicePreferido = i;
        break;

      }

    }


    cameraState.currentIndex =
      indicePreferido;

    selector.value =
      indicePreferido;


    document.getElementById(
      'camera-controls'
    ).style.display = 'block';


    mensajeCamara(
      `${cameraState.cameras.length} cámara(s) disponible(s).`
    );

    return true;

  } catch (error) {

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
// INICIAR LECTOR QR
// =====================================================

async function iniciarCamara() {

  if (cameraState.activa) {

    mensajeCamara(
      '📷 La cámara ya está activa.'
    );

    return;

  }


  if (
    typeof Html5Qrcode ===
    'undefined'
  ) {

    mensajeCamara(
      '❌ No se cargó la biblioteca del lector QR.'
    );

    return;

  }


  const camarasOK =
    await cargarCamaras();

  if (!camarasOK) {
    return;
  }


  try {

    const cameraId =
      cameraState.cameras[
        cameraState.currentIndex
      ].id;


    cameraState.reader =
      new Html5Qrcode(
        'reader'
      );


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

      function(decodedText) {

        mensajeCamara(
          '✅ QR leído correctamente.'
        );

        detenerCamara();

        regMsg.textContent =
          'QR leído: ' +
          decodedText;

      },

      function(errorMessage) {

        // No mostramos los errores normales
        // de búsqueda de QR continuamente.
      }

    );


    cameraState.activa = true;


    mensajeCamara(
      '📷 Cámara activa. Apunte al QR del carnet.'
    );


    document.getElementById(
      'camBtn'
    ).disabled = true;


    document.getElementById(
      'switchCamBtn'
    ).disabled =
      cameraState.cameras.length < 2;


  } catch (error) {

    console.error(
      'Error iniciando cámara:',
      error
    );


    cameraState.activa = false;


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

  selector.value =
    cameraState.currentIndex;


  if (cameraState.activa) {

    await detenerCamara();

    await iniciarCamara();

  } else {

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
// CAMBIAR DESDE EL SELECTOR
// =====================================================

document
  .getElementById('cameraSelect')
  .addEventListener(
    'change',
    async function() {

      cameraState.currentIndex =
        Number(this.value);


      if (cameraState.activa) {

        await detenerCamara();

        await iniciarCamara();

      }

    }
  );


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

  } catch (error) {

    console.warn(
      'Error deteniendo cámara:',
      error
    );

  }


  cameraState.reader = null;

  cameraState.activa = false;


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
// BOTONES
// =====================================================

document
  .getElementById('camBtn')
  .addEventListener(
    'click',
    iniciarCamara
  );


document
  .getElementById('stopCamBtn')
  .addEventListener(
    'click',
    detenerCamara
  );


document
  .getElementById('switchCamBtn')
  .addEventListener(
    'click',
    cambiarCamara
  );
consultarBtn.addEventListener('click',()=>{consultaMsg.textContent=dniConsulta.value.trim()&&claveConsulta.value.trim()?'Consulta frontend lista para conectarse al backend.':'Ingrese DNI y código de consulta.'});
dniBtn.addEventListener('click',()=>{regMsg.textContent=dniManual.value.trim()?'Registro DNI preparado para backend.':'Ingrese el DNI.'});
