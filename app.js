const express = require('express')
const cors = require('cors')
const app = express()
const port = 3000

app.set('views', './views')
app.set('view engine', 'pug')

//app.use(cors())
app.use('/public', express.static('public'))
app.use('/draco', express.static('node_modules/three/examples/js/libs/draco/gltf'))

app.get('/', (req, res) => {
  res.render('index', { title:'Visor 3D' })
})

app.get('/admin', (req, res) => {
    res.render('admin/index', { title:'Admin Page' })
})

app.listen(port, () => {
  console.log(`App en marcha -> http://localhost:${port}`)
})