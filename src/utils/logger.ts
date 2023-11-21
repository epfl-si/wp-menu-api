function log(message: string, level: string = 'info', metadata: object = {}) {
    const logObject = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...metadata,
    };

    // Assuming sending logs to console, you can replace this with your preferred logging mechanism
    console.log(JSON.stringify(logObject));
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

