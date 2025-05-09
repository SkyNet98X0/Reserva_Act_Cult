// Variables globales
let reservas = [];
let modoEdicion = false;
let idEdicion = null;

// Elementos del DOM
const form = document.getElementById('reserva-form');
const formTitle = document.getElementById('form-title');
const btnCancelar = document.getElementById('btn-cancelar');
const btnGuardar = document.getElementById('btn-guardar');
const tablaReservas = document.getElementById('tabla-reservas');
const notificacionEl = document.getElementById('notificacion');
const confirmacionOverlay = document.getElementById('confirmacion-overlay');
const confirmacionMensaje = document.getElementById('confirmacion-mensaje');
let confirmacionAceptar = document.getElementById('confirmacion-aceptar');
const confirmacionCancelar = document.getElementById('confirmacion-cancelar');

// Cargar datos al iniciar la página
document.addEventListener('DOMContentLoaded', function() {
    // Cargar reservas del localStorage si existen
    cargarReservas();
    
    // Establecer fecha mínima como hoy en el campo fecha
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').min = hoy;
    
    // Evento para enviar formulario
    form.addEventListener('submit', guardarReserva);
    
    // Evento para cancelar edición
    btnCancelar.addEventListener('click', cancelarEdicion);
    
    // Configurar evento para cerrar confirmación con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && confirmacionOverlay.style.display === 'flex') {
            cerrarConfirmacion();
        }
    });
    
    // Configurar evento para cerrar confirmación al hacer clic fuera
    confirmacionOverlay.addEventListener('click', function(e) {
        if (e.target === confirmacionOverlay) {
            cerrarConfirmacion();
        }
    });
    
    // Evento para botón cancelar de confirmación
    confirmacionCancelar.addEventListener('click', cerrarConfirmacion);
});

