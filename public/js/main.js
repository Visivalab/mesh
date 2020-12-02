import * as THREE from 'three'; // https://threejs.org/docs/#api/en/loaders/Loader
import earcut from 'earcut';
import {GUI} from './gui';
import {Modal} from './modal'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

let renderer, scene, camera, controls, ambientLight;
let container, mainGui;
let mesh;

let pathProjectId = window.location.pathname.split('/').pop()

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

init();

function createCamera(){
    
  camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.set( - 40, 40, 40 );
  
  camera.layers.enable( 0 );
  scene.add( camera );

}

function createLights(){

  ambientLight = new THREE.AmbientLight( 0xffffff, 1.5 );
  scene.add( ambientLight );

}

function setControls(){
  controls = new OrbitControls( camera, renderer.domElement );
  controls.addEventListener( 'change', render );
  controls.minDistance = 10;
  controls.maxDistance = 5000;
  controls.enablePan = true;
}

function createRenderer(){
    
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    physicallyCorrectLights: true 
  });
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );

  //Esto y el antialias le da a saco de calidad al render, pero no sé exactamente como
  //renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = THREE.sRGBEncoding;

  container.appendChild( renderer.domElement );

}

function onWindowResize() {
  renderer.setSize( window.innerWidth, window.innerHeight ); // Actualiza el tamaño del visor

  // Actualiza el tamaño de la camara, sino los elementos se estiran y se chafan
  camera.aspect = window.innerWidth / window.innerHeight; 
  camera.updateProjectionMatrix();

  render();
}

function render() {
  renderer.render( scene, camera );
}

function init() {

  container = document.querySelector('#viewer')
  
  container.addEventListener('click', mouseClick, false)
  container.addEventListener('keypress', keyPress)


  //Crear la escena con su background bien bonito
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xbfe3dd );

  createCamera();
  createLights();
  createRenderer();
  setControls();
  createGui()
  loadProject();

  render();
  
  window.addEventListener( 'resize', onWindowResize, false );
}

/* CREAR ELEMENTO INTERFAZ */

function createGui(){

  mainGui = GUI.create()

  let defaultOptions = GUI.createGroup('defaultOptions')
  let layersGroup = GUI.createGroup('layers','Layers',true,true)
  let polygonsGroup = GUI.createGroup('polygons','Polygons',true,true)
  let addPolygonsButton = GUI.createButton( '/public/styles/icons/plus_cross.svg','gui__button--rounded', function(e){
    e.stopPropagation()
    
    let modalNewPolygon = new Modal({
      id: 'modall',
      background: true
    })
    modalNewPolygon.mount()
    modalNewPolygon.write('<strong>Pulsa el ratón</strong> para crear el polígono.<br>Cuando termines, <strong>pulsa enter</strong>.')
    modalNewPolygon.addButton({text:'Ok',color:'green',focus:true}, function(){
      
      drawing = true;
      modalNewPolygon.close()
    
    })
    modalNewPolygon.addButton({text:'Cancel',color:'red',focus:false}, function(){
      modalNewPolygon.close()
    })
  })
  
  GUI.add( GUI.createBasic('enableAll','Enable all', function(){
    camera.layers.enableAll()
    render()
  }), defaultOptions)

  GUI.add( GUI.createBasic('disableAll','Disable all', function(){
    camera.layers.disableAll()
    render()
  }), defaultOptions)

  GUI.add(layersGroup, mainGui)
  GUI.add(GUI.createSeparator('space'), mainGui)
  GUI.add(addPolygonsButton, polygonsGroup)
  GUI.add(polygonsGroup, mainGui)
  GUI.add(GUI.createSeparator('line'), mainGui)
  GUI.add(defaultOptions, mainGui)

  document.querySelector('body').appendChild( mainGui );

}

/* CARGAR MESH */
function loadLayer(id,data){
  const api_loader = new GLTFLoader();
  
  // Las meshes estan comprimidas con DRACO para que pesen MUCHISIMO menos, pero se necesita el descodificador draco para cargarlas - https://threejs.org/docs/#examples/en/loaders/GLTFLoader
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/'); // Para incluir los decoders hay definida una ruta en main.js a su carpeta dentro del module three de node_modules
  api_loader.setDRACOLoader(dracoLoader); // Carga elementos de aws que agarra de la base de datos

  api_loader.load(
    //data.url, 
    '/public/meshes/teatro_decimated.glb',
    function(glb){
      console.group('Loading layer')
      console.log("DB layer info: ", data)
      console.log("Poner en la capa "+id)
      console.log("glb info: ", glb)

      mesh = glb.scene
      scene.add(glb.scene)

      // Todos los hijos de la escena deben tener el layer, no vale con setear solamente la escena. traverse recorre todos los hijos
      glb.scene.traverse( function(child) {
        child.layers.set( id )
      })

      ambientLight.layers.enable( id )
      camera.layers.enable( id )
      raycaster.layers.enable( id )

      render();
      console.groupEnd()
    },
    function(xhr){
      let layer = document.querySelector('#layer_'+id+' .gui__element__info')
      layer.textContent = Math.round( xhr.loaded / xhr.total * 100 ) + '%'
    },
    function(error){
      console.log( 'An error happened',error );
    }
  );

}

