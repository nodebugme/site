module.exports = toResponseContainer

function toResponseContainer(resultObject, page, baseURL) {
  return {
    objects: resultObject.objects,
    meta: {
      next: (page + 1) * 10 <= resultObject.count ?
        (baseURL + '?p=' + (page + 1)) :
        null,
      prev: (page - 1) * 10 >= 0 ?
        (baseURL + (page - 1 ? '?p=' + (page - 1) : '')) :
        null,
      count: resultObject.count
    }
  }
}
