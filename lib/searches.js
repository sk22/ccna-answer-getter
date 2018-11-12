exports['ccnav6.com'] = {
  answerRegex: /<span style="color: (?:red|#ff0000);"><strong>([\s\S]+?)<\/strong><\/span>/g,
  questionBeginning: '<li><strong>'
}

exports['ccna7.com'] = {
  answerRegex: /<span style="color: #ff0000;">([\s\S]+?)<\/span>/g,
  questionBeginning: '<li class="wpProQuiz_listItem">'
}

exports.default = exports['ccnav6.com']
