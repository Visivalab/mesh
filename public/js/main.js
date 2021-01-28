import * as THREE from 'three'; // https://threejs.org/docs/#api/en/loaders/Loader
import earcut from 'earcut';
import {GUI} from './gui';
import {Modal} from './modal';
import {ToolViewer} from './toolViewer';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

// Variables globales de threejs
let renderer, scene, overscene, camera, controls, ambientLight
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

// Variables globales para trabajar con shaders (el outline al pulsar un polígono)
let composer, outlinePass
// Variables globales para elementos de la interfaz que se necesitan a menudo
let container, mainGui
// Variables globales donde guardar un array con los objetos en escena, para poder verlos y modificarlos siempre
let scenePolygons = {}
let sceneRulers = {}
//let sceneMeshes = {}

let pathProjectId = document.querySelector('#projectId').textContent
let localMeshRoute = false // cambiar localMeshRoute a true para ver meshes de local en vez de las que vienen de la ruta de aws 


// Objeto que define la creación de cada modal, para poder encontrarla y editarla facilmente
// No estoy muy seguro de la utilidad o practicidad real de esto
// Además no puedo modificar o cerrar las modales desde otro lado porque no estan definidas fuera de este scope, que tampoco es del todo malo.
const modals = {
  
  
  
  
  
}
/* Módulo de CONTROL de CREACIÓN/MODIFICACIÓN/BORRAción.. de los polígonos */
const polygonModule = (function(){

  let newPolygonVertices = []
  let newPolygons = [] // Para poderlos borrar cuadno se cancela hay que guardar la instancia en algun lado
  let clickingPoints = [] // Para poderlos borrar cuando se cancela hay que guardar la instancia en algun lado
  
  function initPolygonSelection(){
    container.addEventListener('click',selectElement)

  }
  function selectElement(e){
    unhighlightAll3DObjects()
    for(let freeModal of [...document.querySelectorAll('.freeModal')]) freeModal.remove() // Quita cualquier freeModal que pueda haber por la escena

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


  function initPolygonCreation(){
    container.addEventListener('click', newPolygonPoint)
    document.querySelector('body').addEventListener('keydown', saveCreatedPolygon)
  }

  function stopPolygonCreation(){
    container.removeEventListener('click', newPolygonPoint)
    document.querySelector('body').removeEventListener('keydown', saveCreatedPolygon)
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

      let savePolygonModal = new Modal({
        id:'savePolygon',
        background: true
      })
      savePolygonModal.mount()
      savePolygonModal.write('Polígono terminado<br>Puedes ponerle un nombre:')
      savePolygonModal.addInput({ type: 'text', id: 'polygonName', name: 'polygonName', placeholder: 'Nome', focus: true })
      savePolygonModal.addInput({ type: 'text', id: 'polygonLink', name: 'polygonLink', placeholder: 'link' })
      savePolygonModal.addButton({ text:'Save', color:'green', focus: false, key: 'Enter' }, accept )
      savePolygonModal.addButton({text:'Cancel',color:'red',focus:false}, cancel )

      function accept(){
        polygonModule.savePolygonInfo()
        polygonModule.cleanPolygonCreated()
  
        savePolygonModal.close()
        render()
      }
      function cancel(){
        polygonModule.cleanPolygonCreated()
  
        savePolygonModal.close()
        render()
      }
      
    }
  }
  
  function saveUpdatedPolygon(polygon){
    let link = validateLink(document.querySelector('#newLink').value)
    fetch('/api/polygon/update',{
      method:'POST',
      body: JSON.stringify({
        id: polygon._id,
        name: document.querySelector('#newName').value,
        link
      }),
      headers:{
        'Content-Type': 'application/json'
      }
    })
    .then( res => res.json() )
    .then( resp => {
      console.log('Updated polygon', resp)
      
      // !! Se coje tal cual. Molaria hacerlo con una funcion propia del GUI. Habria que pensar el gui como el modal, como un constructor con sus cosas propias
      document.querySelector(`#polygon_${resp._id}`).remove()
      // !! No hay manera logica o facil de actualizar la capa existente ahora mismo. La solucion rapida es borrarla y meter una nueva
      // El problema es que se pone al final siempre claro
      addGUIPolygon(resp)
      
      // Cambiar data que tiene linkado el poligono en la mesh
      scenePolygons[resp._id].data.link = resp.link
      scenePolygons[resp._id].data.name = resp.name
    })
  }
  
  function deletePolygon(polygon){
    
    fetch('/api/polygon/delete',{
      method:'POST',
      body: JSON.stringify({ 
        idProject: pathProjectId,
        id: polygon._id 
      }),
      headers:{ 'Content-Type': 'application/json' }
    })
    .then( res => res.json() )
    .then( resp => {
      console.log('Deleted polygon', resp)
      
      // !! Se coje tal cual. Molaria hacerlo con una funcion propia del GUI. Habria que pensar el gui como el modal, como un constructor con sus cosas propias
      document.querySelector(`#polygon_${resp._id}`).remove()

      scene.remove(scenePolygons[resp._id].geometry)
      delete(scenePolygons[resp._id])

      render()
    })
  }
  
  function savePolygonInfo(){
    // Hay que guardar el link en un formato correcto, osea ponerle https:// si no lo tiene
    let link = validateLink(document.querySelector('#polygonLink').value)
    
    fetch('/api/polygon/save',{
      method:'POST',
      body: JSON.stringify({
        project: pathProjectId,
        points: newPolygonVertices,
        name: document.querySelector('#polygonName').value,
        link,
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
  let rulerDistances = []
  let clickingPoints = []
  let rawPoints = []

  let toolViewer_ruler

  function initRulerCreation(){
    console.log("Iniciar ruler")

    toolViewer_ruler = new ToolViewer({
      title:'Ruler',
      id: 'toolViewer_ruler'
    })
    toolViewer_ruler.mount()
    toolViewer_ruler.addHTML(`
      <li>Total: <strong><span class="rulerTotalResult">0</span>m</strong></li>
      <li>Last: <strong><span class="rulerLastResult">0</span>m</strong></li>
    `)
    
    /*toolViewer_ruler.addButton({
      text: 'Save',
      action: () => {
        stopRulerCreation()
        console.log("SAVEEEEEEE")
      }
    })*/
    toolViewer_ruler.addButton({
      text: 'Cancel (C)',
      color: 'red',
      action: () => {
        stopRulerCreation()
        console.log("CANCEL RULER")
      }
    })

    container.addEventListener('click', newRulerPoint)
    document.querySelector('body').addEventListener('keydown', saveCreatedRuler)
  }

  function stopRulerCreation(){
    for(let point of clickingPoints) scene.remove(point)
    rawPoints = []
    clickingPoints = []
    rulerDistances = []
    prevVertice = undefined

    toolViewer_ruler.close()
    render()

    container.removeEventListener('click', newRulerPoint)
    document.querySelector('body').removeEventListener('keydown', saveCreatedRuler)
  }

  function saveCreatedRuler(event){
    if(event.key === "Enter"){
      saveRuler()
      stopRulerCreation()
    }
    if(event.key === "Escape" || event.key === "c") stopRulerCreation()
  }

  function newRulerPoint(event){

    const intersects = intersections(event.clientX, event.clientY)
    let [px,py,pz] = [intersects[0].point.x, intersects[0].point.y, intersects[0].point.z]
    rawPoints.push({x:px,y:py,z:pz})

    let point = createPoint()
    clickingPoints.push(point)
    scene.add(point)

    point.position.set(px, py, pz)

    if(prevVertice){
      let geometry = generateLine(rawPoints)
      let hiddenGeometry = generateLine(rawPoints, true)
      for(let part of geometry.children) part.layers.set(31)
      for(let part of hiddenGeometry.children) part.layers.set(31)
      scene.add( geometry )
      overscene.add( hiddenGeometry )
    } 

    let distanceFromPrev = prevVertice?.distanceTo(intersects[0].point)
    prevVertice = intersects[0].point

    let totalResult = document.querySelector('.rulerTotalResult')
    let lastResult = document.querySelector('.rulerLastResult')

    if(distanceFromPrev){
      rulerDistances.push(distanceFromPrev)
      totalResult.textContent = rulerDistances.reduce((accumulator, currentValue) => accumulator + currentValue).toFixed(2)
      lastResult.textContent = distanceFromPrev.toFixed(2)
    }

    render()
  }

  function saveRuler(){
    console.log("Points to save: ", rawPoints )
    fetch('/api/ruler/save',{
      method:'POST',
      body: JSON.stringify({
        idProject: pathProjectId,
        name: 'Ruler',
        points: rawPoints,
      }),
      headers:{
        'Content-Type': 'application/json'
      }
    })
    .then( res => res.json() )
    .then( resp => {
      console.log('Ruler created', resp)
      
      addGUIRuler(resp)
    })

  }

  function saveUpdatedRuler(ruler){
    fetch('/api/ruler/update',{
      method:'POST',
      body: JSON.stringify({
        id: ruler._id,
        name: document.querySelector('#newName').value
      }),
      headers:{
        'Content-Type': 'application/json'
      }
    })
    .then( res => res.json() )
    .then( resp => {
      console.log('Updated ruler', resp)
      
      // !! Se coje tal cual. Molaria hacerlo con una funcion propia del GUI. Habria que pensar el gui como el modal, como un constructor con sus cosas propias
      document.querySelector(`#ruler_${resp._id}`).remove()
      // !! No hay manera logica o facil de actualizar la capa existente ahora mismo. La solucion rapida es borrarla y meter una nueva
      // El problema es que se pone al final siempre claro
      addGUIRuler(resp)
    })
  }

  function deleteRuler(ruler){
    // !! Cuidado, se esta borrando el ruler pero no se está quitando de la lista de rulers del proyecto
    fetch('/api/ruler/delete',{
      method:'POST',
      body: JSON.stringify({
        idProject: pathProjectId, 
        id: ruler._id 
      }),
      headers:{ 'Content-Type': 'application/json' }
    })
    .then( res => res.json() )
    .then( resp => {
      console.log('Deleted ruler', resp)
      
      // !! Se coje tal cual. Molaria hacerlo con una funcion propia del GUI. Habria que pensar el gui como el modal, como un constructor con sus cosas propias
      document.querySelector(`#ruler_${resp._id}`).remove()

      // !! Hay que quitarlo tambien del objeto scenePolygons
      //scene.remove(sceneRulers[resp._id].geometry)
      render()
    })
  }

  return{
    initRulerCreation,
    saveUpdatedRuler,
    deleteRuler
  }
})()

init();


function createCamera(){
    
  camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.set( - 40, 40, 40 );
  
  camera.layers.enable( 0 );
  scene.add( camera );

}

function toggleLayer(layerId){
  camera.layers.toggle( layerId )
  render()
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
  renderer.autoClear = false;

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
  renderer.clear();  
  composer.render(scene, camera)

  //Hacer otra scene por encima para hacer que las cosas que se esconden detras de objetos siempre esten visibles
  renderer.clearDepth();
  renderer.render( overscene, camera );
}

function init() {

  container = document.querySelector('#viewer')

  //Crear la escena con su background bien bonito
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xbfe3dd );
  // Crear la escena de ayuda que irà encima de la scene. Esto es para tener objetos que se esconden detrás de objetos siempre visibles. En overscene se meterian estos objetos que queremos siempre visibles
  overscene = new THREE.Scene();

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
  polygonModule.initPolygonSelection();
  
  ambientLight.layers.enable( 31 )
  camera.layers.enable( 31 )
  raycaster.layers.enable( 31 )
  ambientLight.layers.enable( 30 )
  camera.layers.enable( 30 )
  raycaster.layers.enable( 30 )

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
  let togglePolygonsButton = GUI.createButton( '/public/styles/icons/eye.svg','gui__button--extraSize', () => {
    toggleLayer(30)
    togglePolygonsButton.classList.toggle('off')
  })
  let addPolygonsButton = GUI.createButton( '/public/styles/icons/plus_cross.svg','gui__button--rounded', () => {
    let modalNewPolygon = new Modal({
      id: 'modalNewPolygon',
      background: true
    })
    modalNewPolygon.mount()
    modalNewPolygon.write('<strong>Click</strong> to create the polygon.<br>When done, <strong>hit enter</strong>.')
    modalNewPolygon.addButton( {text:'Ok',color:'green',focus:true}, accept )
    modalNewPolygon.addButton( {text:'Cancel',color:'red',focus:false}, cancel )

    function cancel(){
      modalNewPolygon.close()
    }
    function accept(){
      polygonModule.initPolygonCreation()
      modalNewPolygon.close()
    }
  })
  let toggleRulersButton = GUI.createButton( '/public/styles/icons/eye.svg','gui__button--extraSize', () => {
    toggleLayer(31)
    toggleRulersButton.classList.toggle('off')
  })
  let addRulerButton = GUI.createButton( '/public/styles/icons/plus_cross.svg','gui__button--rounded', rulerModule.initRulerCreation )

  GUI.add( layersGroup, mainGui )
  GUI.add( GUI.createSeparator('space'), mainGui )
  GUI.add( togglePolygonsButton, polygonsGroup )
  GUI.add( addPolygonsButton, polygonsGroup )
  GUI.add( polygonsGroup, mainGui )
  GUI.add( rulersGroup, mainGui )
  GUI.add( toggleRulersButton, rulersGroup )
  GUI.add( addRulerButton, rulersGroup )
  
  //GUI.add( GUI.createSeparator('line'), mainGui )
  //GUI.add( GUI.createBasic('enableAll','Enable all', enableAllLayers), defaultOptions )
  //GUI.add( GUI.createBasic('disableAll','Disable all', disableAllLayers), defaultOptions )
  GUI.add( defaultOptions, mainGui )

  document.querySelector('body').appendChild( mainGui );

}

function loadProject(){
  fetch('/api/project/'+pathProjectId)
  .then( response => response.json() )
  .then( project => {
    console.log(`Project: ${project._id}`, project)

    loadPolygons(project.polygons)
    loadRulers(project.rulers)
    loadMeshes(project.meshes)
  })
}

function loadMeshes(meshes){
  for(let i=0; i<meshes.length; i++){ // En un for normal porque los layers deben tener numeros del 0 al 31 - https://threejs.org/docs/#api/en/core/Layers

    let guiLayer = GUI.createBasic(`layer_${i}`, meshes[i].name, function(){
      camera.layers.toggle( i )
      guiLayer.classList.toggle('off')
      render()
    })
    GUI.add(guiLayer,'#layers .gui__group__content')

    loadSingleMesh(i,meshes[i])
  }
}

function loadPolygons(polygons){
  // Ponemos todos los poligonos en la misma capa(30) para tenerlos agrupados
  // Tambien se podran apagar de uno en uno, pero lo que hará será crear y destruir el elemento en scene

  for( let polygon of polygons ){
    addGUIPolygon(polygon)
    let geometry = generatePolygon(polygon.points)

    geometry.layers.set( 30 )

    scene.add( geometry )
    scenePolygons[polygon._id] = {
      visible: true,
      data: polygon,
      geometry
    }
  }
  render()
}

function loadRulers(rulers){

  // Ponemos todos los rulers en la misma capa (31) para tenerlos agrupados
  // Tambien se podran apagar de uno en uno, pero lo que hará será crear y destruir el elemento en scene

  for(let ruler of rulers){
    addGUIRuler(ruler)
    let geometry = generateLine(ruler.points)
    let hiddenGeometry = generateLine(ruler.points, true)
    
    // Hay que recorrer todos los childrens de geometry(porque es un grupo de meshes(cilindros)) para cambiarlos de layer
    for(let part of geometry.children) part.layers.set(31)
    for(let part of hiddenGeometry.children) part.layers.set(31)

    scene.add(geometry)
    overscene.add(hiddenGeometry)

    sceneRulers[ruler._id] = {
      visible: true,
      data: ruler,
      geometry,
      hiddenGeometry,
    }
  }
  render()
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
        let editPolyModal = new Modal({
          background: true,
          id: 'editPolyModal'
        })
        editPolyModal.mount()
        editPolyModal.addInput({ type:'text',id:'newName',name:'newName',value:polygon.name})
        editPolyModal.addInput({ type:'text',id:'newLink',name:'newLink',value:polygon.link})
        editPolyModal.addButton({ text:'Save changes',color:'green',key:'Enter'}, accept )
        editPolyModal.addButton({ text:'Delete',color:'red' }, delet )
        editPolyModal.addButton({ text:'Cancel' }, cancel )

        function accept(){
          polygonModule.saveUpdatedPolygon(polygon)
          editPolyModal.close()
        }
        function delet(){
          let confirmDelete = new Modal({
            id: 'confirmDelete'
          })
          confirmDelete.mount()
          confirmDelete.write('Sure?')
          confirmDelete.addButton({ text:'Yes',color:'red',key:'Enter' }, confirmDelet )
          confirmDelete.addButton({ text:'No',color:'green',key:'Escape' }, cancel )
          function confirmDelet(){
            polygonModule.deletePolygon(polygon)
            confirmDelete.close()
            
            document.querySelector('#editPolyModal').remove()
            document.querySelector('.modal__background').remove()
          }
          function cancel(){
            confirmDelete.close()
          }
        }
        function cancel(){
          editPolyModal.close()
        }
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
  let guiElement = GUI.createBasic(`polygon_${polygon._id}`, polygon.name, () => togglePolygon(polygon._id), guiElement_options )
  GUI.add(guiElement,'#polygons .gui__group__content')  
}

function togglePolygon(elementId){
  let polygon = scenePolygons[elementId]
  let GUIPolygon = document.querySelector(`#polygon_${elementId}`)
  
  if(polygon.visible === true ){
    scene.remove(polygon.geometry)
    polygon.visible = false
    GUIPolygon.classList.add('off')
  }else{
    scene.add(polygon.geometry)
    polygon.visible = true
    GUIPolygon.classList.remove('off')
  }
  render()
}

function toggleRuler(elementId){
  let ruler = sceneRulers[elementId]
  let GUIRuler = document.querySelector(`#ruler_${elementId}`)

  if(ruler.visible === true ){
    scene.remove(ruler.geometry)
    overscene.remove(ruler.hiddenGeometry)
    ruler.visible = false
    GUIRuler.classList.add('off')
  }else{
    scene.add(ruler.geometry)
    overscene.add(ruler.hiddenGeometry)
    ruler.visible = true
    GUIRuler.classList.remove('off')
  }
  render()
}

function addGUIRuler(ruler){
  let guiElement_options = {
    edit:{
      'name':'Edit',
      'image': '/styles/icons/menu_3puntosVertical.svg',
      'event': function(){

        let editRulerModal = new Modal({
          background: true,
          id: 'editRulerModal'
        })
        editRulerModal.mount()
        editRulerModal.addInput({ type:'text',id:'newName',name:'newName',value:ruler.name})
        editRulerModal.addButton({ text:'Save changes',color:'green',key:'Enter'}, accept )
        editRulerModal.addButton({ text:'Delete',color:'red' }, delet )
        editRulerModal.addButton({ text:'Cancel' }, cancel )

        function accept(){
          rulerModule.saveUpdatedRuler(ruler)
          editRulerModal.close()
        }
        function delet(){
          
          let confirmDelete = new Modal({
            id: 'confirmDelete'
          })
          confirmDelete.mount()
          confirmDelete.write('Sure?')
          confirmDelete.addButton({ text:'Yes',color:'red',key:'Enter' }, confirmDelet )
          confirmDelete.addButton({ text:'No',color:'green',key:'Escape' }, cancel )

          function confirmDelet(){
            rulerModule.deleteRuler(ruler)
            confirmDelete.close()

            document.querySelector('#editRulerModal').remove()
            document.querySelector('.modal__background').remove()
          }
          function cancel(){
            confirmDelete.close()
          }
        }
        function cancel(){
          editRulerModal.close()
        }

      }
    }
  }
  let guiElement = GUI.createBasic(`ruler_${ruler._id}`, ruler.name, () => toggleRuler(ruler._id), guiElement_options)
  
  GUI.add(guiElement, '#rulers .gui__group__content')
}


/* HELPERS GENERALES */

/* Genera un polígono three a partir de un array de objetos de vertices -> [{x:,y:,z:},] 
  No añade el polígono a la escena, solo crea la geometria y la devuelve para ser usada 
*/
function generatePolygon(vertices){
  let positions = []
  for(let vertice of vertices) positions.push(vertice.x, vertice.y, vertice.z)
  
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3 ) ) // El 3 es porque hay 3 componentes para cada vertice en este bufferAttribute (x,y,z). También se convierte a una TypedArray de tipo Float32Array. No sé porqué hace falta ni qué es una typedarray.
  geometry.setIndex(earcut(positions,null,3)) // earcut retorna un array con los indices de los vertices de cada triangulo - [1,0,3, 3,2,1] -
  geometry.computeVertexNormals()

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

/* Genera una linea creada con cilindros a partir de un array de objetos {x:,y:,z:} o de vector3s 
Hay que crear cilindros en lugar de línias para poder controlar el grosor y la opacidad - https://stackoverflow.com/questions/15316127/three-js-line-vector-to-cylinder
Se encarga tambien de crear los vector3 necesarios para los vertices en caso de que no se le pase un vector3*/
function generateLine(vertices, hiddenGeometry = false){
  let vector3_lineVertices = []
  let prevPoint = null
  
  for(let vertice of vertices) vector3_lineVertices.push(new THREE.Vector3( vertice.x, vertice.y, vertice.z ))

  const cylinderMesh = function (pointX, pointY, hidden = false) {
    let direction = new THREE.Vector3().subVectors(pointY, pointX);
    
    // Las líneas escondidas deben tener opacidad y un grosor ligeramente mas pequeño para que no aparezcan por encima de las no escondidas
    // Aparte de otros cambios que podamos querer como color etc
    let normalMaterial = { 
      color: 0x5B5B5B, 
      opacity: 1 
    },
    hiddenLinesMaterial = { 
      color: 0x5B5B5B, 
      opacity: 0.5, 
      transparent: true 
    },
    normalGeometry = [0.04, 0.04, direction.length(), 6, 4, true],
    hiddenLinesGeometry = [0.01, 0.01, direction.length(), 6, 4, true]
      
    let materialOptions = hidden ? hiddenLinesMaterial : normalMaterial
    let geometryOptions = hidden ? hiddenLinesGeometry : normalGeometry

    // edge from X to Y
    const material = new THREE.MeshBasicMaterial(materialOptions);
    // Make the geometry (of "direction" length)
    let geometry = new THREE.CylinderGeometry(...geometryOptions);
    // shift it so one end rests on the origin
    geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, direction.length() / 2, 0));
    // rotate it the right way for lookAt to work
    geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(THREE.Math.degToRad(90)));
    // Make a mesh with the geometry
    let mesh = new THREE.Mesh(geometry, material);
    // Position it where we want
    mesh.position.copy(pointX);
    // And make it point to where we want
    mesh.lookAt(pointY);

    return mesh;
  }
  
  const ruler = new THREE.Group();

  for(let point of vector3_lineVertices){
    if(prevPoint){
      let cil = cylinderMesh(point, prevPoint, hiddenGeometry)
      ruler.add( cil );
    }
    prevPoint = point
  }

  return ruler
}
/* Resalta el elemento 3D en la escena de three */
function highlight3DObject(object){
  outlinePass.selectedObjects = [object];
  render()
}

/* Quita el resalte a todos los elementos */
function unhighlightAll3DObjects(){
  outlinePass.selectedObjects = [];
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

const validateLink = link => {
  //!! Seguuuro que hay alguna libreria para hacer esta mierda bien
  if( /(^https:\/\/)?[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/.test( link ) ) {
    if( /^http/.test( link ) ) {
      if(/^https/.test( link )){
        return link
      }else{
        return link.replace(/^http/,'https')
      }
    }else{
      return 'https://' + link
    }
  }else{
    console.log("Invalid link")
    return
  }
}


// Abrir cerrar project info
let projectInfoB = document.querySelector('#projectInfo--button')
let projectInfo = document.querySelector('#projectInfo')
projectInfoB.addEventListener('click',()=>{
  projectInfo.classList.toggle('hidden')
})