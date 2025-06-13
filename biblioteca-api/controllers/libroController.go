package controllers

import (
	"biblioteca-api/config"
	"biblioteca-api/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func ObtenerLibros(c *gin.Context) {
	rows, err := config.DB.Query("SELECT * FROM libros")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var libros []models.Libro
	for rows.Next() {
		var libro models.Libro
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

func CrearLibro(c *gin.Context) {
	var nuevoLibro models.Libro

	if err := c.BindJSON(&nuevoLibro); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	stmt, err := config.DB.Prepare("INSERT INTO libros (titulo, autor, editorial, anio_publicacion, genero, isbn, cantidad_disponible) VALUES (?, ?, ?, ?, ?, ?, ?)")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = stmt.Exec(nuevoLibro.Titulo, nuevoLibro.Autor, nuevoLibro.Editorial,
		nuevoLibro.AnioPublicacion, nuevoLibro.Genero, nuevoLibro.ISBN, nuevoLibro.CantidadDisponible)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"mensaje": "Libro registrado exitosamente"})
}
