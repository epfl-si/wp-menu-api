import {KubeConfig} from "@kubernetes/client-node";
import {getSiteListFromKubernetes} from "../../src/utils/source";
import {assert, expect} from "chai";

describe('Kubernetes Client Test', () => {
    it('should initialize KubeConfig', () => {
        const kc = new KubeConfig();
        kc.loadFromDefault();
    });
    it('should find wordpresssite campus', async () => {
        const kc = new KubeConfig();
        kc.loadFromDefault();
        const sites = await getSiteListFromKubernetes("svc0041p-wordpress");
        expect(sites.find(site => site.url == 'https://www.epfl.ch/campus/restaurants-shops-hotels')).not.be.undefined;
    });
});
