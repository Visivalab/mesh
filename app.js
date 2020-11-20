const express = require('express')
const app = express()
const port = 3000

app.set('views', './views')
app.set('view engine', 'pug')

app.use('/public', express.static('public'))
app.use('/mesh', express.static('mesh'));

app.get('/', (req, res) => {
  res.render('index', { title:'Admin Page' })
})

app.get('/admin', (req, res) => {
    res.render('admin/index', { title:'Admin Page' })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})