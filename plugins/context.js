module.exports = {register: register}
register.attributes = {
  name: 'context',
  version: '1.0.0'
}

function register(plugin, options, next) {
  plugin.ext('onPreResponse', onresponse)
  options.contextHelpers = options.contextHelpers || []
  next()

  function onresponse(request, reply) {
    if (request.plugins.context &&
        !response.isBoom &&
        response.variety === 'view') {
      response.source.context = response.source.context || {}
      options.contextHelpers.forEach(function(contextHelper) {
        fn(response.source.context)
      })
    }
  }
}
