import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {error, getErrorMessage} from "./logger";

export interface Config {
  WP_SERVICE_NAME: string;
  WP_SERVICE_PORT: number;
  SERVICE_PORT: number;
  REFRESH_INTERVAL: number;
  NODE_TLS_REJECT_UNAUTHORIZED: number;
  REFRESH_INTERVAL_WITH_FILE: number;
  REFRESH_FROM_FILE: boolean;
  PATH_SITES_FILE: string;
  NAMESPACE: string;
  LABS_LINK_URL_FR: string;
  LABS_LINK_URL_EN: string;
  ASSOC_BREADCRUMB_EN: string;
  ASSOC_BREADCRUMB_FR: string;
  MENU_BAR_LINKS_EN: string;
  MENU_BAR_LINKS_FR: string;
  MENU_BAR_LINKS_DE: string;
  DEBUG: boolean;
  REQUEST_TIMEOUT: number;
}

export function loadConfig(configFilePath: any): Config | undefined {
  try {
    const configFile = fs.readFileSync(configFilePath, 'utf8');
    const parsedConfig = yaml.load(configFile) as Config;
    if (parsedConfig) {
      return parsedConfig;
    } else {
      error('Invalid or missing data section in the config', { url: configFilePath });
    }
  } catch (e) {
    error(getErrorMessage(e), { url: configFilePath });
  }
  return undefined;
}
