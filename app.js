const express = require('express') // https://expressjs.com/es/4x/api.html#res.render
const mongoose = require('mongoose') // https://mongoosejs.com/docs/guide.html
const cors = require('cors')

const app = express()
const port = 3000

// Conexión a la base de datos (mongodb 🤼‍♂️)
mongoose.connect('mongodb+srv://visivalab:japt5noop@COOD3dest@main.p4nnd.mongodb.net/database?retryWrites=true&w=majority', {
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

// Definir rutas (Poner en otro lado)
const meshController = require('./controllers/meshController')

app.get('/', (req, res) => {
  res.render('index', { title:'Visor 3D' })
})
app.get('/admin', (req, res) => {
    res.render('admin/index', { title:'Admin Page' })
})
app.get('/upload', meshController.upload)


app.listen(port, () => {
  console.log(`App en marcha -> http://localhost:${port}`)
})