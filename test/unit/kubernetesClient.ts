import {KubeConfig} from "@kubernetes/client-node";
import {getK8SPodName, getSiteListFromKubernetes} from "../../src/utils/source";
import {assert, expect} from "chai";

describe('Kubernetes Client Test', () => {
    it('should initialize KubeConfig', () => {
        const kc = new KubeConfig();
        kc.loadFromDefault();
    });
    it('should find wp-nginx pod', async () => {
        const kc = new KubeConfig();
        kc.loadFromDefault();
        const podName = await getK8SPodName("svc0041t-wordpress")
        assert(podName.indexOf("wp-nginx") > -1);
    });
    it('should find wordpresssite campus', async () => {
        const kc = new KubeConfig();
        kc.loadFromDefault();
        const sites = await getSiteListFromKubernetes("svc0041t-wordpress");
        expect(sites.find(site => site.url == 'https://wpn-test.epfl.ch/campus/restaurants-shops-hotels')).not.be.undefined;
    });
});
