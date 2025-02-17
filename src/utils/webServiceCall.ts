import {error, getErrorMessage, info} from "./logger";
import * as http from "http";
import {Config} from "./configFileReader";

export async function callWebService(configFile: Config, url: string, callBackFunction: (url: string, res: any) => any): Promise<any> {
	const path = url.replace(/^https?:\/\/(.*)\.epfl\.ch/gm, "").replace(/^https?:\/\/wp-httpd/gm, "");
	const parsedUrl = new URL(url);
	const wordpressHostname = configFile.WP_SERVICE_NAME;

	if (configFile.DEBUG) {
		console.log("Info callWebService", url, parsedUrl.hostname, wordpressHostname, path);
	}

	const options = {
		hostname: wordpressHostname,
		path: path,
		port: configFile.WP_SERVICE_PORT,
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Host': parsedUrl.hostname,
		},
		rejectUnauthorized: false
	};

	info('Start web service call', { url: url, method: 'callWebService' });
	return new Promise((resolve, reject) => {
		const req = http.request(options, (res) => {
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
