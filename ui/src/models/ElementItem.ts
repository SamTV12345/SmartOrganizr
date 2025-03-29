import {Folder} from "./Folder";
import {ApiLink} from "./ApiLink";
import {Author} from "./Author";

export interface ElementItem {
    creationDate: Date,
    id: string,
    name: string,
    parent: Folder,
    author?:Author,
    numberOfPages?:number,
    description: string,
    links?: ApiLink[],
    length?:number,
    type:string
}
