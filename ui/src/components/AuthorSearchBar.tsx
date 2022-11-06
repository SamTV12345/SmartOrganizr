import {Page} from "../models/Page";
import {AuthorEmbeddedContainer} from "../models/AuthorEmbeddedContainer";
import {Author} from "../models/Author";
import axios from "axios";
import {setAuthorPage, setAuthorSearchText} from "../store/CommonSlice";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {useDebounce} from "../utils/DebounceHook";
import {apiURL, waitTime} from "../Keycloak";

export  const AuthorSearchBar = ()=>{
    const dispatch = useAppDispatch()
    const fullTextSearch = useAppSelector(state=>state.commonReducer.authorSearchText)

    const loadAuthors = async (link:string)=>{
        const authorsInResponse: Page<AuthorEmbeddedContainer<Author>> = await new Promise<Page<AuthorEmbeddedContainer<Author>>>(resolve=>{
            axios.get(link)
                .then(resp=>resolve(resp.data))
                .catch((error)=>{
                    console.log(error)
                })})
        if(authorsInResponse !== undefined){
                dispatch(setAuthorPage(authorsInResponse))
         }
    }

    useDebounce(() => {
        if(fullTextSearch === undefined|| fullTextSearch.trim().length===0){
            loadAuthors(apiURL+`/v1/authors?page=0`)
        }
        else{
            loadAuthors(apiURL+`/v1/authors?page=0&name=${fullTextSearch}`)
        }
    },waitTime,[fullTextSearch])

    return <input className="w-8/12 m-2 bg-gray-700 text-white pl-3 pr-3" value={fullTextSearch} onChange={v=>dispatch(setAuthorSearchText(v.target.value))}/>
}