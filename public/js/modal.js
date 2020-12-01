export function Modal(options){
  this.background = options.background || false
  this.place = options.place || 'body'
  this.id = options.id || null
}

/* Habria alguna manera de poder hacer todo esto
pero sin linkar las cosas a una clase o id concreto?
Seria necesario en algun contexto? */

Modal.prototype.mount = function(){

  if(!this.id){
    console.error('Al crear la modal hay que pasar ID')
    return
  }
  let modalElement = document.createElement('div')
  modalElement.className = 'modal'
  modalElement.id = this.id
  let modalContent = document.createElement('div')
  modalContent.className = 'modal__content'
  let modalbuttons = document.createElement('div')
  modalbuttons.className = 'modal__buttons'

  modalElement.appendChild(modalContent)
  modalElement.appendChild(modalbuttons)

  if(this.background === true) this.createBackground()

  document.querySelector(this.place).appendChild(modalElement)
}

Modal.prototype.createBackground = function(){
  let backgroundElement = document.createElement('div')
  backgroundElement.className = 'modal__background'
  document.querySelector(this.place).appendChild(backgroundElement)
}

Modal.prototype.write = function(text){
  let modalText = document.createElement('p')
  modalText.innerHTML = text
  document.querySelector(`#${this.id} .modal__content`).appendChild(modalText)
}

Modal.prototype.addInput = function(options){
  let input = document.createElement('input')
  input.type = options.type
  input.id = options.id
  input.name = options.name
  input.placeholder = options.placeholder

  document.querySelector(`#${this.id} .modal__content`).appendChild(input)

  if(options.focus) input.focus()
}

Modal.prototype.addButton = function(options,callback){
  let buttonElement = document.createElement('button')
  buttonElement.className = `button--${options.color}`
  buttonElement.textContent = options.text
  buttonElement.addEventListener('click', callback)
  
  document.querySelector(`#${this.id} .modal__buttons`).appendChild(buttonElement)
  
  if(options.focus) buttonElement.focus()
  if(options.key) document.addEventListener('keydown', modalKeydown)

  function modalKeydown(e){
    if(options.key === e.key){
      callback()
      document.removeEventListener('keydown', modalKeydown)
    }
  }
}

Modal.prototype.close = function(){
  document.querySelector(`#${this.id}`).remove()
  if(this.background) document.querySelector('.modal__background').remove()
}