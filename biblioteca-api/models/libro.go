package models

type Libro struct {
	ID                 int    `json:"id"`
	Titulo             string `json:"titulo"`
	Autor              string `json:"autor"`
	Editorial          string `json:"editorial"`
	AnioPublicacion    int    `json:"anio_publicacion"`
	Genero             string `json:"genero"`
	ISBN               string `json:"isbn"`
	CantidadDisponible int    `json:"cantidad_disponible"`
}
