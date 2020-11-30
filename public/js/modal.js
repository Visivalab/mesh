
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

Modal.prototype.addButton = function(text,color,callback){
  let buttonElement = document.createElement('div')
  buttonElement.className = `button button--${color}`
  buttonElement.textContent = text
  buttonElement.addEventListener('click', callback)

  document.querySelector(`#${this.id} .modal__buttons`).appendChild(buttonElement)
}

Modal.prototype.close = function(){
  document.querySelector(`#${this.id}`).remove()
  if(this.background) document.querySelector('.modal__background').remove()
}