import * as THREE from 'three'; // https://threejs.org/docs/#api/en/loaders/Loader

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
//import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

let renderer, scene, camera, controls, ambientLight;
let gui;

init();

function createGui() {
  gui = document.createElement('div')
  gui.className = 'gui';
  document.querySelector('body').appendChild(gui)
  let defaultOptions = createGuiGroup('defaultOptions','')
  let layers = createGuiGroup('layers','')

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
  gui.appendChild(defaultOptions)
  
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

  document.body.appendChild( renderer.domElement );

}

function loadLayer(id,data){
  const api_loader = new GLTFLoader();
  
  // Las meshes estan comprimidas con DRACO para que pesen MUCHISIMO menos, pero se necesita el descodificador draco para cargarlas - https://threejs.org/docs/#examples/en/loaders/GLTFLoader
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('./draco/'); // Para incluir los decoders hay definida una ruta en main.js a su carpeta dentro del module three de node_modules
  api_loader.setDRACOLoader(dracoLoader); // Carga elementos de aws que agarra de la base de datos

  api_loader.load(
    data.url, 
    function(glb){
      console.group('Loading layer')
      console.log("DB layer info: ", data)
      console.log("Poner en la capa "+id)
      console.log("glb info: ", glb)

      scene.add(glb.scene)

      // Todos los hijos de la escena deben tener el layer, no vale con setear solamente la escena. traverse recorre todos los hijos
      glb.scene.traverse( function(child) {
        child.layers.set( id )
      })

      ambientLight.layers.enable( id );
      camera.layers.enable( id )

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
  fetch('/mesh')
  .then( response => {
    return response.json()
  })
  .then( result => {
    console.log("Found ", result)
    for(let i=0; i<result.length; i++){ // En un for normal porque los layers deben tener numeros del 0 al 31 - https://threejs.org/docs/#api/en/core/Layers

      let guiLayer = createGuiElement(`layer_${i}`, result[i].name, function(){
        camera.layers.toggle( i )
        render()
      })
      document.querySelector('.gui #layers').appendChild(guiLayer)

      loadLayer(i,result[i])

    }
  })
}

function init() {

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