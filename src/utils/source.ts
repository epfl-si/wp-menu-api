import {Site} from "../interfaces/site";
import {error, getErrorMessage, info} from "./logger";
import {Config} from "./configFileReader";
import {CoreV1Api, CustomObjectsApi, KubeConfig} from '@kubernetes/client-node';
import fs from "fs";
import {parse} from "yaml";

export async function getSiteListFromInventory(configFile: Config, K8SPodName: string): Promise<Site[]> {
	const k8slist = await getSiteListFromKubernetes(configFile.NAMESPACE);
	const fileList = await getSiteListFromFile(configFile.PATH_SITES_FILE);
	const sites = k8slist.concat(fileList);
	return sites.map(s => new Site(s.url.replace("wp-httpd.epfl.ch", "wp-httpd")));
}

export async function getSiteListFromKubernetes(namespace: string): Promise<Site[]> {
	const items = await getKubernetesCustomResources('wordpresssites', namespace);
	const resources = items.map((item: any) => {
		const url = 'https://' + item.spec?.hostname + item.spec?.path;
		return new Site(url);
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
			return data.map(item => new Site(item));
		} else {
			error('Incorrect format in ' + filePath);
			return [];
		}
	} catch (e) {
		error('Error reading ' + filePath + ": " + getErrorMessage(e));
		return [];
	}
}
