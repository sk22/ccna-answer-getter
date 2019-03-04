function client({
  SERVER,
  URL,
  UPDATE_TITLE = true,
  RESET_TITLE_TIMEOUT = 0,
  RESET_TITLE_ON_DESELECT = true,
  AUTO_CHECKBOXES = false,
  USE_INTERVAL = false,
  UPDATE_INTERVAL = 1000,
  ANSWER_REGEX,
  QUESTION_BEGINNING
}) {
  const socket = io(SERVER)

  function selectionUpdater() {
    let previousSelection
    return function updateSelection() {
      const selection = getSelection().toString()
      if (selection.length < 5) return
      if (selection !== previousSelection && selection.trim().length) {
        previousSelection = selection
        socket.emit('selection', selection.trim())
      }
    }
  }

  function resetTitle() {
    updateTitle(initialTitle, true)
  }

  function updateTitle(title, reset = false) {
    document.title = title
    if (!reset && RESET_TITLE_TIMEOUT > 0) {
      setTimeout(() => updateTitle(initialTitle, true), RESET_TITLE_TIMEOUT)
    }
  }

  function sanitize(text) {
    return text
      .replace(/\xa0/g, ' ') // nbsp
      .replace(/\u200b/g, '') // zwsp
      .replace(/’/g, "'") // weird apostrophe
      .replace(/\n/, ' ')
      .toLowerCase()
      .trim()
  }

  // function setCheckboxes(answers) {
  //   Array.from(document.querySelectorAll('.rTableOptionRow label'))
  //     .filter(label =>
  //       sanitize(answers.join('\n')).includes(sanitize(label.textContent))
  //     )
  //     .map(label => label.getAttribute('for'))
  //     .map(id => document.getElementById(id))
  //     .forEach(checkbox => (checkbox.checked = true))
  // }

  function setCheckboxes(answers) {
    Array.from(document.querySelectorAll('.coreContent label'))
      .filter(label =>
        sanitize(answers.join('\n')).includes(sanitize(label.textContent))
      )
      .map(label => label.querySelector('input'))
      .forEach(checkbox => (checkbox.checked = true))
  }

  function updateAnswer(answers) {
    console.log(answers)
    if (UPDATE_TITLE) {
      updateTitle(answers.join(', ') || 'N/A')
    }
    if (AUTO_CHECKBOXES) {
      setCheckboxes(answers)
    }
  }

  function requestAnswerKey(url) {
    socket.emit('request', url)
  }

  const initialTitle = document.title

  socket.on('answer', updateAnswer)
  socket.on('fulfilled', name => console.log(`Applied answer key "${name}"`))

  const updateSelection = selectionUpdater()
  if (USE_INTERVAL) {
    interval = setInterval(updateSelection, UPDATE_INTERVAL)
  } else {
    document.addEventListener('mouseup', updateSelection)
    if (UPDATE_TITLE && RESET_TITLE_ON_DESELECT) {
      document.addEventListener('click', resetTitle)
    }
  }

  if (ANSWER_REGEX && QUESTION_BEGINNING) {
    socket.emit('search', {
      answerRegex: ANSWER_REGEX,
      questionBeginning: QUESTION_BEGINNING,
      custom: true
    })
  }

  requestAnswerKey(URL)
}
