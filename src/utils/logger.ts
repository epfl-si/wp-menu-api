import * as url from "url";
import {Config} from "./configFileReader";

const Prometheus = require('prom-client');
const register = new Prometheus.Registry();
const error_counter = new Prometheus.Counter({
    name: 'menu_api_error_count',
    help: 'Count of errors obtained in menu-api',
    labelNames: ['url', 'lang', 'message', 'method'],
});
const info_counter = new Prometheus.Counter({
    name: 'menu_api_info_count',
    help: 'Count all the info messages in menu-api',
    labelNames: ['url', 'lang', 'message', 'method'],
});
export const http_request_counter = new Prometheus.Counter({
    name: 'menu_api_http_request_count',
    help: 'Count of HTTP requests made to menu-api',
    labelNames: ['route', 'statusCode', 'message', 'lang'],
});
export const total_refresh_files = new Prometheus.Gauge({
   name: 'menu_api_total_refresh_files',
   help: 'Check if the there are always 3 refresh files, one for each language',
   labelNames: ['fileName']
});
export const refresh_files_size = new Prometheus.Gauge({
    name: 'menu_api_refresh_files_size',
    help: 'Check the size of refresh files',
    labelNames: ['fileName']
});
export const refresh_memory_array_size = new Prometheus.Gauge({
    name: 'menu_api_refresh_memory_array_size',
    help: 'Check the size of the memory array',
    labelNames: ['arrayName']
});
export const total_WPV_sites = new Prometheus.Gauge({
    name: 'menu_api_total_WPV_sites',
    help: 'Check the number of wp veritas sites per openshift environment',
    labelNames: ['openshiftEnvironment']
});

register.setDefaultLabels({
    app: 'menu-api'
})
Prometheus.collectDefaultMetrics({register});
register.registerMetric(http_request_counter);
register.registerMetric(info_counter);
register.registerMetric(error_counter);
register.registerMetric(total_refresh_files);
register.registerMetric(refresh_files_size);
register.registerMetric(refresh_memory_array_size);
register.registerMetric(total_WPV_sites);

export function getRegister() {
    return register;
}

let debug = false;

export function configLogs(configFile: Config) {
    debug = configFile.DEBUG;
}

function log(message: string, level: string = 'info', metadata: object = {}) {
    const logObject = {
        message,
        //timestamp: new Date().toISOString(),
        ...metadata,
    };

    // Assuming sending logs to console, you can replace this with your preferred logging mechanism
    if (level == 'error' || debug) {
        console.log(JSON.stringify(logObject));
    }
    switch ( level ) {
        case 'info':
            info_counter.labels(logObject).inc();
            break;
        case 'error':
            error_counter.labels(logObject).inc();
            break;
        case 'warning':
            error_counter.labels(logObject).inc();
            break;
    }
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
        message = e.message.concat(e.stack != undefined ? "---" + e.stack : '');
    }

    return message;
}
