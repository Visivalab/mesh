import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';

let renderer, scene, camera, controls;

init();

function createGui() {

    // Crear el GUI
    const gui = new GUI();
    gui.domElement.id = 'gui';

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
    let folder__layers = gui.addFolder('Layers');
    let folder__lights = gui.addFolder('Lights');

    folder__layers.add(layers,'layer_0')
        .name('Base layer');
    folder__layers.add(layers,'layer_1')
        .name('Layer 1');
    folder__layers.add(layers,'layer_2')
        .name('Layer 2');
    folder__layers.add(layers,'all')
        .name('Enable all');
    folder__layers.add(layers,'none')
        .name('Disable all');
    folder__lights.add(layers, 'sunlight')
        .name('Sunlight');

}

function createCamera(){
    
    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set( - 10, 0, 23 );
    
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
    controls.enablePan = false;
}

function createRenderer(){
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );

    //Esto y el antialias le da a saco de calidad al render, pero no sé exactamente como
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild( renderer.domElement );

}

function loadMeshes(){

    const loader = new GLTFLoader().setPath('../../mesh/');

    loader.load('test.gltf', function(test){
        console.log("Added test mesh")
        console.log(test.scene)
        test.scene.traverse( function(child) {
            child.layers.set( 2 )
            scene.add(child)
        })
        render();
    })

    loader.load('test2.gltf', function(test){
        console.log("Added test2 mesh")
        console.log(test.scene)
        //Un gltf tiene una escena con hijos, que son los elementos 3d. Cada uno de estos tambien puede tener hijos. Como un arbol de 3ds. traverse recorre todos estos hijos
        test.scene.traverse( function(child) {
            child.layers.set( 1 )
            scene.add(child)
        })
        render();
    })

    loader.load('gltf/full_mesh.glb', function(full_packed){
        console.log("Added full_mesh")
        console.log(full_packed.scene)
        full_packed.scene.traverse( function(child) {
            child.layers.set( 0 )
            scene.add(child)
        })
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