import * as THREE from 'three'; // https://threejs.org/docs/#api/en/loaders/Loader
import earcut from 'earcut';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
//import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

let renderer, scene, camera, controls, ambientLight;
let container, gui;
let mesh;

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

init();

function createGui() {
  gui = document.createElement('div')
  gui.className = 'gui';
  document.querySelector('body').appendChild(gui)
  let defaultOptions = createGuiGroup('defaultOptions','')
  let layers = createGuiGroup('layers','')
  let separator = createGuiSeparator()

  let enableAll = createGuiElement('enableAll','Enable all', function(){
    camera.layers.enableAll()
    render()
  })

  let disableAll = createGuiElement('disableAll','Disable all', function(){
    camera.layers.disableAll()
    render()
  })
  
  defaultOptions.appendChild(enableAll)
  defaultOptions.appendChild(disableAll)

  gui.appendChild(layers)
  gui.appendChild(separator)
  gui.appendChild(defaultOptions)
  
}

function createGuiSeparator(){
  let separator = document.createElement('div')
  separator.className = 'gui__separator'
  
  return separator
}

function createGuiGroup(id,text,callback = null){
  let group = document.createElement('div')
  group.className = 'gui__group'
  group.id = id
  group.textContent = text

  group.addEventListener('click', callback)

  return group
}

function createGuiElement(id,name,callback = null){
  let layer = document.createElement('div')
  layer.className = 'gui__element'
  layer.id = id
  layer.textContent = name
  
  let info = document.createElement('div')
  info.className = 'gui__element__info'
  layer.appendChild(info)

  layer.addEventListener('click', callback)

  return layer
}

function createCamera(){
    
  camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.set( - 100, 100, 100 );
  
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
  let pathProjectId = window.location.pathname.split('/').pop()
  
  fetch('/api/project/'+pathProjectId)
  .then( response => {
    return response.json()
  })
  .then( project => {
    console.log(`Project: ${project._id}`, project)
    
    let meshes = project.meshes;

    for(let i=0; i<meshes.length; i++){ // En un for normal porque los layers deben tener numeros del 0 al 31 - https://threejs.org/docs/#api/en/core/Layers

      let guiLayer = createGuiElement(`layer_${i}`, meshes[i].name, function(){
        camera.layers.toggle( i )
        render()
      })
      document.querySelector('.gui #layers').appendChild(guiLayer)

      loadLayer(i,meshes[i])

    }
  })
}

function init() {

  container = document.querySelector('#viewer')
  
  container.addEventListener('click', mouseClick, false)


  //Crear la escena con su background bien bonito
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xbfe3dd );

  createCamera();
  createLights();
  createRenderer();
  createGui();
  setControls();

  loadMeshes();

  render();
  
  window.addEventListener( 'resize', onWindowResize, false );
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


/* DIBUJAR POLIGONOS */

const intersections = (x,y) => {
  mouse.x = (x / renderer.domElement.clientWidth ) * 2 - 1
  mouse.y = - ( y / renderer.domElement.clientHeight ) * 2 + 1
  raycaster.setFromCamera( mouse, camera )

  return raycaster.intersectObjects(scene.children, true)
}

let geometryVertices = []
let earcutVertices = []

function mouseClick(event){
  
  const intersects = intersections(event.clientX, event.clientY)
  let [px,py,pz] = [intersects[0].point.x, intersects[0].point.y, intersects[0].point.z]
  drawPoint(px, py, pz)
  
  let geometry = new THREE.Geometry()
  let faces = []

  geometryVertices.push( new THREE.Vector3(px, py, pz) )
  earcutVertices = earcutVertices.concat( [px, py, pz] ) // Concatenamos porque earcut quiere esto : earcut([10,0,1, 0,50,2, 60,60,3, 70,10,4])

  if(earcutVertices.length >= 9){
    console.log("Draw Faces")

    console.log("Vertices", earcutVertices)

    //Pasar los puntos a earcut
    let triangleVertexs = earcut(earcutVertices,null,3)
    
    //Esto retorna un array con los puntos de los triangulos [1,0,3, 3,2,1], que podemos usar para Face3
    //Como a face3 se le pasan 3 puntos y dibuja la cara, tendria que dividir este array de triangles de 3 en 3 para irlo pasando a faces
    console.log("Triangles:", triangleVertexs)

    // Hay que hacer un bucle para que dibuje cada cara    
    // Por cada 3 triangulos hay que dibujar una cara
    for(let i=0; i<triangleVertexs.length; i+=3){

      console.log(triangleVertexs[i], triangleVertexs[i+1], triangleVertexs[i+2])
      faces.push( new THREE.Face3( triangleVertexs[i], triangleVertexs[i+1], triangleVertexs[i+2] ) )

    }
    
    geometry.vertices = geometryVertices
    geometry.faces = faces
    console.log(geometry.faces)
    geometry.computeFaceNormals();
    


    const color = new THREE.Color("rgb(150,50,50)")
    const geometrymaterial = new THREE.MeshStandardMaterial( { 
      color,
      side: 2,
      transparent: true,
      opacity: 0.5
    } );
    
    scene.add( new THREE.Mesh( geometry, geometrymaterial ) );
  }
  render()

}

//Esto un constructor para poder borrar los puntos creados
function drawPoint(x,y,z){
  const ico = new THREE.IcosahedronGeometry(0.3)
  const material = new THREE.MeshBasicMaterial( {color: 0xd9d9d9} )
  const point = new THREE.Mesh( ico, material );

  scene.add(point)
  point.position.set(x,y,z)
}