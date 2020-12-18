export function ToolViewer(options){
  this.position = options.position || 'left'
  this.title = options.title || 'Tool'
  this.id = options.id || null
}

ToolViewer.prototype.mount = function(){
  if(!this.id){
    console.error('El toolViewer no tiene id')
    return
  }
  let toolViewerElement = document.createElement('div')
  toolViewerElement.id = this.id
  toolViewerElement.className = 'toolViewer'

  document.querySelector('body').appendChild(toolViewerElement)
}

ToolViewer.prototype.addHTML = function(html){
  let section = document.createElement('div')
  section.innerHTML = html

  console.log(`#${this.id}`)
  document.querySelector(`#${this.id}`).appendChild(section)
}

ToolViewer.prototype.addButton = function(options){
  let button = document.createElement('button')
  button.textContent = options.text
  if(options.color) button.className = `button--${options.color}`
  button.addEventListener( 'click', options.action )

  document.querySelector(`#${this.id}`).appendChild(button)
}

ToolViewer.prototype.close = function(options){
  document.querySelector(`#${this.id}`).remove()
}