// Función para mostrar notificación simple
function mostrarNotificacion(mensaje, tipo = 'warning', duracion = 5000) {
    // Configurar tipo de alerta y mensaje
    notificacionEl.className = `notificacion alert alert-${tipo} alert-dismissible fade show`;
    notificacionEl.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" 
                onclick="document.getElementById('notificacion').style.display = 'none';"></button>
    `;
    
    // Mostrar la notificación
    notificacionEl.style.display = 'block';
    
    // Ocultar automáticamente después del tiempo especificado
    if (duracion > 0) {
        setTimeout(() => {
            notificacionEl.style.display = 'none';
        }, duracion);
    }
}

// Función para mostrar confirmación (reemplaza confirm())
function mostrarConfirmacion(mensaje, callback) {
    // Establecer mensaje
    confirmacionMensaje.textContent = mensaje;
    
    // Mostrar overlay
    confirmacionOverlay.style.display = 'flex';
    
    // Eliminar eventos anteriores si existen
    confirmacionAceptar.onclick = null;
    
    // Añadir nuevo evento para el botón aceptar
    confirmacionAceptar.onclick = function() {
        cerrarConfirmacion();
        callback(true);
    };
}

// Función para cerrar confirmación
function cerrarConfirmacion() {
    confirmacionOverlay.style.display = 'none';
}

// Función para cargar reservas desde localStorage
function cargarReservas() {
    const reservasGuardadas = localStorage.getItem('reservasActividades');
    if (reservasGuardadas) {
        reservas = JSON.parse(reservasGuardadas);
        mostrarReservas();
    }
}

// Función para guardar reservas en localStorage
function guardarEnLocalStorage() {
    localStorage.setItem('reservasActividades', JSON.stringify(reservas));
}

// Función para validar formulario
function validarFormulario() {
    // Obtener valores
    const nombre = document.getElementById('nombre').value.trim();
    const matricula = document.getElementById('matricula').value.trim();
    const actividad = document.getElementById('actividad').value;
    const fecha = document.getElementById('fecha').value;
    
    // Validar campos vacíos
    if (!nombre || !matricula || !actividad || !fecha) {
        mostrarNotificacion('Todos los campos son obligatorios');
        return false;
    }
    
    // Validar formato de matrícula (8 caracteres alfanuméricos)
    const regexMatricula = /^[a-zA-Z0-9]{8}$/;
    if (!regexMatricula.test(matricula)) {
        mostrarNotificacion('El código de matrícula debe tener exactamente 8 caracteres alfanuméricos');
        return false;
    }
    
    // Validar que la fecha sea actual o futura
    const fechaSeleccionada = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
    
    if (fechaSeleccionada < hoy) {
        mostrarNotificacion('La fecha debe ser actual o futura');
        return false;
    }
    
    // Verificar si la matrícula ya existe (solo en modo nuevo registro)
    if (!modoEdicion) {
        const matriculaExistente = reservas.some(r => r.matricula === matricula);
        if (matriculaExistente) {
            mostrarNotificacion('El código de matrícula ya está registrado. No se permiten duplicados.');
            return false;
        }
    } else {
        // En modo edición, verificar que no se duplique con otra matrícula diferente a la actual
        const reservaActual = reservas.find(r => r.id === idEdicion);
        if (reservaActual && reservaActual.matricula !== matricula) {
            const matriculaExistente = reservas.some(r => r.matricula === matricula);
            if (matriculaExistente) {
                mostrarNotificacion('El código de matrícula ya está registrado. No se permiten duplicados.');
                return false;
            }
        }
    }
    
    return true;
}

// Función para guardar o actualizar una reserva
function guardarReserva(e) {
    e.preventDefault();
    
    if (!validarFormulario()) {
        return;
    }
    
    // Obtener valores del formulario
    const nombre = document.getElementById('nombre').value.trim();
    const matricula = document.getElementById('matricula').value.trim();
    const actividad = document.getElementById('actividad').value;
    const fecha = document.getElementById('fecha').value;
    
    // Formatear fecha para mostrar (CORREGIDO el problema de zona horaria)
    // Usamos partes de la fecha para crear una fecha correcta
    const [year, month, day] = fecha.split('-');
    const fechaFormateada = new Date(year, month - 1, day).toLocaleDateString('es-ES');
    
    if (modoEdicion) {
        // Actualizar reserva existente
        const indice = reservas.findIndex(reserva => reserva.id === idEdicion);
        if (indice !== -1) {
            reservas[indice] = {
                id: idEdicion,
                nombre: nombre,
                matricula: matricula,
                actividad: actividad,
                fecha: fecha,
                fechaFormateada: fechaFormateada
            };
        }
        mostrarNotificacion('¡Reserva actualizada correctamente!', 'success');
        cancelarEdicion();
    } else {
        // Crear nueva reserva
        const nuevaReserva = {
            id: Date.now(), // Usamos timestamp como ID único
            nombre: nombre,
            matricula: matricula,
            actividad: actividad,
            fecha: fecha,
            fechaFormateada: fechaFormateada
        };
        
        // Agregar al array de reservas
        reservas.push(nuevaReserva);
        mostrarNotificacion('¡Reserva registrada correctamente!', 'success');
    }
    
    // Guardar en localStorage
    guardarEnLocalStorage();
    
    // Actualizar tabla
    mostrarReservas();
    
    // Limpiar formulario
    form.reset();
    
    return false;
}

// Función para mostrar reservas en la tabla
function mostrarReservas() {
    // Limpiar tabla
    tablaReservas.innerHTML = '';
    
    // Si no hay reservas, mostrar mensaje
    if (reservas.length === 0) {
        tablaReservas.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No hay reservas registradas</td>
            </tr>
        `;
        return;
    }
    
    // Mostrar cada reserva en la tabla
    reservas.forEach(reserva => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${reserva.nombre}</td>
            <td>${reserva.matricula}</td>
            <td>${reserva.actividad}</td>
            <td>${reserva.fechaFormateada}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="editarReserva(${reserva.id})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="solicitarEliminarReserva(${reserva.id})">Eliminar</button>
            </td>
        `;
        tablaReservas.appendChild(fila);
    });
}

// Función para solicitar confirmación antes de eliminar
function solicitarEliminarReserva(id) {
    mostrarConfirmacion('¿Está seguro de eliminar esta reserva?', function(confirmado) {
        if (confirmado) {
            eliminarReserva(id);
        }
    });
}

// Función para editar una reserva
function editarReserva(id) {
    // Buscar la reserva por ID
    const reserva = reservas.find(r => r.id === id);
    if (!reserva) return;
    
    // Activar modo edición
    modoEdicion = true;
    idEdicion = id;
    
    // Cambiar título del formulario
    formTitle.textContent = 'Editar Reserva';
    btnGuardar.textContent = 'Actualizar';
    btnCancelar.style.display = 'inline-block';
    
    // Cargar datos en el formulario
    document.getElementById('nombre').value = reserva.nombre;
    document.getElementById('matricula').value = reserva.matricula;
    document.getElementById('actividad').value = reserva.actividad;
    document.getElementById('fecha').value = reserva.fecha;
    
    // Desplazarse al formulario
    form.scrollIntoView({ behavior: 'smooth' });
}

// Función para eliminar una reserva (llamada después de confirmación)
function eliminarReserva(id) {
    // Filtrar la reserva a eliminar
    reservas = reservas.filter(reserva => reserva.id !== id);
    
    // Guardar en localStorage
    guardarEnLocalStorage();
    
    // Actualizar tabla
    mostrarReservas();
    
    // Mostrar notificación
    mostrarNotificacion('Reserva eliminada correctamente', 'info');
}

// Función para cancelar la edición
function cancelarEdicion() {
    // Desactivar modo edición
    modoEdicion = false;
    idEdicion = null;
    
    // Restaurar interfaz
    formTitle.textContent = 'Registro de Nueva Reserva';
    btnGuardar.textContent = 'Registrar Reserva';
    btnCancelar.style.display = 'none';
    
    // Limpiar formulario
    form.reset();
}