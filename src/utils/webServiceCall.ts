import {error, getErrorMessage, info} from "./logger";

export async function callWebService(wpVeritas: boolean, url: string, callBackFunction: (url: string, res: any) => any): Promise<any> {
	const headers: Headers = new Headers();
	headers.set('Content-Type', 'application/json');
	headers.set('Accept', 'application/json');
	headers.set('Host', 'www.epfl.ch');

	let internalUrl = url;
	if (!wpVeritas) {
		internalUrl = url.replace("https://www.epfl.ch/labs", "https://httpd-labs:8443/labs")
			.replace("https://www.epfl.ch", "https://httpd-www:8443");
	}
	info('Start web service call', { url: internalUrl, method: 'callWebService'});
	const request: RequestInfo = new Request(internalUrl, {
		method: 'GET',
		headers: headers,
		cache: 'no-cache'
	});

	try {
		const result = await fetch(request);
		if (!result.ok) {
			console.log("request: ", request, "result: ", result)
			throw new Error(`${result.status}: ${result.statusText}`);
		}
		const res =  await result.json();
		info(`End web service call`, { url: internalUrl, method: 'callWebService'});
		return callBackFunction(url, res);
	} catch ( e ) {
		error(getErrorMessage(e), { url: internalUrl, method: 'callWebService'});
		return [];
	}
}
