class MenuEntry {

}

class Site {
    url: string;

    constructor (url : string) {
        this.url = url;
    }
    getUrl() : string {
        return ""
    }
    async getLanguages(): Promise<string[]> {
        const langApiResponse = await fetch(`${this.url}/wp-json/epfl/v1/languages`);
        try {
            return await langApiResponse.json();
        } catch (SyntaxError) {
            return [];
        }
    }

    getMenuEntries(): MenuEntry[]{
        return []
    }
    get [Symbol.toStringTag]() {
        return `<Site url="${this.url}">`;
    }
}

class MenuInventory {
    wpVeritasUrl : string;

    constructor (wpVeritasUrl : string) {
        this.wpVeritasUrl = wpVeritasUrl;
    }
    async sites () {
        const resp = await fetch(this.wpVeritasUrl);
        const inventory: any[] = await resp.json();
        const arraySites = inventory.map(i =>  new Site(i.url))
        return arraySites;
    }
}

async function main () {
    const inv = new MenuInventory("https://wp-veritas.epfl.ch/api/v1/sites");

    for (let site of await inv.sites()) {
        for (let lang of await site.getLanguages()) {
            console.log(`${site} has language ${lang}`);
        }
    }
}

main();
