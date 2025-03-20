'use strict'

// Este archivo puede contener lógica de negocio más compleja
// que podría ser utilizada desde varias rutas

class ExampleService {
  constructor(db, redis, logger) {
    this.db = db
    this.redis = redis
    this.logger = logger
  }
  
  async processData(data) {
    this.logger.info('Procesando datos', { data })
    
    // Ejemplo de transformación de datos
    return {
      processed: true,
      originalData: data,
      timestamp: new Date().toISOString()
    }
  }
  
  async getStatistics() {
    // Ejemplo de consulta a la base de datos para estadísticas
    const totalExamples = this.db.prepare('SELECT COUNT(*) as count FROM examples').get()
    
    return {
      total: totalExamples.count,
      lastUpdated: new Date().toISOString()
    }
  }
}

module.exports = ExampleService