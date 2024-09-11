import { WpMenu } from './wpMenu'
import {Subscribe} from './subscribe'
import {HrefForSubscribe} from "./hrefForSubscribe";

export interface MenuAPIResult {
    status: string,
    items: WpMenu[],
    _links: Subscribe
}
