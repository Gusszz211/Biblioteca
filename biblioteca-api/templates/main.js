        // Constantes globales
        const API_BASE_URL = 'http://localhost:8080/api';
        let usuarioActual = null;

        // Funciones de utilidad
        function mostrarAlerta(mensaje, tipo = 'info') {
            Swal.fire({
                text: mensaje,
                icon: tipo,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }

        function formatearFecha(fecha) {
            if (!fecha) return 'N/A';
            try {
                return new Date(fecha).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            } catch (error) {
                console.error('Error al formatear fecha:', error);
                return 'Fecha inválida';
            }
        }

        function cerrarModal() {
            const modal = document.querySelector('.modal');
            if (modal) {
                modal.remove();
            }
        }

        // Función para hacer peticiones a la API
async function fetchAPI(endpoint, options = {}) {
    try {
        if (!endpoint.startsWith('/')) {
            endpoint = '/' + endpoint;
        }

        const url = `${API_BASE_URL}${endpoint}`;
        console.log('Realizando petición a:', url);
        console.log('Opciones:', options);

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        console.log('Respuesta del servidor:', response.status);

        const contentType = response.headers.get("content-type");

        let data = null;
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.warn("Respuesta no JSON:", text);
            throw new Error("Respuesta inesperada del servidor");
        }

        if (!response.ok) {
            const errorMessage = data?.message || data?.error || 'Error desconocido del servidor';
            console.error('Error del servidor:', data);
            throw new Error(errorMessage);
        }

        console.log('Datos recibidos:', data);
        return data;

    } catch (error) {
        console.error('Error en fetchAPI:', error);
        if (error.message === 'Failed to fetch') {
            mostrarAlerta('⚠️ No se pudo conectar con el servidor. ¿Está activo?', 'error');
        } else {
            mostrarAlerta(`❌ ${error.message}`, 'error');
        }
        return null;
    }
}


        // Función para mostrar secciones
        function showSection(sectionId) {
            // Ocultar todas las secciones
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Remover clase active de todos los tabs
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Mostrar la sección seleccionada
            document.getElementById(sectionId).classList.add('active');
            
            // Activar el tab correspondiente
            event.target.classList.add('active');
            
            // Cargar datos según la sección
            switch(sectionId) {
                case 'dashboard':
                    cargarDashboard();
                    break;
                case 'usuarios':
                    cargarUsuarios();
                    break;
                case 'libros':
                    cargarLibros();
                    break;
                case 'prestamos':
                    cargarPrestamos();
                    cargarSelectOptions();
                    break;
                case 'devoluciones':
                    cargarDevoluciones();
                    cargarPrestamosActivos();
                    break;
            }
        }

        // Función para verificar la conexión con el servidor
        async function verificarConexion() {
            try {
                const response = await fetch(API_BASE_URL);
                if (!response.ok) {
                    throw new Error('Servidor no disponible');
                }
                return true;
            } catch (error) {
                console.error('Error de conexión:', error);
                mostrarAlerta('No se pudo conectar con el servidor. Por favor, verifique que el servidor esté en ejecución.', 'error');
                return false;
            }
        }

        // Dashboard
        async function cargarDashboard() {
            try {
                const [usuarios, libros, prestamos] = await Promise.all([
                    fetchAPI('/usuarios'),
                    fetchAPI('/libros'),
                    fetchAPI('/prestamos')
                ]);
                
                document.getElementById('total-usuarios').textContent = usuarios ? usuarios.length : 0;
                document.getElementById('total-libros').textContent = libros ? libros.length : 0;
                
                if (prestamos) {
                    const prestamosActivos = prestamos.filter(p => !p.devuelto);
                    document.getElementById('prestamos-activos').textContent = prestamosActivos.length;
                }
                
                if (libros) {
                    const librosDisponibles = libros.reduce((sum, libro) => sum + (libro.cantidad_disponible || 0), 0);
                    document.getElementById('libros-disponibles').textContent = librosDisponibles;
                }
            } catch (error) {
                console.error('Error al cargar dashboard:', error);
                mostrarAlerta('Error al cargar el dashboard', 'error');
            }
        }

        // Función para registrar un nuevo usuario
        async function registrarUsuario(event) {
            event.preventDefault();

            try {
                const nombre = document.getElementById('usuario-nombre').value.trim();
                const correo = document.getElementById('usuario-correo').value.trim().toLowerCase();
                const contrasena = document.getElementById('usuario-contrasena').value;
                const tipo = document.getElementById('usuario-tipo').value;

                if (!nombre || !correo || !contrasena) {
                    throw new Error('Todos los campos son obligatorios');
                }

                const usuario = {
                    nombre,
                    correo,
                    contrasena,
                    tipo_usuario: tipo
                };

                console.log('Enviando datos del usuario:', usuario);

                const response = await fetchAPI('/usuarios', {
                    method: 'POST',
                    body: JSON.stringify(usuario)
                });

                if (!response) {
                    throw new Error('Error al registrar el usuario');
                }

                mostrarAlerta('Usuario registrado exitosamente', 'success');
                document.getElementById('usuario-form').reset();
                await cargarUsuarios();
                await cargarEstadisticas();

            } catch (error) {
                console.error('Error al registrar usuario:', error);
                mostrarAlerta(error.message, 'error');
            }
        }

        // Función para eliminar usuario
        async function eliminarUsuario(id) {
            try {
                const usuarios = await fetchAPI('/usuarios');
                if (!usuarios) {
                    mostrarAlerta('No se pudieron cargar los usuarios', 'error');
                    return;
                }

                const usuario = usuarios.find(u => String(u.id) === String(id));
                if (!usuario) {
                    mostrarAlerta('No se pudo encontrar el usuario', 'error');
                    return;
                }

                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>⚠️ Confirmar Eliminación</h3>
                        <p>¿Estás seguro que deseas eliminar al usuario <strong>${usuario.nombre}</strong>?</p>
                        <p>Esta acción eliminará:</p>
                        <ul>
                            <li>✓ Todos los préstamos asociados</li>
                            <li>✓ Todas las devoluciones registradas</li>
                            <li>✓ Cualquier adeudo pendiente</li>
                        </ul>
                        <p><strong>Esta acción no se puede deshacer.</strong></p>
                        <div class="form-actions">
                            <button id="confirm-delete" class="btn btn-danger">Sí, Eliminar Usuario</button>
                            <button id="cancel-delete" class="btn btn-secondary">Cancelar</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);

                document.getElementById('confirm-delete').addEventListener('click', async () => {
                    try {
                        const confirmButton = document.getElementById('confirm-delete');
                        confirmButton.disabled = true;
                        confirmButton.textContent = 'Eliminando...';

                        const response = await fetchAPI(`/usuarios/${id}`, {
                            method: 'DELETE'
                        });

                        if (!response) {
                            throw new Error('Error al eliminar el usuario');
                        }

                        cerrarModal();
                        mostrarAlerta(`✅ Usuario ${usuario.nombre} eliminado exitosamente`);
                        
                        // Recargar la tabla de usuarios
                        await cargarUsuarios();
                        
                        // Actualizar contadores
                        await cargarEstadisticas();
                        
                        // Limpiar las tablas relacionadas
                        const prestamosTable = document.querySelector('#prestamos-table tbody');
                        if (prestamosTable) {
                            prestamosTable.innerHTML = '';
                        }
                        
                        const devolucionesTable = document.querySelector('#devoluciones-table tbody');
                        if (devolucionesTable) {
                            devolucionesTable.innerHTML = '';
                        }
                        
                    } catch (error) {
                        console.error('Error al eliminar usuario:', error);
                        if (error.message.includes('foreign key constraint')) {
                            mostrarAlerta('No se puede eliminar el usuario porque tiene préstamos activos. Por favor, asegúrese de que todos los préstamos hayan sido devueltos.', 'error');
                        } else {
                            mostrarAlerta('Error al eliminar el usuario: ' + error.message, 'error');
                        }
                    } finally {
                        const confirmButton = document.getElementById('confirm-delete');
                        if (confirmButton) {
                            confirmButton.disabled = false;
                            confirmButton.textContent = 'Sí, Eliminar Usuario';
                        }
                    }
                });

                document.getElementById('cancel-delete').addEventListener('click', () => {
                    cerrarModal();
                });
            } catch (error) {
                console.error('Error al iniciar el proceso de eliminación:', error);
                mostrarAlerta('Error al cargar los datos del usuario: ' + error.message, 'error');
            }
        }

        // Hacer las funciones disponibles globalmente
        window.registrarUsuario = registrarUsuario;
        window.eliminarUsuario = eliminarUsuario;

        async function cargarUsuarios() {
            try {
                const usuarios = await fetchAPI('/usuarios');
                if (!usuarios) {
                    throw new Error('Error al cargar usuarios');
                }
            
            const tbody = document.querySelector('#usuarios-table tbody');
                if (!tbody) return;

            tbody.innerHTML = '';
            
                // Ordenar usuarios por ID para mantener consistencia
                usuarios.sort((a, b) => a.id - b.id);
                
                // Agregar cada usuario con ID secuencial
                usuarios.forEach((usuario, index) => {
                    const tr = document.createElement('tr');
                    tr.setAttribute('data-id', usuario.id); // Mantener el ID real en el atributo data-id
                    tr.innerHTML = `
                        <td>${index + 1}</td>
                    <td>${usuario.nombre}</td>
                    <td>${usuario.correo}</td>
                    <td>${usuario.tipo_usuario}</td>
                    <td>
                            <button class="btn btn-sm btn-primary" onclick="editarUsuario(${usuario.id})">Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${usuario.id})">Eliminar</button>
                    </td>
                `;
                    tbody.appendChild(tr);
                });

                // Actualizar opciones del formulario de préstamos
                await cargarSelectOptions();
            } catch (error) {
                console.error('Error al cargar usuarios:', error);
                mostrarAlerta('Error al cargar usuarios: ' + error.message, 'error');
            }
        }

        async function editarUsuario(id) {
            try {
                // Primero intentamos obtener el usuario de la lista actual
                const usuarios = await fetchAPI('/usuarios');
                const usuario = usuarios.find(u => String(u.id) === String(id));
                
                if (!usuario) {
                    mostrarAlerta('No se pudo encontrar el usuario', 'error');
                    return;
                }
                
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>Editar Usuario</h3>
                        <form id="edit-usuario-form" class="form-grid">
                            <div class="form-group">
                                <label for="edit-usuario-nombre">Nombre:</label>
                                <input type="text" id="edit-usuario-nombre" value="${usuario.nombre || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-usuario-correo">Correo:</label>
                                <input type="email" id="edit-usuario-correo" value="${usuario.correo || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-usuario-contrasena">Contraseña: (dejar en blanco para mantener la actual)</label>
                                <input type="password" id="edit-usuario-contrasena">
                            </div>
                            <div class="form-group">
                                <label for="edit-usuario-tipo">Tipo de Usuario:</label>
                                <select id="edit-usuario-tipo">
                                    <option value="lector" ${usuario.tipo_usuario === 'lector' ? 'selected' : ''}>Lector</option>
                                    <option value="administrador" ${usuario.tipo_usuario === 'administrador' ? 'selected' : ''}>Administrador</option>
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Guardar</button>
                                <button type="button" class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
                            </div>
                        </form>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                document.getElementById('edit-usuario-form').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const nombre = document.getElementById('edit-usuario-nombre').value.trim();
                    const correo = document.getElementById('edit-usuario-correo').value.trim().toLowerCase();
                    const contrasena = document.getElementById('edit-usuario-contrasena').value;
                    const tipo_usuario = document.getElementById('edit-usuario-tipo').value;
                    
                    if (!nombre || !correo) {
                        mostrarAlerta('Por favor, complete los campos requeridos', 'error');
                        return;
                    }
                    
                    if (nombre === usuario.nombre && correo === usuario.correo && 
                        !contrasena && tipo_usuario === usuario.tipo_usuario) {
                        mostrarAlerta('No se realizaron cambios', 'info');
                        cerrarModal();
                        return;
                    }
                    
                    const usuarioActualizado = {
                        nombre,
                        correo,
                        tipo_usuario
                    };
                    
                    // Solo incluir la contraseña si se proporcionó una nueva
                    if (contrasena) {
                        usuarioActualizado.contrasena = contrasena;
                    }
                    
                    try {
                        const result = await fetchAPI(`usuarios/${id}`, {
                            method: 'PUT',
                            body: JSON.stringify(usuarioActualizado)
                        });
                        
                if (result) {
                            mostrarAlerta('Usuario actualizado exitosamente');
                            cerrarModal();
                    cargarUsuarios();
                            cargarDashboard();
                        }
                    } catch (error) {
                        console.error('Error al actualizar usuario:', error);
                        mostrarAlerta(`Error al actualizar usuario: ${error.message}`, 'error');
                    }
                });
            } catch (error) {
                console.error('Error al editar usuario:', error);
                mostrarAlerta('Error al cargar datos del usuario', 'error');
            }
        }

        // Función para registrar un nuevo libro
        async function registrarLibro(event) {
            event.preventDefault();

            try {
                const titulo = document.getElementById('libro-titulo').value;
                const autor = document.getElementById('libro-autor').value;
                const editorial = document.getElementById('libro-editorial').value;
                const anio = document.getElementById('libro-anio').value;
                const genero = document.getElementById('libro-genero').value;
                const isbn = document.getElementById('libro-isbn').value;
                const cantidad = document.getElementById('libro-cantidad').value;

                if (!titulo || !autor || !cantidad) {
                    throw new Error('Título, autor y cantidad son campos obligatorios');
                }

                const libro = {
                    titulo,
                    autor,
                    editorial: editorial || null,
                    anio: anio || null,
                    genero: genero || null,
                    isbn: isbn || null,
                    cantidad_disponible: parseInt(cantidad) || 1
                };

                const response = await fetchAPI('/libros', {
                    method: 'POST',
                    body: JSON.stringify(libro)
                });

                if (!response) {
                    throw new Error('Error al registrar el libro');
                }

                mostrarAlerta('Libro registrado exitosamente', 'success');
                document.getElementById('libro-form').reset();
                await cargarLibros();
                await cargarEstadisticas();

            } catch (error) {
                console.error('Error al registrar libro:', error);
                mostrarAlerta(error.message, 'error');
            }
        }

        // Hacer la función disponible globalmente
        window.registrarLibro = registrarLibro;

        // Gestión de Libros
        async function cargarLibros() {
            try {
                const libros = await fetchAPI('/libros');
                if (!libros) {
                    throw new Error('Error al cargar libros');
                }
            
            const tbody = document.querySelector('#libros-table tbody');
                if (!tbody) return;

            tbody.innerHTML = '';
            
                // Ordenar libros por ID para mantener consistencia
                libros.sort((a, b) => a.id - b.id);
                
                // Agregar cada libro con ID secuencial
                libros.forEach((libro, index) => {
                    const tr = document.createElement('tr');
                    tr.setAttribute('data-id', libro.id); // Mantener el ID real en el atributo data-id
                    tr.innerHTML = `
                        <td>${index + 1}</td>
                    <td>${libro.titulo}</td>
                    <td>${libro.autor}</td>
                    <td>${libro.editorial || 'N/A'}</td>
                    <td>${libro.anio_publicacion || 'N/A'}</td>
                    <td>${libro.genero || 'N/A'}</td>
                    <td>${libro.cantidad_disponible}</td>
                    <td>
                            <button class="btn btn-sm btn-primary" onclick="editarLibro(${libro.id})">Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="eliminarLibro(${libro.id})">Eliminar</button>
                    </td>
                `;
                    tbody.appendChild(tr);
                });

                // Actualizar opciones del formulario de préstamos
                await cargarSelectOptions();
            } catch (error) {
                console.error('Error al cargar libros:', error);
                mostrarAlerta('Error al cargar libros: ' + error.message, 'error');
            }
        }

        // Funciones para la gestión de libros
        window.editarLibro = async function(id) {
            try {
                const libros = await fetchAPI('/libros');
                if (!libros) {
                    mostrarAlerta('Error al cargar los libros', 'error');
                    return;
                }

                const libro = libros.find(l => String(l.id) === String(id));
                if (!libro) {
                    mostrarAlerta('No se pudo encontrar el libro', 'error');
                    return;
                }

                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>📖 Editar Libro</h3>
                        <form id="editar-libro-form">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="edit-titulo">Título:</label>
                                    <input type="text" id="edit-titulo" value="${libro.titulo}" required>
                                </div>
                                <div class="form-group">
                                    <label for="edit-autor">Autor:</label>
                                    <input type="text" id="edit-autor" value="${libro.autor}" required>
                                </div>
                                <div class="form-group">
                                    <label for="edit-editorial">Editorial:</label>
                                    <input type="text" id="edit-editorial" value="${libro.editorial || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="edit-anio">Año de Publicación:</label>
                                    <input type="number" id="edit-anio" value="${libro.anio_publicacion || ''}" min="1800" max="2024">
                                </div>
                                <div class="form-group">
                                    <label for="edit-genero">Género:</label>
                                    <input type="text" id="edit-genero" value="${libro.genero || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="edit-isbn">ISBN:</label>
                                    <input type="text" id="edit-isbn" value="${libro.isbn || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="edit-cantidad">Cantidad Disponible:</label>
                                    <input type="number" id="edit-cantidad" value="${libro.cantidad_disponible}" min="0" required>
                                </div>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                                <button type="button" class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
                            </div>
                        </form>
                    </div>
                `;
                
                document.body.appendChild(modal);

                document.getElementById('editar-libro-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    // Obtener y validar el año de publicación
                    const anioInput = document.getElementById('edit-anio').value;
                    const anioPublicacion = anioInput ? parseInt(anioInput) : null;
                    
                    const libroActualizado = {
                        titulo: document.getElementById('edit-titulo').value,
                        autor: document.getElementById('edit-autor').value,
                        editorial: document.getElementById('edit-editorial').value,
                        anio_publicacion: anioPublicacion,
                        genero: document.getElementById('edit-genero').value,
                        isbn: document.getElementById('edit-isbn').value,
                        cantidad_disponible: parseInt(document.getElementById('edit-cantidad').value)
                    };

                    try {
                        await fetchAPI(`libros/${id}`, {
                            method: 'PUT',
                            body: JSON.stringify(libroActualizado)
                        });

                        cerrarModal();
                        mostrarAlerta('✅ Libro actualizado exitosamente');
                        await cargarLibros();
                    } catch (error) {
                        mostrarAlerta('Error al actualizar el libro', 'error');
                    }
                });
            } catch (error) {
                console.error('Error al cargar el libro:', error);
                mostrarAlerta('Error al cargar el libro', 'error');
            }
        };

        window.eliminarLibro = async function(id) {
            try {
                const libros = await fetchAPI('/libros');
                if (!libros) {
                    mostrarAlerta('Error al cargar los libros', 'error');
                    return;
                }

                const libro = libros.find(l => String(l.id) === String(id));
                if (!libro) {
                    mostrarAlerta('No se pudo encontrar el libro', 'error');
                    return;
                }

                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>⚠️ Confirmar Eliminación</h3>
                        <p>¿Estás seguro que deseas eliminar el libro <strong>${libro.titulo}</strong>?</p>
                        <p>Esta acción eliminará:</p>
                        <ul>
                            <li>✓ Todos los préstamos asociados</li>
                            <li>✓ Todas las devoluciones registradas</li>
                            <li>✓ Cualquier adeudo relacionado</li>
                        </ul>
                        <p><strong>Esta acción no se puede deshacer.</strong></p>
                        <div class="form-actions">
                            <button id="confirm-delete" class="btn btn-danger">Sí, Eliminar Libro</button>
                            <button id="cancel-delete" class="btn btn-secondary">Cancelar</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);

                document.getElementById('confirm-delete').addEventListener('click', async () => {
                    try {
                        const confirmButton = document.getElementById('confirm-delete');
                        confirmButton.disabled = true;
                        confirmButton.textContent = 'Eliminando...';

                        try {
                            await fetchAPI(`libros/${id}`, {
                                method: 'DELETE'
                            });
                            
                            cerrarModal();
                            mostrarAlerta(`✅ Libro ${libro.titulo} eliminado exitosamente`);
                            
                            // Recargar la tabla de libros para actualizar la numeración
                            await cargarLibros();
                            
                            // Actualizar contadores
                            const totalLibros = document.getElementById('total-libros');
                            if (totalLibros) {
                                const currentCount = parseInt(totalLibros.textContent) || 0;
                                totalLibros.textContent = Math.max(0, currentCount - 1);
                            }
                            
                            // Limpiar las tablas relacionadas
                            const prestamosTable = document.querySelector('#prestamos-table tbody');
                            if (prestamosTable) {
                                prestamosTable.innerHTML = '';
                            }
                            
                            const devolucionesTable = document.querySelector('#devoluciones-table tbody');
                            if (devolucionesTable) {
                                devolucionesTable.innerHTML = '';
                            }
                            
                        } catch (error) {
                            if (error.message.includes('foreign key constraint')) {
                                mostrarAlerta('No se puede eliminar el libro porque tiene préstamos activos. Por favor, asegúrese de que todos los préstamos hayan sido devueltos.', 'error');
                            } else {
                                mostrarAlerta('Error al eliminar el libro. Por favor, intente nuevamente.', 'error');
                            }
                        }
                    } catch (error) {
                        console.error('Error en el proceso de eliminación:', error);
                        mostrarAlerta('Error al eliminar el libro. Por favor, intente nuevamente.', 'error');
                    } finally {
                        const confirmButton = document.getElementById('confirm-delete');
                        confirmButton.disabled = false;
                        confirmButton.textContent = 'Sí, Eliminar Libro';
                    }
                });

                document.getElementById('cancel-delete').addEventListener('click', () => {
                    cerrarModal();
                });
            } catch (error) {
                console.error('Error al iniciar el proceso de eliminación:', error);
                mostrarAlerta('Error al cargar los datos del libro', 'error');
            }
        };

        // Función para calcular días de retraso
        function calcularDiasRetraso(fechaDevolucion) {
            const fechaActual = new Date();
            const fechaDevolucionObj = new Date(fechaDevolucion);
            
            // Si la fecha de devolución es posterior a la fecha actual, no hay retraso
            if (fechaDevolucionObj > fechaActual) {
                return 0;
            }
            
            // Calcular la diferencia en días
            const diffTime = Math.abs(fechaActual - fechaDevolucionObj);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return diffDays;
        }

        // Función para calcular monto de adeudo
        function calcularMontoAdeudo(diasRetraso) {
            // Tarifa base por día de retraso
            const TARIFA_POR_DIA = 5;
            
            // Si no hay retraso, no hay adeudo
            if (diasRetraso <= 0) {
                return 0;
            }
            
            // Calcular el monto total
            let monto = diasRetraso * TARIFA_POR_DIA;
            
            // Aplicar descuento por devolución voluntaria (20%)
            monto = monto * 0.8;
            
            return Math.round(monto * 100) / 100; // Redondear a 2 decimales
        }

        // Función para cargar opciones en el formulario de préstamos
        async function cargarSelectOptions() {
            try {
                // Obtener datos de usuarios y libros
                const [usuarios, libros] = await Promise.all([
                    fetchAPI('/usuarios'),
                    fetchAPI('/libros')
                ]);

                if (!usuarios || !libros) {
                    throw new Error('Error al cargar datos para el formulario');
                }

                console.log('Todos los usuarios:', usuarios);
                console.log('Todos los libros:', libros);

                // Cargar usuarios en el select
                const selectUsuario = document.getElementById('prestamo-usuario');
                if (selectUsuario) {
                    // Limpiar opciones existentes
                    selectUsuario.innerHTML = '';
                    
                    // Agregar opción por defecto
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = 'Seleccionar usuario...';
                    selectUsuario.appendChild(defaultOption);
                    
                    // Filtrar y agregar usuarios tipo lector
                    const usuariosLectores = usuarios.filter(usuario => 
                        usuario.tipo === 'lector' || usuario.tipo_usuario === 'lector'
                    );
                    console.log('Usuarios lectores filtrados:', usuariosLectores);

                    if (usuariosLectores.length === 0) {
                        const noOption = document.createElement('option');
                        noOption.value = '';
                        noOption.textContent = 'No hay usuarios lectores disponibles';
                        selectUsuario.appendChild(noOption);
                    } else {
                        usuariosLectores.forEach(usuario => {
                            const option = document.createElement('option');
                            option.value = usuario.id;
                            option.textContent = `${usuario.nombre} (${usuario.correo})`;
                            selectUsuario.appendChild(option);
                        });
                    }
                }

                // Cargar libros en el select
                const selectLibro = document.getElementById('prestamo-libro');
                if (selectLibro) {
                    // Limpiar opciones existentes
                    selectLibro.innerHTML = '';
                    
                    // Agregar opción por defecto
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = 'Seleccionar libro...';
                    selectLibro.appendChild(defaultOption);
                    
                    // Filtrar y agregar libros disponibles
                    const librosDisponibles = libros.filter(libro => libro.cantidad_disponible > 0);
                    console.log('Libros disponibles:', librosDisponibles);

                    if (librosDisponibles.length === 0) {
                        const noOption = document.createElement('option');
                        noOption.value = '';
                        noOption.textContent = 'No hay libros disponibles';
                        selectLibro.appendChild(noOption);
                    } else {
                        librosDisponibles.forEach(libro => {
                            const option = document.createElement('option');
                            option.value = libro.id;
                            option.textContent = `${libro.titulo} - ${libro.autor} (Disponibles: ${libro.cantidad_disponible})`;
                            selectLibro.appendChild(option);
                        });
                    }
                }

                // Establecer fechas por defecto
                const fechaPrestamo = document.getElementById('prestamo-fecha');
                const fechaDevolucion = document.getElementById('prestamo-devolucion');
                
                if (fechaPrestamo && fechaDevolucion) {
                    const hoy = new Date();
                    const quinceDias = new Date();
                    quinceDias.setDate(hoy.getDate() + 15);

                    fechaPrestamo.value = hoy.toISOString().split('T')[0];
                    fechaDevolucion.value = quinceDias.toISOString().split('T')[0];
                }

                // Establecer estado inicial según el contexto
                const selectEstado = document.getElementById('prestamo-estado');
                if (selectEstado) {
                    const esAdmin = window.location.pathname.includes('index.html');
                    selectEstado.value = esAdmin ? 'Autorizado' : 'Pendiente';
                    selectEstado.style.display = esAdmin ? 'block' : 'none';
                }

                // Verificar si se cargaron las opciones
                console.log('Select Usuario opciones:', selectUsuario?.options.length);
                console.log('Select Libro opciones:', selectLibro?.options.length);

            } catch (error) {
                console.error('Error al cargar opciones:', error);
                mostrarAlerta('Error al cargar opciones: ' + error.message, 'error');
            }
        }

        // Función para notificar al usuario sobre cambios en sus préstamos
        async function notificarUsuario(usuarioId, mensaje, tipo = 'info') {
            try {
                const notificacion = {
                    usuario_id: usuarioId,
                    mensaje: mensaje,
                    tipo: tipo,
                    fecha: new Date().toISOString()
                };

                await fetchAPI('/notificaciones', {
                    method: 'POST',
                    body: JSON.stringify(notificacion)
                });
            } catch (error) {
                console.error('Error al enviar notificación:', error);
            }
        }
// Función para registrar préstamo
async function registrarPrestamo(event) {
    event.preventDefault();

    try {
        // Obtener valores del formulario
        const usuarioId = document.getElementById('prestamo-usuario').value;
        const libroId = document.getElementById('prestamo-libro').value;
        const fechaPrestamo = document.getElementById('prestamo-fecha').value;
        const fechaDevolucion = document.getElementById('prestamo-devolucion').value;
        const estado = document.getElementById('prestamo-estado').value;

        // Validar campos
        if (!usuarioId || !libroId || !fechaPrestamo || !fechaDevolucion || !estado) {
            throw new Error('Todos los campos son obligatorios');
        }

        if (new Date(fechaPrestamo) > new Date(fechaDevolucion)) {
            throw new Error('La fecha de devolución debe ser posterior a la fecha de préstamo');
        }

        // Verificar disponibilidad del libro
        const libros = await fetchAPI('/libros');
        const libro = libros.find(l => String(l.id) === String(libroId));
        if (!libro || libro.cantidad_disponible <= 0) {
            throw new Error('El libro no está disponible en este momento');
        }

        // Verificar si el usuario ya tiene préstamos activos o pendientes
        const prestamosUsuario = await fetchAPI('/prestamos');
        const prestamosPendientes = prestamosUsuario.filter(p =>
            String(p.usuario_id) === String(usuarioId) &&
            (p.estado === 'Pendiente' || p.estado === 'Autorizado')
        );

        if (prestamosPendientes.length > 0) {
            throw new Error('El usuario tiene préstamos pendientes o activos');
        }

        // Construir el objeto de préstamo
        const prestamo = {
            usuario_id: parseInt(usuarioId, 10),
            libro_id: parseInt(libroId, 10),
            fecha_prestamo: fechaPrestamo,
            fecha_devolucion: fechaDevolucion,
            estado: estado
        };

        // Enviar a la API usando fetch directamente (fetchAPI debe aceptar opciones o usaremos fetch nativo aquí)
        const response = await fetch('/prestamos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(prestamo)
        });

        if (!response.ok) {
            // Leer mensaje de error de la respuesta si hay
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al registrar el préstamo');
        }

        // Notificar al usuario
        await notificarUsuario(usuarioId, `Nuevo préstamo ${estado.toLowerCase()}: ${libro.titulo}`, 'info');

        // Limpiar formulario y recargar datos
        document.getElementById('prestamo-form').reset();

        await Promise.all([
            cargarPrestamos(),
            cargarLibros(),
            cargarEstadisticas(),
            cargarSelectOptions()
        ]);

        mostrarAlerta('Préstamo registrado exitosamente', 'success');

    } catch (error) {
        console.error('Error al registrar préstamo:', error);
        mostrarAlerta(error.message, 'error');
    }
}

// Hacer la función registrarPrestamo disponible globalmente
window.registrarPrestamo = registrarPrestamo;

// Función para autorizar préstamo
window.autorizarPrestamo = async function(id) {
    try {
        const prestamo = await fetch(`/prestamos/${id}`).then(res => {
            if (!res.ok) throw new Error('Préstamo no encontrado');
            return res.json();
        });

        if (prestamo.estado !== 'Pendiente') {
            throw new Error('Solo se pueden autorizar préstamos pendientes');
        }

        const libro = await fetch(`/libros/${prestamo.libro_id}`).then(res => {
            if (!res.ok) throw new Error('Libro no encontrado');
            return res.json();
        });

        if (!libro || libro.cantidad_disponible <= 0) {
            throw new Error('El libro no está disponible');
        }

        // Actualizar estado del préstamo
        const prestamoActualizado = {
            ...prestamo,
            estado: 'Autorizado'
        };

        const resPrestamoUpdate = await fetch(`/prestamos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(prestamoActualizado)
        });
        if (!resPrestamoUpdate.ok) {
            const errData = await resPrestamoUpdate.json().catch(() => ({}));
            throw new Error(errData.message || 'Error al actualizar préstamo');
        }

        // Actualizar disponibilidad del libro
        const resLibroUpdate = await fetch(`/libros/${prestamo.libro_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...libro,
                cantidad_disponible: libro.cantidad_disponible - 1
            })
        });
        if (!resLibroUpdate.ok) {
            const errData = await resLibroUpdate.json().catch(() => ({}));
            throw new Error(errData.message || 'Error al actualizar libro');
        }

        // Notificar al usuario (ajusta la función para que acepte estos parámetros)
        await notificarUsuario(prestamo.usuario_id, `Préstamo autorizado: ${libro.titulo}`, 'info');

        // Actualizar tablas
        await Promise.all([
            cargarPrestamos(),
            cargarLibros()
        ]);

        mostrarAlerta('Préstamo autorizado exitosamente', 'success');

    } catch (error) {
        console.error('Error al autorizar préstamo:', error);
        mostrarAlerta(error.message, 'error');
    }
};


       // Función para rechazar préstamo
window.rechazarPrestamo = async function(id) {
    try {
        const prestamo = await fetch(`/prestamos/${id}`).then(res => {
            if (!res.ok) throw new Error('Préstamo no encontrado');
            return res.json();
        });

        if (prestamo.estado !== 'Pendiente') {
            throw new Error('Solo se pueden rechazar préstamos pendientes');
        }

        const prestamoActualizado = {
            ...prestamo,
            estado: 'Rechazado'
        };

        const resUpdate = await fetch(`/prestamos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(prestamoActualizado)
        });
        if (!resUpdate.ok) {
            const errData = await resUpdate.json().catch(() => ({}));
            throw new Error(errData.message || 'Error al actualizar préstamo');
        }

        // Notificar al usuario
        const libro = await fetch(`/libros/${prestamo.libro_id}`).then(res => {
            if (!res.ok) throw new Error('Libro no encontrado');
            return res.json();
        });

        await notificarUsuario(prestamo.usuario_id, `Préstamo rechazado: ${libro.titulo}`, 'info');

        await cargarPrestamos();

        mostrarAlerta('Préstamo rechazado exitosamente', 'success');
    } catch (error) {
        console.error('Error al rechazar préstamo:', error);
        mostrarAlerta(error.message, 'error');
    }
};

