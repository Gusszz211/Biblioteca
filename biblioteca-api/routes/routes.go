package routes

import (
	"biblioteca-api/controllers"

	"github.com/gin-gonic/gin"
)

func DefinirRutas(router *gin.Engine) {
	router.GET("/libros", controllers.ObtenerLibros)
	router.POST("/libros", controllers.CrearLibro)
}
