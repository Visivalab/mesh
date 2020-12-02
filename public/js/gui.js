export const GUI = (function(){
  
  function create(){
    let gui = document.createElement('div')
    gui.className = 'gui';
    
    return gui
  }

  function createBasic(id,name,callback = null){
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

  function createSeparator(type){
    let separator = document.createElement('div')
    if(type == 'line'){
      separator.className = 'gui__separator gui__separator--line'
    }else if(type == 'space'){
      separator.className = 'gui__separator gui__separator--space'
    }
    return separator
  }

  function createButton(icon = null, extraClass, action){
    let button = document.createElement('div')
    button.className = 'gui__button '+extraClass
    button.style.backgroundImage = `url(${icon})`
    
    button.addEventListener('click', action)

    return button
  }
  function createGroup(id,text = null, dropdownMode = false, opened = true /*,callback = null*/){
    let group = document.createElement('div')
    group.className = 'gui__group'
    group.id = id
    if(text){
      let groupTitle = document.createElement('div')
      groupTitle.className = 'gui__group__title'
      groupTitle.textContent = text
      
      if(dropdownMode){
        groupTitle.addEventListener('click', () => toggleGroup(group) )
        group.classList.add('gui__group--dropdown')
      }
      
      group.appendChild(groupTitle)
    }
    function toggleGroup(group){
      group.classList.toggle('gui__group--active')
      //console.log(group)
    }
    if(opened) toggleGroup(group)
  
    let groupContent = document.createElement('div')
    groupContent.className = 'gui__group__content'
    group.appendChild(groupContent)
  
    //group.addEventListener('click', callback)
  
    return group
  }

  function add(what,where){ 
    // Se gestiona de forma un poco cutre donde se ponen las cosas que se añaden al gui o a los elementos del gui en base a su clase
    // Esto no tiene ningun futuro puta
    
    // Si se le pasa un string en vez de un nodo, busca el id del elemento en el gui
    if(typeof where === 'string'){
      let target = document.querySelector(`.gui ${where}`)
      target.appendChild(what)
      return
    }

    if( what.classList.contains('gui__element') && where.classList.contains('gui__group') ){ // Si añadimos un elemento a un grupo tiene que ir dentro del content del grupo
      where.querySelector('.gui__group__content').appendChild(what)
    }else if( what.classList.contains('gui__button') && where.classList.contains('gui__group') ){ // Si añadimos un boton a un grupo tiene que ir al título
      where.querySelector('.gui__group__title').appendChild(what)
    }else{
      where.appendChild(what) 
    }
  }

  return{
    create,
    createBasic,
    createSeparator,
    createButton,
    createGroup,
    add
  }
})()

