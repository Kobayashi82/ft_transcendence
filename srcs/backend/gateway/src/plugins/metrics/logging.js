'use strict'

module.exports = (promClient, serviceName) => {

  // Logs processed (from services)
  const logsProcessed = new promClient.Counter({
    name: `${serviceName}_logs_processed_total`,
    help: 'Total logs processed',
    labelNames: ['service', 'level']
  })

  //  Logs sent to Logstash
  const logsSentToLogstash = new promClient.Counter({
    name: `${serviceName}_logs_sent_to_logstash_total`,
    help: 'Total logs sent to logstash'
  })

  // Failures sending logs
  const logSendFailures = new promClient.Counter({
    name: `${serviceName}_log_send_failures_total`,
    help: 'Total failures sending logs to logstash'
  })

  // Log batch size (bytes)
  const logBatchSize = new promClient.Histogram({
    name: `${serviceName}_log_batch_size_bytes`,
    help: 'Size of log batches sent to logstash',
    buckets: [1024, 10240, 102400, 1048576, 10485760]
  })

  return {
    logsProcessed,
    logsSentToLogstash,
    logSendFailures,
    logBatchSize,
    
    recordLogsProcessed: (service, level, count = 1) => {
      logsProcessed.inc({ service, level }, count)
    },
    
    recordLogsSent: (count = 1) => {
      logsSentToLogstash.inc(count)
    },
    
    recordSendFailure: () => {
      logSendFailures.inc()
    },
    
    recordBatchSize: (sizeInBytes) => {
      logBatchSize.observe(sizeInBytes)
    }
  }
}
