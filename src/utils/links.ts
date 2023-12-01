import {Config} from "./configFileReader";

let config: Config | undefined;

export function configLinks(conf: Config | undefined) {
  config = conf;
}

export function getLabsLink(lang: string) : string {
  switch ( lang ) {
    case "fr":
      return config?.LABS_LINK_URL_FR || 'https://www.epfl.ch/labs/fr/laboratoires/';
    default: //en
      return config?.LABS_LINK_URL_EN || 'https://www.epfl.ch/labs/en/laboratories/';
  }
}

export function getAssocLink(lang: string) : string {
  switch ( lang ) {
    case "fr":
      return config?.ASSOC_LINK_URL_FR || 'https://www.epfl.ch/campus/associations/list/fr/toutes-les-associations/';
    default: //en
      return config?.ASSOC_LINK_URL_EN || 'https://www.epfl.ch/campus/associations/list/en/all-associations/';
  }
}
