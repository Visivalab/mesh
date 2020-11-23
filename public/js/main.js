import * as THREE from 'three'; // https://threejs.org/docs/#api/en/loaders/Loader

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

let renderer, scene, camera, controls;

init();

function createGui() {

    // Crear el GUI
    const gui = new GUI();
    gui.domElement.id = 'gui';
    gui.width = 220;

    // Definir las capas y sus funcionalidades
    const layers = {
        layer_0: function () {
            camera.layers.toggle( 0 );
            render();
        },
        layer_1: function () {
            camera.layers.toggle( 1 );
            render();
        },
        layer_2: function () {
            camera.layers.toggle( 2 );
            render();
        },
        all: function () {
            camera.layers.enableAll();
            render();
        },
        none: function () {
            camera.layers.disableAll();
            render();
        },
        sunlight: function (){
            camera.layers.toggle(3);
            render();
        }
    };

    // Crear estructura de carpetas y linkar cada layer a su funcionalidad
    //let folder__layers = gui.addFolder('Layers');
    //let folder__lights = gui.addFolder('Lights');

    gui.add(layers,'layer_0')
      .name('Base layer');
    gui.add(layers,'layer_1')
      .name('Layer 1');
    gui.add(layers,'layer_2')
      .name('Layer 2');
    gui.addFolder('');
    gui.add(layers,'all')
      .name('Enable all');
    gui.add(layers,'none')
      .name('Disable all');

}

function createCamera(){
    
    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set( - 1000, 1000, 1000 );
    
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

function loadMeshes(){

    const loader = new GLTFLoader().setPath('./public/meshes/');
    const aws_loader = new GLTFLoader().setPath('https://meshview.s3.eu-west-3.amazonaws.com/');
    const api_loader = new GLTFLoader();
    
    // Las meshes estan comprimidas con DRACO para que pesen MUCHISIMO menos, pero se necesita el descodificador draco para cargarlas.
    // https://threejs.org/docs/#examples/en/loaders/GLTFLoader
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./draco/'); // Para incluir los decoders hay definida una ruta en main.js a su carpeta dentro del module three de node_modules
    
    loader.setDRACOLoader(dracoLoader); // Carga elementos de la carpeta pública
    aws_loader.setDRACOLoader(dracoLoader); // Carga elementos con el link de aws
    api_loader.setDRACOLoader(dracoLoader); // Carga elementos de aws que agarra de la base de datos

    //Para cargarlo desde el json en /mesh,
    //recorrer el json(que al final deberia tener un solo elemento con layers) y obtener la url del elemento
    //Luego el api_loader tiene que usar esta url
    fetch('/mesh')
        .then( res => {
            return res.json()
        })
        .then( fi => {
            console.log("Found ",fi)
            api_loader.load(fi[0].url, function(test){
                console.log(test.scene)
                test.scene.traverse( function(child) {
                    child.layers.set( 1 )
                    scene.add(child)
                })
                render();
            });
        })

    /*aws_loader.load('test.glb', function(test){
        console.log("Added test mesh from amazon!")
        console.log(test.scene)
        test.scene.traverse( function(child) {
            child.layers.set( 1 )
            scene.add(child)
        })
        render();
    })*/

    /*loader.load('test_mesh.glb', function(test){
        console.log("Added test_mesh from local")
        console.log(test.scene)
        //Un gltf tiene una escena con hijos, que son los elementos 3d. Cada uno de estos tambien puede tener hijos. Como un arbol de 3ds. traverse recorre todos estos hijos
        test.scene.traverse( function(child) {
            child.layers.set( 2 )
            scene.add(child)
        })
        render();
    })*/

    /*loader.load('teatro_decimated_compressed.glb', function(full_packed){
        console.log("Added teatro_decimated_compressed from amazon")
        console.log(full_packed.scene)
        full_packed.scene.traverse( function(child) {
            child.layers.set( 1 )
            scene.add(child)
        })
    })*/

    /*aws_loader.load('teatro_decimated_compressed.glb', function(full_packed){
        console.log("Added teatro_decimated_compressed from amazon")
        console.log(full_packed.scene)
        full_packed.scene.traverse( function(child) {
            child.layers.set( 1 )
            scene.add(child)
        })
    })*/

    /*aws_loader.load('teatro_decimated.glb', function(full_packed){
        console.log("Added teatro_decimated from amazon")
        console.log(full_packed.scene)
        full_packed.scene.traverse( function(child) {
            child.layers.set( 2 )
            scene.add(child)
        })
    })*/
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