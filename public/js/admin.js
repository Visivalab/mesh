console.log("ADMIN")


let projectTable = document.querySelector('#projectTable tbody')

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
    projectOptions.innerHTML = "<button class='button'>Editar</button>"
   

    projectRow.appendChild(projectName)
    projectRow.appendChild(projectEasyId)
    projectRow.appendChild(projectId)
    projectRow.appendChild(projectOptions)

    projectTable.appendChild(projectRow)
  }

  console.log(projects)
})