function loadProject(){
  
  fetch('/api/project/'+pathProjectId)
  .then( response => {
    return response.json()
  })
  .then( project => {
    console.log(`Project: ${project._id}`, project)
    
    let meshes = project.meshes;
    let polygons = project.polygons;

    // Cargar las meshes de la base de datos
    for(let i=0; i<meshes.length; i++){ // En un for normal porque los layers deben tener numeros del 0 al 31 - https://threejs.org/docs/#api/en/core/Layers

      let guiLayer = GUI.createBasic(`layer_${i}`, meshes[i].name, function(){
        camera.layers.toggle( i )
        render()
      })
      GUI.add(guiLayer,'#layers .gui__group__content')

      loadLayer(i,meshes[i])
    }

    // Cargar los polígonos
    // Como puede haber muchos poligonos, voy a reservar las capas 30 y 31 para puntos y polígonos (son las últimas ocupables)
    // O al ser poca carga, los puedo quitar y añadir de la escena en vez de apagarlos
    for( let polygon of polygons ){
      
      let optionsLayer = {
        edit:{
          'name': 'Edit',
          'image': '/styles/icons/menu_3puntosVertical.svg',
          'event': function(){
            console.log("Open element menu")
            // !! Todo esto por supuesto en una funcion aparte, pero ver bien como organizar
            let editPolyModal = new Modal({
              background: true,
              id: 'editPolyModal'
            })
            editPolyModal.mount()
            editPolyModal.addInput({ type:'text',id:'newName',name:'newName',value:polygon.name})
            editPolyModal.addInput({ type:'text',id:'newLink',name:'newLink',value:polygon.link})
            editPolyModal.addButton({ text:'Guardar cambios',color:'green',key:'Enter'}, () => {
              fetch('/api/polygon/update',{
                method:'POST',
                body: JSON.stringify({
                  id: polygon._id,
                  name: document.querySelector('#newName').value,
                  link: document.querySelector('#newLink').value,
                }),
                headers:{
                  'Content-Type': 'application/json'
                }
              })
              .then( res => res.json() )
              .then( resp => {
                console.log('Updated', resp)
                editPolyModal.close()

                // !! Update existent después de un buen refactoring, que ahora seguro repetiria cosas otra vez

              })
            })
            editPolyModal.addButton({ text:'Borrar',color:'red' }, () => {
              let confirmDelete = new Modal({
                id: 'confirmDelete'
              })
              confirmDelete.mount()
              confirmDelete.write('Seguro?')
              confirmDelete.addButton({ text:'Si',color:'red',key:'Enter'}, () => {
                fetch('/api/polygon/delete',{
                  method:'POST',
                  body: JSON.stringify({ id: polygon._id }),
                  headers:{ 'Content-Type': 'application/json' }
                })
                .then( res => res.json() )
                .then( resp => {
                  console.log('Deleted', resp)
                  editPolyModal.close()
                  confirmDelete.close()
  
                  // !! Update existent después de un buen refactoring, que ahora seguro repetiria cosas otra vez
  
                })
              })
              confirmDelete.addButton({ text:'No',color:'green',key:'Escape'}, () => {
                confirmDelete.close()
              })
            })
            editPolyModal.addButton({ text:'Cancel' }, () => {
              editPolyModal.close()
            })
          }
        }
      }
      if(polygon.link){
        optionsLayer.openLink = {
          'name': 'Open link',
          'image': '/styles/icons/link.svg',
          'event': function(){
            console.log("Open link")
            window.open(polygon.link, '_blank')
          }
        }
      }

      let guiLayer = GUI.createBasic(`polygon_${polygon.id}`, polygon.name, function(){
        // Intentar no usar capas para esto, solo hay 32 layers como tal en three
        console.log("Apagar este polygon")
      }, optionsLayer )
      
      GUI.add(guiLayer,'#polygons .gui__group__content')

      scene.add( generatePolygon(polygon.points) )

    }
  })
}


function generatePolygon(vertices){ //vertices es { x, y, z }
  let faces = []
  let geometry = new THREE.Geometry()
  let earcutVertices = []
  let geometryVertices = []
  
  for(let vertice of vertices){
    geometryVertices.push( new THREE.Vector3(vertice.x, vertice.y, vertice.z) )
    earcutVertices = earcutVertices.concat( [vertice.x, vertice.y, vertice.z] )
  }
  let triangleVertexs = earcut(earcutVertices,null,3) // earcut retorna un array con los indices de los vertices de cada triangulo - [1,0,3, 3,2,1] -

  for(let i=0; i<triangleVertexs.length; i+=3){ // Por cada 3 vertices hay crear una cara
    faces.push( new THREE.Face3( triangleVertexs[i], triangleVertexs[i+1], triangleVertexs[i+2] ) )
  }

  geometry.vertices = geometryVertices
  geometry.faces = faces
  
  geometry.computeFaceNormals();

  const color = new THREE.Color("rgb(150,50,50)")
  const geometrymaterial = new THREE.MeshStandardMaterial( { 
    color,
    side: 2,
    transparent: true,
    opacity: 0.5
  });

  let createdPolygon = new THREE.Mesh( geometry, geometrymaterial )
  return createdPolygon

}




