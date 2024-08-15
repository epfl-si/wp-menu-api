import {error, getErrorMessage, info} from "./logger";
import * as https from "https";
import {Config} from "./configFileReader";

export async function callWebService(configFile: Config, wpVeritas: boolean, url: string, openshiftEnv: string, callBackFunction: (url: string, res: any) => any): Promise<any> {
	const hostname = wpVeritas ? configFile.WPVERITAS_HOSTNAME : configFile.POD_NAME + openshiftEnv;
	const path = url.replace("https://" + configFile.EPFL_HOSTNAME, "");

	const options = {
		hostname: hostname,
		path: wpVeritas ? '/api/v1/sites' : path,
		port: wpVeritas ? null : 8443,
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Host': wpVeritas ? configFile.WPVERITAS_HOSTNAME : configFile.EPFL_HOSTNAME,
		},
		rejectUnauthorized: false
	};

	info('Start web service call', { url: hostname + path, method: 'callWebService'});
	return new Promise((resolve, reject) => {
		const req = https.request(options, (res) => {
			let data = "";

			res.setEncoding("utf8");
			res.on("data", (chunk) => {
				data += chunk;
			});

			res.on("end", () => {
				try {
					info(`End web service call`, {
						url: path,
						method: "callWebService",
					});
					resolve(callBackFunction(url, JSON.parse(data)));
				} catch (e) {
					error(getErrorMessage(e), {
						url: path,
						method: "callWebService",
					});
					reject(e);
				}
			});

			res.on("error", (e) => {
				error(getErrorMessage(e), {
					url: path,
					method: "callWebService",
				});
				reject(e);
			});
		});

		req.on("error", (e) => {
			error(getErrorMessage(e), {
				url: path,
				method: "callWebService",
			});
			reject(e);
		});

		req.end();
	});
}
