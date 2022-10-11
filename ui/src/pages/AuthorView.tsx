import {useEffect} from "react";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {AuthorEmbeddedContainer} from "../models/AuthorEmbeddedContainer";
import {Author} from "../models/Author";
import {Page} from "../models/Page";
import axios from "axios";
import {apiURL} from "../Keycloak";
import {setAuthorPage} from "../store/CommonSlice";
import {Waypoint} from "react-waypoint";

export const AuthorView = ()=> {
    const dispatch = useAppDispatch()
    const authorPage = useAppSelector(state=>state.commonReducer.authorPage)

    const mergeAuthors = (oldAuthorList: Page<AuthorEmbeddedContainer<Author>>,newAuthorList: Page<AuthorEmbeddedContainer<Author>>)=>{
        const authorList =  [...oldAuthorList._embedded.authorRepresentationModelList,...newAuthorList._embedded.authorRepresentationModelList]
        return {
            page:newAuthorList.page,
            _embedded:{
                authorRepresentationModelList: authorList
            } ,
            _links:newAuthorList._links
        } as Page<AuthorEmbeddedContainer<Author>>
    }


    const loadAuthors = async (link:string)=>{
        const authorsInResponse: Page<AuthorEmbeddedContainer<Author>> = await new Promise<Page<AuthorEmbeddedContainer<Author>>>(resolve=>{
            axios.get(link)
                .then(resp=>resolve(resp.data))
                .catch((error)=>{
                    console.log(error)
                })})
        if(authorsInResponse !== undefined){
            if(authorPage !== undefined){
                dispatch(setAuthorPage(mergeAuthors(authorPage, authorsInResponse)))
            }
            else {
                dispatch(setAuthorPage(authorsInResponse))
            }
        }
    }

    useEffect(()=>{
        loadAuthors(apiURL+"/v1/authors/?page=0")
        },[])
    return <div className="table w-full p-2">
        <table className="w-3/5 border mx-auto">
            <thead>
            <tr className="bg-gray-50 border-b">
                <th className="p-2 border-r cursor-pointer text-sm font-thin text-gray-500">
                    <div className="flex items-center justify-center">
                        ID
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
                        </svg>
                    </div>
                </th>
                <th className="p-2 border-r cursor-pointer text-sm font-thin text-gray-500">
                    <div className="flex items-center justify-center">
                        Name
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
                        </svg>
                    </div>
                </th>
                <th className="p-2 border-r cursor-pointer text-sm font-thin text-gray-500">
                    <div className="flex items-center justify-center">
                        Email
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
                        </svg>
                    </div>
                </th>
            </tr>
            </thead>
            <tbody>
            <tr className="bg-gray-50 text-center">
                <td className="p-2 border-r">
                    <input type="text" className="border p-1"/>
                </td>
                <td className="p-2 border-r">
                    <input type="text" className="border p-1"/>
                </td>
                <td className="p-2 border-r">
                    <input type="text" className="border p-1"/>
                </td>
            </tr>
            {
                authorPage && authorPage._embedded && authorPage._embedded.authorRepresentationModelList.map((author,index)=><tr className="bg-gray-50 text-center" key={author.id.toString()}>
                    <td className="p-2 border-r cursor-pointer text-sm font-thin text-gray-500">
                        {author.id}
                    </td>
                <td className="p-2 border-r cursor-pointer text-sm font-thin text-gray-500">
                    {author.name}
                </td>
                    <td className="p-2 border-r cursor-pointer text-sm font-thin text-gray-500">
                        {author.extraInformation}
                    </td>
                    {authorPage.page.size-index<10 &&
                        authorPage._links && authorPage._links.next
                        && authorPage._links.next.href
                        && <Waypoint onEnter={()=>loadAuthors(authorPage._links.next.href)}/>}
                </tr>
                )
            }
            </tbody>

        </table>
    </div>
}