/* DIBUJAR POLIGONOS */
let drawing = false;

const intersections = (x,y) => {
  mouse.x = (x / renderer.domElement.clientWidth ) * 2 - 1
  mouse.y = - ( y / renderer.domElement.clientHeight ) * 2 + 1
  raycaster.setFromCamera( mouse, camera )

  return raycaster.intersectObjects(scene.children, true)
}



let newPolygonVertices = []
let newPolygons = [] // Para poderlos borrar cuadno se cancela, hay que guardar la instancia en algun lado
let clickingPoints = [] // Para poderlos borrar cuando se cancela, hay que guardar la instancia en algun lado

// !! Cambiar nombre de mouseClick y keyPress para que se sepa qué hacen
function mouseClick(event){
  if(drawing === false) return

  const intersects = intersections(event.clientX, event.clientY)
  let [px,py,pz] = [intersects[0].point.x, intersects[0].point.y, intersects[0].point.z]
  
  let point = createPoint()
  clickingPoints.push(point)
  scene.add(point)
  point.position.set(px, py, pz)

  newPolygonVertices.push({x:px,y:py,z:pz})

  if(newPolygonVertices.length >= 3){ 
    let newPolygon = generatePolygon(newPolygonVertices)
    newPolygons.push(newPolygon)   

    scene.add( newPolygon )
    // !! Ver como No ir poniendo los polígonos uno encima de otro..
  }
  render()

}

function createPoint(){
  const ico = new THREE.IcosahedronGeometry(0.3)
  const material = new THREE.MeshBasicMaterial( {color: 0xd9d9d9} )
  const point = new THREE.Mesh( ico, material );

  return point
}

function keyPress(e){
  if(drawing === false) return
  
  if(e.key === "Enter"){
    drawing = false
    console.log("End polygon")
    let savePolygonModal = new Modal({
      id:'savePolygon',
      background: true
    })
    savePolygonModal.mount()
    savePolygonModal.write('Polígono terminado<br>Puedes ponerle un nombre:')
    savePolygonModal.addInput({
      type: 'text',
      id: 'polygonName',
      name: 'polygonName',
      placeholder: 'Nome',
      focus: true
    })
    savePolygonModal.addInput({
      type: 'text',
      id: 'polygonLink',
      name: 'polygonLink',
      placeholder: 'link'
    })
    savePolygonModal.addButton({
      text:'Save',
      color:'green',
      focus: false,
      key: 'Enter'
    }, function(){
      fetch('/api/polygon/save',{
        method:'POST',
        body: JSON.stringify({
          project: pathProjectId,
          points: newPolygonVertices,
          name: document.querySelector('#polygonName').value,
          link: document.querySelector('#polygonLink').value,
          color: 'green'
        }),
        headers:{
          'Content-Type': 'application/json'
        }
      })
      .then( res => res.json() )
      .then( resp => {
        
        
        
        // Añadir poligono en gui y dejarlo bien, sin puntos en los vertices etc
        // Podria añadirlo sin mas o recargar la lista
        
        // !! Esto está repetido de mas arriba. Hacer refactor de la creación de capas
        let optionsLayer = {
          edit:{
            'name': 'Edit',
            'image': '/styles/icons/menu_3puntosVertical.svg',
            'event': function(){
              console.log("Open element menu")
            }
          }
        }
        if(resp.link){
          optionsLayer.openLink = {
            'name': 'Open link',
            'image': '/styles/icons/link.svg',
            'event': function(){
              console.log("Open link")
              window.open(resp.link, '_blank')
            }
          }
        }
        let guiLayer = GUI.createBasic(`polygon_${resp._id}`, resp.name, function(){
          // Intentar no usar capas para esto, solo hay 32 layers como tal en three
          console.log("Apagar este polygon")
        }, optionsLayer )
        GUI.add(guiLayer,'#polygons .gui__group__content')


        console.log('Added',resp)
      })
      .catch( error => console.error(error) )
      
      for(let point of clickingPoints) scene.remove(point)

      newPolygonVertices = []
      clickingPoints = []
      console.log("Added polygons this session: ", newPolygons)
      
      savePolygonModal.close()
      
      render()
    })
    savePolygonModal.addButton({text:'Cancel',color:'red',focus:false}, function(){

      for(let point of clickingPoints) scene.remove(point)
      for(let polygon of newPolygons) scene.remove(polygon)
      
      newPolygonVertices = []
      clickingPoints = []
      newPolygons = []

      savePolygonModal.close()
      
      render()
    })
  }
}