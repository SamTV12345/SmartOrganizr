import {useAppDispatch, useAppSelector} from "../store/hooks";
import {setElementType} from "../ElementCreateSlice";
import {CreateFolder} from "./CreateFolder";
import {CreateNote} from "./CreateNote";

export const ElementAddModal = ()=>{
    const type = useAppSelector(state=>state.elementReducer.type)
    const dispatch = useAppDispatch()

    return <div className="grid grid-cols-2">
        <h2 className="col-span-2 text-center text-xl">Typ</h2>
        <div className="flex items-center pl-4 rounded border border-gray-200 dark:border-gray-700">
            <input id="bordered-radio-1" type="radio" value="" name="bordered-radio" checked={type==='Folder'} onChange={()=>dispatch(setElementType('Folder'))}
                   className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"/>
                <label htmlFor="bordered-radio-1"
                       className="py-4 ml-2 w-full text-sm font-medium text-gray-900 dark:text-gray-300">Ordner</label>
        </div>
        <div className="flex items-center pl-4 rounded border border-gray-200 dark:border-gray-700">
            <input checked={type==='Note'} id="bordered-radio-2" type="radio" value="" name="bordered-radio" onChange={()=>dispatch(setElementType('Note'))}
                   className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"/>
                <label htmlFor="bordered-radio-2"
                       className="py-4 ml-2 w-full text-sm font-medium text-gray-900 dark:text-gray-300">Note</label>
        </div>
        {type==='Folder'&&<CreateFolder/>}
        {type==='Note'&&<CreateNote/>}
    </div>
}