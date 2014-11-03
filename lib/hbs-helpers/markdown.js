module.exports = load

var marked = require('marked')

marked.setOptions({
  sanitize: true,
  smartypants: true,
  breaks: true, 
})

function load(handlebars, settings) {
  handlebars.registerHelper('markdown', function(text) {
    return marked(text)
  })
}
