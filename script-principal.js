<script>
const firebaseConfig = {
  apiKey: "AIzaSyCoWEFFkPnGgjwTHwRYXUUcJ29KZPoj9R8",
  authDomain: "friends-kukis.firebaseapp.com",
  projectId: "friends-kukis",
  storageBucket: "friends-kukis.firebasestorage.app",
  messagingSenderId: "833642230061",
  appId: "1:833642230061:web:70d4661ec772c8e84323a4"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const storage = firebase.storage();
</script>

<script>
document.addEventListener("DOMContentLoaded", function() {

const COSTO_MIN = 4000;
  const COSTO_MAX = 15000;
  let COSTO_DOMICILIO = 5000;      
  let DISTANCIA_KM = null;         
  const FALLBACK_DOMI = 6000;      

  
const DIRECCION_SEDES = {
  Popayan: {
    "Sede Terraplaza Centro Comercial": "Carrera 9 #73 AN-200 Norte, Cra. 9, Popayán, Cauca, Colombia",
    'Sede Sur Planta de Producción': "Cra 40 # 4N - 05 barrio ciudad 2000, Popayán, Cauca, Colombia"
  },
  Jamundi: {
    "Sede Centro Comercial Alfaguara": "Calle 2 #22-175, Jamundí, Valle del Cauca, Colombia"
  },
  Cali: {
  }
};


  let selectedProducts = [];
  let opcionDomicilio = 'recoger';
  let metodoPagoSeleccionado = '';
  let comprobanteArchivoGlobal = null;

  function generarIDUnico() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resultado = '';
    for (let i = 0; i < 4; i++) {
      resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
  }

  function guardarEstadoPedido() {
    const estado = {
      selectedProducts,
      opcionDomicilio,
      metodoPagoSeleccionado,
      timestamp: Date.now()
    };
    localStorage.setItem('friendsKukisPedido', JSON.stringify(estado));
  }

  function cargarEstadoPedido() {
    try {
      const guardado = localStorage.getItem('friendsKukisPedido');
      if (guardado) {
        const estado = JSON.parse(guardado);
        if (Date.now() - estado.timestamp < 2 * 60 * 60 * 1000) {
          selectedProducts = estado.selectedProducts || [];
          opcionDomicilio = estado.opcionDomicilio || 'recoger';
          metodoPagoSeleccionado = estado.metodoPagoSeleccionado || '';
          return true;
        }
      }
    } catch (e) {
      console.error("Error cargando estado:", e);
    }
    return false;
  }

  function limpiarEstadoPedido() {
    localStorage.removeItem('friendsKukisPedido');
  }

  if (cargarEstadoPedido()) {
    console.log("✅ Estado del pedido recuperado");
  }

  const canasta = document.querySelector('#canasta-kuki');
  const hiddenField = document.querySelector('#selected_products');
  const btnCanasta = document.querySelector('#btn-canasta-kuki');
  const formularioContainer = document.querySelector('#formulario-pedido');

  (function activarReboteIcono(){
    const btnIcon = document.querySelector('#btn-canasta-kukiss');
    if (!btnIcon) return;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes bounceKuki { 0%,100%{transform:scale(1)} 50%{transform:scale(1.25) rotate(-5deg)} }
      #btn-canasta-kukiss.animando { animation: bounceKuki .5s ease; }
    `;
    document.head.appendChild(style);
    btnIcon.addEventListener('click', () => {
      btnIcon.classList.add('animando');
      setTimeout(() => btnIcon.classList.remove('animando'), 500);
    });
  })();

  let formularioPersonalizado;
  if (formularioContainer) {
    if (!formularioContainer.querySelector('form')) {
      formularioPersonalizado = crearFormularioPersonalizado();
      formularioContainer.appendChild(formularioPersonalizado);
    }
    formularioContainer.style.display = 'none';
  }

  if (canasta) canasta.style.display = 'none';
  let countEl = document.querySelector('#canasta-count');
  if (!countEl && btnCanasta) {
    countEl = document.createElement('span');
    countEl.id = 'canasta-count';
    btnCanasta.appendChild(countEl);
  }

  if (btnCanasta) {
    btnCanasta.addEventListener('click', (e) => {
      e.preventDefault();
      if (canasta) canasta.scrollIntoView({ behavior: "smooth" });
    });
  }

  document.querySelectorAll('.carrito-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.name;
      const category = btn.dataset.categoria;
      const price = parseFloat(btn.dataset.price);

      const existing = selectedProducts.find(p => p.name === name && p.category === category);
      if (existing) {
        existing.quantity += 1;
      } else {
        selectedProducts.push({ name, category, price, quantity: 1 });
      }
      guardarEstadoPedido();
      renderCanasta();
    });
  });

  document.querySelectorAll(".tab-content-menu").forEach(tab => tab.style.display = "none");
  document.querySelectorAll(".w-tab-link").forEach(function(link) {
    link.addEventListener("click", function() {
      const targetId = this.getAttribute("data-w-tab");
      const targetTab = document.querySelector('.w-tab-content [data-w-tab="' + targetId + '"]');
      if (!targetTab) return;
      if (targetTab.style.display === "block") {
        targetTab.style.display = "none";
      } else {
        document.querySelectorAll(".tab-content-menu").forEach(tab => tab.style.display = "none");
        targetTab.style.display = "block";
      }
    });
  });

  function formatearDetallesPedido() {
    let detalles = "DETALLES DEL PEDIDO:\n\n";
    let subtotalProductos = 0;

    selectedProducts.forEach((p) => {
      const subtotal = p.price * p.quantity;
      detalles += `${p.quantity}x ${p.name} (${p.category}) - $${subtotal}`;
      if (p.sabores && p.sabores.length > 0) {
        detalles += ` - Sabores: ${p.sabores.join(', ')}`;
      }
      detalles += `\n`;
      subtotalProductos += subtotal;
    });

    let totalFinal = subtotalProductos;
    let infoDomicilio = "";
    let pagoPendiente = "";

    if (opcionDomicilio === 'domicilio_pagado') {
      totalFinal += COSTO_DOMICILIO;
      infoDomicilio = `\nDomicilio (pagado ahora): $${COSTO_DOMICILIO}`;
    } else if (opcionDomicilio === 'domicilio_efectivo') {
      infoDomicilio = `\nDomicilio (pagar al recibir): $${COSTO_DOMICILIO}`;
      if (metodoPagoSeleccionado && metodoPagoSeleccionado !== 'Efectivo') {
        pagoPendiente = `\n⚠️ PENDIENTE: $${COSTO_DOMICILIO} en efectivo por domicilio`;
      }
    } else if (opcionDomicilio === 'recoger') {
      infoDomicilio = `\nRecoger en tienda: $0`;
    }

    detalles += `\nSUBTOTAL PRODUCTOS: $${subtotalProductos}`;
    detalles += infoDomicilio;

    if (DISTANCIA_KM != null) {
      detalles += `\nDISTANCIA ESTIMADA: ${DISTANCIA_KM} km`;
      detalles += `\nTARIFA DOMICILIO DINÁMICA: $${COSTO_DOMICILIO}`;
    }

    if (pagoPendiente) {
      detalles += pagoPendiente;
      detalles += `\nTOTAL PAGADO EN LÍNEA: $${totalFinal}`;
      detalles += `\nTOTAL FINAL (con domicilio): $${totalFinal + COSTO_DOMICILIO}`;
    } else {
      detalles += `\nTOTAL: $${totalFinal}`;
    }

    return {
      texto: detalles,
      subtotalProductos,
      total: totalFinal,
      opcionDomicilio,
      costoDomicilio: COSTO_DOMICILIO,
      pagoPendiente: !!pagoPendiente
    };
  }

  function renderCanasta() {
    if (!canasta) return;

    if (selectedProducts.length === 0) {
      canasta.innerHTML = '';
      canasta.style.display = 'none';
      updateCanastaCount();
      return;
    }

    canasta.style.display = 'block';
    canasta.innerHTML = '';
    let subtotalProductos = 0;

    const title = document.createElement('h3');
    title.textContent = "CANASTA DE COMPRAS";
    title.className = "canasta-titulo";
    canasta.appendChild(title);

    selectedProducts.forEach((p, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'canasta-item';
      itemDiv.innerHTML = `
        <span>${p.name} (${p.category})</span>
        <input type="number" min="1" value="${p.quantity}" data-index="${index}" class="canasta-cantidad">
        <span>$${p.price * p.quantity}</span>
        <button class="btn-remove" data-index="${index}">Eliminar</button>
      `;
      canasta.appendChild(itemDiv);
      subtotalProductos += p.price * p.quantity;

      if (p.category === 'BabyKukis') {
        const saboresContainer = crearDesplegableSabores(index);
        canasta.appendChild(saboresContainer);
        if (!p.sabores) p.sabores = [];
      }
    });

    const domicilioDiv = document.createElement('div');
    domicilioDiv.className = 'domicilio-container';
    domicilioDiv.style.marginTop = '15px';
    domicilioDiv.style.padding = '15px';
    domicilioDiv.style.border = '2px solid #e0e0e0';
    domicilioDiv.style.borderRadius = '8px';
    domicilioDiv.style.backgroundColor = '#f8f9fa';

    domicilioDiv.innerHTML = `
      <h4 style="margin-bottom: 12px; color: #333; text-align: center;">🚚 OPCIÓN DE ENTREGA</h4>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <label style="display: flex; align-items: center; padding: 10px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; background: ${opcionDomicilio === 'recoger' ? '#e8f5e8' : '#fff'};">
          <input type="radio" name="opcion_domicilio" value="recoger" ${opcionDomicilio === 'recoger' ? 'checked' : ''} style="margin-right: 10px;">
          <div>
            <strong>🏪 Recoger en tienda</strong>
            <div style="font-size: 12px; color: #666;">Vienes personalmente a recoger tu pedido</div>
            <div style="font-size: 12px; color: #28a745;">Costo: $0</div>
          </div>
        </label>
        
        <label style="display: flex; align-items: center; padding: 10px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; background: ${opcionDomicilio === 'domicilio_pagado' ? '#e8f5e8' : '#fff'};">
          <input type="radio" name="opcion_domicilio" value="domicilio_pagado" ${opcionDomicilio === 'domicilio_pagado' ? 'checked' : ''} style="margin-right: 10px;">
          <div>
            <strong>🚚 Domicilio pagado ahora</strong>
            <div style="font-size: 12px; color: #666;">Pagas el domicilio junto con tu pedido</div>
            <div style="font-size: 12px; color: #dc3545;">Costo: $${COSTO_DOMICILIO}</div>
          </div>
        </label>
        
        <label style="display: flex; align-items: center; padding: 10px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; background: ${opcionDomicilio === 'domicilio_efectivo' ? '#e8f5e8' : '#fff'};">
          <input type="radio" name="opcion_domicilio" value="domicilio_efectivo" ${opcionDomicilio === 'domicilio_efectivo' ? 'checked' : ''} style="margin-right: 10px;">
          <div>
            <strong>💰 Domicilio pagar al recibir</strong>
            <div style="font-size: 12px; color: #666;">Pagas el domicilio en efectivo cuando recibes</div>
            <div style="font-size: 12px; color: #ffc107;">Costo: $${COSTO_DOMICILIO} (efectivo)</div>
          </div>
        </label>
      </div>
    `;
    canasta.appendChild(domicilioDiv);

    let totalFinal = subtotalProductos;
    if (opcionDomicilio === 'domicilio_pagado') totalFinal += COSTO_DOMICILIO;

    const desgloseDiv = document.createElement('div');
    desgloseDiv.className = 'desglose-precios';
    desgloseDiv.style.marginTop = '15px';
    desgloseDiv.style.padding = '12px';
    desgloseDiv.style.backgroundColor = '#f0f8ff';
    desgloseDiv.style.borderRadius = '6px';
    desgloseDiv.style.fontSize = '14px';

    let desgloseHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span>Subtotal productos:</span>
        <span>$${subtotalProductos}</span>
      </div>
    `;

    if (DISTANCIA_KM != null) {
      desgloseHTML += `
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
          <span>Distancia estimada:</span>
          <span>${DISTANCIA_KM} km</span>
        </div>`;
    } else if (opcionDomicilio !== 'recoger') {
      desgloseHTML += `
        <div style="margin-top:6px;font-size:12px;color:#666;">
          (Ingresa <strong>Ciudad</strong>, <strong>Sede</strong> y <strong>Dirección</strong> para calcular la tarifa dinámica del domicilio)
        </div>`;
    }

    if (opcionDomicilio === 'recoger') {
      desgloseHTML += `<div style="display:flex;justify-content:space-between;margin-bottom:5px;color:#28a745;"><span>Recoger en tienda:</span><span>$0</span></div>`;
    } else if (opcionDomicilio === 'domicilio_pagado') {
      desgloseHTML += `<div style="display:flex;justify-content:space-between;margin-bottom:5px;color:#dc3545;"><span>Domicilio (pagado ahora):</span><span>$${COSTO_DOMICILIO}</span></div>`;
    } else if (opcionDomicilio === 'domicilio_efectivo') {
      desgloseHTML += `<div style="display:flex;justify-content:space-between;margin-bottom:5px;color:#ffc107;"><span>Domicilio (pagar al recibir):</span><span>$${COSTO_DOMICILIO}</span></div>`;
    }

    const detallesObj = formatearDetallesPedido();
    if (detallesObj.pagoPendiente) {
      desgloseHTML += `
        <div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px solid #ccc;padding-top:5px;">
          <span>TOTAL (productos):</span>
          <span>$${totalFinal}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:5px;color:#ffc107;font-weight:bold;">
          <span>+ Domicilio (efectivo):</span>
          <span>$${COSTO_DOMICILIO}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:3px;font-weight:bold;color:#333;">
          <span>TOTAL FINAL:</span>
          <span>$${totalFinal + COSTO_DOMICILIO}</span>
        </div>
      `;
    } else {
      desgloseHTML += `
        <div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px solid #ccc;padding-top:5px;">
          <span>TOTAL:</span>
          <span>$${totalFinal}</span>
        </div>
      `;
    }

    desgloseDiv.innerHTML = desgloseHTML;
    canasta.appendChild(desgloseDiv);

    if (selectedProducts.length > 0) {
      const botonDoble = document.createElement('button');
      botonDoble.textContent = 'HACER PEDIDO';
      botonDoble.className = 'btn-doble';
      botonDoble.style.background = '#4CAF50';
      botonDoble.style.marginTop = '15px';

      botonDoble.addEventListener('click', function() {
        let saboresValidos = true;
        selectedProducts.forEach((p) => {
          if (p.category === 'BabyKukis' && (!p.sabores || p.sabores.length === 0)) {
            saboresValidos = false;
          }
        });

        if (!saboresValidos) {
          alert('Por favor selecciona al menos 1 sabor para todos los productos BabyKukis');
          return;
        }

        if (!formularioContainer) return;

        if (formularioContainer.style.display === 'block') {
          formularioContainer.style.display = 'none';
          botonDoble.textContent = 'HACER PEDIDO';
        } else {
          formularioContainer.style.display = 'block';
          botonDoble.textContent = 'SEGUIR COMPRANDO';
          botonDoble.style.background = '#6c757d';

          setTimeout(() => {
            const formulario = document.querySelector('#formulario-pedido-personalizado');
            if (formulario) {
              const yOffset = -80;
              const y = formulario.getBoundingClientRect().top + window.pageYOffset + yOffset;
              window.scrollTo({ top: y, behavior: 'smooth' });
            } else {
              formularioContainer.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 100);
        }
      });
      canasta.appendChild(botonDoble);
    }

    if (hiddenField) hiddenField.value = JSON.stringify(selectedProducts);
    updateCanastaCount();
  }

  function updateCanastaCount() {
    if (!countEl) return;
    const totalItems = selectedProducts.reduce((acc, p) => acc + p.quantity, 0);
    if (totalItems > 0) {
      countEl.style.display = 'block';
      countEl.textContent = totalItems;
    } else {
      countEl.style.display = 'none';
    }
  }

  if (canasta) {
    canasta.addEventListener('change', function(e){
      if (e.target.classList.contains('canasta-cantidad')) {
        const idx = parseInt(e.target.dataset.index);
        selectedProducts[idx].quantity = parseInt(e.target.value) || 1;
        guardarEstadoPedido();
        renderCanasta();
      }
      if (e.target.name === 'opcion_domicilio') {
        opcionDomicilio = e.target.value;
        guardarEstadoPedido();
        renderCanasta();
      }
    });

    canasta.addEventListener('click', function(e){
      if (e.target.classList.contains('btn-remove')) {
        const idx = parseInt(e.target.dataset.index);
        selectedProducts.splice(idx, 1);
        guardarEstadoPedido();
        renderCanasta();
      }
    });
  }
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js"></script>

<script>
const firebaseConfig = {
  apiKey: "AIzaSyCoWEFFkPnGgjwTHwRYXUUcJ29KZPoj9R8",
  authDomain: "friends-kukis.firebaseapp.com",
  projectId: "friends-kukis",
  storageBucket: "friends-kukis.firebasestorage.app",
  messagingSenderId: "833642230061",
  appId: "1:833642230061:web:70d4661ec772c8e84323a4"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const storage = firebase.storage();
</script>

<script>
document.addEventListener("DOMContentLoaded", function() {

const COSTO_MIN = 4000;
  const COSTO_MAX = 15000;
  let COSTO_DOMICILIO = 5000;
  let DISTANCIA_KM = null;
  const FALLBACK_DOMI = 6000;

  const DIRECCION_SEDES = {
    Popayan: {
      "Sede Terraplaza Centro Comercial": "Carrera 9 #73 AN-200 Norte, Cra. 9, Popayán, Cauca, Colombia",
      "Sede Sur Planta de Producción": "Cra 40 # 4N - 05 barrio ciudad 2000, Popayán, Cauca, Colombia"
    },
    Jamundi: {
      "Sede Centro Comercial Alfaguara": "Calle 2 #22-175, Jamundí, Valle del Cauca, Colombia"
    },
    Cali: {}
  };

  let selectedProducts = [];
  let opcionDomicilio = "recoger";
  let metodoPagoSeleccionado = "";
  let comprobanteArchivoGlobal = null;

  function generarIDUnico() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  }

  function guardarEstadoPedido() {
    localStorage.setItem("friendsKukisPedido", JSON.stringify({
      selectedProducts, opcionDomicilio, metodoPagoSeleccionado, timestamp: Date.now()
    }));
  }

  function cargarEstadoPedido() {
    try {
      const guardado = localStorage.getItem("friendsKukisPedido");
      if (guardado) {
        const estado = JSON.parse(guardado);
        if (Date.now() - estado.timestamp < 2 * 60 * 60 * 1000) {
          selectedProducts = estado.selectedProducts || [];
          opcionDomicilio = estado.opcionDomicilio || "recoger";
          metodoPagoSeleccionado = estado.metodoPagoSeleccionado || "";
          return true;
        }
      }
    } catch (e) {
      console.error("Error cargando estado:", e);
    }
    return false;
  }

  function limpiarEstadoPedido() {
    localStorage.removeItem("friendsKukisPedido");
  }

  if (cargarEstadoPedido()) console.log("✅ Estado del pedido recuperado");

  const canasta = document.querySelector("#canasta-kuki");
  const hiddenField = document.querySelector("#selected_products");
  const btnCanasta = document.querySelector("#btn-canasta-kuki");
  const formularioContainer = document.querySelector("#formulario-pedido");

  (function activarReboteIcono() {
    const btnIcon = document.querySelector("#btn-canasta-kukiss");
    if (!btnIcon) return;
    const style = document.createElement("style");
    style.textContent = `
      @keyframes bounceKuki {0%,100%{transform:scale(1)}50%{transform:scale(1.25) rotate(-5deg)}}
      #btn-canasta-kukiss.animando {animation:bounceKuki .5s ease;}
    `;
    document.head.appendChild(style);
    btnIcon.addEventListener("click", () => {
      btnIcon.classList.add("animando");
      setTimeout(() => btnIcon.classList.remove("animando"), 500);
    });
  })();

  let formularioPersonalizado;
  if (formularioContainer) {
    if (!formularioContainer.querySelector("form")) {
      formularioPersonalizado = crearFormularioPersonalizado();
      formularioContainer.appendChild(formularioPersonalizado);
    }
    formularioContainer.style.display = "none";
  }

  if (canasta) canasta.style.display = "none";
  let countEl = document.querySelector("#canasta-count");
  if (!countEl && btnCanasta) {
    countEl = document.createElement("span");
    countEl.id = "canasta-count";
    btnCanasta.appendChild(countEl);
  }

  if (btnCanasta) {
    btnCanasta.addEventListener("click", e => {
      e.preventDefault();
      if (canasta) canasta.scrollIntoView({ behavior: "smooth" });
    });
  }

  document.querySelectorAll(".carrito-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const name = btn.dataset.name;
      const category = btn.dataset.categoria;
      const price = parseFloat(btn.dataset.price);
      const existing = selectedProducts.find(p => p.name === name && p.category === category);
      if (existing) existing.quantity += 1;
      else selectedProducts.push({ name, category, price, quantity: 1 });
      guardarEstadoPedido();
      renderCanasta();
    });
  });

  function ensureGoogleMapsLoaded() {
    return new Promise(resolve => {
      if (window.google && google.maps && google.maps.DistanceMatrixService) return resolve();
      if (document.getElementById("gmaps-sdk")) {
        const check = setInterval(() => {
          if (window.google && google.maps && google.maps.DistanceMatrixService) {
            clearInterval(check); resolve();
          }
        }, 300);
        return;
      }
      const script = document.createElement("script");
      script.id = "gmaps-sdk";
      script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyBUGX7VXXFeFsKSh5Lgzuy-SdGG5vRg-b0&libraries=places";
      script.async = true;
      document.head.appendChild(script);
      const check = setInterval(() => {
        if (window.google && google.maps && google.maps.DistanceMatrixService) {
          clearInterval(check); resolve();
        }
      }, 300);
    });
  }

  function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
      if (!window.google || !google.maps || !google.maps.Geocoder)
        return reject(new Error("Google Maps Geocoder no disponible"));
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else reject(new Error("No se pudo geocodificar: " + status));
      });
    });
  }

  function getDistanceKm(origin, destination) {
    return new Promise((resolve, reject) => {
      if (!window.google || !google.maps || !google.maps.DistanceMatrixService)
        return reject(new Error("Google Maps no cargó"));
      const service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        { origins: [origin], destinations: [destination], travelMode: "DRIVING", unitSystem: google.maps.UnitSystem.METRIC },
        (response, status) => {
          try {
            if (status !== "OK") return reject(new Error("Status: " + status));
            const elem = response.rows?.[0]?.elements?.[0];
            if (!elem || elem.status !== "OK") return reject(new Error("Sin ruta válida"));
            resolve(elem.distance.value / 1000);
          } catch (e) { reject(e); }
        }
      );
    });
  }

  function tarifaPorKm(km) {
    const kMin = 1.5, kMax = 8;
    if (km <= kMin) return COSTO_MIN;
    if (km >= kMax) return COSTO_MAX;
    const frac = (km - kMin) / (kMax - kMin);
    return Math.round((COSTO_MIN + frac * (COSTO_MAX - COSTO_MIN)) / 100) * 100;
  }

  async function recalcularDomicilio(ciudad, sede, direccion) {
    try {
      if (!ciudad || !sede || !direccion || direccion.trim().length < 5) {
        DISTANCIA_KM = null; COSTO_DOMICILIO = 5000; renderCanasta(); return;
      }
      const origen = DIRECCION_SEDES[ciudad]?.[sede];
      if (!origen) {
        DISTANCIA_KM = null; COSTO_DOMICILIO = FALLBACK_DOMI; renderCanasta(); return;
      }
      const destinoTexto = `${direccion}, ${ciudad}, Colombia`;
      await ensureGoogleMapsLoaded();

      const dirTxt = document.querySelector('[name="direccion_envio"]');
      let lat = dirTxt?.dataset.lat, lng = dirTxt?.dataset.lng;

      if (!lat || !lng) {
        try {
          const coords = await geocodeAddress(destinoTexto);
          lat = coords.lat; lng = coords.lng;
          console.log("📍 Coordenadas (geocode):", lat, lng);
        } catch (e) { console.warn("⚠️ Geocoding falló:", e); }
      }

      const destinoFinal = lat && lng ? `${lat},${lng}` : destinoTexto;
      const km = await getDistanceKm(origen, destinoFinal);

      DISTANCIA_KM = Number(km.toFixed(2));
      COSTO_DOMICILIO = tarifaPorKm(DISTANCIA_KM);
      console.log(`🚚 Distancia: ${DISTANCIA_KM} km | Costo: $${COSTO_DOMICILIO}`);
      renderCanasta();
    } catch (err) {
      console.warn("❌ Error domicilio:", err);
      DISTANCIA_KM = null; COSTO_DOMICILIO = FALLBACK_DOMI; renderCanasta();
    }
  }

  function crearFormularioPersonalizado() {
    const form = document.createElement("form");
    form.id = "formulario-pedido-personalizado";
    form.style.cssText = "padding:20px;border:2px solid #e0e0e0;border-radius:10px;background:#fafafa;margin-top:20px;";

    form.innerHTML = `
      <h3 style="margin-bottom:20px;color:#333;text-align:center;">INFORMACIÓN DEL PEDIDO</h3>
      <label>Nombre Completo *</label><input name="nombre_completo" required style="width:100%;padding:10px;border:1px solid #ccc;border-radius:4px;margin-bottom:10px;">
      <label>Número de WhatsApp *</label><input type="tel" name="numero_whatsapp" required style="width:100%;padding:10px;border:1px solid #ccc;border-radius:4px;margin-bottom:10px;">
      <label>Dirección de Envío *</label><textarea name="direccion_envio" required style="width:100%;padding:10px;border:1px solid #ccc;border-radius:4px;margin-bottom:10px;"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div>
          <label>Ciudad *</label>
          <select id="ciudad-select" name="ciudad" required>
            <option value="">Escoja su ciudad</option>
            <option value="Popayan">Popayán</option>
            <option value="Jamundi">Jamundí</option>
            <option value="Cali" disabled>Cali (Próximamente)</option>
          </select>
        </div>
        <div>
          <label>Sede más cercana *</label>
          <select id="sede-select" name="sede" required><option value="">Primero seleccione ciudad</option></select>
        </div>
      </div>
      <label>Programación de envío *</label>
      <select name="programacion_envio" required>
        <option value="">Opción de envío</option>
        <option value="Envío inmediato">Envío inmediato</option>
        <option value="En las próximas 2 horas">En las próximas 2 horas</option>
        <option value="Esta tarde">Esta tarde</option>
        
      </select>
      <label>Método de Pago *</label>
      <select id="metodo-pago-select" name="metodo_pago" required>
        <option value="">Seleccione método</option>
        <option value="Efectivo">Efectivo</option>
        <option value="Transferencia">Transferencia Bancaria</option>
        <option value="Nequi">Nequi</option>
        <option value="Daviplata">Daviplata</option>
      </select>
      <label>Tipo de envoltura *</label>
      <select name="tipo_envoltura" required>
        <option value="">Seleccione</option>
        <option value="Envoltura estándar">Envoltura estándar</option>
        <option value="Personalizada">Personalizada</option>
      </select>
      <label>Notas adicionales</label>
      <textarea name="extras_notas" placeholder="Ej: instrucciones especiales..." style="width:100%;padding:10px;border:1px solid #ccc;border-radius:4px;margin-bottom:15px;"></textarea>
      <button type="submit" style="width:100%;padding:15px;background:#4CAF50;color:white;border:none;border-radius:5px;font-size:16px;font-weight:bold;">ENVIAR PEDIDO</button>
    `;

    const ciudadSel = form.querySelector("#ciudad-select");
    const sedeSel = form.querySelector("#sede-select");
    const dirTxt = form.querySelector('[name="direccion_envio"]');
    const sedesPorCiudad = {
      Popayan: ["Sede Terraplaza Centro Comercial", "Sede Sur Planta de Producción"],
      Jamundi: ["Sede Centro Comercial Alfaguara"],
      Cali: ["Sin sede"]
    };

    ciudadSel.addEventListener("change", e => {
      const ciudad = e.target.value;
      sedeSel.innerHTML = '<option value="">Escoja su sede</option>';
      if (ciudad && sedesPorCiudad[ciudad])
        sedesPorCiudad[ciudad].forEach(sede => {
          const opt = document.createElement("option");
          opt.value = sede; opt.textContent = sede; sedeSel.appendChild(opt);
        });
      setTimeout(() => recalcularDomicilio(ciudadSel.value, sedeSel.value, dirTxt.value), 0);
    });

    sedeSel.addEventListener("change", () => recalcularDomicilio(ciudadSel.value, sedeSel.value, dirTxt.value));

    ensureGoogleMapsLoaded().then(() => {
      try {
        const auto = new google.maps.places.Autocomplete(dirTxt, { componentRestrictions: { country: ["co"] } });
        auto.addListener("place_changed", () => {
          const place = auto.getPlace();
          if (place.geometry && place.geometry.location) {
            dirTxt.dataset.lat = place.geometry.location.lat();
            dirTxt.dataset.lng = place.geometry.location.lng();
            recalcularDomicilio(ciudadSel.value, sedeSel.value, dirTxt.value);
          }
        });
      } catch (e) { console.warn("Autocomplete no disponible:", e); }
    });

    ["change", "blur", "input"].forEach(evt => {
      let debounce;
      dirTxt.addEventListener(evt, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => recalcularDomicilio(ciudadSel.value, sedeSel.value, dirTxt.value), 400);
      });
    });

    form.querySelector("#metodo-pago-select").addEventListener("change", e => {
      metodoPagoSeleccionado = e.target.value;
      guardarEstadoPedido();
      if (metodoPagoSeleccionado !== "Efectivo") mostrarModalPagos();
      renderCanasta();
    });

    form.addEventListener("submit", e => {
      e.preventDefault(); handleFormSubmit(form);
    });

    return form;
  }

      setTimeout(() => recalcularDomicilio(ciudadSel.value, sedeSel.value, dirTxt?.value), 0);
    });

    sedeSel.addEventListener('change', function() {
      setTimeout(() => recalcularDomicilio(ciudadSel.value, sedeSel.value, dirTxt?.value), 0);
    });

    let debounce;
    ['change','blur','input'].forEach(evt => {
      dirTxt?.addEventListener(evt, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          recalcularDomicilio(ciudadSel?.value, sedeSel?.value, dirTxt?.value);
        }, 400);
      });
    });

