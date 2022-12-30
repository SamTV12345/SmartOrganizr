import {lazy} from "react";

export const AuthorLazyLoad = lazy(()=>import('../pages/AuthorView').then(module=> {
    return{default:module["AuthorView"]}
}))

export const FolderViewLazyLoad = lazy(()=>import('../pages/FolderView').then(module=> {
    return{default:module["FolderView"]}
}))

export const SearchElementViewLazyLoad = lazy(()=>import('../pages/SearchElementView').then(module=> {
    return{default:module["SearchElementView"]}
}))

export const ConcertViewLazyLoad = lazy(()=>import('../pages/ConcertView').then(module=> {
    return{default:module["ConcertView"]}
}))

export const ImportExportViewLazyLoad = lazy(()=>import('../pages/ImportExportView').then(module=> {
    return{default:module["ImportExportView"]}
}))