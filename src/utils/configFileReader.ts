import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {error, getErrorMessage} from "./logger";

export interface Config {
  OPENSHIFT_ENV: string;
  WPVERITAS_URL: string;
  MENU_API_PROTOCOL_HOST_PORT: string;
  SERVICE_PORT: number;
  REFRESH_INTERVAL: number;
  NODE_TLS_REJECT_UNAUTHORIZED: number;
  REFRESH_INTERVAL_WITH_FILE: number;
  REFRESH_FROM_FILE: boolean;
  PATH_REFRESH_FILE: string;
  REST_URL_END: string;
  LABS_LINK_URL_FR: string;
  LABS_LINK_URL_EN: string;
  ASSOC_BREADCRUMB_EN: string;
  ASSOC_BREADCRUMB_FR: string;
  MENU_BAR_LINKS_EN: string;
  MENU_BAR_LINKS_FR: string;
  MENU_BAR_LINKS_DE: string;
}

interface ConfigMapData {
  data: Config;
}

export function loadConfig(configFilePath: any): Config | undefined {
  try {
    const configFile = fs.readFileSync(configFilePath, 'utf8');
    const parsedConfig = yaml.load(configFile) as ConfigMapData;
    if (parsedConfig && parsedConfig.data) {
      return parsedConfig.data;
    } else {
      error('Invalid or missing data section in the ConfigMap', { url: configFilePath, method: 'readConfigMapFile'});
    }
  } catch (e) {
    error(getErrorMessage(e), { url: configFilePath, method: 'readConfigMapFile'});
  }
  return undefined;
}
