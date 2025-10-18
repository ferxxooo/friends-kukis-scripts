<!-- Firebase (compat) - Pegar esto en el body antes del script principal -->
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js"></script>

<script>
/* ================== INICIALIZAR FIREBASE ================== */
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
/* ================== SCRIPT PRINCIPAL MEJORADO ================== */
document.addEventListener("DOMContentLoaded", function() {
  // ====== CONFIGURACIÓN ======
  const COSTO_DOMICILIO = 5000;
  
  // ====== SISTEMA DE GUARDADO AUTOMÁTICO ======
  let selectedProducts = [];
  let opcionDomicilio = 'recoger';
  let metodoPagoSeleccionado = '';
  let comprobanteArchivoGlobal = null;

  // ====== GENERADOR DE ID DE SEGUIMIENTO ======
  function generarIDUnico() {
      const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let resultado = '';
      for (let i = 0; i < 4; i++) {
          resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
      }
      return resultado;
  }

  // Guardar estado en localStorage
  function guardarEstadoPedido() {
    const estado = {
      selectedProducts: selectedProducts,
      opcionDomicilio: opcionDomicilio,
      metodoPagoSeleccionado: metodoPagoSeleccionado,
      timestamp: Date.now()
    };
    localStorage.setItem('friendsKukisPedido', JSON.stringify(estado));
  }

  // Cargar estado desde localStorage
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

  // Cargar estado al iniciar
  if (cargarEstadoPedido()) {
    console.log("✅ Estado del pedido recuperado");
  }

  // ====== ELEMENTOS DEL DOM ======
  const canasta = document.querySelector('#canasta-kuki');
  const hiddenField = document.querySelector('#selected_products');
  const btnCanasta = document.querySelector('#btn-canasta-kuki');
  const formularioContainer = document.querySelector('#formulario-pedido');

  // Configurar formulario
  let formularioPersonalizado;
  if (formularioContainer) {
    if (!formularioContainer.querySelector('form')) {
      formularioPersonalizado = crearFormularioPersonalizado();
      formularioContainer.appendChild(formularioPersonalizado);
    }
    formularioContainer.style.display = 'none';
  }

  // Configurar canasta
  if (canasta) canasta.style.display = 'none';
  
  let countEl = document.querySelector('#canasta-count');
  if (!countEl && btnCanasta) {
    countEl = document.createElement('span');
    countEl.id = 'canasta-count';
    btnCanasta.appendChild(countEl);
  }

  // ====== EVENT LISTENERS ======
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
      if(existing){
        existing.quantity += 1;
      } else {
        selectedProducts.push({name, category, price, quantity:1});
      }
      guardarEstadoPedido();
      renderCanasta();
    });
  });

  // Tabs
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

  // ====== FUNCIONES PRINCIPALES ======
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
    if (pagoPendiente) {
      detalles += pagoPendiente;
      detalles += `\nTOTAL PAGADO EN LÍNEA: $${totalFinal}`;
      detalles += `\nTOTAL FINAL (con domicilio): $${totalFinal + COSTO_DOMICILIO}`;
    } else {
      detalles += `\nTOTAL: $${totalFinal}`;
    }

    return { 
      texto: detalles, 
      subtotalProductos: subtotalProductos,
      total: totalFinal,
      opcionDomicilio: opcionDomicilio,
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

    // Sección domicilio
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

    if (opcionDomicilio === 'recoger') {
      desgloseHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #28a745;"><span>Recoger en tienda:</span><span>$0</span></div>`;
    } else if (opcionDomicilio === 'domicilio_pagado') {
      desgloseHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #dc3545;"><span>Domicilio (pagado ahora):</span><span>$${COSTO_DOMICILIO}</span></div>`;
    } else if (opcionDomicilio === 'domicilio_efectivo') {
      desgloseHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #ffc107;"><span>Domicilio (pagar al recibir):</span><span>$${COSTO_DOMICILIO}</span></div>`;
    }

    const detallesObj = formatearDetallesPedido();
    if (detallesObj.pagoPendiente) {
      desgloseHTML += `
        <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #ccc; padding-top: 5px;">
          <span>TOTAL (productos):</span>
          <span>$${totalFinal}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 5px; color: #ffc107; font-weight: bold;">
          <span>+ Domicilio (efectivo):</span>
          <span>$${COSTO_DOMICILIO}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 3px; font-weight: bold; color: #333;">
          <span>TOTAL FINAL:</span>
          <span>$${totalFinal + COSTO_DOMICILIO}</span>
        </div>
      `;
    } else {
      desgloseHTML += `
        <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #ccc; padding-top: 5px;">
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
        selectedProducts.forEach((p, index) => {
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
              window.scrollTo({
                top: y,
                behavior: 'smooth'
              });
            } else {
              formularioContainer.scrollIntoView({ 
                behavior: "smooth",
                block: "start"
              });
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

  // Delegación de eventos
  if (canasta) {
    canasta.addEventListener('change', function(e){
      if(e.target.classList.contains('canasta-cantidad')){
        const idx = parseInt(e.target.dataset.index);
        selectedProducts[idx].quantity = parseInt(e.target.value) || 1;
        guardarEstadoPedido();
        renderCanasta();
      }
      
      if(e.target.name === 'opcion_domicilio') {
        opcionDomicilio = e.target.value;
        guardarEstadoPedido();
        renderCanasta();
      }
    });

    canasta.addEventListener('click', function(e){
      if(e.target.classList.contains('btn-remove')){
        const idx = parseInt(e.target.dataset.index);
        selectedProducts.splice(idx, 1);
        guardarEstadoPedido();
        renderCanasta();
      }
    });
  }

  // ====== FORMULARIO ======
  function crearFormularioPersonalizado() {
    const form = document.createElement('form');
    form.id = 'formulario-pedido-personalizado';
    form.style.padding = '20px';
    form.style.border = '2px solid #e0e0e0';
    form.style.borderRadius = '10px';
    form.style.backgroundColor = '#fafafa';
    form.style.marginTop = '20px';

    form.innerHTML = `
      <h3 style="margin-bottom: 20px; color: #333; text-align: center;">INFORMACIÓN DEL PEDIDO</h3>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Nombre Completo *</label>
        <input type="text" name="nombre_completo" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Número de WhatsApp *</label>
        <input type="tel" name="numero_whatsapp" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Dirección de Envío *</label>
        <textarea name="direccion_envio" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; min-height: 60px; resize: vertical;"></textarea>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Ciudad *</label>
          <select name="ciudad" id="ciudad-select" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
            <option value="">Escoja su ciudad</option>
            <option value="Popayan">Popayán</option>
            <option value="Jamundi">Jamundí</option>
            <option value="Cali" disabled style="color: #999; background-color: #f5f5f5;">Cali (Próximamente)</option>
          </select>
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Sede más cercana *</label>
          <select name="sede" id="sede-select" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
            <option value="">Primero seleccione ciudad</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Programación de envío *</label>
        <select name="programacion_envio" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
          <option value="">Seleccione opción de envío</option>
          <option value="Envío inmediato">Envío inmediato</option>
          <option value="En las próximas 2 horas">En las próximas 2 horas</option>
          <option value="Esta tarde">Esta tarde</option>
          <option value="Esta noche">Esta noche</option>
          <option value="Mañana en la mañana">Mañana en la mañana</option>
          <option value="Mañana en la tarde">Mañana en la tarde</option>
          <option value="Fecha específica">Programar para fecha específica</option>
        </select>
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Método de Pago *</label>
        <select name="metodo_pago" id="metodo-pago-select" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
          <option value="">Seleccione método de pago</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Transferencia">Transferencia Bancaria</option>
          <option value="Nequi">Nequi</option>
          <option value="Daviplata">Daviplata</option>
        </select>
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Tipo de pedido/envoltura *</label>
        <select name="tipo_envoltura" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
          <option value="">Seleccione una opción</option>
          <option value="Para regalo">Para regalo</option>
          <option value="Fecha especial">Fecha especial</option>
          <option value="Envoltura estándar">Envoltura estándar</option>
          <option value="Personalizada">Personalizada (especificar en notas)</option>
        </select>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Extras o notas adicionales</label>
        <textarea name="extras_notas" placeholder="Ej: Especificaciones de envoltura, instrucciones especiales, detalles del regalo, etc." style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; min-height: 80px; resize: vertical;"></textarea>
      </div>
      <button type="submit" style="width: 100%; padding: 15px; background: #4CAF50; color: white; border: none; border-radius: 5px; font-size: 16px; font-weight: bold; cursor: pointer;">
        ENVIAR PEDIDO
      </button>
    `;

    // Configuración de sedes ACTUALIZADA
    const sedesPorCiudad = {
      'Popayan': ['Sede Terraplaza Centro Commercial'],
      'Jamundi': ['Sede Centro Comercial Alfaguara'],
      'Cali': ['Sin sede']
    };

    form.querySelector('#ciudad-select').addEventListener('change', function(e) {
      const ciudad = e.target.value;
      const sedeSelect = form.querySelector('#sede-select');
      sedeSelect.innerHTML = '<option value="">Escoja su sede</option>';
      
      // CALI DESACTIVADA
      if (ciudad === 'Cali') {
        const option = document.createElement('option');
        option.value = 'Sin sede';
        option.textContent = 'Sin sede';
        option.disabled = true;
        option.style.color = '#999';
        option.style.backgroundColor = '#f5f5f5';
        sedeSelect.appendChild(option);
        sedeSelect.value = 'Sin sede';
        return;
      }
      
      if (ciudad && sedesPorCiudad[ciudad]) {
        sedesPorCiudad[ciudad].forEach(sede => {
          const option = document.createElement('option');
          option.value = sede;
          option.textContent = sede;
          sedeSelect.appendChild(option);
        });
      }
    });

    form.querySelector('#metodo-pago-select').addEventListener('change', function(e) {
      metodoPagoSeleccionado = e.target.value;
      guardarEstadoPedido();
      if (metodoPagoSeleccionado && metodoPagoSeleccionado !== 'Efectivo') {
        mostrarModalPagos();
      }
      renderCanasta();
    });

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      handleFormSubmit(form);
    });

    return form;
  }

  // ====== FUNCIONES PARA MANEJAR ELEMENTOS QUE TAPAN EL MODAL ======
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

 // ====== MODAL DE PAGOS SOLO CON LOGOS (SIN TEXTO) ======
function mostrarModalPagos() {
    ocultarElementosQueTapanModal();
    
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    const modal = document.createElement('div');
    modal.id = 'modal-pagos';
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0,0,0,0.95) !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 999999 !important;
      padding: 20px !important;
      box-sizing: border-box !important;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white !important; 
        padding: 25px !important; 
        border-radius: 15px !important; 
        width: 100% !important;
        max-width: 450px !important;
        max-height: 90vh !important;
        overflow-y: auto !important;
        box-shadow: 0 25px 50px rgba(0,0,0,0.5) !important;
        position: relative !important;
        z-index: 1000000 !important;
      ">
        <button onclick="cerrarModalPagos()" style="
          position: absolute !important;
          top: 15px !important;
          right: 20px !important;
          background: #dc3545 !important;
          color: white !important;
          border: none !important;
          border-radius: 50% !important;
          width: 35px !important;
          height: 35px !important;
          cursor: pointer !important;
          font-size: 18px !important;
          font-weight: bold !important;
          z-index: 1000001 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        ">×</button>
        
        <div style="text-align: center; margin-bottom: 20px; padding-top: 10px;">
          <h3 style="color: #4CAF50; margin: 0 0 12px 0; font-size: 22px; font-weight: bold;">💳 INFORMACIÓN DE PAGO</h3>
          <div style="background: #fff3cd; padding: 12px; border-radius: 8px; border: 2px solid #ffeaa7; margin-bottom: 10px;">
            <p style="margin: 0; font-size: 14px; color: #856404; font-weight: bold;">
              ⚠️ TOMA CAPTURA - No cierres esta ventana
            </p>
          </div>
        </div>
        
        <!-- NEQUI SOLO LOGO -->
        <div style="margin-bottom: 20px; padding: 18px; background: #f8fbff; border-radius: 12px; border: 2px solid #e8f0fe;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <img src="https://cdn.brandfetch.io/id6FVNP6X7/w/800/h/248/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B" 
                 style="width: 70px; height: 70px; object-fit: contain;" 
                 alt="Nequi">
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; border-radius: 10px; border: 1px solid #e0e0e0;">
              <div>
                <div style="font-weight: bold; font-size: 14px; color: #666;">Número</div>
                <div style="font-size: 18px; color: #333; font-weight: bold; margin-top: 5px;">3227249622</div>
              </div>
              <button onclick="copiarAlPortapapeles('3227249622')" style="background: #4D14DE; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; min-width: 80px;">Copiar</button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; border-radius: 10px; border: 1px solid #e0e0e0;">
              <div>
                <div style="font-weight: bold; font-size: 14px; color: #666;">BRE-B</div>
                <div style="font-size: 18px; color: #333; font-weight: bold; margin-top: 5px;">322724FRIENDS</div>
              </div>
              <button onclick="copiarAlPortapapeles('322724FRIENDS')" style="background: #4D14DE; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; min-width: 80px;">Copiar</button>
            </div>
          </div>
        </div>
        
        <!-- BANCOLOMBIA SOLO LOGO -->
        <div style="margin-bottom: 20px; padding: 18px; background: #f8fdf8; border-radius: 12px; border: 2px solid #f0f8f0;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <img src="https://cdn.brandfetch.io/idPIbCua49/w/800/h/103/theme/dark/logo.webp?c=1dxbfHSJFAPEGdCLU4o5B" 
                 style="width: 115px; height: 115px; object-fit: contain;" 
                 alt="Bancolombia">
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; border-radius: 10px; border: 1px solid #e0e0e0;">
            <div>
              <div style="font-weight: bold; font-size: 14px; color: #666;">Cuenta de ahorros</div>
              <div style="font-size: 18px; color: #333; font-weight: bold; margin-top: 5px;">970-23456-99</div>
            </div>
            <button onclick="copiarAlPortapapeles('970-23456-99')" style="background: #1E3A8A; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; min-width: 80px;">Copiar</button>
          </div>
        </div>
        
        <!-- COMPROBANTE -->
        <div style="margin-bottom: 25px; padding: 18px; background: #f8f9fa; border-radius: 12px; border: 2px dashed #795548;">
          <h4 style="color: #795548; margin: 0 0 12px 0; text-align: center; font-size: 18px; font-weight: bold;">📸 COMPROBANTE DE PAGO</h4>
          <input type="file" id="comprobantePago" accept="image/*,capture=camera" style="width: 100%; padding: 15px; border: 2px solid #ccc; border-radius: 8px; background: white; font-size: 15px; margin-bottom: 8px;">
          <small style="color: #666; display: block; text-align: center; font-size: 13px; font-weight: 500;">Toma foto o sube captura de tu transferencia</small>
        </div>
        
        <!-- BOTONES -->
        <div style="display: flex; gap: 12px; flex-direction: column;">
          <button onclick="confirmarPago()" style="padding: 18px; background: #4CAF50; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 17px; font-weight: bold;">
            ✅ YA REALICÉ EL PAGO
          </button>
          <button onclick="cerrarModalPagos()" style="padding: 15px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 500;">
            Cancelar Pago
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Funciones globales (se mantienen igual)
    window.copiarAlPortapapeles = function(texto) {
      navigator.clipboard.writeText(texto).then(() => {
        alert('✅ Copiado: ' + texto);
      }).catch(() => {
        const tempInput = document.createElement('input');
        tempInput.value = texto;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert('✅ Copiado: ' + texto);
      });
    };
    
    window.cerrarModalPagos = function() {
      const modal = document.getElementById('modal-pagos');
      if (modal) {
        document.body.removeChild(modal);
      }
      restaurarElementosOcultos();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      
      comprobanteArchivoGlobal = null;
      
      const metodoPagoSelect = document.querySelector('#metodo-pago-select');
      if (metodoPagoSelect) {
        metodoPagoSelect.value = '';
      }
      metodoPagoSeleccionado = '';
      guardarEstadoPedido();
    };
    
    window.confirmarPago = function() {
      const comprobanteInput = document.getElementById('comprobantePago');
      if (comprobanteInput && comprobanteInput.files.length > 0) {
        comprobanteArchivoGlobal = comprobanteInput.files[0];
        console.log("💾 Comprobante guardado:", comprobanteArchivoGlobal.name);
        
        alert('✅ Comprobante listo. Ahora completa tu información de envío.');
        const modal = document.getElementById('modal-pagos');
        if (modal) {
          document.body.removeChild(modal);
          restaurarElementosOcultos();
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
        }
      } else {
        alert('⚠️ Por favor adjunta el comprobante de pago antes de continuar.');
      }
    };
  }

  // ====== FIREBASE STORAGE MEJORADO ======
  async function subirComprobanteAFirebase(archivo, pedidoId = null) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log("🔄 Iniciando subida de archivo:", archivo.name, "Tamaño:", archivo.size, "Tipo:", archivo.type);
        
        if (archivo.size > 5 * 1024 * 1024) {
          throw new Error("La imagen es muy grande. Máximo 5MB.");
        }
        
        if (!archivo.type.startsWith('image/')) {
          throw new Error("Solo se permiten archivos de imagen.");
        }
        
        const timestamp = Date.now();
        const pedidoSuffix = pedidoId ? `_pedido_${pedidoId}` : `_temp_${timestamp}`;
        const nombreArchivo = `comprobantes/${timestamp}_${archivo.name.replace(/\s+/g, '_')}${pedidoSuffix}`;
        
        const storageRef = storage.ref().child(nombreArchivo);
        
        console.log("📁 Subiendo a Storage:", nombreArchivo);
        
        const metadata = {
          contentType: archivo.type,
          customMetadata: {
            'uploadedBy': 'webflow-form',
            'timestamp': timestamp.toString(),
            'originalName': archivo.name,
            'size': archivo.size.toString(),
            'pedidoId': pedidoId || 'sin_id'
          }
        };
        
        const snapshot = await storageRef.put(archivo, metadata);
        console.log("✅ Archivo subido, obteniendo URL...");
        
        const downloadURL = await snapshot.ref.getDownloadURL();
        console.log("🌐 URL obtenida:", downloadURL);
        
        resolve({
          url: downloadURL,
          nombreArchivo: nombreArchivo,
          path: snapshot.ref.fullPath
        });
        
      } catch (error) {
        console.error("❌ Error en subirComprobanteAFirebase:", error);
        reject(error);
      }
    });
  }

  async function enviarPedidoAFirebase(payload) {
    try {
      const docRef = await db.collection('pedidos').add({
        ...payload,
        estado: 'pendiente',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error("Error guardando en Firebase:", err);
      return { success: false, error: err.message || String(err) };
    }
  }

  async function handleFormSubmit(formEl) {
    if (!formEl || selectedProducts.length === 0) {
      alert("Por favor agrega productos a la canasta antes de enviar el pedido.");
      return;
    }

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

    const nombre = formEl.querySelector('[name="nombre_completo"]')?.value.trim() || '';
    const whatsapp = formEl.querySelector('[name="numero_whatsapp"]')?.value.trim() || '';
    const direccion = formEl.querySelector('[name="direccion_envio"]')?.value.trim() || '';
    const ciudad = formEl.querySelector('[name="ciudad"]')?.value || '';
    const sede = formEl.querySelector('[name="sede"]')?.value || '';
    const programacionEnvio = formEl.querySelector('[name="programacion_envio"]')?.value || '';
    const metodoPago = formEl.querySelector('[name="metodo_pago"]')?.value || '';
    const tipoEnvoltura = formEl.querySelector('[name="tipo_envoltura"]')?.value || '';
    const extrasNotas = formEl.querySelector('[name="extras_notas"]')?.value.trim() || '';

    if (!nombre || !whatsapp || !direccion || !ciudad || !sede || !programacionEnvio || !metodoPago || !tipoEnvoltura) {
      alert("Por favor completa todos los campos obligatorios.");
      return;
    }

    console.log("📝 Datos capturados:", { nombre, whatsapp, ciudad, sede, metodoPago });

    const submitBtn = formEl.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent || 'ENVIAR';
    if (submitBtn) {
      submitBtn.textContent = "📤 PREPARANDO...";
      submitBtn.disabled = true;
      submitBtn.style.opacity = 0.7;
    }

    let comprobanteFile = null;
    
    console.log("🔍 Buscando comprobante...");
    
    if (comprobanteArchivoGlobal) {
      comprobanteFile = comprobanteArchivoGlobal;
      console.log("📁 Comprobante encontrado en variable global:", comprobanteFile.name);
    } else {
      const comprobanteInput = document.getElementById('comprobantePago');
      if (comprobanteInput && comprobanteInput.files && comprobanteInput.files.length > 0) {
        comprobanteFile = comprobanteInput.files[0];
        console.log("📁 Comprobante encontrado en modal:", comprobanteFile.name);
      } else {
        console.log("ℹ️ No se encontró comprobante para subir");
      }
    }

    // PRIMERO: Crear el pedido en Firestore para obtener el ID
    if (submitBtn) {
      submitBtn.textContent = "🚀 CREANDO PEDIDO...";
    }

    const detallesObj = formatearDetallesPedido();
    
    const payloadInicial = {
      nombre, whatsapp, direccion, ciudad, sede, programacionEnvio,
      metodoPago, tipoEnvoltura, extrasNotas,
      detallesPedido: detallesObj.texto,
      productos: selectedProducts,
      total: detallesObj.total,
      opcionDomicilio, costoDomicilio: COSTO_DOMICILIO,
      subtotalProductos: detallesObj.subtotalProductos,
      comprobantePagoUrl: '',
      tieneComprobante: false,
      nombreArchivoComprobante: comprobanteFile?.name || 'sin_comprobante',
      origen: window.location.href,
      fecha: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })
    };

    console.log("📦 Creando pedido en Firebase...");

    let pedidoId = null;
    let result = null;
    
    try {
      const docRef = await db.collection('pedidos').add({
        ...payloadInicial,
        estado: 'pendiente',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      pedidoId = docRef.id;
      console.log("🎉 Pedido creado con ID:", pedidoId);
      
      // AHORA SUBIR COMPROBANTE CON EL ID DEL PEDIDO
      if (comprobanteFile) {
        try {
          if (submitBtn) {
            submitBtn.textContent = "📤 SUBIENDO COMPROBANTE...";
          }
          
          console.log("🔄 Subiendo comprobante con ID pedido:", pedidoId);
          const comprobanteInfo = await subirComprobanteAFirebase(comprobanteFile, pedidoId);
          console.log("✅ Comprobante subido exitosamente:", comprobanteInfo.url);
          
          await db.collection('pedidos').doc(pedidoId).update({
            comprobantePagoUrl: comprobanteInfo.url,
            tieneComprobante: true,
            nombreArchivoComprobante: comprobanteFile.name,
            pathComprobante: comprobanteInfo.path,
            actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          console.log("✅ Pedido actualizado con comprobante");
          
        } catch (error) {
          console.error("❌ Error subiendo comprobante:", error);
          await db.collection('pedidos').doc(pedidoId).update({
            errorComprobante: error.message
          });
        }
      }
      
      // GENERAR ID DE SEGUIMIENTO
      const idSeguimiento = generarIDUnico();
      
      // ACTUALIZAR EL PEDIDO CON EL ID DE SEGUIMIENTO
      await db.collection('pedidos').doc(pedidoId).update({
        idSeguimiento: idSeguimiento,
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log("🔢 ID de seguimiento generado:", idSeguimiento);
      
      result = { success: true, id: pedidoId, idSeguimiento: idSeguimiento };
      
    } catch (err) {
      console.error("💥 Error creando pedido:", err);
      result = { success: false, error: err.message || String(err) };
    }

    if (result.success) {
      console.log("🎉 Proceso completado. Pedido ID:", pedidoId, "Seguimiento:", result.idSeguimiento);
      
      comprobanteArchivoGlobal = null;
      
      // MENSAJE MEJORADO TIPO RAPPI
      alert(`🎉 ¡PEDIDO CONFIRMADO!

📦 Número de seguimiento: ${result.idSeguimiento}

📍 Estado: Recibido
⏰ Procesando tu pedido...

🔍 Consulta el estado en:
friends-kukis.webflow.io

¡Gracias por tu compra! 🍪`);
      
      formEl.reset();
      selectedProducts = [];
      opcionDomicilio = 'recoger';
      metodoPagoSeleccionado = '';
      limpiarEstadoPedido();
      renderCanasta();
      if (formularioContainer) formularioContainer.style.display = 'none';
    } else {
      console.error("💥 Error en el proceso:", result.error);
      alert('Error al enviar pedido. Por favor intenta nuevamente.\nError: ' + result.error);
    }

    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.style.opacity = 1;
    }
  }

  // ====== INICIALIZACIÓN ======
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
    instrucciones.textContent = 'Mantén Ctrl (Windows) o Cmd (Mac) para seleccionar múltiples sabores';
    instrucciones.style.display = 'block';
    instrucciones.style.marginTop = '5px';
    instrucciones.style.color = '#666';
    instrucciones.style.fontSize = '12px';
    container.appendChild(instrucciones);

    return container;
  }

  renderCanasta();
  updateCanastaCount();
});
</script>

<!-- CSS CRÍTICO PARA MODAL -->
<style>
#modal-pagos {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background: rgba(0,0,0,0.95) !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  z-index: 999999 !important;
  padding: 20px !important;
  box-sizing: border-box !important;
}

#modal-pagos > div {
  z-index: 1000000 !important;
  position: relative !important;
}

body > *:not(#modal-pagos) {
  z-index: auto !important;
}

.w-nav, 
[class*="header"], 
[class*="navbar"],
[class*="sticky"],
[class*="fixed"] {
  z-index: 999 !important;
}

body.modal-open {
  overflow: hidden !important;
  position: fixed !important;
  width: 100% !important;
  height: 100% !important;
}

@media (max-width: 480px) {
  #modal-pagos {
    padding: 10px !important;
  }
  
  #modal-pagos > div {
    max-width: 95% !important;
    max-height: 95vh !important;
    padding: 20px !important;
  }
}

#btn-canasta-kuki,
[class*="canasta"],
[class*="carrito"] {
  z-index: 100 !important;
}

@keyframes saltoCarrito {
  0% { transform: scale(1) translateY(0); }
  30% { transform: scale(1.5) translateY(-6px); }
  60% { transform: scale(0.95) translateY(2px); }
  100% { transform: scale(1) translateY(0); }
}
.animar-carrito {
  animation: saltoCarrito 0.4s ease;
}

html {
  scroll-behavior: smooth;
}
</style>

<script>
document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll('.carrito-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.add('animar-carrito');
      setTimeout(() => btn.classList.remove('animar-carrito'), 400);
    });
  });
});
</script>
