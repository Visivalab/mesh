console.log("ADMIN")


let projectTable = document.querySelector('#projectTable tbody')

fetch('/api/projects')
.then( response => response.json() )
.then( projects => {
  for(let project of projects){

    let projectRow = document.createElement('tr')
    let projectName = document.createElement('td')
    let projectId = document.createElement('td')
    let projectOptions = document.createElement('td')

    projectName.textContent = project.title
    projectId.textContent = project._id
    projectOptions.innerHTML = "<button class='button'>Editar</button>"+
    `<a target="_blank" href=/view/${project._id}>Ver</a>`

    projectRow.appendChild(projectName)
    projectRow.appendChild(projectId)
    projectRow.appendChild(projectOptions)

    projectTable.appendChild(projectRow)
  }

  console.log(projects)
})