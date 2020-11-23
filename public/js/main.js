import * as THREE from 'three'; // https://threejs.org/docs/#api/en/loaders/Loader

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
//import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

let renderer, scene, camera, controls;
let gui;

init();

function createGui() {


  gui = document.createElement('div')
  gui.className = 'gui';
  document.querySelector('body').appendChild(gui)

  /*
  let layer1 = document.createElement('div')
  layer1.className = 'gui__layer'
  layer1.textContent = 'Layer 1'
  layer1.addEventListener('click', () => {
    camera.layers.toggle( 0 )
    render()
  })
  gui.appendChild(layer1)
  */
  let layer2 = document.createElement('div')
  layer2.className = 'gui__layer'
  layer2.textContent = 'Enable all'
  layer2.addEventListener('click', () => {
    camera.layers.enableAll()
    render()
  })
  gui.appendChild(layer2)

  let layer3 = document.createElement('div')
  layer3.className = 'gui__layer'
  layer3.textContent = 'Disable all'
  layer3.addEventListener('click', () => {
    camera.layers.disableAll()
    render()
  })
  gui.appendChild(layer3)

  
}

function createCamera(){
    
    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set( - 100, 100, 100 );
    
    // Ponemos la camara en cada layer
    camera.layers.enable( 0 );
    camera.layers.enable( 1 );
    camera.layers.enable( 2 );
    camera.layers.enable( 3 );

    scene.add( camera );

}

function createLights(){

    // ambient light
    const ambient = new THREE.AmbientLight( 0xfcba43, .2 );
    ambient.layers.set( 3 );

    // point light
    const sunlight = new THREE.PointLight( 0xffffff, 1.5 );
    sunlight.layers.set( 3 ); //Set hace que se ponga en esta capa y se quite de todas las demás. Enable hace que se ponga en la capa, si está en otra seguirá en la otra tambien

    scene.add( ambient );
    camera.add( sunlight ); // Esta luz sale de la camara

}

function setControls(){
    controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render );
    controls.minDistance = 10;
    controls.maxDistance = 5000;
    controls.enablePan = true;
}

function createRenderer(){
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
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

      render();
      console.groupEnd()
    },
    function(xhr){
      let layer = document.querySelector('#guiLayer_'+id)
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
        for(let i=0; i<result.length; i++){

          let layer = document.createElement('div')
          layer.id = 'guiLayer_'+i
          layer.className = 'gui__layer'
          layer.textContent = 'Layer '+i
          layer.addEventListener('click', () => {
            camera.layers.toggle( i )
            render()
          })
          gui.appendChild(layer)

          loadLayer(i,result[i])

        }
      })
}

function init() {

    console.log("Creamos la escena three")

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