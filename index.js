const express = require('express')
const app = express()
const { parse } = require('url')

const http = require('http').Server(app)
const io = require('socket.io')(http)
const fs = require('fs')
const fetch = require('node-fetch')
const { fromString: htmlToText } = require('html-to-text')
const searches = require('./lib/searches')

const answerKeys = new Map()
const answerFile = process.argv.length === 3 ? process.argv[2] : 'answers.html'

app.use(express.static('public'))

const shortReadme = `Press Ctrl+A, Ctrl+C and paste it into the assessment's console.
You can access the console inside the assessment by pressing Ctrl+Shift+I or F12.
Then, select a question and the answer will be displayed in the website's title
(at the top of the browser window).`

const booleanCheckbox = onOff => (onOff === 'on' ? true : false)

const sendIndexText = (req, res) => {
  res.set('Content-Type', 'text/plain')
  const protocol = req.hostname === 'localhost' ? 'http' : 'https'
  console.log(req.query.update_interval)
  const config = {
    SERVER: `${protocol}://${req.headers.host}`,
    URL: `${req.query.url}`,
    UPDATE_TITLE: booleanCheckbox(req.query.update_title),
    RESET_TITLE_TIMEOUT: Number(req.query.reset_title_timeout || NaN),
    RESET_TITLE_ON_DESELECT: booleanCheckbox(req.query.reset_title_on_deselect),
    AUTO_CHECKBOXES: booleanCheckbox(req.query.auto_checkboxes),
    USE_INTERVAL: booleanCheckbox(req.query.use_interval),
    UPDATE_INTERVAL: Number(req.query.update_interval || NaN),
    ANSWER_REGEX: req.query.answer_regex,
    QUESTION_BEGINNING: req.query.question_beginning
  }

  const clientScript = fs.readFileSync('lib/client.js')
  const socketioScript = fs.readFileSync('lib/socketio.min.js')
  res.send(
    `// ${shortReadme.split('\n').join('\n// ')}\n\n` +
      `config = ${JSON.stringify(config, null, 2)}\n\n` +
      clientScript +
      socketioScript +
      `CLIENT = client(config)`
  )
}

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
app.get('/script', sendIndexText)

app.get('/answer', (req, res) => {
  const { url, query } = req.query
  if (url && query) {
    getAnswerKey(url).then(answerKey => {
      const answer = getAnswers(url, answerKey, query, getSearch(url))
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

function sanitize(text) {
  return text
    .replace(/’/g, "'")
    .replace(/\n/, ' ')
    .trim()
}

function getHostname(url) {
  const fullHostname = parse(url).hostname
  return fullHostname.startsWith('www.')
    ? fullHostname.slice('www.'.length)
    : fullHostname
}

function getSearch(url) {
  return searches[getHostname(url)] || searches.default
}

function getAnswers(url, answerKey, selection, search) {
  const firstQuestionIndex = answerKey.indexOf(search.questionBeginning)
  const htmlFromFirstQuestion = answerKey.slice(firstQuestionIndex)
  const questionStartIndex =
    htmlFromFirstQuestion.indexOf(selection) + firstQuestionIndex
  const htmlFromStartIndex = answerKey.slice(questionStartIndex)
  const endIndex = htmlFromStartIndex.indexOf(search.questionBeginning)
  const answerHtml = htmlFromStartIndex.slice(0, endIndex)
  const regex = search.answerRegex
  const matches = []
  let match

  do {
    match = regex.exec(answerHtml)
    if (match) matches.push(match[1])
  } while (match !== null)
  const answers = matches.map(htmlToText).map(sanitize)
  console.log(url, selection, answers)
  return answers
}

io.on('connection', socket => {
  console.log('a user connected')
  let answerKey = answerKeys.get('default') || ''
  let url = ''
  let search = searches.default

  function applySearch({ answerRegex, questionBeginning, custom }) {
    search = {
      answerRegex: new RegExp(answerRegex, 'g'),
      questionBeginning,
      custom
    }
    console.log('search parameters applied: ', search)
  }

  socket.on('debug', text =>
    console.debug(`DEBUG [${socket.id}] [${url}]`, text)
  )

  socket.on('request', async u => {
    url = u
    if (!search.custom) applySearch(getSearch(url))

    answerKey = await getAnswerKey(u)
    console.log(`answer key "${u}" loaded for user "${socket.id}"`)
    socket.emit('fulfilled', getAnswerKeyName(answerKey))
  })

  socket.on('selection', selection => {
    if (selection.length < 5) return
    const answers = getAnswers(url, answerKey, selection, search)
    if (answers) {
      socket.emit('answer', answers)
    } else {
      socket.emit('answer', "Answer key didn't load")
    }
  })

  socket.on('search', applySearch)
})

http.listen(3000, function() {
  console.log('server listening on *:3000')
})
