import {useEffect} from "react";
import {useAppSelector} from "../store/hooks";
import {AuthorEmbeddedContainer} from "../models/AuthorEmbeddedContainer";
import {Author} from "../models/Author";
import {Page} from "../models/Page";
import axios from "axios";
import {apiURL} from "../Keycloak";

export const AuthorView = () => {
    const authorPage = useAppSelector(state => state.commonReducer.authorPage)

    const loadAuthors = async (page: number) => {
        const messagesInResponse: Page<AuthorEmbeddedContainer<Author>>[] = await new Promise<Page<AuthorEmbeddedContainer<Author>>[]>(resolve => {
            axios.get(apiURL + "/v1/authors?page=" + page)
                .then(resp => resolve(resp.data))
                .catch((error) => {
                    console.log(error)
                })
        })
        if (messagesInResponse !== undefined) {
            console.log(messagesInResponse)
        }
    }

    useEffect(() => {
        loadAuthors(0)
    }, [])
    return <div className="table w-full p-2">
        <table className="w-full border">
            <thead>
            <tr className="bg-gray-50 border-b">
                <th className="border-r p-2">
                    <input type="checkbox"/>
                </th>
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
                <th className="p-2 border-r cursor-pointer text-sm font-thin text-gray-500">
                    <div className="flex items-center justify-center">
                        Address
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
                        </svg>
                    </div>
                </th>
                <th className="p-2 border-r cursor-pointer text-sm font-thin text-gray-500">
                    <div className="flex items-center justify-center">
                        Action
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

                </td>
                <td className="p-2 border-r">
                    <input type="text" className="border p-1"/>
                </td>
                <td className="p-2 border-r">
                    <input type="text" className="border p-1"/>
                </td>
                <td className="p-2 border-r">
                    <input type="text" className="border p-1"/>
                </td>
                <td className="p-2 border-r">
                    <input type="text" className="border p-1"/>
                </td>
                <td className="p-2">
                    <input type="text" className="border p-1"/>
                </td>


            </tr>
            </tbody>
        </table>
    </div>
}