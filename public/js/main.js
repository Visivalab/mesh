import * as THREE from 'three'; // https://threejs.org/docs/#api/en/loaders/Loader
import earcut from 'earcut';
import {GUI} from './gui';
import {Modal} from './modal';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

// Variables globales de threejs
let renderer, scene, camera, controls, ambientLight
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

// Variables globales para trabajar con shaders (el outline al pulsar un polígono)
let composer, outlinePass
// Variables globales para elementos de la interfaz que se necesitan a menudo
let container, mainGui
// Variables globales donde guardar un array con los objetos en escena, para poder verlos y modificarlos siempre
let scenePolygons = {}
//let sceneMeshes = {}
// Variable global para guardar el id del proyecto, que viene en la url
let pathProjectId = window.location.pathname.split('/').pop()

let localMeshRoute = false // cambiar localMeshRoute a true para ver meshes de local en vez de las que vienen de la ruta de aws 

// Objeto que define la creación de cada modal, para poder encontrarla y editarla facilmente
// No estoy muy seguro de la utilidad o practicidad real de esto
// Además no puedo modificar o cerrar las modales desde otro lado porque no estan definidas fuera de este scope, que tampoco es del todo malo.
const modals = {
  'modalNewPolygon': function(){
    let modalNewPolygon = new Modal({
      id: 'modalNewPolygon',
      background: true
    })
    modalNewPolygon.mount()
    modalNewPolygon.write('<strong>Click</strong> to create the polygon.<br>When done, <strong>hit enter</strong>.')
    modalNewPolygon.addButton({text:'Ok',color:'green',focus:true}, function(){
      polygonModule.initPolygonCreation()
      modalNewPolygon.close()
    })
    modalNewPolygon.addButton({text:'Cancel',color:'red',focus:false}, function(){
      modalNewPolygon.close()
    })
  },
  'modalEditPolygon': function(polygon){
    let editPolyModal = new Modal({
      background: true,
      id: 'editPolyModal'
    })
    editPolyModal.mount()
    editPolyModal.addInput({ type:'text',id:'newName',name:'newName',value:polygon.name})
    editPolyModal.addInput({ type:'text',id:'newLink',name:'newLink',value:polygon.link})
    editPolyModal.addButton({ text:'Save changes',color:'green',key:'Enter'}, () => {
      polygonModule.saveUpdatedPolygon(polygon)
      editPolyModal.close()
    })
    editPolyModal.addButton({ text:'Delete',color:'red' }, () => {
      modals.modalConfirmDeletePolygon(polygon)
    })
    editPolyModal.addButton({ text:'Cancel' }, () => {
      editPolyModal.close()
    })
  },
  'modalConfirmDeletePolygon': function(polygon){
    let confirmDelete = new Modal({
      id: 'confirmDelete'
    })
    confirmDelete.mount()
    confirmDelete.write('Sure?')
    confirmDelete.addButton({ text:'Yes',color:'red',key:'Enter' }, () => {
      polygonModule.deletePolygon(polygon)
      confirmDelete.close()
      // !! Esto está así porqué no está referenciada la otra modal en ningun lado que pueda ir desde aquí
      document.querySelector('#editPolyModal').remove()
      document.querySelector('.modal__background').remove()
      
    })
    confirmDelete.addButton({ text:'No',color:'green',key:'Escape' }, () => {
      confirmDelete.close()
    })
  },
  'modalSavePolygon': function(){
    let savePolygonModal = new Modal({
      id:'savePolygon',
      background: true
    })
    savePolygonModal.mount()
    savePolygonModal.write('Polígono terminado<br>Puedes ponerle un nombre:')
    savePolygonModal.addInput({ type: 'text', id: 'polygonName', name: 'polygonName', placeholder: 'Nome', focus: true })
    savePolygonModal.addInput({ type: 'text', id: 'polygonLink', name: 'polygonLink', placeholder: 'link' })
    savePolygonModal.addButton({ text:'Save', color:'green', focus: false, key: 'Enter' }, function(){
      polygonModule.savePolygonInfo()
      polygonModule.cleanPolygonCreated()
      
      savePolygonModal.close()
      render()
    })
    savePolygonModal.addButton({text:'Cancel',color:'red',focus:false}, function(){
      polygonModule.cleanPolygonCreated()

      savePolygonModal.close()
      render()
    })
  }
}
/* Módulo de CONTROL de CREACIÓN/MODIFICACIÓN/BORRAción.. de los polígonos */
const polygonModule = (function(){

  let newPolygonVertices = []
  let newPolygons = [] // Para poderlos borrar cuadno se cancela hay que guardar la instancia en algun lado
  let clickingPoints = [] // Para poderlos borrar cuando se cancela hay que guardar la instancia en algun lado
  
  
  
  // !! TODO ESTO Está aquí por comodidad, no sé si deberia pertenecer aquí
  function initPolygonSelection(){
    container.addEventListener('click',selectElement)
  }
  function selectElement(e){
    const intersects = intersections(e.clientX, e.clientY)
    for(let intersected of intersects){
      if(intersected.object.sceneType === 'polygon'){
        showPolygonInfo(e.offsetX, e.offsetY, intersected.object.uuid)          
        highlight3DObject(intersected.object)
      }
    }
  }
  function closeAllFreemodals(){
    for(let freeModal of document.querySelectorAll('.freeModal')) freeModal.remove()
  }
  function showPolygonInfo(x,y,id = null){
    closeAllFreemodals()
    let freeModal = document.createElement('div')
    freeModal.className = 'freeModal'
    freeModal.style.top = `${y-50}px`
    freeModal.style.left = `${x+20}px`

    // !! poner en funcion - Traverse elementos de scenePolygons para ver cual tiene esta geometria y poder cargar su data
    let polygonData;
    for(let scenePolygonID in scenePolygons){
      if(scenePolygons[scenePolygonID].geometry.uuid === id){
        polygonData = scenePolygons[scenePolygonID].data
      }
    }
    
    // !! Pensar bien un constructor de freeModals, o aprovechar modal
    freeModal.innerHTML = `
    <h3>${polygonData.name}</h3>
    <p>...</p>
    <br>
    `
    if(polygonData.link){
      let link = document.createElement('a')
      link.href = polygonData.link
      link.target = '_blank'
      link.textContent = 'Link'

      freeModal.appendChild(link)
    }
    
    
    document.querySelector('body').appendChild(freeModal)
  }
  // !! el TODO ESTO es hasta aquí
  




  function initPolygonCreation(){
    container.addEventListener('click', newPolygonPoint)
    container.addEventListener('keypress', saveCreatedPolygon)
  }

  function stopPolygonCreation(){
    container.removeEventListener('click', newPolygonPoint)
    container.removeEventListener('keypress', saveCreatedPolygon)
  }
  
  function newPolygonPoint(event){
  
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
  
  function saveCreatedPolygon(e){
    if(e.key === "Enter"){
      stopPolygonCreation()
      modals.modalSavePolygon()
    }
  }
  
  function saveUpdatedPolygon(polygon){
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
      
      // !! Se coje tal cual. Molaria hacerlo con una funcion propia del GUI. Habria que pensar el gui como el modal, como un constructor con sus cosas propias
      document.querySelector(`#polygon_${resp._id}`).remove()
      // !! No hay manera logica o facil de actualizar la capa existente ahora mismo. La solucion rapida es borrarla y meter una nueva
      // El problema es que se pone al final siempre claro
      addGUIPolygon(resp)
    })
  }
  
  function deletePolygon(polygon){
    
    // !! Cuidado, se esta borrando el poligono pero no se está quitando de la lista de poligonos del proyecto
    fetch('/api/polygon/delete',{
      method:'POST',
      body: JSON.stringify({ id: polygon._id }),
      headers:{ 'Content-Type': 'application/json' }
    })
    .then( res => res.json() )
    .then( resp => {
      console.log('Deleted', resp)
      
      // !! Se coje tal cual. Molaria hacerlo con una funcion propia del GUI. Habria que pensar el gui como el modal, como un constructor con sus cosas propias
      document.querySelector(`#polygon_${resp._id}`).remove()

      // !! Hay que quitarlo tambien del objeto scenePolygons
      scene.remove(scenePolygons[resp._id].geometry)
      render()
    })
  }
  
  function savePolygonInfo(){
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
      loadPolygons([resp])
    })
    .catch( error => console.error(error) )
  }
  
  function cleanPolygonCreated(){
    for(let polygon of newPolygons) scene.remove(polygon)
    for(let point of clickingPoints) scene.remove(point)
    
    newPolygons = []
    newPolygonVertices = []
    clickingPoints = []
  }

  return{
    initPolygonSelection,
    cleanPolygonCreated,
    savePolygonInfo,
    deletePolygon,
    saveUpdatedPolygon,
    initPolygonCreation
  }
})()

