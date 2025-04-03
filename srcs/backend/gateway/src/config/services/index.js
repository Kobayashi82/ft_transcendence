'use strict'

const serviceStats = require('./stats')
const serviceGame = require('./game')
const serviceAI_DeepPong = require('./ai_deeppong')

const buildServicesConfig = () => {

  const services = {
    [serviceStats.name]: serviceStats,
    [serviceGame.name]: serviceGame,
    [serviceAI_DeepPong.name]: serviceAI_DeepPong,
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
