'use strict'

const serviceStats = require('./stats')
const serviceGame = require('./game')
const serviceDeepPong = require('./deeppong')

const buildServicesConfig = () => {

  const services = {
    [serviceStats.name]: serviceStats,
    [serviceGame.name]: serviceGame,
    [serviceDeepPong.name]: serviceDeepPong,
  }
  
  // Build route map with prefix as key and service name as value
  const routeMap = {}
  
  Object.values(services).forEach(service => {
    if (service.prefix) { routeMap[service.prefix] = service.name }
  })
  
  return { services, routeMap }
}

const { services, routeMap } = buildServicesConfig()

module.exports = { services, routeMap }