form.querySelector('#metodo-pago-select').addEventListener('change', function(e) {
      metodoPagoSeleccionado = e.target.value;
      guardarEstadoPedido();
      if (metodoPagoSeleccionado && metodoPagoSeleccionado !== 'Efectivo') {
        mostrarModalPagos();
      }
      renderCanasta();
    });

    // Submit
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      handleFormSubmit(form);
    });

    ensureGoogleMapsLoaded().then(() => {
      try {
        if (window.google && google.maps && google.maps.places && dirTxt) {
          new google.maps.places.Autocomplete(dirTxt, { componentRestrictions: { country: ['co'] } });
        }
      } catch (e) {}
    });

    return form;
  }

  function ocultarElementosQueTapanModal() {
    const elementosAltos = document.querySelectorAll(`
      .w-nav-overlay,
      [style*="z-index: 999"],
      [style*="z-index: 9999"],
      [style*="z-index: 1000"],
      [class*="overlay"],
      [class*="dropdown"]
    `);
    elementosAltos.forEach(el => {
      const computedZIndex = parseInt(window.getComputedStyle(el).zIndex);
      if (computedZIndex > 1000) {
        el.style.visibility = 'hidden';
        el.dataset.originalVisibility = el.style.visibility;
      }
    });
  }

  function restaurarElementosOcultos() {
    const elementosOcultos = document.querySelectorAll('[data-original-visibility]');
    elementosOcultos.forEach(el => {
      el.style.visibility = el.dataset.originalVisibility;
      delete el.dataset.originalVisibility;
    });
  }

  function mostrarModalPagos() {
    ocultarElementosQueTapanModal();
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const modal = document.createElement('div');
    modal.id = 'modal-pagos';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.95); display: flex; justify-content: center; align-items: center;
      z-index: 999999; padding: 20px; box-sizing: border-box;
    `;

    modal.innerHTML = `
      <div style="background: white; padding: 25px; border-radius: 15px; width: 100%; max-width: 450px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.5); position: relative;">
        <button onclick="cerrarModalPagos()" style="position: absolute; top: 15px; right: 20px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center;">×</button>
        <div style="text-align: center; margin-bottom: 20px; padding-top: 10px;">
          <h3 style="color: #4CAF50; margin: 0 0 12px 0; font-size: 22px; font-weight: bold;">INFORMACIÓN DE PAGO</h3>
          <div style="background: #fff3cd; padding: 12px; border-radius: 8px; border: 2px solid #ffeaa7; margin-bottom: 10px;">
            <p style="margin: 0; font-size: 14px; color: #856404; font-weight: bold;">⚠️ TOMA CAPTURA - No cierres esta ventana</p>
          </div>
        </div>

        <!-- NEQUI -->
        <div style="margin-bottom: 20px; padding: 18px; background: #f8fbff; border-radius: 12px; border: 2px solid #e8f0fe;">
          <div style="display:flex;align-items:center;justify-content:center;margin-bottom:15px;">
            <img src="https://cdn.brandfetch.io/id6FVNP6X7/w/800/h/248/theme/dark/logo.png" style="width:70px; height:70px; object-fit:contain;" alt="Nequi">
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;background:white;padding:15px;border-radius:10px;border:1px solid #e0e0e0;">
              <div>
                <div style="font-weight:bold;font-size:14px;color:#666;">Número</div>
                <div style="font-size:18px;color:#333;font-weight:bold;margin-top:5px;">3226374600</div>
              </div>
              <button onclick="copiarAlPortapapeles('3226374600')" style="background:#4D14DE;color:white;border:none;padding:10px 15px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:bold;min-width:80px;">Copiar</button>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;background:white;padding:15px;border-radius:10px;border:1px solid #e0e0e0;">
              <div>
                <div style="font-weight:bold;font-size:14px;color:#666;">BRE-B</div>
                <div style="font-size:18px;color:#333;font-weight:bold;margin-top:5px;">322724FRIENDS</div>
              </div>
              <button onclick="copiarAlPortapapeles('3226374600')" style="background:#4D14DE;color:white;border:none;padding:10px 15px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:bold;min-width:80px;">Copiar</button>
            </div>
          </div>
        </div>

        <!-- BANCOLOMBIA -->
        <div style="margin-bottom: 20px; padding: 18px; background: #f8fdf8; border-radius: 12px; border: 2px solid #f0f8f0;">
          <div style="display:flex;align-items:center;justify-content:center;margin-bottom:15px;">
            <img src="https://cdn.brandfetch.io/idPIbCua49/w/800/h/103/theme/dark/logo.webp" style="width:115px; height:115px; object-fit:contain;" alt="Bancolombia">
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;background:white;padding:15px;border-radius:10px;border:1px solid #e0e0e0;">
            <div>
              <div style="font-weight:bold;font-size:14px;color:#666;">Cuenta de ahorros</div>
              <div style="font-size:18px;color:#333;font-weight:bold;margin-top:5px;">868-812759-80</div>
            </div>
            <button onclick="copiarAlPortapapeles('868-812759-80')" style="background:#1E3A8A;color:white;border:none;padding:10px 15px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:bold;min-width:80px;">Copiar</button>
          </div>
        </div>

        <!-- COMPROBANTE -->
        <div style="margin-bottom:25px; padding:18px; background:#f8f9fa; border-radius:12px; border:2px dashed #795548;">
          <h4 style="color:#795548; margin:0 0 12px 0; text-align:center; font-size:18px; font-weight:bold;">COMPROBANTE DE PAGO</h4>
          <input type="file" id="input-comprobante" accept="image/*" style="width:100%; padding:10px;"/>
          <small style="color:#555; display:block; margin-top:8px;">Formatos: JPG/PNG. Tamaño máx sugerido: 3 MB.</small>
        </div>

        <button onclick="cerrarModalPagos()" style="width:100%; padding:12px; background:#6c757d; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">
          Entendido
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    const inputComp = modal.querySelector('#input-comprobante');
    if (inputComp) {
      inputComp.addEventListener('change', (e) => {
        comprobanteArchivoGlobal = e.target.files?.[0] || null;
      });
    }
  }

  window.cerrarModalPagos = function() {
    const modal = document.getElementById('modal-pagos');
    if (modal) modal.remove();
    restaurarElementosOcultos();
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  };

  window.copiarAlPortapapeles = function(texto) {
    navigator.clipboard.writeText(texto).then(() => {
      alert('Copiado al portapapeles: ' + texto);
    }).catch(() => {
      alert('No se pudo copiar. Selecciona y copia manualmente: ' + texto);
    });
  };

  function crearDesplegableSabores(productIndex) {
    const sabores = ['Nutella', 'Red Velvet', 'Leche Klim', 'Maracuyá'];
    const container = document.createElement('div');
    container.className = 'sabores-container';
    container.style.marginTop = '5px';
    container.style.padding = '10px';
    container.style.border = '1px solid #ddd';
    container.style.borderRadius = '5px';
    container.style.backgroundColor = '#f9f9f9';

    const label = document.createElement('label');
    label.textContent = 'Selecciona sabores (1-3):';
    label.style.display = 'block';
    label.style.marginBottom = '8px';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';
    label.style.color = '#333';
    container.appendChild(label);

    const select = document.createElement('select');
    select.multiple = true;
    select.required = true;
    select.className = 'sabores-select';
    select.dataset.productIndex = productIndex;
    select.style.width = '100%';
    select.style.padding = '8px';
    select.style.fontSize = '14px';
    select.style.border = '1px solid #ccc';
    select.style.borderRadius = '4px';

    select.addEventListener('change', function() {
      if (this.selectedOptions.length > 3) {
        alert('Solo puedes seleccionar máximo 3 sabores');
        this.selectedOptions[this.selectedOptions.length - 1].selected = false;
      }
      if (this.selectedOptions.length === 0) {
        this.setCustomValidity('Debes seleccionar al menos 1 sabor');
      } else {
        this.setCustomValidity('');
      }
      const selectedSabores = Array.from(this.selectedOptions).map(option => option.value);
      selectedProducts[productIndex].sabores = selectedSabores;
      guardarEstadoPedido();
    });

    sabores.forEach(sabor => {
      const option = document.createElement('option');
      option.value = sabor;
      option.textContent = sabor;
      select.appendChild(option);
    });

    container.appendChild(select);

    const instrucciones = document.createElement('small');
    instrucciones.textContent = 'Mantén presionada la tecla Ctrl (o Cmd en Mac) para seleccionar varios.';
    instrucciones.style.display = 'block';
    instrucciones.style.marginTop = '6px';
    instrucciones.style.color = '#666';
    container.appendChild(instrucciones);

    return container;
  }

  async function handleFormSubmit(formEl) {
    // Validación mínima
    if (selectedProducts.length === 0) {
      alert('Tu canasta está vacía.');
      return;
    }

    const submitBtn = formEl.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.textContent = 'Enviando...';
      submitBtn.disabled = true;
      submitBtn.style.opacity = 0.7;
    }

    const fd = new FormData(formEl);
    const nombre = fd.get('nombre_completo')?.toString().trim();
    const whatsapp = fd.get('numero_whatsapp')?.toString().trim();
    const direccion = fd.get('direccion_envio')?.toString().trim();
    const ciudad = fd.get('ciudad')?.toString();
    const sede = fd.get('sede')?.toString();
    const programacion_envio = fd.get('programacion_envio')?.toString();
    const metodo_pago = fd.get('metodo_pago')?.toString();
    const tipo_envoltura = fd.get('tipo_envoltura')?.toString();
    const extras_notas = fd.get('extras_notas')?.toString();


