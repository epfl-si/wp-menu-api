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
    getLanguages(): string[]{
        return []
    }
    getMenuEntries(): MenuEntry[]{
        return []
    }
    toString(): string {
        return this.url;
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
    console.log(await inv.sites());
}

main();
