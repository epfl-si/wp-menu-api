import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {error, getErrorMessage} from "./logger";

export interface Config {
  WPVERITAS_URL: string;
  SERVICE_PORT: number;
  REFRESH_INTERVAL: number;
  NODE_TLS_REJECT_UNAUTHORIZED: number;
  REFRESH_INTERVAL_WITH_FILE: number;
  REFRESH_FROM_FILE: boolean;
  PATH_REFRESH_FILE: string;
  PATH_SITES_FILE: string;
  NAMESPACE: string;
  LABS_LINK_URL_FR: string;
  LABS_LINK_URL_EN: string;
  ASSOC_BREADCRUMB_EN: string;
  ASSOC_BREADCRUMB_FR: string;
  MENU_BAR_LINKS_EN: string;
  MENU_BAR_LINKS_FR: string;
  MENU_BAR_LINKS_DE: string;
  POD_NAME: string;
  DEBUG: boolean;
  LOCAL_ENV: boolean;
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
