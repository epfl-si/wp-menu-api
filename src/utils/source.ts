import {Site} from "../interfaces/site";
import {error, getErrorMessage, increaseRefreshErrorCount, info} from "./logger";
import {Config} from "./configFileReader";
import {callWebService} from "./webServiceCall";
import {KubeConfig, CustomObjectsApi, CoreV1Api} from '@kubernetes/client-node';
import fs from "fs";
import {parse} from "yaml";

export async function getSiteListFromInventory(configFile: Config, K8SPodName: string): Promise<Site[]> {
	const k8slist = await getSiteListFromKubernetes(configFile.NAMESPACE);
	const wpveritaslist = await getSiteListFromWPVeritas(configFile, K8SPodName);
	const fileList = await getSiteListFromFile(configFile.PATH_SITES_FILE);
	const sites = wpveritaslist.concat(k8slist).concat(fileList);
	return sites.map(s => new Site(s.url.replace("wp-httpd.epfl.ch", "wp-httpd"),s.openshiftEnv, s.wpInfra));
}

async function getSiteListFromWPVeritas(configFile: Config, K8SPodName: string): Promise<Site[]> {
	let wpVeritasURL: string = configFile.WPVERITAS_URL; // TODO filter on unmigrated sites

	try {
		return await callWebService(configFile, true, wpVeritasURL, '', K8SPodName, callBackFunctionFromWPVeritas);
	} catch (e) {
		increaseRefreshErrorCount();
		error(getErrorMessage(e), { url: wpVeritasURL });
		return [];
	}
}

export async function getSiteListFromKubernetes(namespace: string): Promise<Site[]> {
	const items = await getKubernetesCustomResources('wordpresssites', namespace);
	const resources = items.map((item: any) => {
		const url = 'https://' + item.spec?.hostname + item.spec?.path;
		return new Site(url, 'OS4', true);
	});

	return resources;
}

async function getKubernetesCustomResources (resourceType: string, namespace: string): Promise<any> {
		const kc = new KubeConfig();
		kc.loadFromDefault();
		const customObjectsApi = kc.makeApiClient(CustomObjectsApi);
		try {
			const response = await customObjectsApi.listNamespacedCustomObject({group: 'wordpress.epfl.ch', version: 'v1', namespace: namespace, plural: resourceType});
			return response.items;
		} catch (e) {
			error('Error listing custom resources: ' + getErrorMessage(e));
			return [];
		}
};

async function getKubernetesPods (namespace: string): Promise<any[]> {
	const kc = new KubeConfig();
	kc.loadFromDefault();
	const coreObjectsApi = kc.makeApiClient(CoreV1Api);
	try {
		const response = await coreObjectsApi.listNamespacedPod({ namespace: namespace });
		return response.items;
	} catch (e) {
		error('Error listing Pods: ' + getErrorMessage(e));
		return [];
	}
};

function callBackFunctionFromWPVeritas(url: string, res: any){
	const inventory: any[] = res;
	const sites = inventory.map(i =>  new Site(i.url, i.openshiftEnv, i.wpInfra));
	info(`Total sites retrieved: ${sites.length}`, { url: url, method: 'callWebService' });
	return sites;
}

export async function getK8SPodName (namespace: string): Promise<string> {
	const items = await getKubernetesPods(namespace);
	const pods = items.find((i: any) => i.metadata.name.indexOf('wp-nginx') > -1);
	if (pods) {
		info('Pod name: ' + pods.metadata.name);
		return pods.metadata.name;
	} else {
		error('Pod wp-nginx not found');
		return '';
	}
}

async function getSiteListFromFile(filePath: string): Promise<Site[]> {
	try {
		if (filePath == '' || !fs.existsSync(filePath)) {
			return [];
		}
		const fileContent = fs.readFileSync(filePath, 'utf8');
		const data = parse(fileContent);
		if (Array.isArray(data) && data.every(item => typeof item === 'string')) {
			return data.map(item => new Site(item,  'dev', true));
		} else {
			error('Incorrect format in ' + filePath);
			return [];
		}
	} catch (e) {
		error('Error reading ' + filePath + ": " + getErrorMessage(e));
		return [];
	}
}
