import express from 'express';
import * as dotenv from 'dotenv';
import {Refresh} from "./menus/refresh";
import {Lists} from "./menus/lists";

const app = express()

dotenv.config();
const servicePort: number = parseInt(process.env.SERVICE_PORT || '3001', 10);
const isDev: boolean = process.env.IS_DEV ==='true';

app.use('/menus', (req, res, next) => {
    const url = req.query.url;
    const lang = req.query.lang;

    if (!(url && typeof url === "string")) {
        res.status(400).json({
            status: "KO",
            result: "url parameter is missing"
        })
    } else if (!(lang && typeof lang === "string")) {
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
        result: Lists.getMenuItems(req.query.url as string, req.query.lang as string, "breadcrumb")
    })
});

app.get('/menus/siblings', (req, res) => {
    res.status(200).json({
        status: "OK",
        result: Lists.getMenuItems(req.query.url as string, req.query.lang as string, "siblings")
    })
});

app.listen(servicePort, () => {
    console.log(`Server is running on port ${servicePort}`);
    Refresh.refreshMenu(isDev);//Run immediately the first time and every 10 min after
    setInterval(() => Refresh.refreshMenu(isDev), 600000);//every 10min
});
