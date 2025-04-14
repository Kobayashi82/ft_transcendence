'use strict'

const serviceGame = require('./game')
const serviceStats = require('./stats')
const serviceDeepPong = require('./deeppong')

const buildServicesConfig = () => {

  const services = {
    [serviceGame.name]: serviceGame,
    [serviceStats.name]: serviceStats,
    [serviceDeepPong.name]: serviceDeepPong,
  }
  
  const routeMap = {}
  
  Object.values(services).forEach(service => {
    if (service.prefix) { routeMap[service.prefix] = service.name }
  })
  
  return { services, routeMap }
}

const { services, routeMap } = buildServicesConfig()

module.exports = { services, routeMap }
