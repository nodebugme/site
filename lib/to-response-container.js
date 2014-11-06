module.exports = toResponseContainer

function toResponseContainer(resultObject, baseURL) {
  return {
    objects: resultObject.objects,
    meta: {
      next: (page + 1) * 10 <= count ?
        (getHost() + baseURL + '?p=' + (page + 1)) :
        null,
      prev: (page - 1) * 10 >= 0 ?
        (getHost() + baseURL + (page - 1 ? '?p=' + (page - 1) : '')) :
        null,
      count: count
    }
  }
}
