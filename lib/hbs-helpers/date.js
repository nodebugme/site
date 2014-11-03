module.exports = load

function load(handlebars, settings) {
  handlebars.registerHelper('humanDate', function(date) {
    return date.getUTCFullYear() + ' ' + [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ][date.getUTCMonth()] + ' ' + date.getDate() + ([
      'th',
      'st',
      'nd',
      'rd',
      'th'
    ][date.getDate() % 9] || 'th')
  })
}
