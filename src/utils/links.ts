import {Config} from "./configFileReader";

let config: Config;

export function configLinks(conf: Config) {
  config = conf;
}

export function getLabsLink(lang: string) : string {
  switch ( lang ) {
    case "fr":
      return config.LABS_LINK_URL_FR;
    default: //en
      return config.LABS_LINK_URL_EN;
  }
}

export function getMenuBarLinks(lang: string) : string[] {
  let listLinksFromConfig: string | undefined;
  switch ( lang ) {
    case "fr":
      listLinksFromConfig = config.MENU_BAR_LINKS_FR;
      break;
    case "de":
      listLinksFromConfig = config.MENU_BAR_LINKS_DE;
      break;
    default: //en
      listLinksFromConfig = config.MENU_BAR_LINKS_EN;
      break;
  }
  if (listLinksFromConfig) {
    return listLinksFromConfig.split('\n').filter(Boolean);
  } else {
    return [];
  }
}

export function getAssocBreadcrumb(lang: string) : string[] {
  let listLinksFromConfig: string | undefined;
  switch ( lang ) {
    case "fr":
      listLinksFromConfig = config.ASSOC_BREADCRUMB_FR;
      break;
    default: //en
      listLinksFromConfig = config.ASSOC_BREADCRUMB_EN;
      break;
  }
  if (listLinksFromConfig) {
    return listLinksFromConfig.split('\n').filter(Boolean);
  } else {
    return [];
  }
}

export function getBaseUrl(pageUrl: string): string {
  const parts: string[] = pageUrl.split('/');
  return parts.slice(0, -2).join('/').concat('/');
}
