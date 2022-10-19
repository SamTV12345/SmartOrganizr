import {useTranslation} from "react-i18next";
import {ElementSearchBar} from "../components/ElementSearchBar";
import {useAppSelector} from "../store/hooks";

export const SearchElementView = ()=>{
    const {t} = useTranslation()
    const searchedElements = useAppSelector(state=>state.commonReducer.elementsSearched)

    console.log(searchedElements&&searchedElements._embedded.noteRepresentationModelList)
    return <table className="w-full md:w-8/12  divide-y table-fixed divide-gray-700 md:mx-auto md:mt-4 md:mb-4 border-collapse" id="searchTable">
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
            <th className="py-3 px-6 text-xs font-medium tracking-wider text-left uppercase text-gray-400">
                <div className="flex items-center justify-center">
                    {t('extraInformation')}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
                    </svg>
                </div>
            </th>
            <th className="py-3 px-6 text-xs font-medium tracking-wider text-left uppercase text-gray-400 md:rounded-tr-2xl">
                <div className="flex items-center justify-center">
                    Author
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
            <td className="col-span-3 bg-gray-800" colSpan={4}>
                <div className="flex justify-center">
                    <ElementSearchBar/>
                </div>
            </td>
        </tr>
        {searchedElements&& searchedElements._embedded&& searchedElements._embedded.noteRepresentationModelList&& searchedElements._embedded.noteRepresentationModelList.map(element=>
                <tr>
            <td className="text-white">{element.title}</td>
            <td className="text-white">{element.author.name}</td>
            <td className="text-white">{element.description}</td>
            <td className="text-white">{element.parent.name}</td>
        </tr>
        )
        }
        </tbody>
    </table>
}