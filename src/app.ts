import express from 'express';
import * as dotenv from 'dotenv';
import {getExternalMenus, getHomepageCustomLinks, readRefreshFile, refreshFileMenu, refreshMenu} from "./menus/refresh";
import {getMenuItems} from "./menus/lists";
import fs from 'fs';
import {error, info} from "./utils/logger";

const app = express()

dotenv.config();
const servicePort: number = parseInt(process.env.SERVICE_PORT || '3001', 10);
const refreshInterval: number = parseInt(process.env.REFRESH_INTERVAL || '600000', 10);
const refreshIntervalWithFile: number = parseInt(process.env.REFRESH_INTERVAL_WITH_FILE || '1200000', 10);
const refreshFromFile: boolean =  JSON.parse(process.env.REFRESH_FROM_FILE || 'true');
const pathRefreshFile: string =  process.env.PATH_REFRESH_FILE || '.';

app.use('/menus', (req, res, next) => {
    const url = req.query.url;
    const lang = req.query.lang;

    if (!(url && typeof url === "string")) {
        error('Url parameter is missing', { url: url, method: '/menus'});
        res.status(400).json({
            status: "KO",
            result: "url parameter is missing"
        })
    } else if (!(lang && typeof lang === "string")) {
        error('Lang parameter is missing', { lang: lang, method: '/menus'});
        res.status(400).json({
            status: "KO",
            result: "lang parameter is missing"
        })
    } else {
        next();
    }
})

app.get('/menus/breadcrumb', (req, res) => {
    res.status(200).json({
        status: "OK",
        result: getMenuItems(req.query.url as string, req.query.lang as string, "breadcrumb")
    })
});

app.get('/menus/siblings', (req, res) => {
    res.status(200).json({
        status: "OK",
        result: getMenuItems(req.query.url as string, req.query.lang as string, "siblings")
    })
});

app.use('/utils', (req, res, next) => {
    const lang = req.query.lang;

    if (!(lang && typeof lang === "string")) {
        error('Lang parameter is missing', { lang: lang, method: '/utils'});
        res.status(400).json({
            status: "KO",
            result: "lang parameter is missing"
        })
    } else {
        next();
    }
})

app.get('/utils/homepageCustomLinks', (req, res) => {
    res.status(200).json({
        status: "OK",
        result: getHomepageCustomLinks(req.query.lang as string)
    })
});

app.get('/utils/externalMenus', (req, res) => {
    res.status(200).json({
        status: "OK",
        result: getExternalMenus(req.query.lang as string)
    })
});

app.listen(servicePort, async () => {
    console.log(`Server is running on port ${servicePort}`);
    info(`Server is running on port ${servicePort}`);
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
});
