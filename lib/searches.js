exports['ccnav6.com'] = {
  answerRegex: /<span style="color: (?:red|#ff0000);"><strong>([\s\S]+?)<\/strong><\/span>/g,
  questionBeginning: '<li><strong>'
}

exports['ccna7.com'] = {
  answerRegex: /<span style="color: #ff0000;">([\s\S]+?)<\/span>/g,
  questionBeginning: '<li class="wpProQuiz_listItem">'
}

exports['ccnasec.com'] = {
  answerRegex: /<span style="color: blue;">([\s\S]+?)<\/span>/g,
  questionBeginning: '<li><strong>'
}

exports['invialgo.com'] = {
  answerRegex: /<strong>([\s\S]+?)<\/strong>/g,
  questionBeginning: '<li>'
}

exports['itexamanswers.net'] = {
  answerRegex: /<span style="color: red;">([\s\S]+?)<\/strong>/,
  questionBeginning: '<p><strong>'
}

exports['ccna8.com'] = exports['ccna7.com']

exports.default = exports['ccnav6.com']
