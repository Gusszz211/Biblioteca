package main

import (
	"database/sql"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

// Estructuras
type Usuario struct {
	ID          int    `json:"id"`
	Nombre      string `json:"nombre"`
	Correo      string `json:"correo"`
	Contrasena  string `json:"contrasena,omitempty"`
	TipoUsuario string `json:"tipo_usuario"`
}

type Libro struct {
	ID                 int    `json:"id"`
	Titulo             string `json:"titulo"`
	Autor              string `json:"autor"`
	Editorial          string `json:"editorial"`
	AnioPublicacion    *int   `json:"anio_publicacion"`
	Genero             string `json:"genero"`
	ISBN               string `json:"isbn"`
	CantidadDisponible int    `json:"cantidad_disponible"`
}

type Prestamo struct {
	ID              int     `json:"id"`
	IDUsuario       int     `json:"id_usuario"`
	IDLibro         int     `json:"id_libro"`
	FechaPrestamo   string  `json:"fecha_prestamo"`
	FechaDevolucion string  `json:"fecha_devolucion"`
	Devuelto        bool    `json:"devuelto"`
	UsuarioNombre   *string `json:"usuario_nombre,omitempty"`
	LibroTitulo     *string `json:"libro_titulo,omitempty"`
}

type Devolucion struct {
	ID            int     `json:"id"`
	IDPrestamo    int     `json:"id_prestamo"`
	FechaEntrega  string  `json:"fecha_entrega"`
	Observaciones string  `json:"observaciones"`
	UsuarioNombre *string `json:"usuario_nombre,omitempty"`
	LibroTitulo   *string `json:"libro_titulo,omitempty"`
}

var db *sql.DB

func init() {
	var err error
	// Conectar a MySQL
	db, err = sql.Open("mysql", "root:1234@tcp(127.0.0.1:3306)/biblioteca_db")
	if err != nil {
		panic("Error al conectar con la base de datos: " + err.Error())
	}

	err = db.Ping()
	if err != nil {
		panic("Error al hacer ping a la base de datos: " + err.Error())
	}
}

func main() {
	r := gin.Default()

	// Configurar CORS
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	r.Use(cors.New(config))

	// Rutas API
	api := r.Group("/api")
	{
		// Usuarios
		api.GET("/usuarios", obtenerUsuarios)
		api.POST("/usuarios", crearUsuario)
		api.PUT("/usuarios/:id", actualizarUsuario)
		api.DELETE("/usuarios/:id", eliminarUsuario)

		// Libros
		api.GET("/libros", obtenerLibros)
		api.POST("/libros", crearLibro)
		api.PUT("/libros/:id", actualizarLibro)
		api.DELETE("/libros/:id", eliminarLibro)

		// Préstamos
		api.GET("/prestamos", obtenerPrestamos)
		api.POST("/prestamos", crearPrestamo)
		api.PUT("/prestamos/:id", actualizarPrestamo)
		api.PUT("/prestamos/:id/devolver", marcarPrestamoDevuelto)
		api.DELETE("/prestamos/:id", eliminarPrestamo)

		// Devoluciones
		api.GET("/devoluciones", obtenerDevoluciones)
		api.POST("/devoluciones", crearDevolucion)
		api.DELETE("/devoluciones/:id", eliminarDevolucion)
	}

	// Servir archivos estáticos (opcional)
	r.Static("/static", "./static")
	r.LoadHTMLGlob("templates/*")

	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	r.Run(":8080")
}

// ================ USUARIOS ================

func obtenerUsuarios(c *gin.Context) {
	rows, err := db.Query("SELECT id, nombre, correo, tipo_usuario FROM usuarios")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var usuarios []Usuario
	for rows.Next() {
		var usuario Usuario
		err := rows.Scan(&usuario.ID, &usuario.Nombre, &usuario.Correo, &usuario.TipoUsuario)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		usuarios = append(usuarios, usuario)
	}

	c.JSON(http.StatusOK, usuarios)
}

func crearUsuario(c *gin.Context) {
	var usuario Usuario
	if err := c.ShouldBindJSON(&usuario); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Encriptar contraseña
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(usuario.Contrasena), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al encriptar contraseña"})
		return
	}

	result, err := db.Exec("INSERT INTO usuarios (nombre, correo, contrasena, tipo_usuario) VALUES (?, ?, ?, ?)",
		usuario.Nombre, usuario.Correo, string(hashedPassword), usuario.TipoUsuario)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	usuario.ID = int(id)
	usuario.Contrasena = "" // No devolver la contraseña

	c.JSON(http.StatusCreated, usuario)
}

