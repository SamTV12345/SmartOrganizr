import {ApiLink} from "./ApiLink";
import {ElementItem} from "./ElementItem";

export interface Folder extends ElementItem {
    links: ApiLink[],
    length: number
}