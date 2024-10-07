import 'mocha';
import { assert } from "chai";
import {SiteTreeReadOnly} from "../../src/interfaces/siteTree";
import * as fs from 'fs';
import {MenuEntry} from "../../src/interfaces/MenuEntry";
import {Site} from "../../src/interfaces/site";
import {loadConfig} from "../../src/utils/configFileReader";

const bogusWpMenu = {
    post_status: "post_status",
    post_name: "4444",
    post_parent: 5555,
    guid: "aaa-2-bbbb",
    menu_order:1,
    post_type: "post",
    db_id: 12345,
    object_id: 67890,
    object: "page",
    type_label: "Page",
    url: "http://toto.com/some/page"
}

const bogusExternalWpMenu = {
    post_status:"publish",
    post_name:"19761",
    post_parent:0,
    menu_order:2,
    post_type:"nav_menu_item",
    db_id:19761,
    object:"epfl-external-menu",
    type_label:"External Menu"
}

const config = loadConfig('menu-api-config.yaml');

describe("Site Tree", function() {
    describe("in a single site", function() {
        it("has a parent", function() {
            const parent : MenuEntry = MenuEntry.parse(new Site('http://toto.com/', '', true), {ID: 1, menu_item_parent: 0, title: "Some_Page parent 1",rest_url: "/wp-json/bla?bla", ...bogusWpMenu}),
                child : MenuEntry = MenuEntry.parse(new Site('http://toto.com/', '', true), {ID: 2, menu_item_parent: 1, title: "Some_Page child 1",rest_url: "/wp-json/bla?bla", ...bogusWpMenu});
            const siteTree = SiteTreeReadOnly([{ urlInstanceRestUrl: "http://toto.com/wp-json/bla?bla", entries: [parent, child] }]);
            const tree = siteTree.getParent("http://toto.com/wp-json/bla?bla",2);
            if (tree) {
                assert(tree["http://toto.com/wp-json/bla?bla"].ID === 1);
            } else {
                assert.fail();
            }
        })
        it("has a child", function() {
            const parent : MenuEntry = MenuEntry.parse(new Site('http://toto.com/', '', true), {ID: 1, menu_item_parent: 0, title: "Some_Page parent 1", rest_url: "/wp-json/bla?bla",...bogusWpMenu}),
                child : MenuEntry = MenuEntry.parse(new Site('http://toto.com/', '', true), {ID: 2, menu_item_parent: 1, title: "Some_Page child 1",rest_url: "/wp-json/bla?bla", ...bogusWpMenu});
            const siteTree = SiteTreeReadOnly([{ urlInstanceRestUrl: "https://toto.com/wp-json/bla?bla", entries: [parent, child] }]);
            assert.deepEqual(siteTree.getChildren("https://toto.com/wp-json/bla?bla",1), [child])
        })
        it("doesn't crash when parentID points nowhere", function() {
            const parent : MenuEntry = MenuEntry.parse(new Site('http://toto.com/', '', true), {ID: 1, menu_item_parent: 0, title: "Some_Page parent 1", rest_url: "/wp-json/bla?bla",...bogusWpMenu}),
                child : MenuEntry = MenuEntry.parse(new Site('http://toto.com/', '', true), {ID: 2, menu_item_parent: 3, title: "Some_Page child 1",rest_url: "/wp-json/bla?bla",  ...bogusWpMenu});
            const siteTree = SiteTreeReadOnly([{ urlInstanceRestUrl: "https://toto.com/wp-json/bla?bla", entries: [parent, child] }]);
            const tree1 = siteTree.getParent("https://toto.com/wp-json/bla?bla",2);
            if (tree1) {
                assert(tree1["http://toto.com/wp-json/bla?bla"] === undefined);
            } else {
                assert.fail();
            }
            assert.deepEqual(siteTree.getChildren("https://toto.com/wp-json/bla?bla",1), []);
        })
        it("doesn't crash when entries menu list is undefined", function() {
            const siteTree = SiteTreeReadOnly([{ urlInstanceRestUrl: "https://toto.com/wp-json/bla?bla", entries: undefined }]);
            const tree1 = siteTree.getParent("https://toto.com/wp-json/bla?bla",2);
            if (tree1) {
                assert(tree1["http://toto.com/wp-json/bla?bla"] === undefined);
            } else {
                assert.fail();
            }
        })
        it("doesn't crash when entries menu list is empty", function() {
            const siteTree = SiteTreeReadOnly([{ urlInstanceRestUrl: "https://toto.com/wp-json/bla?bla", entries: [] }]);
            const tree1 = siteTree.getParent("https://toto.com/wp-json/bla?bla",2);
            if (tree1) {
                assert(tree1["http://toto.com/wp-json/bla?bla"] === undefined);
            } else {
                assert.fail();
            }
        })
    })
    describe("in multiple sites", function() {
        it("doesn't crach with multiple sites", function() {
            const parent : MenuEntry = MenuEntry.parse(new Site('http://toto.com/', '', true), {ID: 1, menu_item_parent: 0, title: "Some_Page parent 1",rest_url: "/wp-json/bla?bla", ...bogusWpMenu}),
                child : MenuEntry = MenuEntry.parse(new Site('http://toto.com/', '', true), {ID: 2, menu_item_parent: 1, title: "Some_Page child 2",rest_url: "/wp-json/bla?bla", ...bogusWpMenu});
            const parent2 : MenuEntry = MenuEntry.parse(new Site('http://tototata.com/', '', true), {ID: 1, menu_item_parent: 0, title: "Some_Page parent 1 bis",rest_url: "/wp-json/bla?bla", ...bogusWpMenu}),
                child2 : MenuEntry = MenuEntry.parse(new Site('http://tototata.com/', '', true), {ID: 3, menu_item_parent: 1 ,title: "Some_Page child 3",rest_url: "/wp-json/bla?bla", ...bogusWpMenu});
            const siteTree = SiteTreeReadOnly([{ urlInstanceRestUrl: "https://toto.com/wp-json/bla?bla", entries: [parent, child] },{ urlInstanceRestUrl: "https://tototata.com/wp-json/bla?bla", entries: [parent2, child2] }]);
            const tree1 = siteTree.getParent("https://toto.com/wp-json/bla?bla", 2);
            const tree2 = siteTree.getParent("https://tototata.com/wp-json/bla?bla", 3);
            if (tree1) {
                assert(tree1["https://toto.com/wp-json/bla?bla"].title === "Some_Page parent 1");
            } else {
                assert.fail();
            }
            if (tree2) {
                assert(tree2["https://tototata.com/wp-json/bla?bla"].title === "Some_Page parent 1 bis");
            } else {
                assert.fail();
            }
        })
        it("gets external site reference", function() {
            const parent : MenuEntry = MenuEntry.parse(new Site('http://tototata.com/', '', true), {ID: 1, menu_item_parent: 0, title: "Some_Page parent 1",rest_url: "/wp-json/bla?bla", ...bogusWpMenu}),
                child : MenuEntry = MenuEntry.parse(new Site('http://tototata.com/', '', true), {ID: 2, menu_item_parent: 1, title: "Some_Page child 2",rest_url: "/wp-json/bla?bla", ...bogusWpMenu}),
                parent2 : MenuEntry = MenuEntry.parse(new Site('http://tototata.com/', '', true), {ID: 1, menu_item_parent: 0, title: "Some_Page parent 1 bis",rest_url: "/wp-json/bla?bla", ...bogusWpMenu}),
                child2 : MenuEntry = MenuEntry.parse(new Site('http://tototata.com/', '', true), {ID: 3, menu_item_parent: 1 ,title: "Some_Page child 3",rest_url: "/wp-json/bla?bla", ...bogusWpMenu}),
                child3 : MenuEntry = MenuEntry.parse(new Site('https://toto.com/', '', true), {ID: 4, menu_item_parent: 1, title: "Some_Page external menu 4", rest_url: "/wp-json/bla?bla", ...bogusExternalWpMenu});
            const siteTree = SiteTreeReadOnly([{ urlInstanceRestUrl: "https://toto.com/wp-json/bla?bla", entries: [parent, child] },
                { urlInstanceRestUrl: "https://tototata.com/wp-json/bla?bla", entries: [parent2, child2, child3] }]);
            assert(siteTree.findExternalMenuByRestUrl(child3.getFullUrl())?.title=="Some_Page parent 1");
        })
        it("gets the correct instance child", function() {
            const jsonServices =  fs.readFileSync('./test/unit/data/services.json', 'utf-8');
            const jsonWebSite =  fs.readFileSync('./test/unit/data/website.json', 'utf-8');
            const servicesMenu = JSON.parse(jsonServices);
            const websiteMenu = JSON.parse(jsonWebSite);
            const siteTree = SiteTreeReadOnly([{ urlInstanceRestUrl: "https://wp-httpd.epfl.ch/campus/services/wp-json/epfl/v1/menus/top?lang=en", entries: servicesMenu.items.map((i: any) => MenuEntry.parse(new Site(i.ownerSite.url, '', true), i)) },
                { urlInstanceRestUrl: "https://wp-httpd.epfl.ch/campus/services/website/wp-json/epfl/v1/menus/top?lang=en", entries: websiteMenu.items.map((i: any) => MenuEntry.parse(new Site(i.ownerSite.url, '', true), i)) }]);
            const children = siteTree.getChildren("https://wp-httpd.epfl.ch/campus/services/wp-json/epfl/v1/menus/top?lang=en", 7119);
            assert(children.filter(item => item.ID ===15624 ).length == 1);
        })
        it("has no external menu as children", function() {
            const jsonServices =  fs.readFileSync('./test/unit/data/services.json', 'utf-8');
            const jsonWebSite =  fs.readFileSync('./test/unit/data/website.json', 'utf-8');
            const servicesMenu = JSON.parse(jsonServices);
            const websiteMenu = JSON.parse(jsonWebSite);
            const siteTree = SiteTreeReadOnly([{ urlInstanceRestUrl: "https://wp-httpd.epfl.ch/campus/services/wp-json/epfl/v1/menus/top?lang=en", entries: servicesMenu.items.map((i: any) => MenuEntry.parse(new Site(i.ownerSite.url, '', true), i)) },
                { urlInstanceRestUrl: "https://wp-httpd.epfl.ch/campus/services/website/wp-json/epfl/v1/menus/top?lang=en", entries: websiteMenu.items.map((i: any) => MenuEntry.parse(new Site(i.ownerSite.url, '', true), i)) }]);
            const children = siteTree.getChildren("https://wp-httpd.epfl.ch/campus/services/wp-json/epfl/v1/menus/top?lang=en", 7119);
            assert.deepEqual(children.filter(item => item.object === 'epfl-external-menu' ), []);
        })
        it("finds the correct item", function() {
            const jsoServices =  fs.readFileSync('./test/unit/data/services.json', 'utf-8');
            const jsonWebSite =  fs.readFileSync('./test/unit/data/website.json', 'utf-8');
            const servicesMenu = JSON.parse(jsoServices);
            const websiteMenu = JSON.parse(jsonWebSite);
            const siteTree = SiteTreeReadOnly([{ urlInstanceRestUrl: "https://wp-httpd.epfl.ch/campus/services/wp-json/epfl/v1/menus/top?lang=en", entries: servicesMenu.items.map((i: any) => MenuEntry.parse(new Site(i.ownerSite.url, '', true), i)) },
                { urlInstanceRestUrl: "https://wp-httpd.epfl.ch/campus/services/website/wp-json/epfl/v1/menus/top?lang=en", entries: websiteMenu.items.map((i: any) => MenuEntry.parse(new Site(i.ownerSite.url, '', true), i)) }]);
            let firstSite: { [urlInstance: string]: MenuEntry } | undefined = siteTree.findItemByUrl("https://wp-httpd/campus/services/website/close-a-website/");
            if (firstSite) {
                const restUrl = Object.keys(firstSite)[0];
                if (firstSite[restUrl]) {
                    assert(firstSite[restUrl].ID ===24813);
                } else {
                    assert.fail();
                }
            } else {
                assert.fail();
            }
        })
    })
});