if (metodo_pago && metodo_pago !== 'Efectivo') {
      if (!comprobanteArchivoGlobal) {
        alert('⚠️ Debes subir el comprobante de pago antes de enviar tu pedido.');
        if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false; submitBtn.style.opacity = 1; }
        return;
      }
      const tiposOK = ['image/jpeg','image/png','image/jpg'];
      if (!tiposOK.includes(comprobanteArchivoGlobal.type)) {
        alert('❌ Solo se permiten imágenes JPG o PNG como comprobante.');
        if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false; submitBtn.style.opacity = 1; }
        return;
      }
      if (comprobanteArchivoGlobal.size > 3 * 1024 * 1024) {
        alert('❌ El archivo excede los 3 MB permitidos.');
        if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false; submitBtn.style.opacity = 1; }
        return;
      }
    }

    const detallesObj = formatearDetallesPedido();

    let urlComprobante = '';
    if (comprobanteArchivoGlobal) {
      try {
        const ext = (comprobanteArchivoGlobal.name || 'comprobante').split('.').pop();
        const idSeg = generarIDUnico();
        const ref = storage.ref().child(`comprobantes/${Date.now()}_${idSeg}.${ext}`);
        await ref.put(comprobanteArchivoGlobal);
        urlComprobante = await ref.getDownloadURL();
      } catch (e) {
        console.warn('No se pudo subir comprobante:', e);
      }
    }

    const payload = {
      idSeguimiento: generarIDUnico(),
      fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
      nombre,
      whatsapp,
      direccion,
      ciudad,
      sede,
      programacion_envio,
      metodo_pago,
      tipo_envoltura,
      extras_notas,
      productos: selectedProducts,
      opcionDomicilio,
      costoDomicilio: COSTO_DOMICILIO,
      subtotalProductos: detallesObj.subtotalProductos,
      total: detallesObj.total,
      detallesTexto: detallesObj.texto,
      distanciaKm: DISTANCIA_KM,
      tarifaDomiRango: { min: COSTO_MIN, max: COSTO_MAX },
      origenSedeTexto: (DIRECCION_SEDES[ciudad] && DIRECCION_SEDES[ciudad][sede]) ? DIRECCION_SEDES[ciudad][sede] : '',
      destinoClienteTexto: `${direccion || ''}${ciudad ? ', ' + ciudad : ''}, Colombia`,
      domicilioDinamicoOK: DISTANCIA_KM != null,
      urlComprobante
    };

    try {
      const docRef = await db.collection('pedidos').add(payload);
      alert(`🎉 Pedido recibido. ¡Gracias por tu compra!

📦 Número de seguimiento: ${payload.idSeguimiento}

📍 Estado: Recibido
⏰ Procesando tu pedido...

🔍 Consulta el estado en:
friends-kukis.webflow.io`);

      formEl.reset();
      selectedProducts = [];
      opcionDomicilio = 'recoger';
      metodoPagoSeleccionado = '';
      comprobanteArchivoGlobal = null;
      limpiarEstadoPedido();
      renderCanasta();
      if (formularioContainer) formularioContainer.style.display = 'none';
    } catch (err) {
      console.error("💥 Error en el proceso:", err);
      alert('Error al enviar pedido. Por favor intenta nuevamente.\nError: ' + (err?.message || err));
    } finally {
      if (submitBtn) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        submitBtn.style.opacity = 1;
      }
    }
  }

  function ensureGoogleMapsLoaded() {
    return new Promise((resolve) => {
      if (window.google && google.maps && google.maps.DistanceMatrixService) {
        return resolve();
      }
      if (document.getElementById('gmaps-sdk')) {
        const check = setInterval(() => {
          if (window.google && google.maps && google.maps.DistanceMatrixService) {
            clearInterval(check);
            resolve();
          }
        }, 300);
        return;
      }
      const script = document.createElement('script');
      script.id = 'gmaps-sdk';
      script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBUGX7VXXFeFsKSh5Lgzuy-SdGG5vRg-b0&libraries=places';
      script.async = true;
      document.head.appendChild(script);

      const check = setInterval(() => {
        if (window.google && google.maps && google.maps.DistanceMatrixService) {
          clearInterval(check);
          resolve();
        }
      }, 300);
    });
  }

  function getDistanceKm(originText, destinationText) {
    return new Promise((resolve, reject) => {
      if (!window.google || !google.maps || !google.maps.DistanceMatrixService) {
        return reject(new Error('Google Maps JS no cargó'));
      }
      const service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [originText],
          destinations: [destinationText],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC
        },
        (response, status) => {
          try {
            if (status !== 'OK') return reject(new Error('DistanceMatrix status: ' + status));
            const row = response.rows?.[0];
            const elem = row?.elements?.[0];
            if (!elem || elem.status !== 'OK') return reject(new Error('Sin ruta válida'));
            const meters = elem.distance.value; 
            const km = meters / 1000;
            resolve(km);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  function tarifaPorKm(km) {
    const kMin = 1.5;
    const kMax = 8;
    if (km <= kMin) return COSTO_MIN;
    if (km >= kMax) return COSTO_MAX;
    const frac = (km - kMin) / (kMax - kMin);
    const valor = COSTO_MIN + frac * (COSTO_MAX - COSTO_MIN);
    return Math.round(valor / 100) * 100; 
  }

  async function recalcularDomicilio(ciudad, sede, direccion) {
    try {
      if (!ciudad || !sede || !direccion || direccion.trim().length < 5) {
        DISTANCIA_KM = null;
        COSTO_DOMICILIO = 5000;
        renderCanasta();
        return;
      }

      const origen = DIRECCION_SEDES[ciudad]?.[sede];
      if (!origen) {
        DISTANCIA_KM = null;
        COSTO_DOMICILIO = FALLBACK_DOMI; 
        renderCanasta();
        return;
      }
      const destino = `${direccion}, ${ciudad}, Colombia`;

      await ensureGoogleMapsLoaded();
      const km = await getDistanceKm(origen, destino);
      DISTANCIA_KM = Number(km.toFixed(2));
      COSTO_DOMICILIO = tarifaPorKm(DISTANCIA_KM);
      renderCanasta();
    } catch (err) {
      console.warn('No se pudo calcular distancia:', err);
      DISTANCIA_KM = null;
      COSTO_DOMICILIO = FALLBACK_DOMI; 
      renderCanasta();
    }
  }

  renderCanasta();
});








const iconosCarrito = document.querySelectorAll('#btn-canasta-kukiss, .carrito-btn, .cart-icon');
if (iconosCarrito.length > 0) {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bounceKuki {
      0%,100% { transform: scale(1); }
      50% { transform: scale(1.25) rotate(-6deg); }
    }
    .brinca-kuki {
      animation: bounceKuki 0.5s ease;
    }
  `;
  document.head.appendChild(style);

  iconosCarrito.forEach(icono => {
    icono.addEventListener('click', () => {
      icono.classList.add('brinca-kuki');
      setTimeout(() => icono.classList.remove('brinca-kuki'), 500);
    });
  });
}

</script>






<style>
@keyframes spinKuki {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin-active {
  animation: spinKuki 1.2s ease-in-out;
}

@keyframes shakeKuki {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}
.shake-active {
  animation: shakeKuki 0.45s ease-in-out;
}

@keyframes vibrarKuki {
  0%, 100% { transform: translate(0); }
  25% { transform: translate(-1px, 1px); }
  50% { transform: translate(1px, -1px); }
  75% { transform: translate(-1px, -1px); }
}
.vibrar-active {
  animation: vibrarKuki 0.25s ease-in-out;
}
</style>

<script>
document.addEventListener("DOMContentLoaded", () => {

  const logo = document.querySelector('#logo-kuki');
  if (logo) {
    logo.classList.add('spin-active');
    setTimeout(() => logo.classList.remove('spin-active'), 1500);
  }

  const iconosCarrito = document.querySelectorAll(
    '#btn-canasta-kuki, #btn-canasta-kukiss, .carrito-btn, .cart-icon'
  );
  if (iconosCarrito.length > 0) {
    iconosCarrito.forEach(icono => {
      icono.classList.add('shake-active');
      setTimeout(() => icono.classList.remove('shake-active'), 450);
    });

    setInterval(() => {
      iconosCarrito.forEach(icono => {
        icono.classList.add('shake-active');
        setTimeout(() => icono.classList.remove('shake-active'), 450);
      });
    }, 4000); 
  }

  const categorias = document.querySelectorAll(
    '#Galletas-rellenas123, #Cuchareables-cat123, #baby123'
  );
  if (categorias.length > 0) {
    categorias.forEach(cat => {
      cat.classList.add('vibrar-active');
      setTimeout(() => cat.classList.remove('vibrar-active'), 250);
    });

    setInterval(() => {
      categorias.forEach(cat => {
        cat.classList.add('vibrar-active');
        setTimeout(() => cat.classList.remove('vibrar-active'), 250);
      });
    }, 2300);
  }

});
</script>

