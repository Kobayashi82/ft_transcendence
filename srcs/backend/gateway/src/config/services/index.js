'use strict'

const serviceAuth = require('./auth')

const buildServicesConfig = () => {

  const services = {
    [serviceAuth.name]: serviceAuth,
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