func actualizarUsuario(c *gin.Context) {
	id := c.Param("id")
	var usuario Usuario
	if err := c.ShouldBindJSON(&usuario); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := "UPDATE usuarios SET nombre = ?, correo = ?, tipo_usuario = ?"
	args := []interface{}{usuario.Nombre, usuario.Correo, usuario.TipoUsuario}

	if usuario.Contrasena != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(usuario.Contrasena), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al encriptar contraseña"})
			return
		}
		query += ", contrasena = ?"
		args = append(args, string(hashedPassword))
	}

	query += " WHERE id = ?"
	args = append(args, id)

	_, err := db.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Usuario actualizado exitosamente"})
}

func eliminarUsuario(c *gin.Context) {
	id := c.Param("id")

	_, err := db.Exec("DELETE FROM usuarios WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Usuario eliminado exitosamente"})
}

// ================ LIBROS ================

func obtenerLibros(c *gin.Context) {
	rows, err := db.Query("SELECT id, titulo, autor, editorial, anio_publicacion, genero, isbn, cantidad_disponible FROM libros")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var libros []Libro
	for rows.Next() {
		var libro Libro
		err := rows.Scan(&libro.ID, &libro.Titulo, &libro.Autor, &libro.Editorial,
			&libro.AnioPublicacion, &libro.Genero, &libro.ISBN, &libro.CantidadDisponible)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		libros = append(libros, libro)
	}

	c.JSON(http.StatusOK, libros)
}

func crearLibro(c *gin.Context) {
	var libro Libro
	if err := c.ShouldBindJSON(&libro); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := db.Exec("INSERT INTO libros (titulo, autor, editorial, anio_publicacion, genero, isbn, cantidad_disponible) VALUES (?, ?, ?, ?, ?, ?, ?)",
		libro.Titulo, libro.Autor, libro.Editorial, libro.AnioPublicacion, libro.Genero, libro.ISBN, libro.CantidadDisponible)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	libro.ID = int(id)

	c.JSON(http.StatusCreated, libro)
}

func actualizarLibro(c *gin.Context) {
	id := c.Param("id")
	var libro Libro
	if err := c.ShouldBindJSON(&libro); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := db.Exec("UPDATE libros SET titulo = ?, autor = ?, editorial = ?, anio_publicacion = ?, genero = ?, isbn = ?, cantidad_disponible = ? WHERE id = ?",
		libro.Titulo, libro.Autor, libro.Editorial, libro.AnioPublicacion, libro.Genero, libro.ISBN, libro.CantidadDisponible, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Libro actualizado exitosamente"})
}

func eliminarLibro(c *gin.Context) {
	id := c.Param("id")

	_, err := db.Exec("DELETE FROM libros WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Libro eliminado exitosamente"})
}

// ================ PRÉSTAMOS ================

func obtenerPrestamos(c *gin.Context) {
	query := `
		SELECT p.id, p.id_usuario, p.id_libro, p.fecha_prestamo, p.fecha_devolucion, p.devuelto,
			u.nombre as usuario_nombre, l.titulo as libro_titulo
		FROM prestamos p
		LEFT JOIN usuarios u ON p.id_usuario = u.id
		LEFT JOIN libros l ON p.id_libro = l.id
		ORDER BY p.id DESC
	`

	rows, err := db.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var prestamos []Prestamo
	for rows.Next() {
		var prestamo Prestamo
		err := rows.Scan(&prestamo.ID, &prestamo.IDUsuario, &prestamo.IDLibro,
			&prestamo.FechaPrestamo, &prestamo.FechaDevolucion, &prestamo.Devuelto,
			&prestamo.UsuarioNombre, &prestamo.LibroTitulo)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		prestamos = append(prestamos, prestamo)
	}

	c.JSON(http.StatusOK, prestamos)
}

func crearPrestamo(c *gin.Context) {
	var prestamo Prestamo
	if err := c.ShouldBindJSON(&prestamo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verificar disponibilidad del libro
	var cantidadDisponible int
	err := db.QueryRow("SELECT cantidad_disponible FROM libros WHERE id = ?", prestamo.IDLibro).Scan(&cantidadDisponible)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al verificar disponibilidad"})
		return
	}

	if cantidadDisponible <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El libro no está disponible"})
		return
	}

	// Iniciar transacción
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Crear préstamo
	result, err := tx.Exec("INSERT INTO prestamos (id_usuario, id_libro, fecha_prestamo, fecha_devolucion, devuelto) VALUES (?, ?, ?, ?, FALSE)",
		prestamo.IDUsuario, prestamo.IDLibro, prestamo.FechaPrestamo, prestamo.FechaDevolucion)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Reducir cantidad disponible
	_, err = tx.Exec("UPDATE libros SET cantidad_disponible = cantidad_disponible - 1 WHERE id = ?", prestamo.IDLibro)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	tx.Commit()

	id, _ := result.LastInsertId()
	prestamo.ID = int(id)

	c.JSON(http.StatusCreated, prestamo)
}

