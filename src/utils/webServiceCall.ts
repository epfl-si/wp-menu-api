import {error, getErrorMessage, info} from "./logger";
import * as https from "https";

export async function callWebService(wpVeritas: boolean, url: string, callBackFunction: (url: string, res: any) => any): Promise<any> {
	const hostname = url.indexOf("https://www.epfl.ch/labs") > -1 ? 'httpd-labs' : 'httpd-www';
	const path = url.replace("https://www.epfl.ch", "");

	const options = {
		hostname: wpVeritas ? 'wp-veritas.epfl.ch' : hostname,
		path: wpVeritas ? '/api/v1/sites' : path,
		port: wpVeritas ? null : 8443,
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Host': wpVeritas ? 'wp-veritas.epfl.ch' : "www.epfl.ch",
		}
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