// Función para editar préstamo
window.editarPrestamo = async function(id) {
    try {
        const prestamo = await fetch(`/prestamos/${id}`).then(res => {
            if (!res.ok) throw new Error('Préstamo no encontrado');
            return res.json();
        });

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Editar Préstamo</h3>
                <form id="editar-prestamo-form">
                    <div class="form-group">
                        <label for="edit-fecha-prestamo">Fecha de Préstamo:</label>
                        <input type="date" id="edit-fecha-prestamo" value="${prestamo.fecha_prestamo}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-fecha-devolucion">Fecha de Devolución:</label>
                        <input type="date" id="edit-fecha-devolucion" value="${prestamo.fecha_devolucion}" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                        <button type="button" class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('editar-prestamo-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const fechaPrestamo = document.getElementById('edit-fecha-prestamo').value;
            const fechaDevolucion = document.getElementById('edit-fecha-devolucion').value;

            if (new Date(fechaPrestamo) > new Date(fechaDevolucion)) {
                mostrarAlerta('La fecha de devolución debe ser posterior a la fecha de préstamo', 'error');
                return;
            }

            try {
                const resUpdate = await fetch(`/prestamos/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...prestamo,
                        fecha_prestamo: fechaPrestamo,
                        fecha_devolucion: fechaDevolucion
                    })
                });

                if (!resUpdate.ok) {
                    const errData = await resUpdate.json().catch(() => ({}));
                    throw new Error(errData.message || 'Error al actualizar préstamo');
                }

                cerrarModal();
                await cargarPrestamos();
                mostrarAlerta('Préstamo actualizado exitosamente', 'success');
            } catch (error) {
                mostrarAlerta('Error al actualizar el préstamo: ' + error.message, 'error');
            }
        });
    } catch (error) {
        console.error('Error al editar préstamo:', error);
        mostrarAlerta(error.message, 'error');
    }
};


      // Función para eliminar préstamo
window.eliminarPrestamo = async function(id) {
    try {
        const prestamo = await fetch(`/prestamos/${id}`).then(res => {
            if (!res.ok) throw new Error('Préstamo no encontrado');
            return res.json();
        });

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>⚠️ Confirmar Eliminación</h3>
                <p>¿Estás seguro que deseas eliminar este préstamo?</p>
                <p>Esta acción no se puede deshacer.</p>
                <div class="form-actions">
                    <button id="confirm-delete" class="btn btn-danger">Sí, Eliminar Préstamo</button>
                    <button id="cancel-delete" class="btn btn-secondary">Cancelar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('confirm-delete').addEventListener('click', async () => {
            try {
                const resDelete = await fetch(`/prestamos/${id}`, {
                    method: 'DELETE'
                });
                if (!resDelete.ok) {
                    const errData = await resDelete.json().catch(() => ({}));
                    throw new Error(errData.message || 'Error al eliminar préstamo');
                }

                cerrarModal();
                await cargarPrestamos();
                mostrarAlerta('Préstamo eliminado exitosamente', 'success');
            } catch (error) {
                mostrarAlerta('Error al eliminar el préstamo: ' + error.message, 'error');
            }
        });

        document.getElementById('cancel-delete').addEventListener('click', () => {
            cerrarModal();
        });
    } catch (error) {
        console.error('Error al eliminar préstamo:', error);
        mostrarAlerta(error.message, 'error');
    }
};


       // Función para registrar devolución
async function registrarDevolucion(idPrestamo) {
    try {
        const prestamo = await fetchAPI(`/prestamos/${idPrestamo}`);
        if (!prestamo) throw new Error('Préstamo no encontrado');

        if (prestamo.estado !== 'Autorizado') {
            throw new Error('Solo se pueden devolver préstamos autorizados');
        }

        const libro = await fetchAPI(`/libros/${prestamo.libro_id}`);
        if (!libro) throw new Error('Libro no encontrado');

        // Calcular días de retraso y monto
        const diasRetraso = calcularDiasRetraso(prestamo.fecha_devolucion);
        const montoAdeudo = calcularMontoAdeudo(diasRetraso);

        // Crear registro de devolución
        const devolucion = {
            id_prestamo: idPrestamo,
            fecha_entrega: new Date().toISOString().split('T')[0],
            dias_retraso: diasRetraso,
            monto_adeudo: montoAdeudo,
            observaciones: diasRetraso > 0 
                ? `Devolución con ${diasRetraso} día(s) de retraso. Adeudo: $${montoAdeudo}` 
                : 'Devolución a tiempo'
        };

        // Guardar devolución
        const response = await fetchAPI('/devoluciones', {
            method: 'POST',
            body: JSON.stringify(devolucion)
        });

        if (!response) throw new Error('Error al registrar la devolución');

        // Actualizar estado del préstamo
        await fetchAPI(`/prestamos/${idPrestamo}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...prestamo,
                estado: 'Devuelto'
            })
        });

        // Actualizar cantidad disponible del libro
        await fetchAPI(`/libros/${prestamo.libro_id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...libro,
                cantidad_disponible: libro.cantidad_disponible + 1
            })
        });

        // Notificar al usuario
        await notificarUsuario(prestamo.usuario_id, 'Devuelto', libro.titulo);

        // Actualizar vistas
        await Promise.all([
            cargarPrestamos(),
            cargarLibros(),
            cargarDevoluciones()
        ]);

        mostrarAlerta('Devolución registrada exitosamente', 'success');
    } catch (error) {
        console.error('Error al registrar devolución:', error);
        mostrarAlerta(error.message, 'error');
    }
}

// Función para cargar devoluciones
async function cargarDevoluciones() {
    try {
        const [devolucionesData, prestamosData, usuariosData, librosData] = await Promise.all([
            fetchAPI('/devoluciones'),
            fetchAPI('/prestamos'),
            fetchAPI('/usuarios'),
            fetchAPI('/libros')
        ]);

        if (!devolucionesData || !prestamosData || !usuariosData || !librosData) {
            throw new Error('Error al cargar los datos necesarios');
        }

        const tbody = document.querySelector('#devoluciones-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        devolucionesData.forEach(devolucion => {
            const prestamo = prestamosData.find(p => p.id === devolucion.id_prestamo);
            const usuario = usuariosData.find(u => String(u.id) === String(prestamo?.usuario_id));
            const libro = librosData.find(l => String(l.id) === String(prestamo?.libro_id));

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${devolucion.id}</td>
                <td>Préstamo #${devolucion.id_prestamo}</td>
                <td>${usuario ? usuario.nombre : 'Usuario no encontrado'}</td>
                <td>${libro ? libro.titulo : 'Libro no encontrado'}</td>
                <td>${formatearFecha(devolucion.fecha_entrega)}</td>
                <td>
                    ${devolucion.dias_retraso > 0 ? `
                        <span class="text-danger">
                            ${devolucion.dias_retraso} día(s) de retraso<br>
                            Monto: $${devolucion.monto_adeudo}
                        </span>
                    ` : 'A tiempo'}
                </td>
                <td>${devolucion.observaciones || 'Sin observaciones'}</td>
            `;
            tbody.appendChild(tr);
        });

        // Agregar estilos para la tabla de devoluciones (solo una vez)
        if (!document.getElementById('estilo-devoluciones')) {
            const style = document.createElement('style');
            style.id = 'estilo-devoluciones';
            style.textContent = `
                #devoluciones-table td {
                    padding: 10px;
                    border-bottom: 1px solid #ddd;
                }
                #devoluciones-table .text-danger {
                    color: #dc3545;
                    font-weight: bold;
                }
            `;
            document.head.appendChild(style);
        }
    } catch (error) {
        console.error('Error al cargar devoluciones:', error);
        mostrarAlerta('Error al cargar las devoluciones: ' + error.message, 'error');
    }
}


        // Función para cargar adeudos
        async function cargarAdeudosAdmin() {
            try {
                const [devolucionesData, prestamosData, usuariosData, librosData] = await Promise.all([
                    fetchAPI('/devoluciones'),
                    fetchAPI('/prestamos'),
                    fetchAPI('/usuarios'),
                    fetchAPI('/libros')
                ]);

                if (!devolucionesData || !prestamosData || !usuariosData || !librosData) {
                    throw new Error('Error al cargar los datos necesarios');
                }

                const tbody = document.querySelector('#adeudos-table tbody');
                if (!tbody) return;

                tbody.innerHTML = '';

                // Filtrar solo las devoluciones con retraso
                const adeudos = devolucionesData.filter(d => d.dias_retraso > 0);

                if (adeudos.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center">No hay adeudos registrados</td>
                        </tr>
                    `;
                    return;
                }

                adeudos.forEach(adeudo => {
                    const prestamo = prestamosData.find(p => p.id === adeudo.id_prestamo);
                    const usuario = usuariosData.find(u => String(u.id) === String(prestamo?.usuario_id));
                    const libro = librosData.find(l => String(l.id) === String(prestamo?.libro_id));

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${usuario ? usuario.nombre : 'Usuario no encontrado'}</td>
                        <td>${libro ? libro.titulo : 'Libro no encontrado'}</td>
                        <td>${new Date(prestamo?.fecha_prestamo).toLocaleDateString()}</td>
                        <td class="text-danger">${adeudo.dias_retraso} días</td>
                        <td class="text-danger">$${adeudo.monto_adeudo}</td>
                    `;
                    tbody.appendChild(tr);
                });

                // Agregar estilos para la tabla de adeudos
                const style = document.createElement('style');
                style.textContent = `
                    #adeudos-table td {
                        padding: 10px;
                        border-bottom: 1px solid #ddd;
                    }
                    #adeudos-table .text-danger {
                        color: #dc3545;
                        font-weight: bold;
                    }
                    .text-center {
                        text-align: center;
                    }
                `;
                document.head.appendChild(style);
            } catch (error) {
                console.error('Error al cargar adeudos:', error);
                mostrarAlerta('Error al cargar los adeudos: ' + error.message, 'error');
            }
        }

        // Función para cargar el perfil de usuario con sus préstamos y adeudos
        async function cargarPerfilUsuario(idUsuario) {
            try {
                const [usuario, prestamos, devoluciones, libros] = await Promise.all([
                    fetchAPI(`/usuarios/${idUsuario}`),
                    fetchAPI('/prestamos'),
                    fetchAPI('/devoluciones'),
                    fetchAPI('/libros')
                ]);

                if (!usuario || !prestamos || !devoluciones || !libros) {
                    throw new Error('Error al cargar los datos del usuario');
                }

                // Filtrar préstamos del usuario
                const prestamosUsuario = prestamos.filter(p => p.usuario_id === idUsuario);
                
                // Calcular adeudos
                const adeudos = devoluciones
                    .filter(d => {
                        const prestamo = prestamosUsuario.find(p => p.id === d.id_prestamo);
                        return prestamo && d.dias_retraso > 0;
                    })
                    .map(d => {
                        const prestamo = prestamosUsuario.find(p => p.id === d.id_prestamo);
                        const libro = libros.find(l => l.id === prestamo.libro_id);
                        return {
                            ...d,
                            libro: libro?.titulo || 'N/A',
                            fecha_prestamo: prestamo.fecha_prestamo
                        };
                    });

                // Mostrar información en el perfil
                const perfilContainer = document.getElementById('perfil-usuario');
                if (perfilContainer) {
                    perfilContainer.innerHTML = `
                        <div class="perfil-header">
                            <h3>Perfil de ${usuario.nombre}</h3>
                            <p>Correo: ${usuario.correo}</p>
                            <p>Tipo: ${usuario.tipo_usuario}</p>
                        </div>
                        
                        <div class="prestamos-activos">
                            <h4>Préstamos Activos</h4>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Libro</th>
                                            <th>Fecha Préstamo</th>
                                            <th>Fecha Devolución</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${prestamosUsuario
                                            .filter(p => p.estado === 'Autorizado')
                                            .map(p => {
                                                const libro = libros.find(l => l.id === p.libro_id);
                                                return `
                                                    <tr>
                                                        <td>${libro?.titulo || 'N/A'}</td>
                                                        <td>${formatearFecha(p.fecha_prestamo)}</td>
                                                        <td>${formatearFecha(p.fecha_devolucion)}</td>
                                                        <td>
                                                            <span class="estado-badge estado-${p.estado.toLowerCase()}">
                                                                ${p.estado}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="adeudos-usuario">
                            <h4>Adeudos Pendientes</h4>
                            ${adeudos.length > 0 ? `
                                <div class="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Libro</th>
                                                <th>Fecha Préstamo</th>
                                                <th>Días de Retraso</th>
                                                <th>Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${adeudos.map(a => `
                                                <tr>
                                                    <td>${a.libro}</td>
                                                    <td>${formatearFecha(a.fecha_prestamo)}</td>
                                                    <td class="text-danger">${a.dias_retraso} días</td>
                                                    <td class="text-danger">$${a.monto_adeudo}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : '<p>No hay adeudos pendientes</p>'}
                        </div>
                    `;

                    // Agregar estilos para el perfil
                    const style = document.createElement('style');
                    style.textContent = `
                        .perfil-header {
                            background-color: #f8f9fa;
                            padding: 20px;
                            border-radius: 8px;
                            margin-bottom: 20px;
                        }
                        .prestamos-activos, .adeudos-usuario {
                            margin-top: 20px;
                        }
                        .text-danger {
                            color: #dc3545;
                            font-weight: bold;
                        }
                    `;
                    document.head.appendChild(style);
                }
            } catch (error) {
                console.error('Error al cargar perfil de usuario:', error);
                mostrarAlerta('Error al cargar el perfil del usuario: ' + error.message, 'error');
            }
        }

        // Función para cargar estadísticas del dashboard
        async function cargarEstadisticas() {
            try {
                const [usuarios, libros, prestamos] = await Promise.all([
                    fetchAPI('/usuarios'),
                    fetchAPI('/libros'),
                    fetchAPI('/prestamos')
                ]);

                if (!usuarios || !libros || !prestamos) {
                    throw new Error('Error al cargar los datos del dashboard');
                }

                // Calcular estadísticas
                const totalUsuarios = usuarios.length;
                const totalLibros = libros.length;
                const prestamosActivos = prestamos.filter(p => p.estado === 'Autorizado').length;
                const librosDisponibles = libros.reduce((total, libro) => total + (libro.cantidad_disponible || 0), 0);

                // Actualizar elementos del dashboard
                const elementos = {
                    'total-usuarios': totalUsuarios,
                    'total-libros': totalLibros,
                    'prestamos-activos': prestamosActivos,
                    'libros-disponibles': librosDisponibles
                };

                Object.entries(elementos).forEach(([id, valor]) => {
                    const elemento = document.getElementById(id);
                    if (elemento) {
                        elemento.textContent = valor;
                    }
                });

            } catch (error) {
                console.error('Error al cargar estadísticas:', error);
                mostrarAlerta('Error al cargar estadísticas: ' + error.message, 'error');
            }
        }

        async function cargarPrestamos() {
            try {
                const tbody = document.querySelector('#prestamos-table tbody');
                if (!tbody) {
                    console.error('No se encontró la tabla de préstamos');
                    return;
                }
        
                tbody.innerHTML = '';
        
                // fetchAPI debería ser una función definida que retorna datos JSON
                const [prestamos, usuarios, libros] = await Promise.all([
                    fetchAPI('/prestamos'),
                    fetchAPI('/usuarios'),
                    fetchAPI('/libros')
                ]);
        
                console.log('Datos cargados:', { prestamos, usuarios, libros });
        
                // Validar que los datos sean arrays
                if (!Array.isArray(prestamos) || !Array.isArray(usuarios) || !Array.isArray(libros)) {
                    throw new Error('Los datos recibidos no tienen el formato esperado');
                }
        
                // Ordenar préstamos descendente por id
                prestamos.sort((a, b) => b.id - a.id);
        
                prestamos.forEach(prestamo => {
                    try {
                        // Buscar usuario y libro relacionados al préstamo
                        const usuario = usuarios.find(u => String(u.id) === String(prestamo.usuario_id));
                        const libro = libros.find(l => String(l.id) === String(prestamo.libro_id));
                        
                        // Estado por defecto Pendiente
                        const estado = prestamo.estado || 'Pendiente';
                        const estadoLower = estado.toLowerCase();
        
                        // Formatear fechas, agregar función si no existe
                        const fechaPrestamo = formatearFecha(prestamo.fecha_prestamo);
                        const fechaDevolucion = formatearFecha(prestamo.fecha_devolucion);
        
                        // Crear fila
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${prestamo.id}</td>
                            <td>${usuario ? usuario.nombre : 'Usuario no encontrado'}</td>
                            <td>${libro ? libro.titulo : 'Libro no encontrado'}</td>
                            <td>${fechaPrestamo}</td>
                            <td>${fechaDevolucion}</td>
                            <td>
                                <span class="estado-badge estado-${estadoLower}">
                                    ${estado}
                                </span>
                            </td>
                            <td>
                                <div class="btn-group">
                                    ${estado === 'Pendiente' ? `
                                        <button class="btn btn-sm btn-success" onclick="autorizarPrestamo(${prestamo.id})">
                                            <i class="fas fa-check"></i> Autorizar
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="rechazarPrestamo(${prestamo.id})">
                                            <i class="fas fa-times"></i> Rechazar
                                        </button>
                                    ` : ''}
                                    ${estado === 'Autorizado' ? `
                                        <button class="btn btn-sm btn-primary" onclick="registrarDevolucion(${prestamo.id})">
                                            <i class="fas fa-undo"></i> Devolver
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-sm btn-warning" onclick="editarPrestamo(${prestamo.id})">
                                        <i class="fas fa-edit"></i> Editar
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="eliminarPrestamo(${prestamo.id})">
                                        <i class="fas fa-trash"></i> Eliminar
                                    </button>
                                </div>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    } catch (error) {
                        console.error('Error al procesar préstamo:', error);
                    }
                });
        
            } catch (error) {
                console.error('Error al cargar préstamos:', error);
                mostrarAlerta('Error al cargar los préstamos: ' + error.message, 'error');
            }
        }
        

        // Inicialización al cargar la página
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                // Asegurarse de que las funciones estén disponibles globalmente
                window.cargarPrestamos = cargarPrestamos;
                window.registrarPrestamo = registrarPrestamo;
                window.autorizarPrestamo = autorizarPrestamo;
                window.rechazarPrestamo = rechazarPrestamo;
                window.editarPrestamo = editarPrestamo;
                window.eliminarPrestamo = eliminarPrestamo;
                window.registrarDevolucion = registrarDevolucion;

                // Configurar eventos de formularios
                const prestamoForm = document.getElementById('prestamo-form');
                if (prestamoForm) {
                    prestamoForm.addEventListener('submit', registrarPrestamo);
                }

                const usuarioForm = document.getElementById('usuario-form');
                if (usuarioForm) {
                    usuarioForm.addEventListener('submit', registrarUsuario);
                }

                const libroForm = document.getElementById('libro-form');
                if (libroForm) {
                    libroForm.addEventListener('submit', registrarLibro);
                }

                const devolucionForm = document.getElementById('devolucion-form');
                if (devolucionForm) {
                    devolucionForm.addEventListener('submit', registrarDevolucionFormulario);
                }

                // Cargar datos iniciales
                await Promise.all([
                    cargarEstadisticas(),
                    cargarUsuarios(),
                    cargarLibros(),
                    cargarPrestamos(),
                    cargarDevoluciones(),
                    cargarSelectOptions()
                ]);

                // Si estamos en lector.html, cargar préstamos del usuario
                if (window.location.pathname.includes('lector.html')) {
                    await cargarMisPrestamos();
                }
            } catch (error) {
                console.error('Error en la inicialización:', error);
                mostrarAlerta('Error al inicializar la aplicación: ' + error.message, 'error');
            }
        });

        // Event listeners para búsqueda en tiempo real
        document.getElementById('search-usuarios').addEventListener('input', buscarUsuarios);
        document.getElementById('search-libros').addEventListener('input', buscarLibros);

        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('libro-form');
            if (form) {
                form.addEventListener('submit', registrarLibro);
            }
        });
   


