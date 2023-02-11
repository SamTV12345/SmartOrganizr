import {useEffect} from "react";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {AuthorEmbeddedContainer} from "../models/AuthorEmbeddedContainer";
import {Author} from "../models/Author";
import {Page} from "../models/Page";
import axios from "axios";
import {apiURL, links} from "../Keycloak";
import {setAuthorPage} from "../store/CommonSlice";
import {Waypoint} from "react-waypoint";
import {useTranslation} from "react-i18next";
import {fixLinkProtocol, fixProtocol} from "../utils/Utilities";
import {Modal} from "../components/modals/Modal";
import {setAuthor, setModalOpen, setOpenAddModal} from "../ModalSlice";
import {AuthorModal} from "../components/modals/AuthorModal";
import {AuthorPatchDto} from "../models/AuthorPatchDto";
import {AddModal} from "../components/modals/AddModal";
import {AuthorAddModal} from "../components/modals/AuthorAddModal";
import {mergeAuthorInList, mergeAuthors, mergeNewAuthorInList, removeAuthor} from "../utils/AuthorUtilList";
import {AuthorSearchBar} from "../components/searchBars/AuthorSearchBar";
import {AuthorWithIndex} from "../models/AuthorWithIndex";
import {TableData} from "../components/table/TableData";
import {PlusIcon} from "../components/form/PlusIcon";

export const AuthorView = ()=> {
    const dispatch = useAppDispatch()
    const authorPage = useAppSelector(state=>state.commonReducer.authorPage)
    const {t} = useTranslation()
    const selectedAuthor = useAppSelector(state=>state.modalReducer.selectedAuthor)
    const createdAuthor = useAppSelector(state=>state.modalReducer.createdAuthor)

    const deleteAuthor = async (authorPageInParam: Page<AuthorEmbeddedContainer<Author>>,author:Author)=>{
        await new Promise<Author>(()=>{
            axios.delete(`${apiURL}/v1/authors/${author.id}`)
                .then(()=>{
                    dispatch(setAuthorPage(removeAuthor(authorPageInParam,author.id)))
                    dispatch(setAuthor(undefined))
                    dispatch(setModalOpen(false))
                })
                .catch((err)=>console.log(err))
        })
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
        if (!authorPage && links.author.href) {
            loadAuthors(fixLinkProtocol(links.author.href))
        }
    },[])



    const updateAuthor = async(author:Author)=>{
        const authorInResponse: Author = await new Promise<Author>(resolve=>{
            axios.patch(apiURL+`/v1/authors/${author.id}`,{name: author.name,extraInformation:author.extraInformation} as AuthorPatchDto)
                .then(resp=>resolve(resp.data))
                .catch((error)=>{
                    console.log(error)
                })})
        if(authorInResponse !== undefined && authorPage){
            dispatch(setAuthorPage(mergeAuthorInList(authorPage,author)))
        }
    }


    const createAuthor = async(author:Author)=>{
        const authorInResponse: AuthorWithIndex = await new Promise<AuthorWithIndex>(resolve=>{
            axios.post(apiURL+`/v1/authors`,{name: author.name,extraInformation:author.extraInformation} as AuthorPatchDto)
                .then(resp=>resolve(resp.data))
                .catch((error)=>{
                    console.log(error)
                })})
        if(authorInResponse !== undefined && authorPage){
            dispatch(setAuthorPage(mergeNewAuthorInList(authorPage,authorInResponse)))
        }
    }

    return <div>
        <PlusIcon onClick={()=>dispatch(setOpenAddModal(true))}/>
        <AddModal acceptText={t('create')} children={<AuthorAddModal/>} headerText={t('createAuthor')} onAccept={()=>{createAuthor(createdAuthor)}}/>
        <Modal headerText={t('editAuthor')} children={<AuthorModal/>} onAccept={()=>{
            selectedAuthor&&updateAuthor(selectedAuthor)}} onCancel={()=>{}} acceptText={t('update')} cancelText={t('cancel')}
            onDelete={()=>selectedAuthor&&authorPage&&deleteAuthor(authorPage,selectedAuthor)}/>
        <table className="w-full md:w-8/12  divide-y table-fixed divide-gray-700 md:mx-auto md:mt-4 md:mb-4 border-collapse" id="authorTable">
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
            <tr>
                <td className="col-span-3 bg-gray-800" colSpan={3}>
                    <div className="flex justify-center">
                        <AuthorSearchBar/>
                    </div>
                </td>
            </tr>
            {
                authorPage && authorPage._embedded && authorPage._embedded.authorRepresentationModelList.map((author,index)=>
                        <tr className="hover:bg-gray-700" key={author.id.toString()} onClick={()=>{
                            dispatch(setAuthor(author))
                            dispatch(setModalOpen(true))
                        }}>
                            <TableData content={author.id}/>
                            <TableData content={author.name}/>
                            <TableData content={<>
                                {author.extraInformation}
                                {authorPage.page.size-index<10 &&
                                    authorPage._links && authorPage._links.next
                                    && authorPage._links.next.href
                                    && <Waypoint onEnter={()=>{
                                        loadAuthors(fixProtocol(authorPage._links.next.href))
                                    }}/>}
                            </>
                            }/>
                </tr>
                )
            }
            </tbody>
        </table>
    </div>
}
