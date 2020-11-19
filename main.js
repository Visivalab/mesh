console.log("Holaa");

import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';

let stats;
let renderer, scene, camera;

init();

function init() {

    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    stats = new Stats();
    document.body.appendChild( stats.dom );

    const layers = {
        'toggle red': function () {
            camera.layers.toggle( 0 );
        },
        'toggle green': function () {
            camera.layers.toggle( 1 );
        },
        'toggle blue': function () {
            camera.layers.toggle( 2 );
        },
        'enable all': function () {
            camera.layers.enableAll();
        },
        'disable all': function () {
            camera.layers.disableAll();
        }
    };

    // Init gui
    const gui = new GUI();
    gui.add( layers, 'toggle red' );
    gui.add( layers, 'toggle green' );
    gui.add( layers, 'toggle blue' );
    gui.add( layers, 'enable all' );
    gui.add( layers, 'disable all' );

    renderer.outputEncoding = THREE.sRGBEncoding;

    // scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xbfe3dd );

    // camera
    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set( - 10, 0, 23 );
    camera.layers.enable( 0 );
    camera.layers.enable( 1 );
    camera.layers.enable( 2 );

    scene.add( camera );

    // controls
    const controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render );
    controls.minDistance = 10;
    controls.maxDistance = 5000;
    controls.enablePan = false;

    // ambient
    scene.add( new THREE.AmbientLight( 0xfcba43, .2 ) );

    // light
    const light = new THREE.PointLight( 0xffffff, 1.5 );
    light.layers.enable( 0 );
    light.layers.enable( 1 );
    light.layers.enable( 2 );

    camera.add( light );

    // model
    const loader = new GLTFLoader().setPath('./models/gltf/');
    loader.load('full_mesh.glb', function(glb){
        console.log("Added full_mesh")
        console.log(glb.scene)
        scene.add(glb.scene)
    })

    render();

    window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

    renderer.setSize( window.innerWidth, window.innerHeight );

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    render();

}

function render() {

    renderer.render( scene, camera );

}