## Visor para meshes ##

#### Tareas principales restantes ####
- [ ] Selector de capa cuando se pulsa sobre varias capas distintas
- [ ] Abrir opciones y link desde free modal
- [ ] Funcionalidad encender/apagar polígonos
- [ ] Guardar las caras earcut en db para que no se tengan que generar en cada polígono al cargar
- [x] Medir distancia entre dos puntos
- [x] Guardar medidas como si fueran poligonos o capas
- [x] Cargar medidas al proyecto
  - [x] En el visor 3D
  - [x] En la gui
- [x] Borrar medidas
- [x] Editar medidas (el nombre solo)
- [ ] Ver info de la medida una vez guardada
  - [ ] Pulsando sobre la linea?
  - [ ] Ver info(nombre,distancia) como parte de la misma linea, en el centro?
- [x] Ruler no tiene linias uniendo los puntos. Debe tener claro.
- [ ] Seria interesante ver como hacer un elemento 3d que se vea siempre por encima de los demás por mas que todo rote y se tape etc.
- [ ] Info del elemento pulsado deberia seguir la rotación de la escena.

#### Bugs ####
- [ ] Si se rota mientras se hace un polígono o medida, se crea un nuevo punta al dejar de rotar porqué lo considera un click hecho
- [x] Cuando se borra un documento de poligono o medida, borrar tambien su referencia en mongodb
- [ ] Info del elemento pulsado no desaparece

#### Tareas secundarias ####
- [ ] Automatizar backups en mongodb estaria bien, por si acaso
- [ ] Free modal seguir punto pulsado o desaparecer al mover la camara
- [ ] Admin page
  - [ ] Crear un nuevo proyecto
  - [ ] Subir mesh + linkarla a un proyecto
  - [ ] Control de acceso