func actualizarPrestamo(c *gin.Context) {
	id := c.Param("id")
	var prestamo Prestamo
	if err := c.ShouldBindJSON(&prestamo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := db.Exec("UPDATE prestamos SET id_usuario = ?, id_libro = ?, fecha_prestamo = ?, fecha_devolucion = ? WHERE id = ?",
		prestamo.IDUsuario, prestamo.IDLibro, prestamo.FechaPrestamo, prestamo.FechaDevolucion, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Préstamo actualizado exitosamente"})
}

func marcarPrestamoDevuelto(c *gin.Context) {
	id := c.Param("id")

	// Obtener información del préstamo
	var idLibro int
	var devuelto bool
	err := db.QueryRow("SELECT id_libro, devuelto FROM prestamos WHERE id = ?", id).Scan(&idLibro, &devuelto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Préstamo no encontrado"})
		return
	}

	if devuelto {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El préstamo ya fue devuelto"})
		return
	}

	// Iniciar transacción
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Marcar como devuelto
	_, err = tx.Exec("UPDATE prestamos SET devuelto = TRUE WHERE id = ?", id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Aumentar cantidad disponible
	_, err = tx.Exec("UPDATE libros SET cantidad_disponible = cantidad_disponible + 1 WHERE id = ?", idLibro)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Préstamo marcado como devuelto"})
}

func eliminarPrestamo(c *gin.Context) {
	id := c.Param("id")

	_, err := db.Exec("DELETE FROM prestamos WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Préstamo eliminado exitosamente"})
}

// ================ DEVOLUCIONES ================

func obtenerDevoluciones(c *gin.Context) {
	query := `
		SELECT d.id, d.id_prestamo, d.fecha_entrega, d.observaciones,
			u.nombre as usuario_nombre, l.titulo as libro_titulo
		FROM devoluciones d
		INNER JOIN prestamos p ON d.id_prestamo = p.id
		LEFT JOIN usuarios u ON p.id_usuario = u.id
		LEFT JOIN libros l ON p.id_libro = l.id
		ORDER BY d.id DESC
	`

	rows, err := db.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var devoluciones []Devolucion
	for rows.Next() {
		var devolucion Devolucion
		err := rows.Scan(&devolucion.ID, &devolucion.IDPrestamo, &devolucion.FechaEntrega,
			&devolucion.Observaciones, &devolucion.UsuarioNombre, &devolucion.LibroTitulo)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		devoluciones = append(devoluciones, devolucion)
	}

	c.JSON(http.StatusOK, devoluciones)
}

func crearDevolucion(c *gin.Context) {
	var devolucion Devolucion
	if err := c.ShouldBindJSON(&devolucion); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verificar que el préstamo existe y no está devuelto
	var devuelto bool
	err := db.QueryRow("SELECT devuelto FROM prestamos WHERE id = ?", devolucion.IDPrestamo).Scan(&devuelto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Préstamo no encontrado"})
		return
	}

	if devuelto {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El préstamo ya fue devuelto"})
		return
	}

	// Iniciar transacción
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Crear devolución
	result, err := tx.Exec("INSERT INTO devoluciones (id_prestamo, fecha_entrega, observaciones) VALUES (?, ?, ?)",
		devolucion.IDPrestamo, devolucion.FechaEntrega, devolucion.Observaciones)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Marcar préstamo como devuelto
	_, err = tx.Exec("UPDATE prestamos SET devuelto = TRUE WHERE id = ?", devolucion.IDPrestamo)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Obtener ID del libro y aumentar cantidad disponible
	var idLibro int
	err = tx.QueryRow("SELECT id_libro FROM prestamos WHERE id = ?", devolucion.IDPrestamo).Scan(&idLibro)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = tx.Exec("UPDATE libros SET cantidad_disponible = cantidad_disponible + 1 WHERE id = ?", idLibro)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	tx.Commit()

	id, _ := result.LastInsertId()
	devolucion.ID = int(id)

	c.JSON(http.StatusCreated, devolucion)
}

func eliminarDevolucion(c *gin.Context) {
	id := c.Param("id")

	_, err := db.Exec("DELETE FROM devoluciones WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Devolución eliminada exitosamente"})
}
