import express from 'express';
import {
    getExternalMenus,
    getHomepageCustomLinks,
    readRefreshFile,
    refreshFileMenu,
    refreshMenu,
    configRefresh
} from "./menus/refresh";
import {getMenuItems} from "./menus/lists";
import fs from 'fs';
import {error, getErrorMessage, getHttpRequestCounter, getRegister, info} from "./utils/logger";
import {loadConfig, Config} from "./utils/configFileReader";
import {configLinks} from "./utils/links";

const app = express()
const args = process.argv.slice(2);
const configFileIndex = args.findIndex(arg => arg === '-p');
let servicePort: number = 3000;
let config: Config | undefined;
let refreshInterval: number = 600000;
let refreshIntervalWithFile: number = 1200000;
let refreshFromFile: boolean =  true;
let pathRefreshFile: string = '.';

const pjson = require('../package.json');
const version = pjson.version;

if (configFileIndex !== -1 && configFileIndex + 1 < args.length) {
    const configFilePath = args[configFileIndex + 1];
    info(`Using config file path: ${configFilePath}`);

    config = loadConfig(configFilePath);
    refreshInterval = config?.REFRESH_INTERVAL || 600000;
    refreshIntervalWithFile = config?.REFRESH_INTERVAL_WITH_FILE || 1200000;
    refreshFromFile = config?.REFRESH_FROM_FILE || true;
    pathRefreshFile = config?.PATH_REFRESH_FILE || '.';
    servicePort = config?.SERVICE_PORT || 3001;
}

app.get('/metrics', function(req, res)
{
    res.setHeader('Content-Type',getRegister().contentType)
    getRegister().metrics().then((data: string) => res.status(200).send(data))
});

app.use('/menus', (req, res, next) => {
    const url = req.query.url;
    const lang = req.query.lang;

    if (!(url && typeof url === "string")) {
        const mess = 'Url parameter is missing';
        error(mess, { url: url, method: '/menus'});
        getHttpRequestCounter().labels({method: req.method, route: "menus", lang: req.query.lang, url: req.query.url,
            statusCode: res.statusCode, message: mess}).inc();
        res.status(400).json({
            status: "KO",
            result: mess
        })
    } else if (!(lang && typeof lang === "string")) {
        const mess = 'Lang parameter is missing';
        error(mess, { lang: lang, method: '/menus'});
        getHttpRequestCounter().labels({method: req.method, route: "menus", lang: req.query.lang, url: req.query.url,
            statusCode: res.statusCode, message: mess}).inc();
        res.status(400).json({
            status: "KO",
            result: mess
        })
    } else {
        next();
    }
})

app.get('/menus/breadcrumb', (req, res) => {
    getHttpRequestCounter().labels({method: req.method, route: "breadcrumb", lang: req.query.lang, url: req.query.url,
        statusCode: res.statusCode}).inc();
    res.json({
        status: "OK",
        result: getMenuItems(req.query.url as string, req.query.lang as string, "breadcrumb")
    })
});

app.get('/menus/siblings', (req, res) => {
    getHttpRequestCounter().labels({method: req.method, route: "siblings", lang: req.query.lang, url: req.query.url,
        statusCode: res.statusCode}).inc();
    res.status(200).json({
        status: "OK",
        result: getMenuItems(req.query.url as string, req.query.lang as string, "siblings")
    })
});

app.use('/utils', (req, res, next) => {
    const lang = req.query.lang;
    const mess = 'Lang parameter is missing';
    if (!(lang && typeof lang === "string")) {
        error(mess, { lang: lang, method: '/utils'});
        getHttpRequestCounter().labels({method: req.method, route: "menus", lang: req.query.lang, url: req.query.url,
            statusCode: res.statusCode, message: mess}).inc();
        res.status(400).json({
            status: "KO",
            result: mess
        })
    } else {
        next();
    }
})

app.get('/utils/homepageCustomLinks', (req, res) => {
    getHttpRequestCounter().labels({method: req.method, route: "homepageCustomLinks", lang: req.query.lang, url: '',
        statusCode: res.statusCode}).inc();
    res.status(200).json({
        status: "OK",
        result: getHomepageCustomLinks(req.query.lang as string)
    })
});

app.get('/utils/externalMenus', (req, res) => {
    getHttpRequestCounter().labels({method: req.method, route: "externalMenus", lang: req.query.lang, url: '',
        statusCode: res.statusCode}).inc();
    res.status(200).json({
        status: "OK",
        result: getExternalMenus(req.query.lang as string)
    })
});

app.listen(servicePort, async () => {
    if (config) {
        console.log(`Menu API server version ${version} is running on port ${servicePort}`);
        info(`Menu API server version ${version} is running on port ${servicePort}`);

        configRefresh(config);
        configLinks(config);

        if (refreshFromFile) {
            info('Server running in refresh from file mode');
            if (!fs.existsSync(pathRefreshFile.concat('/menusFR.json')) ||
              !fs.existsSync(pathRefreshFile.concat('/menusEN.json')) ||
              !fs.existsSync(pathRefreshFile.concat('/menusDE.json'))) {
                await refreshFileMenu(pathRefreshFile, true);
            } else {
                readRefreshFile(pathRefreshFile);
            }
        } else {
            info('Server running in refresh from API mode');
            await refreshMenu();  //Run immediately the first time and every refreshInterval after
            setInterval(async () => await refreshMenu(), refreshInterval);
            setInterval(async () => await refreshFileMenu(pathRefreshFile, false), refreshIntervalWithFile);
        }
    } else {
        error('Please provide a configuration file path using -p', { url: '', method: 'writeRefreshFile'});
    }
});
