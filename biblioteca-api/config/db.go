package config

import (
	"database/sql"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func ConectarDB() {
	var err error
DB, err = sql.Open("mysql", "root:1234@tcp(127.0.0.1:3306)/biblioteca_db")
	if err != nil {
		log.Fatal("Error al conectar:", err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("Error al hacer ping:", err)
	}

	log.Println("Conexión a MySQL exitosa")
}
