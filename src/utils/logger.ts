import {Config} from "./configFileReader";

let errorCountInRefresh = 0;
const Prometheus = require('prom-client');
const register = new Prometheus.Registry();
const error_counter = new Prometheus.Counter({
    name: 'menu_api_errors_count',
    help: 'Count of errors obtained in menu-api',
    labelNames: ['url', 'lang', 'message'],
});
export const http_request_counter = new Prometheus.Counter({
    name: 'menu_api_http_requests_count',
    help: 'Count of HTTP requests made to menu-api',
    labelNames: ['route', 'statusCode', 'message', 'lang'],
});
export const refresh_memory_array_size = new Prometheus.Gauge({
    name: 'menu_api_menu_array_size',
    help: 'Menu array size',
    labelNames: ['arrayName']
});
export const total_retrieved_sites = new Prometheus.Gauge({
    name: 'menu_api_retrieved_sites_total',
    help: 'Number of retrieved sites per language',
    labelNames: ['lang']
});
export const total_pages = new Prometheus.Gauge({
    name: 'menu_api_pages_total',
    help: 'Number of pages per language and site',
    labelNames: ['lang', 'site']
});
export const total_posts = new Prometheus.Gauge({
    name: 'menu_api_posts_total',
    help: 'Number of posts per language and site',
    labelNames: ['lang', 'site']
});
export const total_categories = new Prometheus.Gauge({
    name: 'menu_api_categories_total',
    help: 'Number of categories per language and site',
    labelNames: ['lang', 'site']
});
export const external_detached_menus_counter = new Prometheus.Gauge({
    name: 'menu_api_external_detached_menus_total',
    help: 'Number of external detached menus',
    labelNames: ['url']
});
export const menu_api_refresh_duration_seconds = new Prometheus.Gauge({
    name: 'menu_api_refresh_duration_seconds',
    help: 'Refresh duration in seconds'
});
export const menu_api_wp_api_call_duration_seconds = new Prometheus.Gauge({
    name: 'menu_api_wp_api_call_duration_seconds',
    help: 'API call duration in seconds',
    labelNames: ['url', 'lang']
});
export const orphan_pages_counter = new Prometheus.Gauge({
    name: 'menu_api_orphan_pages_count',
    help: 'menu_api_orphan_pages_count Number of page that are not linked to any menus',
    labelNames: ['url', 'lang']
});

register.setDefaultLabels({
    app: 'menu-api'
})
Prometheus.collectDefaultMetrics({register});
register.registerMetric(http_request_counter);
register.registerMetric(error_counter);
register.registerMetric(refresh_memory_array_size);
register.registerMetric(total_retrieved_sites);
register.registerMetric(total_pages);
register.registerMetric(total_posts);
register.registerMetric(total_categories);
register.registerMetric(external_detached_menus_counter);
register.registerMetric(menu_api_refresh_duration_seconds);
register.registerMetric(menu_api_wp_api_call_duration_seconds);
register.registerMetric(orphan_pages_counter);

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
        ...metadata,
    };

    if (level == 'error' || debug) {
        console.log(new Date().toISOString(), JSON.stringify(logObject));
    }
    switch ( level ) {
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
        message = e.message;
        if (debug) {
            message = message.concat(e.stack != undefined ? " --- " + e.stack : '');
        }
    }

    return message;
}

export function increaseRefreshErrorCount() {
    errorCountInRefresh ++;
}

export function resetRefreshErrorCount() {
    errorCountInRefresh = 0;
}

export function getRefreshErrorCount() {
    return errorCountInRefresh ++;
}