// Función para registrar una devolución desde el formulario de devoluciones
async function registrarDevolucionFormulario(event) {
    event.preventDefault();

    try {
        const idPrestamo = document.getElementById('devolucion-prestamo').value;
        const fechaEntrega = document.getElementById('devolucion-fecha').value;
        const observaciones = document.getElementById('devolucion-observaciones').value;

        if (!idPrestamo || !fechaEntrega) {
            throw new Error('Todos los campos obligatorios deben ser completados');
        }

        const prestamo = await fetchAPI(`/prestamos/${idPrestamo}`);
        if (!prestamo || prestamo.estado !== 'Autorizado') {
            throw new Error('Solo se pueden devolver préstamos autorizados');
        }

        const libro = await fetchAPI(`/libros/${prestamo.libro_id}`);
        const diasRetraso = calcularDiasRetraso(prestamo.fecha_devolucion); // Asumo que calcula días entre fecha_devolución y hoy
        const montoAdeudo = calcularMontoAdeudo(diasRetraso);  // Calcula multa en base a días retraso

        const devolucion = {
            id_prestamo: parseInt(idPrestamo),
            fecha_entrega: fechaEntrega,
            dias_retraso: diasRetraso,
            monto_adeudo: montoAdeudo,
            observaciones: observaciones || (diasRetraso > 0
                ? `Devolución con ${diasRetraso} días de retraso. Adeudo: $${montoAdeudo}`
                : 'Devolución a tiempo')
        };

        await fetchAPI('/devoluciones', {
            method: 'POST',
            body: JSON.stringify(devolucion)
        });

        // Actualizar préstamo a estado Devuelto
        await fetchAPI(`/prestamos/${prestamo.id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...prestamo, estado: 'Devuelto' })
        });

        // Actualizar cantidad disponible del libro
        await fetchAPI(`/libros/${libro.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...libro,
                cantidad_disponible: libro.cantidad_disponible + 1
            })
        });

        await notificarUsuario(prestamo.usuario_id, 'Devuelto', libro.titulo);

        document.getElementById('devolucion-form').reset();
        await Promise.all([
            cargarDevoluciones(),
            cargarLibros(),
            cargarPrestamos(),
            cargarSelectOptions()
        ]);

        mostrarAlerta('Devolución registrada correctamente', 'success');

    } catch (error) {
        console.error('Error al registrar devolución:', error);
        mostrarAlerta('Error al registrar devolución: ' + error.message, 'error');
    }
}
