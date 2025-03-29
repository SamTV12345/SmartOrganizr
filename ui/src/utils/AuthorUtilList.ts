import {Page} from "../models/Page";
import {AuthorEmbeddedContainer} from "../models/AuthorEmbeddedContainer";
import {Author} from "../models/Author";
import {AuthorWithIndex} from "../models/AuthorWithIndex";

export const mergeAuthors = (oldAuthorList: Page<AuthorEmbeddedContainer<Author>>,newAuthorList: Page<AuthorEmbeddedContainer<Author>>)=>{
        const authorList =  [...oldAuthorList._embedded.authorRepresentationModelList,...newAuthorList._embedded.authorRepresentationModelList]
        return {
            page:newAuthorList.page,
            _embedded:{
                authorRepresentationModelList: authorList
            } ,
            _links:newAuthorList._links
        } as Page<AuthorEmbeddedContainer<Author>>
    }

export const mergeAuthorInList = (authorList: Page<AuthorEmbeddedContainer<Author>>, updatedAuthor: Author)=> {
    const newAuthorList = authorList._embedded.authorRepresentationModelList.map(author => author.id === updatedAuthor.id ?
        {id: author.id, name: updatedAuthor.name, extraInformation: updatedAuthor.extraInformation} as Author : author)
    return {
        page: authorList.page,
        _embedded: {
            authorRepresentationModelList: newAuthorList
        },
        _links: authorList._links
    } as Page<AuthorEmbeddedContainer<Author>>
}

export const mergeNewAuthorInList = (authorList: Page<AuthorEmbeddedContainer<Author>>, newAuthor: AuthorWithIndex )=>{
    //Already at index
    if(authorList._embedded.authorRepresentationModelList.length>=newAuthor.index){
        const currentSizeOfPage = authorList.page.size*(authorList.page.number+1)
        let newAuthorList
        //Shorten page
        if(currentSizeOfPage<authorList.page.totalElements) {
             newAuthorList = [
                ...authorList._embedded.authorRepresentationModelList.slice(0, newAuthor.index),
                newAuthor,
                ...authorList._embedded.authorRepresentationModelList.slice(newAuthor.index, authorList._embedded.authorRepresentationModelList.length-1)
            ];
        }
        else{
             newAuthorList = [
                ...authorList._embedded.authorRepresentationModelList.slice(0, newAuthor.index),
                newAuthor,
                ...authorList._embedded.authorRepresentationModelList.slice(newAuthor.index)
            ];
        }
        return {
            page: authorList.page,
            _embedded: {
                authorRepresentationModelList: newAuthorList
            },
            _links: authorList._links
        } as Page<AuthorEmbeddedContainer<Author>>
    }
    return authorList
}

export const removeAuthor = (authorList: Page<AuthorEmbeddedContainer<Author>>, deletedAuthor: string)=>{
        const newAuthorList = authorList._embedded.authorRepresentationModelList.filter(author=>author.id!==deletedAuthor)
        return {
            page: authorList.page,
            _embedded:{
                authorRepresentationModelList: newAuthorList
            } ,
            _links: authorList._links
        } satisfies Page<AuthorEmbeddedContainer<Author>>
    }
