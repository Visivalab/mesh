require('dotenv').config()

const express = require('express') // https://expressjs.com/es/4x/api.html#res.render
const bodyParser = require('body-parser')
const mongoose = require('mongoose') // https://mongoosejs.com/docs/guide.html
const cors = require('cors')

const app = express()
const port = 3000

// Conexión a la base de datos (mongodb 🤼‍♂️)
mongoose.connect(process.env.MONGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("DB Ready!")
});

// Configurar pug
app.set('views', './views')
app.set('view engine', 'pug')

// Configurar accesos a elementos estáticos
//app.use(cors())
app.use('/public', express.static('public'))
app.use('/draco', express.static('node_modules/three/examples/js/libs/draco/gltf')) // Los decoders de draco se tienen que cojer directamente del módulo de three 🤷🏻‍♂️
app.use('/bulma', express.static('node_modules/bulma'))

// Definir rutas (Poner en otro lado)
const meshController = require('./controllers/meshController')
const projectController = require('./controllers/projectController')
const polygonController = require('./controllers/polygonController')

let jsonParser = bodyParser.json()
//let urlencodedParser = bodyParser.urlencoded({ extended: false })

app.get('/view/:id', (req, res) => {
  res.render('index', { title:'Mesh view' })
})
app.get('/admin', (req, res) => {
  res.render('admin/index', { title:'Admin Page' })
})
//app.post('/api/upload', meshController.upload)
app.get('/api/projects', projectController.allProjects)
app.get('/api/project/:id', projectController.project)
//app.get('/api/mesh', meshController.getMesh)
app.post('/api/polygon/save', jsonParser, polygonController.savePolygon)
//app.get('/api/polygon/:id', polygonController.getPolygon) // Coje un poligono concreto mediante su id
app.listen(port, () => {
  console.log(`App en marcha -> http://localhost:${port}`)
})