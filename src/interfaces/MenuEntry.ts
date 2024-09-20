import {Site} from "./site";

export abstract class MenuEntry {

    ownerSite: Site;
    title: string;
    ID: number;
    menu_order: number;
    menu_item_parent: number;
    object: string;
    type_label: string;

    protected constructor (ownerSite: Site, jsonDatum: any) {
        this.ownerSite = ownerSite;
        this.title = jsonDatum.title;
        this.ID = jsonDatum.ID;
        this.menu_order = jsonDatum.menu_order;
        this.menu_item_parent = jsonDatum.menu_item_parent;
        this.object = jsonDatum.object;
        this.type_label = jsonDatum.type_label;
    }

    static parse (ownerSite: Site, jsonDatum : any) : MenuEntry {
        for (let cls of [OtherMenuEntry, ExternalMenuEntry]) {
            const parsed = cls.tryToParse(ownerSite, jsonDatum);
            if (parsed) return parsed;
        }

        throw new TypeError(`Decidedly don't know how to parse ${JSON.stringify(jsonDatum)}`);
    }

    getTitle(): string {
        return this.title;
    }
    getSite(): Site {
        return this.ownerSite;
    }

    abstract getFullUrl() : string;
}

class ExternalMenuEntry extends MenuEntry {
    rest_url: string;
    constructor (ownerSite : Site, jsonDatum : any) {
        super(ownerSite, jsonDatum);
        this.rest_url = jsonDatum.rest_url;
    }

    static tryToParse (ownerSite : Site, jsonDatum : any) : ExternalMenuEntry | undefined {
        if (jsonDatum.object == "epfl-external-menu") {
            return new ExternalMenuEntry(ownerSite, jsonDatum);
        }
    }

    getFullUrl() {
        return `${this.ownerSite.getDomainUrl()}${this.rest_url}`;
    }
}

class OtherMenuEntry extends MenuEntry {
    url: string;
    constructor (ownerSite : Site, jsonDatum : any) {
        super(ownerSite, jsonDatum);
        this.url = jsonDatum.url;
    }

    static tryToParse (ownerSite : Site, jsonDatum : any) : OtherMenuEntry | undefined {
        if (jsonDatum.object != "epfl-external-menu") {
            return new OtherMenuEntry(ownerSite, jsonDatum);
        }
    }

    getFullUrl() {
        return this.url;
    }
}
