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
  loadMeshes();

  render();
  
  window.addEventListener( 'resize', onWindowResize, false );
}

/* CREAR ELEMENTO INTERFAZ */
function createGui(){

  mainGui = GUI.create()

  let defaultOptions = GUI.createGroup('defaultOptions')
  let layers = GUI.createGroup('layers','Layers',true,true)
  let polygons = GUI.createGroup('polygons','Polygons',true,true)
  let addPolygonsButton = GUI.createButton( '/public/styles/icons/plus_cross.svg','gui__button--rounded', function(e){
    e.stopPropagation()
    
    let modalNewPolygon = new Modal({
      id: 'modall',
      background: true
    })
    modalNewPolygon.mount()
    modalNewPolygon.write('<strong>Pulsa el ratón</strong> para crear el polígono.<br>Cuando termines, <strong>pulsa enter</strong>.')
    modalNewPolygon.addButton({text:'Ok',color:'green',focus:true}, function(){
      
      console.log("Empezar a dibujar")
      
      /* Creo un objeto para el polígono?? 
      Solo duraria el rato que se crea, luego las coordenadas
      irian a la bbdd. 
      Pero tambien, cuando hay polígonos, se deberian cargar todos*/
      //let polygon = new Polygon({})
      drawing = true;

      modalNewPolygon.close()
    
    })
    modalNewPolygon.addButton({text:'Cancel',color:'red',focus:false}, function(){
      modalNewPolygon.close()
    })
  })
  
  GUI.add( GUI.createLayer('enableAll','Enable all', function(){
    camera.layers.enableAll()
    render()
  }), defaultOptions)

  GUI.add( GUI.createLayer('disableAll','Disable all', function(){
    camera.layers.disableAll()
    render()
  }), defaultOptions)

  GUI.add(layers, mainGui)
  GUI.add(GUI.createSeparator('space'), mainGui)
  GUI.add(addPolygonsButton, polygons)
  GUI.add(polygons, mainGui)
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

function loadMeshes(){
  
  fetch('/api/project/'+pathProjectId)
  .then( response => {
    return response.json()
  })
  .then( project => {
    console.log(`Project: ${project._id}`, project)
    
    let meshes = project.meshes;

    for(let i=0; i<meshes.length; i++){ // En un for normal porque los layers deben tener numeros del 0 al 31 - https://threejs.org/docs/#api/en/core/Layers

      let guiLayer = GUI.createLayer(`layer_${i}`, meshes[i].name, function(){
        camera.layers.toggle( i )
        render()
      })

      GUI.add(guiLayer,layers)
      
      loadLayer(i,meshes[i])

    }
  })
}


/* DIBUJAR POLIGONOS */
let drawing = false;

const intersections = (x,y) => {
  mouse.x = (x / renderer.domElement.clientWidth ) * 2 - 1
  mouse.y = - ( y / renderer.domElement.clientHeight ) * 2 + 1
  raycaster.setFromCamera( mouse, camera )

  return raycaster.intersectObjects(scene.children, true)
}

let geometryVertices = []
let earcutVertices = []
let polygon

function mouseClick(event){
  if(drawing === false) return

  const intersects = intersections(event.clientX, event.clientY)
  let [px,py,pz] = [intersects[0].point.x, intersects[0].point.y, intersects[0].point.z]
  
  let point = drawPoint()
  scene.add(point)
  point.position.set(px, py, pz)

  scene.remove(polygon)

  let geometry = new THREE.Geometry()
  let faces = []

  geometryVertices.push( new THREE.Vector3(px, py, pz) )
  earcutVertices = earcutVertices.concat( [px, py, pz] ) // Concatenamos porque earcut quiere esto : earcut([10,0,1, 0,50,2, 60,60,3, 70,10,4])

  if(geometryVertices.length >= 3){

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
    } );

    polygon = new THREE.Mesh( geometry, geometrymaterial )
    scene.add( polygon );
  }
  render()

}

function drawPoint(x,y,z){
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
          points: geometryVertices,
          name: document.querySelector('#polygonName').value,
          color: 'green'
        }),
        headers:{
          'Content-Type': 'application/json'
        }
      })
      .then( res => res.json() )
      .then( resp => {
        console.log('Added',resp)
      })
      .catch( error => console.error(error) )
      
      geometryVertices = []
      earcutVertices = []
      savePolygonModal.close()
    })
    savePolygonModal.addButton({text:'Cancel',color:'red',focus:false}, function(){
      console.log("Nada, cancelar todo")
      savePolygonModal.close()
    })
  }
}