/* RULERS MODULE */
const rulerModule = (function(){
  
  let prevVertice
  let clickingPoints = []

  function initRulerCreation(){
    console.log("Iniciar ruler")

    container.addEventListener('click', newRulerPoint)
    container.addEventListener('keypress', saveCreatedRuler)
  }

  function stopRulerCreation(){
    container.removeEventListener('click', newRulerPoint)
    container.removeEventListener('keypress', saveCreatedRuler)
  }

  function saveCreatedRuler(event){
    console.log("Perque no em detecta l'Escape? ", event)
    if(event.key === "Enter"){
      stopRulerCreation()
      //saveRuler()
    }
    if(event.key === "Escape" || event.key === "c") stopRulerCreation()
  }

  function newRulerPoint(event){

    const intersects = intersections(event.clientX, event.clientY)
    let [px,py,pz] = [intersects[0].point.x, intersects[0].point.y, intersects[0].point.z]

    let point = createPoint()
    clickingPoints.push(point)
    scene.add(point)
    point.position.set(px, py, pz)

    console.log("Intersection: ",intersects[0].point)
    let distanceFromPrev = prevVertice?.distanceTo(intersects[0].point)
    console.log(distanceFromPrev)
    prevVertice = intersects[0].point

    render()
  }

  return{
    initRulerCreation
  }
})()

