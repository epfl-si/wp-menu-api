const Prometheus = require('prom-client');
const register = new Prometheus.Registry();
const http_request_counter = new Prometheus.Counter({
    name: 'menu_api_http_request_count',
    help: 'Count of HTTP requests made to menu-api',
    labelNames: ['method', 'route', 'statusCode', 'lang', 'url', 'message', 'level', 'timestamp', 'wpVeritasURL',
    'openshiftEnv', 'totalSites', 'totalFilteredSiteList', 'withRefreshMemory', 'protocolHostAndPort'],
});
register.setDefaultLabels({
    app: 'menu-api'
})
Prometheus.collectDefaultMetrics({register})
register.registerMetric(http_request_counter);

export function getRegister() {
    return register;
}

export function getHttpRequestCounter() {
    return http_request_counter;
}

function log(message: string, level: string = 'info', metadata: object = {}) {
    const logObject = {
        level,
        message,
        //timestamp: new Date().toISOString(),
        ...metadata,
    };

    // Assuming sending logs to console, you can replace this with your preferred logging mechanism
    console.log(JSON.stringify(logObject));
    http_request_counter.labels(logObject).inc();
}

export function error(message: string, metadata: object = {}) {
    log(message, 'error', metadata);
}

export function warn(message: string, metadata: object = {}) {
    log(message, 'warning', metadata);
}

export function info(message: string, metadata: object = {}) {
    log(message, 'info', metadata);
}

export function getErrorMessage(e: any): string {
    let message: string = '';

    if (typeof e === "string") {
        message = e;
    } else if (e instanceof Error) {
        message = e.message;
    }

    return message;
}
