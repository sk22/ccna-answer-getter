const express = require('express')
const app = express()

const http = require('http').Server(app)
const io = require('socket.io')(http)
const fs = require('fs')
const fetch = require('node-fetch')

const answerKeys = new Map()
const answerFile = process.argv.length === 3 ? process.argv[2] : 'answers.html'
const clientScript = fs.readFileSync('client.js')


app.use(express.static('public'))

const defaultUrl =
  'https://ccnav6.com/ccna-3-final-exam-answers-2017-v5-0-3v6-0-scaling-networks.html'

const shortReadme = `Press Ctrl+A, Ctrl+C and paste it into the assessment's console.
You can access the console inside the assessment by pressing Ctrl+Shift+I or F12.
Then, select a question and the answer will be displayed in the website's title
(at the top of the browser window).`

const sendIndexText = (req, res) => {
  res.set('Content-Type', 'text/plain')
  const protocol = req.hostname === 'localhost' ? 'http' : 'https'
  res.send(
    `// ${shortReadme.split('\n').join('\n// ')}\n\n` +
      `let server = '${protocol}://${req.headers.host}'\n` +
      `let url = '${req.query.url || defaultUrl}'\n\n` +
      clientScript
  )
}

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
app.get('/script', sendIndexText)

app.get('/answer', (req, res) => {
  const { url, query } = req.query
  if (url && query) {
    getAnswerKey(url).then(answerKey => {
      const answer = getAnswers(answerKey, query)
      res.json(answer)
    })
  } else {
    res.send('Request incomplete')
  }
})

if (fs.existsSync(answerFile)) {
  const answerKey = fs.readFileSync(answerFile).toString()
  addAnswerKey('default', answerKey)
}

function getAnswerKeyName(text) {
  return /<title>(.*)<\/title>/.exec(text)[1]
}

function addAnswerKey(key, value) {
  console.log(
    `answer key "${getAnswerKeyName(value)}" ` + `loaded\n  (id: "${key}")`
  )
  answerKeys.set(key, value.replace(/\s+/g, ' '))
}

async function getAnswerKey(url) {
  if (answerKeys.has(url)) {
    return answerKeys.get(url)
  } else {
    const res = await fetch(url)
    if (res.status !== 200) {
      console.error(res)
      return ''
    }
    const text = await res.text()
    addAnswerKey(url, text)
    return text
  }
}

function getAnswers(answerKey, selection) {
  const startIndex = answerKey.indexOf(selection)
  const htmlFromStartIndex = answerKey.slice(startIndex)
  const endIndex = htmlFromStartIndex.indexOf('<li><strong>')
  const answerHtml = htmlFromStartIndex.slice(0, endIndex)
  const regex = /<span style="color: red;"><strong>(.*?)<\/strong><\/span>/g
  const matches = []
  let match
  do {
    match = regex.exec(answerHtml)
    if (match) matches.push(match[1])
  } while (match !== null)
  console.log(selection, matches)
  return matches
}

io.on('connection', socket => {
  console.log('a user connected')
  let answerKey = answerKeys.get('default') || ''

  socket.on('request', async url => {
    answerKey = await getAnswerKey(url)
    console.log(`answer key "${url}" loaded for user "${socket.id}"`)
    socket.emit('fulfilled', getAnswerKeyName(answerKey))
  })

  socket.on('selection', selection => {
    const answers = getAnswers(answerKey, selection)
    if (answers) {
      socket.emit('answer', answers)
    } else {
      socket.emit('answer', "Answer key didn't load")
    }
  })
})

http.listen(3000, function() {
  console.log('server listening on *:3000')
})
