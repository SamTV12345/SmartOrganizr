import {PageInfo} from "./PageInfo";

export interface Page<T>{
    _embedded: T,
    page: PageInfo
}