init();


function createCamera(){
    
  camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.set( - 40, 40, 40 );
  
  camera.layers.enable( 0 );
  scene.add( camera );

}

function enableAllLayers(){
  camera.layers.enableAll()
  render()
}

function disableAllLayers(){
  camera.layers.disableAll()
  render()
}

function createLights(){

  ambientLight = new THREE.AmbientLight( 0xffffff, 2 );
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
  //renderer.toneMappingExposure = 1;
  //renderer.gammaOutput = true;
  //renderer.gammaFactor = 2.2;
  renderer.outputEncoding = THREE.sRGBEncoding;

  container.appendChild( renderer.domElement );

}

function createComposer(){
  /* El composer es necesario para aplicar shaders, como el outline cuando se selecciona un elemento.
  A partir de ahora, no se usa renderer para renderizar una escena, sino composer, que en uno de sus pases aplica renderer */
  // !! Hay un problema en three con el addPass (creo entender) que se carga el color de las texturas, el gamma y noseque, por eso hay que aplicar el GammaCorrectionShader 
  // https://discourse.threejs.org/t/srgbencoding-with-post-processing/12582
  // https://discourse.threejs.org/t/effect-composer-gamma-output-difference/12039
  
  composer = new EffectComposer( renderer )
  const renderPass = new RenderPass( scene, camera )
  outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera )
  const gammaCorrectionPass = new ShaderPass( GammaCorrectionShader );

  outlinePass.renderToScreen = true
  outlinePass.selectedObjects = []
  
  composer.addPass( renderPass )
  composer.addPass( outlinePass )
  composer.addPass( gammaCorrectionPass );

  let params = {
    edgeStrength: 2,
    edgeGlow: 1,
    edgeThickness: 1.0,
    pulsePeriod: 0,
    usePatternTexture: false
  };
  outlinePass.edgeStrength = params.edgeStrength;
  outlinePass.edgeGlow = params.edgeGlow;
  outlinePass.visibleEdgeColor.set(0xffffff);
  outlinePass.hiddenEdgeColor.set(0xff00ff);

}

function onWindowResize() {
  renderer.setSize( window.innerWidth, window.innerHeight ); // Actualiza el tamaño del visor

  // Actualiza el tamaño de la camara, sino los elementos se estiran y se chafan
  camera.aspect = window.innerWidth / window.innerHeight; 
  camera.updateProjectionMatrix();

  render();
}

function render() {
  //renderer.render( scene, camera );
  composer.render(scene, camera)
}

function init() {

  container = document.querySelector('#viewer')

  //Crear la escena con su background bien bonito
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xbfe3dd );

  // Configuraciones de three
  createCamera();
  createLights();
  createRenderer();
  setControls();
  createComposer();

  // Creación de la interfaz. Hay que crearla antes de cargar el proyecto porque se ponen los layers cargados dentro de ella
  createGui();
  
  // Carga de los modelos, polígonos, y todo lo que pueda tener el proyecto mas adelante
  loadProject();
  polygonModule.initPolygonSelection;
  
  // Renderizar la escena creada
  render();
  

  window.addEventListener( 'resize', onWindowResize, false );
}

function createGui(){

  mainGui = GUI.create()

  let defaultOptions = GUI.createGroup('defaultOptions')
  let layersGroup = GUI.createGroup('layers','Layers',true,true)
  let polygonsGroup = GUI.createGroup('polygons','Polygons',true,true)
  let rulersGroup = GUI.createGroup('rulers','Rulers',true,true)
  let addPolygonsButton = GUI.createButton( '/public/styles/icons/plus_cross.svg','gui__button--rounded', modals.modalNewPolygon )
  let addRulerButton = GUI.createButton( '/public/styles/icons/plus_cross.svg','gui__button--rounded', rulerModule.initRulerCreation )

  GUI.add( layersGroup, mainGui )
  GUI.add( GUI.createSeparator('space'), mainGui )
  GUI.add( addPolygonsButton, polygonsGroup )
  GUI.add( polygonsGroup, mainGui )
  GUI.add( rulersGroup, mainGui )
  GUI.add( addRulerButton, rulersGroup )
  
  GUI.add( GUI.createSeparator('line'), mainGui )
  GUI.add( GUI.createBasic('enableAll','Enable all', enableAllLayers), defaultOptions )
  GUI.add( GUI.createBasic('disableAll','Disable all', disableAllLayers), defaultOptions )
  GUI.add( defaultOptions, mainGui )

  document.querySelector('body').appendChild( mainGui );

}

