console.log("ADMIN")


let projectTable = document.querySelector('#projectTable tbody')


const modal = (function(){

  const modalBox = document.querySelector('.modal')
  const modalContent = modalBox.querySelector('.modal-content')
  // Init interactions
  function init(){
    modalBox.querySelector('.modal-close').addEventListener( 'click', remove )
  }
  
  const open = () => modalBox.classList.add('is-active')
  const remove = () => modalBox.classList.remove('is-active')
  
  const loadContent = async project => {
    modalBox.setAttribute('project', project)
    modalBox.querySelector('.project-title').textContent = project

    const projectInfo_call = await fetch('/api/project/'+project)
    const projectInfo = await projectInfo_call.json()

    

    for(let mesh of projectInfo.meshes){
      const dom_mesh = document.createElement('div')
      dom_mesh.className = 'project__mesh'
      dom_mesh.innerHTML = `
        <p>${mesh.name}</p>
        <input type="file" class="button is-success">
        <a class="button is-success" href="${mesh.url}">Download</a>
      `
      modalContent.querySelector('.project-mesh-list').appendChild(dom_mesh)
    }

    
  }
  init()

  return{ open, remove, loadContent }
})()


fetch('/api/projects')
.then( response => response.json() )
.then( projects => {
  for(let project of projects){

    let projectRow = document.createElement('tr')
    let projectName = document.createElement('td')
    let projectId = document.createElement('td')
    let projectEasyId = document.createElement('td')
    let projectOptions = document.createElement('td')

    projectName.textContent = project.title
    projectId.innerHTML = `<a target="_blank" href=/view/${project._id}>${project._id}</a>`
    projectEasyId.innerHTML = `<a target="_blank" href=/view/${project.easyId}>${project.easyId}</a>`
    projectOptions.innerHTML = `<button class='button'>Editar</button>`
   
    projectOptions.addEventListener('click', () => {
      modal.open()
      modal.loadContent(project._id)
    })

    projectRow.appendChild(projectName)
    projectRow.appendChild(projectEasyId)
    projectRow.appendChild(projectId)
    projectRow.appendChild(projectOptions)

    projectTable.appendChild(projectRow)
  }

  console.log(projects)
})
