import express from 'express';
import {configRefresh, getExternalMenus, getHomepageCustomLinks, refreshFileMenu} from "./menus/refresh";
import {getMenuItems} from "./menus/lists";
import fs from 'fs';
import {error, getRegister, http_request_counter, info, refresh_files_size, total_refresh_files} from "./utils/logger";
import {Config, loadConfig} from "./utils/configFileReader";
import {configLinks} from "./utils/links";
import {prometheusChecks} from "./utils/metrics";

const app = express()
const args = process.argv.slice(2);
const configFileIndex = args.findIndex(arg => arg === '-p');
let servicePort: number = 3000;
let config: Config | undefined;
let pathRefreshFile: string = '.';
const prometheusInterval: number = 10000;

const pjson = require('../package.json');
const version = pjson.version;

if (configFileIndex !== -1 && configFileIndex + 1 < args.length) {
    const configFilePath = args[configFileIndex + 1];
    info(`Using config file path: ${configFilePath}`);

    config = loadConfig(configFilePath);
    pathRefreshFile = config?.PATH_REFRESH_FILE || '.';
    servicePort = config?.SERVICE_PORT || 3001;
}

app.get('/metrics', function(req, res){
    res.setHeader('Content-Type',getRegister().contentType)
    getRegister().metrics().then((data: string) => res.status(200).send(data))
});

function sendError(mess: string, route: string, req: any, res: any) {
    http_request_counter.labels({route: route, message: mess, statusCode: 400, lang: req.query.lang as string}).inc();
    res.status(400).json({
        status: "KO",
        result: mess
    })
}

app.use('/menus', (req, res, next) => {
    const url = req.query.url;
    const lang = req.query.lang;

    if (!(url && typeof url === "string")) {
        const mess = 'Url parameter is missing';
        error(mess, { url: url, method: '/menus'});
        sendError(mess, 'menus', req, res);
    } else if (!(lang && typeof lang === "string")) {
        const mess = 'Lang parameter is missing';
        error(mess, { lang: lang, method: '/menus'});
        sendError(mess, 'menus', req, res);
    } else {
        next();
    }
})

app.get('/menus/breadcrumb', (req, res) => {
    const result = getMenuItems(
      req.query.url as string,
      req.query.lang as string,
      "breadcrumb",
      req.query.pageType as string,
      req.query.mainPostPageName as string,
      req.query.mainPostPageUrl as string,
      req.query.homePageUrl as string,
      req.query.currentPostName as string);
    let status = 200;
    if (result.errors > 0) {
        status = 500;
    }
    http_request_counter.labels({route: "breadcrumb", statusCode: status, lang: req.query.lang as string}).inc();
    res.status(status).json({
        status: status == 200 ? "OK" : "KO",
        result: result.list
    })
});

app.get('/menus/siblings', (req, res) => {
    const result = getMenuItems(
      req.query.url as string,
      req.query.lang as string,
      "siblings",
      req.query.pageType as string,
      req.query.mainPostPageName as string,
      req.query.mainPostPageUrl as string,
      req.query.homePageUrl as string,
      req.query.currentPostName as string);
    let status = 200;
    if (result.errors > 0) {
        status = 500;
    }
    http_request_counter.labels({route: "siblings", statusCode: status, lang: req.query.lang as string}).inc();
    res.status(status).json({
        status: status == 200 ? "OK" : "KO",
        result: result.list
    })
});

app.use('/utils', (req, res, next) => {
    const lang = req.query.lang;
    const mess = 'Lang parameter is missing';
    if (!(lang && typeof lang === "string")) {
        error(mess, { lang: lang, method: '/utils'});
        sendError(mess, 'utils', req, res);
    } else {
        next();
    }
})

app.get('/utils/homepageCustomLinks', (req, res) => {
    http_request_counter.labels({route: "homepageCustomLinks", statusCode: 200, lang: req.query.lang as string}).inc();
    res.status(200).json({
        status: "OK",
        result: getHomepageCustomLinks(req.query.lang as string)
    })
});

app.get('/utils/externalMenus', (req, res) => {
    http_request_counter.labels({route: "externalMenus", statusCode: 200, lang: req.query.lang as string}).inc();
    res.status(200).json({
        status: "OK",
        result: getExternalMenus(req.query.lang as string)
    })
});

app.get('/refresh', async (req, res) => {
    const statusCode = await refreshCache();
    http_request_counter.labels({route: "refresh", statusCode: statusCode}).inc();
    res.status(statusCode).json({
        status: statusCode,
        result: statusCode == 200 ? "Refresh done" : "An error occurred, see logs for details."
    })
});

app.listen(servicePort, async () => {
    const statusCode = await refreshCache();
    if (statusCode == 400) {
        error('Please provide a configuration file path using -p', { method: 'writeRefreshFile' });
    }
    setInterval(() => prometheusChecks(pathRefreshFile), prometheusInterval);
});

async function refreshCache() {
    if (config) {
        console.log(`Menu API server version ${version} is running on port ${servicePort}`);
        info(`Menu API server version ${version} is running on port ${servicePort}`);

        configRefresh(config);
        configLinks(config);

        await refreshFileMenu(pathRefreshFile);
        return 200;
    } else {
        return 400
    }
}
