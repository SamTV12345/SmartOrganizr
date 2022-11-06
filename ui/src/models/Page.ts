import {ApiLink} from "./ApiLink";
import {PageInfo} from "./PageInfo";

export interface Page<T>{
    _embedded: T,
    _links: {
        first: ApiLink,
        self: ApiLink,
        next: ApiLink,
        last: ApiLink
    }
    page: PageInfo
}