function loadProject(){
  fetch('/api/project/'+pathProjectId)
  .then( response => response.json() )
  .then( project => {
    console.log(`Project: ${project._id}`, project)

    loadMeshes(project.meshes)
    loadPolygons(project.polygons)
  })
}

function loadMeshes(meshes){
  for(let i=0; i<meshes.length; i++){ // En un for normal porque los layers deben tener numeros del 0 al 31 - https://threejs.org/docs/#api/en/core/Layers

    let guiLayer = GUI.createBasic(`layer_${i}`, meshes[i].name, function(){
      camera.layers.toggle( i )
      render()
    })
    GUI.add(guiLayer,'#layers .gui__group__content')

    loadSingleMesh(i,meshes[i])
  }
}

function loadPolygons(polygons){
  for( let polygon of polygons ){
    addGUIPolygon(polygon)
    let geometry = generatePolygon(polygon.points)

    scene.add( geometry )
    scenePolygons[polygon._id] = {
      data: polygon,
      geometry
    }
  }
  console.log(scenePolygons)
}

function loadSingleMesh(id,data){
  const api_loader = new GLTFLoader();
  
  // Las meshes estan comprimidas con DRACO para que pesen MUCHISIMO menos, pero se necesita el descodificador draco para cargarlas - https://threejs.org/docs/#examples/en/loaders/GLTFLoader
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/'); // Para incluir los decoders hay definida una ruta en main.js a su carpeta dentro del module three de node_modules
  api_loader.setDRACOLoader(dracoLoader); // Carga elementos de aws que agarra de la base de datos

  api_loader.load( localMeshRoute ? '/public/meshes/cube10x10.glb' : data.url, // cambiar localMeshRoute a true para ver meshes de local en vez de las que vienen de la ruta de aws 
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

function addGUIPolygon(polygon){
  // Creamos el elemento adecuado para poner en el GUI
  let guiElement_options = {
    edit:{
      'name': 'Edit',
      'image': '/styles/icons/menu_3puntosVertical.svg',
      'event': function(){
        console.log("Open element menu")
        modals.modalEditPolygon(polygon)
      }
    }
  }
  if(polygon.link){
    guiElement_options.openLink = {
      'name': 'Open link',
      'image': '/styles/icons/link.svg',
      'event': function(){
        console.log("Open link")
        window.open(polygon.link, '_blank')
      }
    }
  }
  let guiElement = GUI.createBasic(`polygon_${polygon._id}`, polygon.name, function(){
    // No usar capas para esto, solo hay 32 layers como tal en three. Remover y añadir los poligonos tal qual
    console.log("Apagar este polygon")
  }, guiElement_options )
  // Añadimos el polígono generado a la escena
  GUI.add(guiElement,'#polygons .gui__group__content')
}


/* HELPERS GENERALES */

/* Genera un polígono three a partir de un array de objetos de vertices -> [{x:,y:,z:},] 
  No añade el polígono a la escena, solo crea la geometria y la devuelve para ser usada 
  Se usa durante la creación del polígono, pero tambien cuando se cargan todos los polígonos en la escena */
function generatePolygon(vertices){ 
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
  createdPolygon.sceneType = 'polygon' // Le añadimos esta propiedad para que quede constancia en algun lado de que es un poligono. Nos servirá para cuando se pulse con el ratón para seleccionarlo
  
  return createdPolygon
}
/* Resalta el elemento 3D en la escena de three */
function highlight3DObject(object){
  //console.log("Highlight ", object)
  outlinePass.selectedObjects = [object];
  render()
}

const intersections = (x,y) => {
  mouse.x = (x / renderer.domElement.clientWidth ) * 2 - 1
  mouse.y = - ( y / renderer.domElement.clientHeight ) * 2 + 1
  raycaster.setFromCamera( mouse, camera )

  return raycaster.intersectObjects(scene.children, true)
}

const createPoint = () => {
  const ico = new THREE.IcosahedronGeometry(0.3)
  const material = new THREE.MeshBasicMaterial( {color: 0xd9d9d9} )
  const point = new THREE.Mesh( ico, material );

  return point
}