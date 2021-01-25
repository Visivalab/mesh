## Visor para meshes ##

Seria interesante ver como hacer un elemento 3d que se vea siempre por encima de los demás por mas que todo rote y se tape etc.
  A medio solucionar. Creamos una escena por encima de la normal (overscene) donde añadimos los elementos que pueden ser tapados pero visibles.
  Aplicado y funcionando en las linias y puntos generados por los rulers, pero se deberia hacer de una manera que añadir o quitar algo de la scena no implique hacer manualmente
  scene.add(algo) / scene.remove(algo)
  overscene.add(algo) / overscene.remove(algo)
  sino 
  everyscene.add() / everyscene.remove()
  Tambien hay que aplicar un poco de opacidad a la overscene para que los elementos escondidos se vean menos. Provar con https://threejs.org/docs/#api/en/scenes/Fog