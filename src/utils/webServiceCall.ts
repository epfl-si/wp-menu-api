import {error, getErrorMessage, info} from "./logger";
import * as https from "https";
import {Config} from "./configFileReader";

export async function callWebService(configFile: Config, wpVeritas: boolean, url: string, openshiftEnv: string, callBackFunction: (url: string, res: any) => any): Promise<any> {
	const path = url.replace(/^https?:\/\/(.*)\.epfl\.ch/gm, "");
	const parsedUrl = new URL(url);
	const hostname = wpVeritas ? parsedUrl.hostname : configFile.POD_NAME.concat(url.indexOf('wp-httpd') > -1 ? '' : openshiftEnv);

	if (configFile.DEBUG) {
		console.log("Info callWebService", url, parsedUrl.hostname, openshiftEnv, hostname, path);
	}
	const options = {
		hostname: hostname,
		path: wpVeritas ? '/api/v1/sites' : path,
		port: wpVeritas || configFile.LOCAL_ENV ? null : 8443,
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Host': url.indexOf('wp-httpd') > -1 ? configFile.POD_NAME : parsedUrl.hostname,
		},
		rejectUnauthorized: false
	};

	info('Start web service call', { url: url, method: 'callWebService' });
	return new Promise((resolve, reject) => {
		const req = https.request(options, (res) => {
			let data = "";

			res.setEncoding("utf8");
			res.on("data", (chunk) => {
				data += chunk;
			});

			res.on("end", () => {
				try {
					info(`End web service call`, { url: url, method: "callWebService" });
					resolve(callBackFunction(url, JSON.parse(data)));
				} catch (e) {
					error(getErrorMessage(e), { url: url });
					reject(e);
				}
			});

			res.on("error", (e) => {
				error(getErrorMessage(e), { url: url });
				reject(e);
			});
		});

		req.on("error", (e) => {
			error(getErrorMessage(e), { url: url });
			reject(e);
		});

		req.end();
	});
}
