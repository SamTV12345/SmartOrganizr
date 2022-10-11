import {useEffect} from "react";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {AuthorEmbeddedContainer} from "../models/AuthorEmbeddedContainer";
import {Author} from "../models/Author";
import {Page} from "../models/Page";
import axios from "axios";
import {apiURL} from "../Keycloak";
import {setAuthorPage} from "../store/CommonSlice";
import {Waypoint} from "react-waypoint";
import {useTranslation} from "react-i18next";

export const AuthorView = ()=> {
    const dispatch = useAppDispatch()
    const authorPage = useAppSelector(state=>state.commonReducer.authorPage)
    const {t} = useTranslation()

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
    return <table className="w-full md:w-8/12  divide-y table-fixed divide-gray-700 md:mx-auto md:mt-4 md:mb-4 border-collapse" id="authorTable">
            <thead className="bg-gray-700">
            <tr className="">
                <th className="py-3 px-6 text-xs font-medium tracking-wider text-left uppercase text-gray-400 md:rounded-tl-2xl">
                    <div className="flex items-center justify-center">
                        {t('id')}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
                        </svg>
                    </div>
                </th>
                <th className="py-3 px-6 text-xs font-medium tracking-wider text-left uppercase text-gray-400">
                    <div className="flex items-center justify-center">
                        {t('name')}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
                        </svg>
                    </div>
                </th>
                <th className="py-3 px-6 text-xs font-medium tracking-wider text-left uppercase text-gray-400 md:rounded-tr-2xl">
                    <div className="flex items-center justify-center">
                        {t('extraInformation')}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
                        </svg>
                    </div>
                </th>
            </tr>
            </thead>
            <tbody className="divide-y bg-gray-800 divide-gray-700">
            {
                authorPage && authorPage._embedded && authorPage._embedded.authorRepresentationModelList.map((author,index)=>
                        <tr className="hover:bg-gray-700" key={author.id.toString()}>
                    <td className="py-4 px-6 text-sm font-medium whitespace-nowrap text-white border-inherit text-center">
                        {author.id}
                    </td>
                <td className="py-4 px-6 text-sm font-medium whitespace-nowrap text-white text-center">
                    {author.name}
                </td>
                    <td className="py-4 px-6 text-sm font-medium whitespace-nowrap text-white text-center">
                        {author.extraInformation}
                        {authorPage.page.size-index<10 &&
                            authorPage._links && authorPage._links.next
                            && authorPage._links.next.href
                            && <Waypoint onEnter={()=>loadAuthors(authorPage._links.next.href)}/>}
                    </td>
                </tr>
                )
            }
            </tbody>
        </table>
}